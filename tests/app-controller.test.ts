import { describe, it, expect, vi } from "vitest";
import { AppController } from "../src/app-controller";
import { loadContent } from "../src/content";
import sample from "./fixtures/sample-content.json";

const content = loadContent(sample);

describe("AppController", () => {
  it("starts in STANDBY and emits a standby view", () => {
    const views: any[] = [];
    const c = new AppController(content, () => 0, (v) => views.push(v));
    c.init();
    expect(views.at(-1).screen).toBe("standby");
  });

  it("start() -> QUESTION with a round, next() -> REWARD, next() -> STANDBY", () => {
    const views: any[] = [];
    const c = new AppController(content, () => 0, (v) => views.push(v));
    c.init();

    c.start();
    expect(views.at(-1).screen).toBe("question");
    expect(views.at(-1).round.character.id).toBe("grandma");

    c.next();
    expect(views.at(-1).screen).toBe("reward");
    expect(views.at(-1).round.luckyNumber).toBe(1);

    c.next();
    expect(views.at(-1).screen).toBe("standby");
  });

  it("start() ignores extra calls while not in standby", () => {
    const onView = vi.fn();
    const c = new AppController(content, () => 0, onView);
    c.init();
    c.start();
    const countAfterStart = onView.mock.calls.length;
    c.start(); // should be a no-op in QUESTION
    expect(onView.mock.calls.length).toBe(countAfterStart);
  });
});
