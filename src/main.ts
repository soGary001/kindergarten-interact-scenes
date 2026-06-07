import { loadContent } from "./content";
import { AppController, type ViewModel } from "./app-controller";
import type { Round } from "./types";
import { renderView } from "./render";
import { AudioPlayer } from "./audio-player";
import { Recorder } from "./recorder";
import { recognize } from "./asr-client";
import { isAnswerCorrect } from "./judge";
import { isNative, startNativeRec, type RecHandle } from "./native-asr";
import rawContent from "./content.json";

const root = document.querySelector<HTMLDivElement>("#app")!;
const content = loadContent(rawContent);
const audio = new AudioPlayer();
const recorder = new Recorder();

let currentScreen: ViewModel["screen"] = "standby";
let currentRound: Round | null = null;
let currentPhase: ViewModel["voicePhase"] = "asking";
let roundToken = 0; // bumped on every transition; stale async voice loops bail out

const controller = new AppController(content, Math.random, (vm: ViewModel) => {
  currentScreen = vm.screen;
  currentRound = vm.round;
  currentPhase = vm.voicePhase;
  renderView(root, vm);
  if (vm.screen === "reward") audio.play(vm.round!.thanksAudio);
  else if (vm.screen === "standby") audio.stop();
  // The question clip is played in beginQuestion() (not here) so it isn't
  // restarted on every voice-phase re-render.
});

// --- microphone permission (request on the Start gesture) ---
let micReady = false;
let micPromise: Promise<void> | null = null;
function ensureMic(): Promise<void> {
  if (!micPromise) {
    micPromise = recorder
      .ensurePermission()
      .then(() => { micReady = true; })
      .catch(() => { micReady = false; });
  }
  return micPromise;
}

// --- push-to-talk voice round ---
// After the question, show a "tap to speak" button. The child taps to start (the mic
// warms up with no clock running), speaks for as long as they like, then taps "done" to
// finish. No timing — so a slow mic connection or a hesitant child can never cut them off.
const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms));
const alive = (token: number) => token === roundToken && currentScreen === "question";

let activeRec: RecHandle | null = null;

// Short gap after a character clip ends before the "tap to speak" button appears, so the
// speaker's audio (and its buffered tail) is fully flushed and can't echo into the mic.
const SETTLE_MS = 400;
function showReadyAfterAudio(token: number): void {
  window.setTimeout(() => {
    if (token === roundToken && currentScreen === "question") controller.setVoice("ready");
  }, SETTLE_MS);
}

function beginQuestion(): void {
  const token = ++roundToken;
  const round = currentRound;
  if (!round) return;
  // Play the character's question, then (after a short settle) show the tap-to-speak button.
  audio.play(round.questionAudio, () => {
    if (token === roundToken) showReadyAfterAudio(token);
  });
}

// Cancel any in-flight recording (on skip / back-to-standby).
function cancelRec(): void {
  if (activeRec) {
    void activeRec.stop().catch(() => {});
    activeRec = null;
  }
}

// Web/PWA: browser mic + chunked Vercel ASR. Effectively manual — a big max guards runaway,
// but the child controls start/stop with the buttons.
async function startWebRec(onPartial: (t: string) => void): Promise<RecHandle> {
  await ensureMic();
  if (!recorder.available() || !micReady) throw new Error("no mic");
  const live = await recorder.begin({ maxMs: 60000, silenceMs: 60000 });
  let last = "";
  let polling = true;
  void (async () => {
    while (polling) {
      if (live.hasSpeech()) {
        try {
          const { transcript } = await recognize(live.snapshotBase64(), "audio/wav");
          last = transcript || last;
          onPartial(last);
        } catch {
          /* keep polling */
        }
      }
      await sleep(400);
    }
  })();
  return {
    async stop(): Promise<string> {
      polling = false;
      live.stop();
      try {
        last = (await recognize(live.snapshotBase64(), "audio/wav")).transcript || last;
      } catch {
        /* keep last */
      }
      return last;
    },
  };
}

// Tap "speak": warm up the mic (no timer), then switch to the recording button.
async function startRecording(): Promise<void> {
  const token = roundToken;
  if (!alive(token) || activeRec) return;
  if (currentPhase !== "ready") return; // only from the tap-to-speak button
  if (audio.isPlaying()) return; // never open the mic while the character is still talking
  audio.stop(); // belt-and-suspenders: kill any lingering playback before opening the mic
  controller.setVoice("connecting");
  let rec: RecHandle;
  try {
    rec = isNative()
      ? await startNativeRec((t) => { if (alive(token)) controller.setVoice("recording", t); })
      : await startWebRec((t) => { if (alive(token)) controller.setVoice("recording", t); });
  } catch {
    if (alive(token)) controller.setVoice("ready"); // mic/connection failed → let them retry
    return;
  }
  if (!alive(token)) { void rec.stop().catch(() => {}); return; } // skipped while warming up
  activeRec = rec;
  controller.setVoice("recording");
}

// Tap "done": stop the mic, judge the answer.
async function stopRecording(): Promise<void> {
  const token = roundToken;
  const round = currentRound;
  const rec = activeRec;
  if (!rec || !round) return;
  activeRec = null;
  controller.setVoice("checking");
  let transcript = "";
  try {
    transcript = await rec.stop();
  } catch {
    transcript = "";
  }
  if (!alive(token)) return;
  controller.setVoice("checking", transcript || null);

  if (transcript && isAnswerCorrect(transcript, round)) {
    window.setTimeout(() => {
      if (alive(token)) controller.next(); // correct → jump to the lucky-number page
    }, 700);
  } else {
    controller.setVoice("wrong", transcript || null);
    // The character gently encourages in their own voice; then (after a short settle so the
    // encouragement can't echo into the mic) show the speak button again.
    audio.play(round.encourageAudio, () => {
      if (alive(token)) showReadyAfterAudio(token);
    });
  }
}

function startTurn(): void {
  if (currentScreen !== "standby") return;
  if (!isNative()) void ensureMic(); // web: request mic permission on the gesture (native uses cpal)
  controller.start();
  beginQuestion();
}

// Clicks (real user gestures, so audio + mic are allowed): Start, tap-to-speak, tap-done.
root.addEventListener("click", (e) => {
  const t = e.target as HTMLElement;
  if (t.closest("[data-action='start']")) startTurn();
  else if (t.closest("[data-action='rec-start']")) void startRecording();
  else if (t.closest("[data-action='rec-stop']")) void stopRecording();
});

// Operator keyboard: advance/skip and back-to-standby. Bumping the token + cancelling any
// in-flight recording so a skip can't be overridden by a late ASR result.
window.addEventListener("keydown", (e) => {
  if (e.key === " " || e.key === "Enter" || e.key === "ArrowRight") {
    e.preventDefault();
    if (currentScreen === "standby") startTurn();
    else {
      roundToken++;
      cancelRec();
      controller.next();
    }
  } else if (e.key === "Escape") {
    roundToken++;
    cancelRec();
    controller.toStandby();
  }
});

controller.init();

// Register the service worker (production only) so the app is installable as a PWA.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

// Dev-only: lets the preview drive voice phases for visual checks. Stripped from
// production builds (import.meta.env.DEV is false in `vite build`).
if (import.meta.env.DEV) {
  (window as any).__voice = (phase: any, transcript: string | null = null) =>
    controller.setVoice(phase, transcript);
}
