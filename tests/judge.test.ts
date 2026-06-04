import { describe, it, expect } from "vitest";
import { isAnswerCorrect } from "../src/judge";
import type { Round } from "../src/types";

function round(locationId: string, labelEn: string): Round {
  return {
    character: {} as any,
    scene: {} as any,
    item: {} as any,
    location: { id: locationId, labelEn, preposition: "on", anchor: { xPct: 0, yPct: 0 } },
    luckyNumber: 1,
    questionText: "",
    questionTextZh: "",
    expectedAnswer: "",
    questionAudio: "",
    thanksAudio: "",
    encourageAudio: "",
  };
}

describe("isAnswerCorrect (kindergarten-lenient)", () => {
  it("passes a full correct sentence", () => {
    expect(isAnswerCorrect("They are on the windowsill.", round("windowsill", "windowsill"))).toBe(true);
  });
  it("passes just the location word, any case", () => {
    expect(isAnswerCorrect("SOFA", round("sofa", "sofa"))).toBe(true);
  });
  it("ignores the preposition — in/on/near all pass", () => {
    for (const p of ["on the sofa", "in the sofa", "near the sofa", "sofa"]) {
      expect(isAnswerCorrect(p, round("sofa", "sofa"))).toBe(true);
    }
  });
  it("accepts kid synonyms (couch=sofa, rug=carpet, closet=wardrobe)", () => {
    expect(isAnswerCorrect("it's on the couch", round("sofa", "sofa"))).toBe(true);
    expect(isAnswerCorrect("on the rug", round("carpet", "carpet"))).toBe(true);
    expect(isAnswerCorrect("in the closet", round("wardrobe", "wardrobe"))).toBe(true);
  });
  it("tolerates split words (window sill == windowsill)", () => {
    expect(isAnswerCorrect("it's on the window sill", round("windowsill", "windowsill"))).toBe(true);
  });
  it("accepts the last word of a multi-word label", () => {
    expect(isAnswerCorrect("on the cabinet", round("tv-cabinet", "TV cabinet"))).toBe(true);
  });
  it("rejects a wrong location", () => {
    expect(isAnswerCorrect("It's on the sofa.", round("windowsill", "windowsill"))).toBe(false);
  });
  it("rejects unrelated speech", () => {
    expect(isAnswerCorrect("um I don't know", round("wardrobe", "wardrobe"))).toBe(false);
  });
});
