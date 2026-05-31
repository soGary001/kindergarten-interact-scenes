import type { Content, Round } from "./types";
import { selectRound } from "./selection";

export type Screen = "standby" | "question" | "reward";

export interface ViewModel {
  screen: Screen;
  round: Round | null;
}

type Rng = () => number;
type OnView = (v: ViewModel) => void;

export class AppController {
  private screen: Screen = "standby";
  private round: Round | null = null;

  constructor(
    private content: Content,
    private rng: Rng = Math.random,
    private onView: OnView = () => {},
  ) {}

  init(): void {
    this.emit();
  }

  start(): void {
    if (this.screen !== "standby") return;
    this.round = selectRound(this.content, this.rng);
    this.screen = "question";
    this.emit();
  }

  next(): void {
    if (this.screen === "question") {
      this.screen = "reward";
    } else if (this.screen === "reward") {
      this.screen = "standby";
      this.round = null;
    } else {
      return; // standby ignores next()
    }
    this.emit();
  }

  toStandby(): void {
    this.screen = "standby";
    this.round = null;
    this.emit();
  }

  private emit(): void {
    this.onView({ screen: this.screen, round: this.round });
  }
}
