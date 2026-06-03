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
 * called with the live (growing) text for the on-screen caption. Stops on the first
 * final sentence, an error, or after maxMs.
 */
export async function recognizeOnceNative(
  onPartial?: (text: string) => void,
  maxMs = 15000,
  silenceMs = 2000,
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

  const hard = window.setTimeout(() => void finish(), maxMs);
  unlistens.push((() => window.clearTimeout(hard)) as UnlistenFn);
  unlistens.push((() => window.clearTimeout(silenceTimer)) as UnlistenFn);

  try {
    await invoke("asr_start"); // no initial silence timer → child gets up to maxMs to start
  } catch {
    void finish();
  }
  return result;
}
