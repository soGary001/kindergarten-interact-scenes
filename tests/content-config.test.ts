import { describe, it, expect } from "vitest";
import { CONTENT_CONFIG, enumerateAudioLines } from "../build-assets/content-config";

describe("CONTENT_CONFIG", () => {
  it("has all ten competition characters", () => {
    expect(CONTENT_CONFIG.characters.map((c) => c.id).sort())
      .toEqual(["boy", "brother", "brother2", "dad", "girl", "grandpa", "mom", "sister", "sister2", "teacher"]);
  });

  it("every character's scene exists", () => {
    const scenes = new Set(CONTENT_CONFIG.scenes.map((s) => s.id));
    for (const c of CONTENT_CONFIG.characters) expect(scenes.has(c.sceneId)).toBe(true);
  });

  it("every scene has exactly one (fixed) location", () => {
    for (const s of CONTENT_CONFIG.scenes) expect(s.locations).toHaveLength(1);
  });
});

describe("enumerateAudioLines", () => {
  it("produces one question line per item and 10 thanks lines per character", () => {
    const lines = enumerateAudioLines(CONTENT_CONFIG);
    const grandpaQ = lines.filter((l) => l.characterId === "grandpa" && l.kind === "question");
    const grandpaT = lines.filter((l) => l.characterId === "grandpa" && l.kind === "thanks");
    expect(grandpaQ).toHaveLength(1);
    expect(grandpaT).toHaveLength(10);
  });
});
