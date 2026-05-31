import { describe, it, expect } from "vitest";
import { loadContent } from "../src/content";

const valid = {
  scenes: [
    { id: "s1", background: "bg.svg", locations: [
      { id: "table", labelEn: "table", preposition: "on", anchor: { xPct: 10, yPct: 20 } },
    ] },
  ],
  characters: [
    { id: "grandma", nameEn: "Grandma", portrait: "g.svg", sceneId: "s1",
      items: [{ id: "glasses", word: "glasses", isPlural: true, sprite: "i.svg" }],
      questionAudio: { glasses: "" }, thanksAudio: { "1": "" } },
  ],
};

describe("loadContent", () => {
  it("parses a valid manifest", () => {
    const c = loadContent(valid);
    expect(c.characters[0].id).toBe("grandma");
    expect(c.scenes[0].locations[0].preposition).toBe("on");
  });

  it("throws when a character references a missing scene", () => {
    const bad = structuredClone(valid);
    bad.characters[0].sceneId = "nope";
    expect(() => loadContent(bad)).toThrow(/scene/i);
  });

  it("throws when a character has no items", () => {
    const bad = structuredClone(valid);
    bad.characters[0].items = [];
    expect(() => loadContent(bad)).toThrow(/item/i);
  });
});
