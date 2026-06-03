import { describe, it, expect } from "vitest";
import { isAnswerCorrect } from "../src/judge";
import type { Round } from "../src/types";

function roundWithLocation(labelEn: string): Round {
  return {
    character: {} as any,
    scene: {} as any,
    item: {} as any,
    location: { id: "x", labelEn, preposition: "on", anchor: { xPct: 0, yPct: 0 } },
    luckyNumber: 1,
    questionText: "",
    questionTextZh: "",
    expectedAnswer: "",
    questionAudio: "",
    thanksAudio: "",
    encourageAudio: "",
  };
}

describe("isAnswerCorrect (lenient)", () => {
  it("accepts a full correct sentence", () => {
    expect(isAnswerCorrect("They are on the windowsill.", roundWithLocation("windowsill"))).toBe(true);
  });
  it("accepts just the location word, any case", () => {
    expect(isAnswerCorrect("WINDOWSILL", roundWithLocation("windowsill"))).toBe(true);
  });
  it("rejects a wrong location", () => {
    expect(isAnswerCorrect("It's on the sofa.", roundWithLocation("windowsill"))).toBe(false);
  });
  it("accepts the last word of a multi-word location", () => {
    expect(isAnswerCorrect("on the cabinet", roundWithLocation("TV cabinet"))).toBe(true);
  });
  it("rejects empty / unrelated speech", () => {
    expect(isAnswerCorrect("um I don't know", roundWithLocation("wardrobe"))).toBe(false);
  });
});
