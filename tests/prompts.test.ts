import { describe, it, expect } from "vitest";
import { questionPrompt, thanksPrompt } from "../build-assets/prompts";

describe("prompts", () => {
  it("question prompt mentions persona, item, and asks for one short line", () => {
    const p = questionPrompt("a warm, gentle grandmother", "glasses", true);
    expect(p).toMatch(/grandmother/);
    expect(p).toMatch(/glasses/);
    expect(p).toMatch(/Where are/);
  });
  it("thanks prompt includes the lucky number and a thank-you", () => {
    const p = thanksPrompt("an energetic, cheerful little boy", 7);
    expect(p).toMatch(/little boy/);
    expect(p).toMatch(/7/);
    expect(p).toMatch(/lucky number/i);
  });
});
