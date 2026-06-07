const AUDIO = (file: string) => `/assets/audio/${file}`; // served from public/ in dev and dist

export class AudioPlayer {
  private current: HTMLAudioElement | null = null;
  private playing = false;

  /** True while a character clip is actually sounding — used to never record over it. */
  isPlaying(): boolean {
    return this.playing;
  }

  // `onEnded` fires when playback finishes — or right away if the clip is missing or
  // autoplay is blocked — so callers can chain the next step (e.g. start recording).
  async play(file: string, onEnded?: () => void): Promise<void> {
    this.stop();
    if (!file) {
      onEnded?.();
      return;
    }
    const el = new Audio(AUDIO(file));
    this.current = el;
    this.playing = true;
    // Clear the playing flag the instant playback ends, BEFORE the caller's onEnded runs,
    // so anything chained off onEnded (e.g. showing the record button) sees isPlaying()===false.
    el.addEventListener("ended", () => { this.playing = false; }, { once: true });
    if (onEnded) el.addEventListener("ended", onEnded, { once: true });
    try {
      await el.play();
    } catch {
      // Missing file or autoplay block — degrade silently; subtitle still shows.
      this.playing = false;
      onEnded?.();
    }
  }

  stop(): void {
    if (this.current) {
      this.current.pause();
      this.current = null;
    }
    this.playing = false;
  }
}
