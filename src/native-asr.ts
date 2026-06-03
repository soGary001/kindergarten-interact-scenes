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
  maxMs = 9000,
): Promise<string> {
  let finalText = "";
  let done = false;
  const unlistens: UnlistenFn[] = [];
  let resolveFn!: (s: string) => void;
  const result = new Promise<string>((r) => (resolveFn = r));

  const finish = async () => {
    if (done) return;
    done = true;
    try {
      await invoke("asr_stop");
    } catch {
      /* ignore */
    }
    unlistens.forEach((u) => u());
    resolveFn(finalText.trim());
  };

  unlistens.push(
    await listen<string>("asr://partial", (e) => {
      onPartial?.((finalText + " " + e.payload).trim());
    }),
  );
  unlistens.push(
    await listen<string>("asr://final", (e) => {
      finalText = (finalText + " " + e.payload).trim();
      onPartial?.(finalText);
      void finish();
    }),
  );
  unlistens.push(await listen<string>("asr://error", () => void finish()));

  const timer = window.setTimeout(() => void finish(), maxMs);
  unlistens.push((() => window.clearTimeout(timer)) as UnlistenFn);

  try {
    await invoke("asr_start");
  } catch {
    void finish();
  }
  return result;
}
