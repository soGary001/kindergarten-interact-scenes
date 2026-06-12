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

describe("isAnswerCorrect (requires a complete sentence)", () => {
  it("passes a full sentence: subject + be-verb + preposition + location", () => {
    expect(isAnswerCorrect("It's on the sofa.", round("sofa", "sofa"))).toBe(true);
    expect(isAnswerCorrect("They are on the table.", round("table", "table"))).toBe(true);
    expect(isAnswerCorrect("It is under the pillow.", round("pillow", "pillow"))).toBe(true);
  });
  it("tolerates apostrophe-less ASR (its / theyre)", () => {
    expect(isAnswerCorrect("its on the sofa", round("sofa", "sofa"))).toBe(true);
    expect(isAnswerCorrect("theyre in the wardrobe", round("wardrobe", "wardrobe"))).toBe(true);
  });
  it("any preposition is fine (in/on/near) as long as it's a sentence", () => {
    for (const p of ["it's on the sofa", "it's in the sofa", "it is near the sofa"]) {
      expect(isAnswerCorrect(p, round("sofa", "sofa"))).toBe(true);
    }
  });
  it("rejects the bare location word", () => {
    expect(isAnswerCorrect("SOFA", round("sofa", "sofa"))).toBe(false);
  });
  it("rejects a fragment with no be-verb (e.g. 'on the sofa')", () => {
    expect(isAnswerCorrect("on the sofa", round("sofa", "sofa"))).toBe(false);
  });
  it("rejects a sentence with no preposition (e.g. \"it's the sofa\")", () => {
    expect(isAnswerCorrect("it's the sofa", round("sofa", "sofa"))).toBe(false);
  });
  it("accepts kid synonyms inside a full sentence (couch=sofa, rug=carpet, closet=wardrobe)", () => {
    expect(isAnswerCorrect("it's on the couch", round("sofa", "sofa"))).toBe(true);
    expect(isAnswerCorrect("it is on the rug", round("carpet", "carpet"))).toBe(true);
    expect(isAnswerCorrect("they are in the closet", round("wardrobe", "wardrobe"))).toBe(true);
  });
  it("accepts the last word of a multi-word label", () => {
    expect(isAnswerCorrect("it's on the cabinet", round("tv-cabinet", "TV cabinet"))).toBe(true);
  });
  it("rejects a full sentence naming the wrong location", () => {
    expect(isAnswerCorrect("It's on the sofa.", round("table", "table"))).toBe(false);
  });
  it("rejects unrelated speech", () => {
    expect(isAnswerCorrect("um I don't know", round("wardrobe", "wardrobe"))).toBe(false);
  });
});
