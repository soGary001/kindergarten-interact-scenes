import { describe, it, expect } from "vitest";
import { buildManifest } from "../build-assets/generate";
import { CONTENT_CONFIG, enumerateAudioLines } from "../build-assets/content-config";
import { loadContent } from "../src/content";

describe("buildManifest", () => {
  it("produces a Content manifest that passes loadContent validation", () => {
    const lines = enumerateAudioLines(CONTENT_CONFIG);
    const audioByLine = new Map(lines.map((l) => [`${l.characterId}:${l.kind}:${l.key}`, l.filename]));
    const manifest = buildManifest(CONTENT_CONFIG, audioByLine);
    expect(() => loadContent(manifest)).not.toThrow();
  });

  it("wires question audio filenames per item and thanks audio per number", () => {
    const lines = enumerateAudioLines(CONTENT_CONFIG);
    const audioByLine = new Map(lines.map((l) => [`${l.characterId}:${l.kind}:${l.key}`, l.filename]));
    const manifest = buildManifest(CONTENT_CONFIG, audioByLine);
    const grandpa = manifest.characters.find((c) => c.id === "grandpa")!;
    expect(grandpa.questionAudio.glasses).toBe("grandpa-q-glasses.wav");
    expect(grandpa.thanksAudio["7"]).toBe("grandpa-t-7.wav");
  });
});
