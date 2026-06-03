import type { Content, Round } from "./types";
import { selectRound } from "./selection";

export type Screen = "standby" | "question" | "reward";

// Voice sub-phase while on the question screen:
//  asking → (audio plays) → listening (recording) → checking (ASR) → wrong (retry) | correct→next
export type VoicePhase = "asking" | "listening" | "checking" | "wrong";

export interface ViewModel {
  screen: Screen;
  round: Round | null;
  voicePhase?: VoicePhase;
  transcript?: string | null;
}

type Rng = () => number;
type OnView = (v: ViewModel) => void;

export class AppController {
  private screen: Screen = "standby";
  private round: Round | null = null;
  private voicePhase: VoicePhase = "asking";
  private transcript: string | null = null;

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
    this.voicePhase = "asking";
    this.transcript = null;
    this.emit();
  }

  /** Update the voice sub-phase (recording / checking / wrong) on the question screen. */
  setVoice(phase: VoicePhase, transcript: string | null = null): void {
    if (this.screen !== "question") return;
    this.voicePhase = phase;
    this.transcript = transcript;
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
    this.resetVoice();
    this.emit();
  }

  toStandby(): void {
    this.screen = "standby";
    this.round = null;
    this.resetVoice();
    this.emit();
  }

  private resetVoice(): void {
    this.voicePhase = "asking";
    this.transcript = null;
  }

  private emit(): void {
    this.onView({
      screen: this.screen,
      round: this.round,
      voicePhase: this.voicePhase,
      transcript: this.transcript,
    });
  }
}
