// Microphone recorder that captures mono PCM, auto-stops after a pause, and encodes
// a small 16 kHz WAV (base64) — the format DashScope ASR accepts directly.

export interface Recording {
  base64: string;
  mime: string;
}

const TARGET_RATE = 16000;

export class Recorder {
  private stream: MediaStream | null = null;

  /** Request mic permission once (call on a user gesture, e.g. the Start button). */
  async ensurePermission(): Promise<void> {
    if (this.stream) return;
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  }

  available(): boolean {
    return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
  }

  /**
   * Record until ~silenceMs of quiet *after* the child has spoken, or maxMs total.
   * Resolves with a 16 kHz mono WAV (base64, no data: prefix).
   */
  async record(opts: { maxMs?: number; silenceMs?: number } = {}): Promise<Recording> {
    const maxMs = opts.maxMs ?? 8000;
    const silenceMs = opts.silenceMs ?? 1500;
    await this.ensurePermission();
    const stream = this.stream!;
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx: AudioContext = new Ctx();
    const source = ctx.createMediaStreamSource(stream);
    const node = ctx.createScriptProcessor(4096, 1, 1);
    const chunks: Float32Array[] = [];
    let sawSpeech = false;
    let lastLoud = performance.now();
    const start = performance.now();

    return await new Promise<Recording>((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        node.disconnect();
        source.disconnect();
        void ctx.close();
        const pcm = mergeChunks(chunks);
        const wav = encodeWav(downsample(pcm, ctx.sampleRate, TARGET_RATE), TARGET_RATE);
        resolve({ base64: bytesToBase64(wav), mime: "audio/wav" });
      };
      node.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        chunks.push(new Float32Array(input));
        let sum = 0;
        for (let i = 0; i < input.length; i++) sum += input[i] * input[i];
        const rms = Math.sqrt(sum / input.length);
        const now = performance.now();
        if (rms > 0.02) {
          sawSpeech = true;
          lastLoud = now;
        }
        if (now - start > maxMs) finish();
        else if (sawSpeech && now - lastLoud > silenceMs) finish();
      };
      source.connect(node);
      node.connect(ctx.destination);
    });
  }
}

function mergeChunks(chunks: Float32Array[]): Float32Array {
  let len = 0;
  for (const c of chunks) len += c.length;
  const out = new Float32Array(len);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

function downsample(input: Float32Array, from: number, to: number): Float32Array {
  if (to >= from) return input;
  const ratio = from / to;
  const outLen = Math.floor(input.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) out[i] = input[Math.floor(i * ratio)];
  return out;
}

function encodeWav(samples: Float32Array, rate: number): Uint8Array {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buf);
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeStr(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let off = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    off += 2;
  }
  return new Uint8Array(buf);
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}
