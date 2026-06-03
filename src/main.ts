import { loadContent } from "./content";
import { AppController, type ViewModel } from "./app-controller";
import type { Round } from "./types";
import { renderView } from "./render";
import { AudioPlayer } from "./audio-player";
import { Recorder } from "./recorder";
import { recognize } from "./asr-client";
import { isAnswerCorrect } from "./judge";
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

async function listenLoop(token: number, round: Round): Promise<void> {
  await ensureMic();
  if (token !== roundToken || currentScreen !== "question") return;
  if (!recorder.available() || !micReady) return; // no mic → teacher advances manually

  controller.setVoice("listening");
  let rec;
  try {
    rec = await recorder.record({ maxMs: 8000, silenceMs: 1500 });
  } catch {
    if (token === roundToken) controller.setVoice("asking");
    return;
  }
  if (token !== roundToken || currentScreen !== "question") return;

  controller.setVoice("checking");
  let transcript = "";
  try {
    transcript = (await recognize(rec.base64, rec.mime)).transcript;
  } catch {
    // network/ASR error — treat like a wrong attempt so the child can retry
  }
  if (token !== roundToken || currentScreen !== "question") return;

  if (transcript && isAnswerCorrect(transcript, round)) {
    controller.setVoice("checking");
    // correct → brief beat → jump to the lucky-number page
    window.setTimeout(() => {
      if (token === roundToken && currentScreen === "question") controller.next();
    }, 700);
  } else {
    controller.setVoice("wrong", transcript || null);
    // The character gently encourages the child in their own voice; only after that
    // clip finishes do we listen again (so we don't record the encouragement itself).
    audio.play(round.encourageAudio, () => {
      window.setTimeout(() => {
        if (token === roundToken && currentScreen === "question") void listenLoop(token, round);
      }, 600);
    });
  }
}

function startTurn(): void {
  if (currentScreen !== "standby") return;
  void ensureMic(); // user gesture → request mic permission for the session
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
