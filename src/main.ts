import { loadContent } from "./content";
import { AppController, type ViewModel } from "./app-controller";
import { renderView } from "./render";
import { AudioPlayer } from "./audio-player";
import rawContent from "./content.json";

const root = document.querySelector<HTMLDivElement>("#app")!;
const content = loadContent(rawContent);
const audio = new AudioPlayer();

let currentScreen: ViewModel["screen"] = "standby";

const controller = new AppController(content, Math.random, (vm: ViewModel) => {
  currentScreen = vm.screen;
  renderView(root, vm);
  if (vm.screen === "question") audio.play(vm.round!.questionAudio);
  else if (vm.screen === "reward") audio.play(vm.round!.thanksAudio);
  else audio.stop();
});

// Click delegation: the Start button (a real user gesture, so audio is allowed to play).
root.addEventListener("click", (e) => {
  const target = (e.target as HTMLElement).closest("[data-action='start']");
  if (target) controller.start();
});

// Operator keyboard controls: one press = one transition.
window.addEventListener("keydown", (e) => {
  if (e.key === " " || e.key === "Enter" || e.key === "ArrowRight") {
    e.preventDefault();
    if (currentScreen === "standby") controller.start();
    else controller.next();
  } else if (e.key === "Escape") {
    controller.toStandby();
  }
});

controller.init();
