import { describe, it, expect } from "vitest";
import { buildQuestionText, buildExpectedAnswer } from "../src/answer";
import type { ItemDef, LocationDef } from "../src/types";

const glasses: ItemDef = { id: "glasses", word: "glasses", isPlural: true, sprite: "" };
const football: ItemDef = { id: "football", word: "football", isPlural: false, sprite: "" };
const windowsill: LocationDef = { id: "windowsill", labelEn: "windowsill", preposition: "on", anchor: { xPct: 0, yPct: 0 } };
const wardrobe: LocationDef = { id: "wardrobe", labelEn: "wardrobe", preposition: "in", anchor: { xPct: 0, yPct: 0 } };

describe("buildQuestionText", () => {
  it("uses 'are' for plural items", () => {
    expect(buildQuestionText(glasses)).toBe("Where are my glasses?");
  });
  it("uses 'is' for singular items", () => {
    expect(buildQuestionText(football)).toBe("Where is my football?");
  });
});

describe("buildExpectedAnswer", () => {
  it("plural + on", () => {
    expect(buildExpectedAnswer(glasses, windowsill)).toBe("They are on the windowsill.");
  });
  it("singular + in", () => {
    expect(buildExpectedAnswer(football, wardrobe)).toBe("It's in the wardrobe.");
  });
});
