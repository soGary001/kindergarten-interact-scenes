export interface MimoOptions {
  baseUrl: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
}

export class MimoClient {
  private fetchImpl: typeof fetch;
  constructor(private opts: MimoOptions) {
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  private async post(body: unknown): Promise<any> {
    const res = await this.fetchImpl(`${this.opts.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.opts.apiKey}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`request failed: ${res.status} ${(await res.text?.()) ?? ""}`);
    return res.json();
  }

  /** Text generation (mimo-v2.5). Returns the assistant message content. */
  async chat(model: string, prompt: string): Promise<string> {
    const data = await this.post({ model, messages: [{ role: "user", content: prompt }], temperature: 0.8 });
    return (data.choices?.[0]?.message?.content ?? "").trim();
  }

  /**
   * TTS — runs through /chat/completions (confirmed live).
   * For voicedesign, pass `voiceDescription`; it becomes a user message before the
   * assistant message that holds the text to speak. Returns decoded WAV bytes.
   */
  async tts(model: string, text: string, voiceDescription?: string): Promise<ArrayBuffer> {
    const messages = voiceDescription
      ? [{ role: "user", content: voiceDescription }, { role: "assistant", content: text }]
      : [{ role: "assistant", content: text }];
    const data = await this.post({ model, messages });
    const b64: string | undefined = data.choices?.[0]?.message?.audio?.data;
    if (!b64) throw new Error("tts: no audio data in response");
    const buf = Buffer.from(b64, "base64");
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }
}
