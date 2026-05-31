import type { ViewModel } from "./app-controller";

const IMG = (file: string) => `/assets/img/${file}`; // served from public/ in dev and dist

function scatterShapes(): string {
  return `
    <span class="shape dot" style="top:6%;left:8%;width:42px;height:42px;background:var(--yellow)"></span>
    <span class="shape tri" style="bottom:10%;right:9%"></span>
    <span class="shape dot" style="top:14%;right:16%;width:28px;height:28px;background:var(--purple)"></span>
    <span class="shape dot" style="bottom:16%;left:14%;width:34px;height:34px;background:var(--green)"></span>`;
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
        <div class="scene-stage">
          <img class="scene-bg" src="${IMG(r.scene.background)}" alt="">
          <img class="scene-item" src="${IMG(r.item.sprite)}" alt=""
               style="left:${r.location.anchor.xPct}%;top:${r.location.anchor.yPct}%">
          <img class="character" src="${IMG(r.character.portrait)}" alt="">
          <div class="bubble">🔊 ${r.questionText}</div>
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
