import type { Content, Round } from "./types";
import { buildQuestionText, buildQuestionTextZh, buildExpectedAnswer } from "./answer";

type Rng = () => number;

function pick<T>(arr: T[], rng: Rng): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function pickLuckyNumber(rng: Rng): number {
  return Math.floor(rng() * 10) + 1; // 1..10
}

export function selectRound(content: Content, rng: Rng = Math.random): Round {
  const character = pick(content.characters, rng);
  const item = pick(character.items, rng);
  const scene = content.scenes.find((s) => s.id === character.sceneId)!;
  const location = pick(scene.locations, rng);
  const luckyNumber = pickLuckyNumber(rng);
  return {
    character,
    scene,
    item,
    location,
    luckyNumber,
    questionText: buildQuestionText(item),
    questionTextZh: buildQuestionTextZh(item),
    expectedAnswer: buildExpectedAnswer(item, location),
    questionAudio: character.questionAudio[item.id] ?? "",
    thanksAudio: character.thanksAudio[String(luckyNumber)] ?? "",
  };
}
