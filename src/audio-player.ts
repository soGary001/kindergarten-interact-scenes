const AUDIO = (file: string) => `/assets/audio/${file}`; // served from public/ in dev and dist

export class AudioPlayer {
  private current: HTMLAudioElement | null = null;

  async play(file: string): Promise<void> {
    this.stop();
    if (!file) return;
    const el = new Audio(AUDIO(file));
    this.current = el;
    try {
      await el.play();
    } catch {
      // Missing file or autoplay block — degrade silently; subtitle still shows.
    }
  }

  stop(): void {
    if (this.current) {
      this.current.pause();
      this.current = null;
    }
  }
}
