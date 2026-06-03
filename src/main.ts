import { loadContent } from "./content";
import { AppController, type ViewModel } from "./app-controller";
import type { Round } from "./types";
import { renderView } from "./render";
import { AudioPlayer } from "./audio-player";
import { Recorder } from "./recorder";
import { recognize } from "./asr-client";
import { isAnswerCorrect } from "./judge";
import { isNative, recognizeOnceNative } from "./native-asr";
import rawContent from "./content.json";

const root = document.querySelector<HTMLDivElement>("#app")!;
const content = loadContent(rawContent);
const audio = new AudioPlayer();
const recorder = new Recorder();

let currentScreen: ViewModel["screen"] = "standby";
let currentRound: Round | null = null;
let roundToken = 0; // bumped on every transition; stale async voice loops bail out

const controller = new AppController(content, Math.random, (vm: ViewModel) => {
  currentScreen = vm.screen;
  currentRound = vm.round;
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

// --- the hands-free voice round ---
function beginQuestion(): void {
  const token = ++roundToken;
  const round = currentRound;
  if (!round) return;
  // Play the character's question, then auto-start listening when it finishes.
  audio.play(round.questionAudio, () => {
    if (token === roundToken) void listenLoop(token, round);
  });
}

const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms));
const alive = (token: number) => token === roundToken && currentScreen === "question";

// Native (Tauri): Rust cpal mic + streaming Alibaba ASR; partials stream into the caption.
async function captureNative(token: number): Promise<string | null> {
  controller.setVoice("listening");
  const transcript = await recognizeOnceNative((t) => {
    if (alive(token)) controller.setVoice("listening", t);
  }, 9000);
  return alive(token) ? transcript : null;
}

// Web/PWA: browser mic + chunked Vercel ASR, streaming the growing transcript into the caption.
async function captureWeb(token: number): Promise<string | null> {
  await ensureMic();
  if (!alive(token)) return null;
  if (!recorder.available() || !micReady) return null; // no mic → teacher advances manually
  controller.setVoice("listening");
  let live;
  try {
    live = await recorder.begin({ maxMs: 9000, silenceMs: 1500 });
  } catch {
    if (token === roundToken) controller.setVoice("asking");
    return null;
  }
  let recording = true;
  void live.finished.then(() => (recording = false));
  let last = "";
  while (recording && alive(token)) {
    if (!live.hasSpeech()) {
      await sleep(250);
      continue;
    }
    try {
      const { transcript } = await recognize(live.snapshotBase64(), "audio/wav");
      if (!alive(token)) { live.stop(); return null; }
      last = transcript || last;
      controller.setVoice("listening", last);
    } catch {
      await sleep(300);
    }
  }
  if (!alive(token)) return null;
  controller.setVoice("checking", last || null);
  try {
    return (await recognize(live.snapshotBase64(), "audio/wav")).transcript || last;
  } catch {
    return last;
  }
}

async function listenLoop(token: number, round: Round): Promise<void> {
  if (!alive(token)) return;

  const transcript = isNative()
    ? await captureNative(token)
    : await captureWeb(token);

  if (transcript === null || !alive(token)) return;
  controller.setVoice("checking", transcript || null);

  if (transcript && isAnswerCorrect(transcript, round)) {
    window.setTimeout(() => {
      if (alive(token)) controller.next(); // correct → jump to the lucky-number page
    }, 700);
  } else {
    controller.setVoice("wrong", transcript || null);
    // The character gently encourages in their own voice; re-listen only after it ends
    // (so the mic doesn't record the encouragement).
    audio.play(round.encourageAudio, () => {
      window.setTimeout(() => {
        if (alive(token)) void listenLoop(token, round);
      }, 600);
    });
  }
}

function startTurn(): void {
  if (currentScreen !== "standby") return;
  if (!isNative()) void ensureMic(); // web: request mic permission on the gesture (native uses cpal)
  controller.start();
  beginQuestion();
}

// Start button (a real user gesture, so audio + mic are allowed).
root.addEventListener("click", (e) => {
  if ((e.target as HTMLElement).closest("[data-action='start']")) startTurn();
});

// Operator keyboard: advance/skip and back-to-standby. Bumping the token cancels
// any in-flight voice loop so a skip can't be overridden by a late ASR result.
window.addEventListener("keydown", (e) => {
  if (e.key === " " || e.key === "Enter" || e.key === "ArrowRight") {
    e.preventDefault();
    if (currentScreen === "standby") startTurn();
    else {
      roundToken++;
      controller.next();
    }
  } else if (e.key === "Escape") {
    roundToken++;
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
