import { describe, it, expect } from "vitest";
import { CONTENT_CONFIG, enumerateAudioLines } from "../build-assets/content-config";

describe("CONTENT_CONFIG", () => {
  it("has all five characters", () => {
    expect(CONTENT_CONFIG.characters.map((c) => c.id).sort())
      .toEqual(["boy", "dad", "girl", "grandma", "mom"]);
  });

  it("every character's scene exists", () => {
    const scenes = new Set(CONTENT_CONFIG.scenes.map((s) => s.id));
    for (const c of CONTENT_CONFIG.characters) expect(scenes.has(c.sceneId)).toBe(true);
  });
});

describe("enumerateAudioLines", () => {
  it("produces one question line per item and 10 thanks lines per character", () => {
    const lines = enumerateAudioLines(CONTENT_CONFIG);
    const grandmaQ = lines.filter((l) => l.characterId === "grandma" && l.kind === "question");
    const grandmaT = lines.filter((l) => l.characterId === "grandma" && l.kind === "thanks");
    expect(grandmaQ).toHaveLength(1);
    expect(grandmaT).toHaveLength(10);
  });
});
