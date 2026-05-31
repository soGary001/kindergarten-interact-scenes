import { describe, it, expect, vi } from "vitest";
import { MimoClient } from "../build-assets/mimo-client";

describe("MimoClient.chat", () => {
  it("posts to /chat/completions and returns the message content", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "Where are my glasses?" } }] }),
    });
    const c = new MimoClient({ baseUrl: "https://x/v1", apiKey: "k", fetchImpl: fetchMock as any });
    const text = await c.chat("model-x", "hi");
    expect(text).toBe("Where are my glasses?");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://x/v1/chat/completions");
    expect((init.headers as any).Authorization).toBe("Bearer k");
  });

  it("throws on non-ok response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => "err" });
    const c = new MimoClient({ baseUrl: "https://x/v1", apiKey: "k", fetchImpl: fetchMock as any });
    await expect(c.chat("m", "hi")).rejects.toThrow(/500/);
  });
});

describe("MimoClient.tts", () => {
  it("posts to /chat/completions with user(description)+assistant(text) and decodes base64 audio", async () => {
    const wavBytes = new Uint8Array([0x52, 0x49, 0x46, 0x46]); // "RIFF"
    const b64 = Buffer.from(wavBytes).toString("base64");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { audio: { data: b64 } } }] }),
    });
    const c = new MimoClient({ baseUrl: "https://x/v1", apiKey: "k", fetchImpl: fetchMock as any });
    const out = await c.tts("mimo-v2.5-tts-voicedesign", "Hi!", "a warm grandma voice");
    expect(new Uint8Array(out)).toEqual(wavBytes);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://x/v1/chat/completions");
    const body = JSON.parse((init as any).body);
    expect(body.model).toBe("mimo-v2.5-tts-voicedesign");
    expect(body.messages).toEqual([
      { role: "user", content: "a warm grandma voice" },
      { role: "assistant", content: "Hi!" },
    ]);
  });

  it("omits the user(description) message when no voice description is given (plain tts)", async () => {
    const b64 = Buffer.from(new Uint8Array([1])).toString("base64");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { audio: { data: b64 } } }] }),
    });
    const c = new MimoClient({ baseUrl: "https://x/v1", apiKey: "k", fetchImpl: fetchMock as any });
    await c.tts("mimo-v2.5-tts", "Hi!");
    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.messages).toEqual([{ role: "assistant", content: "Hi!" }]);
  });

  it("throws when no audio data is returned", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: {} }] }) });
    const c = new MimoClient({ baseUrl: "https://x/v1", apiKey: "k", fetchImpl: fetchMock as any });
    await expect(c.tts("m", "hi", "v")).rejects.toThrow(/audio/i);
  });
});
