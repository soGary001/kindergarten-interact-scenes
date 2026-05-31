// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { renderView } from "../src/render";
import { loadContent } from "../src/content";
import { selectRound } from "../src/selection";
import sample from "./fixtures/sample-content.json";

const content = loadContent(sample);

describe("renderView", () => {
  let root: HTMLElement;
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    root = document.getElementById("app")!;
  });

  it("renders a Start button on standby", () => {
    renderView(root, { screen: "standby", round: null });
    expect(root.querySelector(".btn-primary")).not.toBeNull();
  });

  it("renders the question text and item sprite on question screen", () => {
    const round = selectRound(content, () => 0); // grandma + glasses + table
    renderView(root, { screen: "question", round });
    expect(root.querySelector(".bubble")!.textContent).toContain("Where are my glasses?");
    const item = root.querySelector(".scene-item") as HTMLElement;
    expect(item.style.left).toBe("20%"); // table anchor xPct
  });

  it("renders the lucky number on reward screen", () => {
    const round = selectRound(content, () => 0);
    renderView(root, { screen: "reward", round });
    expect(root.querySelector(".lucky")!.textContent).toBe(String(round.luckyNumber));
  });
});
