// Native speech recognition for the packaged (Tauri) apps: the Rust side captures the
// mic with cpal and streams to Alibaba's real-time ASR, emitting asr://partial/final
// events. This avoids the WebView getUserMedia limitation. On the web we don't use this
// (see asr-client + recorder instead).
import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export function isNative(): boolean {
  try {
    return isTauri();
  } catch {
    return false;
  }
}

/**
 * Record one spoken answer natively and resolve with the transcript. `onPartial` is
 * called with the live (growing) text for the on-screen caption. `onReady` fires once
 * the mic is actually live (the WebSocket connected) — only THEN does the maxMs ceiling
 * start, so a slow connection (e.g. Windows reaching Alibaba) doesn't eat the child's
 * speaking window and they aren't prompted to "speak now" before the mic exists.
 * Stops after `silenceMs` of silence (once the child has started), an error, or after
 * maxMs of actual listening. If the connection can't be established within connectMs,
 * resolves empty so the caller can retry.
 */
export async function recognizeOnceNative(
  onPartial?: (text: string) => void,
  maxMs = 15000,
  silenceMs = 2000,
  onReady?: () => void,
  connectMs = 12000,
): Promise<string> {
  let finalText = ""; // finalized sentences so far
  let partial = ""; // current in-progress sentence
  let done = false;
  const unlistens: UnlistenFn[] = [];
  let resolveFn!: (s: string) => void;
  const result = new Promise<string>((r) => (resolveFn = r));

  const text = () => (finalText + " " + partial).trim();

  let silenceTimer = 0;
  // Only stop after the child PAUSES for silenceMs — never on the first sentence end,
  // so a mid-sentence pause doesn't cut them off. (maxMs is the hard ceiling.)
  const bump = () => {
    window.clearTimeout(silenceTimer);
    silenceTimer = window.setTimeout(() => void finish(), silenceMs);
  };

  const finish = async () => {
    if (done) return;
    done = true;
    window.clearTimeout(silenceTimer);
    try {
      await invoke("asr_stop");
    } catch {
      /* ignore */
    }
    // brief grace so a trailing final (flushed by finish-task) is captured
    await new Promise((r) => window.setTimeout(r, 300));
    unlistens.forEach((u) => u());
    resolveFn(text());
  };

  unlistens.push(
    await listen<string>("asr://partial", (e) => {
      partial = e.payload;
      onPartial?.(text());
      bump();
    }),
  );
  unlistens.push(
    await listen<string>("asr://final", (e) => {
      finalText = (finalText + " " + e.payload).trim();
      partial = "";
      onPartial?.(text());
      bump();
    }),
  );
  unlistens.push(await listen<string>("asr://error", () => void finish()));
  unlistens.push((() => window.clearTimeout(silenceTimer)) as UnlistenFn);

  // Connect the WebSocket + start the mic. This resolves only once capture is actually
  // live, which can take a few seconds on a slow network. Guard it with connectMs so a
  // hung connection doesn't block the turn forever.
  try {
    await Promise.race([
      invoke("asr_start"),
      new Promise((_, reject) =>
        window.setTimeout(() => reject(new Error("asr-connect-timeout")), connectMs),
      ),
    ]);
  } catch {
    void finish();
    return result;
  }
  if (done) return result; // turn was cancelled while connecting

  // Mic is live now: tell the caller to show "speak now", and ONLY NOW arm the hard
  // ceiling so connection latency never counts against the child's speaking time.
  onReady?.();
  const hard = window.setTimeout(() => void finish(), maxMs);
  unlistens.push((() => window.clearTimeout(hard)) as UnlistenFn);
  return result;
}
