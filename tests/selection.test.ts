import { describe, it, expect } from "vitest";
import { selectRound, pickLuckyNumber } from "../src/selection";
import { loadContent } from "../src/content";
import sample from "./fixtures/sample-content.json";

const content = loadContent(sample);

// Deterministic RNG: returns a fixed sequence of values in [0,1).
function seqRng(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

describe("pickLuckyNumber", () => {
  it("maps 0 -> 1 and ~0.99 -> 10, always within 1..10", () => {
    expect(pickLuckyNumber(() => 0)).toBe(1);
    expect(pickLuckyNumber(() => 0.999)).toBe(10);
  });
});

describe("selectRound", () => {
  it("produces a self-consistent round from the manifest", () => {
    const r = selectRound(content, seqRng([0, 0, 0, 0]));
    expect(r.character.id).toBe(content.characters[0].id);
    expect(r.scene.id).toBe(r.character.sceneId);
    expect(r.character.items).toContain(r.item);
    expect(r.scene.locations).toContain(r.location);
    expect(r.luckyNumber).toBe(1);
    expect(r.questionText).toBe(`Where ${r.item.isPlural ? "are" : "is"} my ${r.item.word}?`);
  });

  it("selects the boy + toys + grass with steered rng", () => {
    const r = selectRound(content, seqRng([0.5, 0.6, 0.3, 0.5]));
    expect(r.character.id).toBe("boy");
    expect(r.item.id).toBe("toys");
    expect(r.location.id).toBe("grass");
    expect(r.expectedAnswer).toBe("They are on the grass.");
  });
});
