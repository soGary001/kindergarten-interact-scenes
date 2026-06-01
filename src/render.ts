import type { ViewModel } from "./app-controller";

const IMG = (file: string) => `/assets/img/${file}`; // served from public/ in dev and dist

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
        <p class="subtitle">幼儿园英语口语比赛</p>
        <button class="btn-primary" data-action="start">▶ 开始 Start</button>
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
            <span class="scene-item" style="left:${r.location.anchor.xPct}%;top:${r.location.anchor.yPct}%;width:${17 * (r.item.scale ?? 1)}%"><img src="${IMG(r.item.sprite)}" alt=""></span>
          </div>
          <div class="mascot">
            <img class="character" src="${IMG(r.character.portrait)}" alt="">
            <div class="bubble">🔊 ${r.questionText}</div>
          </div>
        </div>
        <div class="hint">老师按 → / 空格 进入下一步</div>
      </div>`;
    return;
  }

  // reward
  root.innerHTML = `
    <div class="screen">
      ${[..."🎊⭐🎈✨🌈"].map((c, i) =>
        `<span class="confetti" style="left:${(i + 1) * 16}%;animation-delay:${i * 0.3}s">${c}</span>`).join("")}
      <img class="character" style="position:static;width:140px" src="${IMG(r.character.portrait)}" alt="">
      <p class="subtitle" style="font-size:1.6rem;color:#7B1FA2">Thank you! Here is your lucky number…</p>
      <div class="lucky">${r.luckyNumber}</div>
      <div class="hint">老师按 → / 空格 回到开始</div>
    </div>`;
}
