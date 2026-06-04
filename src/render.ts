import type { ViewModel } from "./app-controller";

const IMG = (file: string) => `/assets/img/${file}`; // served from public/ in dev and dist

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

// Voice sub-status shown under the speech bubble while on the question screen.
function voiceStatus(vm: ViewModel): string {
  switch (vm.voicePhase) {
    case "listening":
      return `<div class="voice voice-listening"><span class="mic-dot"></span>请回答<span class="voice-en">🎤 Speak now</span></div>`;
    case "checking":
      return `<div class="voice voice-checking">🤔 听一听…<span class="voice-en">Checking…</span></div>`;
    case "wrong":
      return `<div class="voice voice-wrong"><div class="encourage">没关系，再试一次！<span class="voice-en">Try again, you can do it! 💪</span></div></div>`;
    default:
      return "";
  }
}

// Live caption bar at the bottom of the screen showing what the child is saying.
function bottomCaption(vm: ViewModel): string {
  if (vm.voicePhase !== "listening" && vm.voicePhase !== "checking") return "";
  const t = vm.transcript ? escapeHtml(vm.transcript) : "";
  if (!t) {
    return `<div class="caption caption-empty">🎤 <span class="cap-dots"><i></i><i></i><i></i></span><span class="cap-hint">在听你说呀…</span></div>`;
  }
  return `<div class="caption"><span class="cap-emoji">🗣️</span><span class="cap-text">${t}</span></div>`;
}

function scatterShapes(): string {
  const dots = [
    "top:4%;left:6%;width:40px;height:40px;background:var(--yellow);animation:floaty 4s ease-in-out infinite",
    "top:3%;left:38%;width:24px;height:24px;background:var(--pink);animation:twinkle 2.6s ease-in-out infinite",
    "top:7%;right:7%;width:34px;height:34px;background:var(--purple);animation:floaty 5s ease-in-out infinite .5s",
    "top:33%;left:3%;width:30px;height:30px;background:var(--green);animation:floatx 4.5s ease-in-out infinite",
    "top:62%;right:4%;width:30px;height:30px;background:var(--cyan);animation:floaty 3.8s ease-in-out infinite .3s",
    "bottom:5%;left:28%;width:22px;height:22px;background:var(--cyan);animation:twinkle 3s ease-in-out infinite .4s",
    "bottom:6%;right:28%;width:30px;height:30px;background:var(--yellow);animation:floaty 4.2s ease-in-out infinite",
  ].map((s) => `<span class="shape dot" style="${s}"></span>`).join("");
  const squares = [
    "top:18%;right:5%;width:30px;height:30px;background:var(--pink);animation:spin 9s linear infinite",
    "bottom:15%;left:5%;width:26px;height:26px;background:var(--purple);animation:spin 11s linear infinite",
    "top:50%;left:7%;width:22px;height:22px;background:var(--yellow);animation:spin 8s linear infinite reverse",
  ].map((s) => `<span class="shape sq" style="${s}"></span>`).join("");
  const tris = [
    "bottom:9%;right:11%;animation:floaty 4s ease-in-out infinite",
    "top:13%;left:21%;animation:spin 12s linear infinite",
    "bottom:30%;right:6%;border-bottom-color:var(--pink);animation:floaty 5s ease-in-out infinite .6s",
  ].map((s) => `<span class="shape tri" style="${s}"></span>`).join("");
  const ring = `<span class="shape ring" style="top:42%;right:9%;width:30px;height:30px;animation:floaty 6s ease-in-out infinite"></span>`;
  return dots + squares + tris + ring;
}

export function renderView(root: HTMLElement, vm: ViewModel): void {
  if (vm.screen === "standby") {
    root.innerHTML = `
      <div class="screen">
        ${scatterShapes()}
        <div class="title">English Fun Time! 🎉</div>
        <p class="subtitle">英语欢乐时光<span class="sub-en">幼儿园英语口语比赛 · Kindergarten English Speaking Contest</span></p>
        <button class="btn-primary" data-action="start"><span class="btn-zh">▶ 开始</span><span class="btn-en">Start</span></button>
      </div>`;
    return;
  }

  const r = vm.round!;
  if (vm.screen === "question") {
    root.innerHTML = `
      <div class="screen">
        ${scatterShapes()}
        <div class="qrow">
          <div class="scene-stage">
            <img class="scene-bg" src="${IMG(r.scene.background)}" alt="">
            <span class="scene-item" style="left:${r.location.anchor.xPct}%;top:${r.location.anchor.yPct}%;width:${17 * Math.min(r.item.scale ?? 1, r.location.maxItemScale ?? Infinity)}%"><img src="${IMG(r.item.sprite)}" alt=""></span>
          </div>
          <div class="mascot">
            <img class="character" src="${IMG(r.character.portrait)}" alt="">
            <div class="bubble">
              <div class="bubble-en">🔊 ${r.questionText}</div>
            </div>
            ${voiceStatus(vm)}
          </div>
        </div>
        ${bottomCaption(vm)}
        <div class="hint">老师按 → 可跳过<span class="hint-en">Teacher: → to skip</span></div>
      </div>`;
    return;
  }

  // reward
  root.innerHTML = `
    <div class="screen">
      ${[..."🎊⭐🎈✨🌈"].map((c, i) =>
        `<span class="confetti" style="left:${(i + 1) * 16}%;animation-delay:${i * 0.3}s">${c}</span>`).join("")}
      <img class="character" style="position:static;width:140px" src="${IMG(r.character.portrait)}" alt="">
      <p class="reward-line"><span class="reward-en">Thank you! Here is your lucky number…</span><span class="reward-zh">谢谢你！这是你的幸运数字…</span></p>
      <div class="lucky">${r.luckyNumber}</div>
      <div class="hint">老师按 空格 / → 回到开始<span class="hint-en">Back to start (Space / →)</span></div>
    </div>`;
}
