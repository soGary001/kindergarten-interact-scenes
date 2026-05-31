// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AudioPlayer } from "../src/audio-player";

describe("AudioPlayer", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("does nothing when the clip filename is empty", async () => {
    const player = new AudioPlayer();
    await expect(player.play("")).resolves.toBeUndefined();
  });

  it("creates and plays an Audio element for a real filename", async () => {
    const playSpy = vi
      .spyOn(HTMLMediaElement.prototype, "play")
      .mockResolvedValue(undefined as unknown as void);
    const player = new AudioPlayer();
    await player.play("grandma-q-glasses.wav");
    expect(playSpy).toHaveBeenCalledOnce();
  });

  it("swallows playback errors (e.g. missing file) without throwing", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockRejectedValue(new Error("no file"));
    const player = new AudioPlayer();
    await expect(player.play("missing.wav")).resolves.toBeUndefined();
  });
});
