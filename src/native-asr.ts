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

/** A live recording the caller stops by hand (push-to-talk). `stop()` resolves the transcript. */
export interface RecHandle {
  stop(): Promise<string>;
}

/**
 * Start a manually-controlled native recording (push-to-talk). Connects the WebSocket +
 * mic and resolves ONLY once capture is actually live — so the UI can wait before showing
 * "speak now" (no talking into a not-yet-live mic) and there is NO timer at all: the child
 * speaks as long as they like and the caller decides when to stop via `stop()`. `onPartial`
 * streams the growing transcript for the on-screen caption. Rejects if the connection can't
 * be established within connectMs, so the caller can return to the tap-to-speak button.
 */
export async function startNativeRec(
  onPartial?: (text: string) => void,
  connectMs = 12000,
): Promise<RecHandle> {
  let finalText = ""; // finalized sentences so far
  let partial = ""; // current in-progress sentence
  let stopped = false;
  const unlistens: UnlistenFn[] = [];
  const text = () => (finalText + " " + partial).trim();
  const cleanup = () => unlistens.forEach((u) => u());

  unlistens.push(
    await listen<string>("asr://partial", (e) => {
      partial = e.payload;
      onPartial?.(text());
    }),
  );
  unlistens.push(
    await listen<string>("asr://final", (e) => {
      finalText = (finalText + " " + e.payload).trim();
      partial = "";
      onPartial?.(text());
    }),
  );

  // Connect the WebSocket + start the mic. Resolves only once capture is live (can take a
  // few seconds on a slow link); guard with connectMs so a hung connection can't block.
  try {
    await Promise.race([
      invoke("asr_start"),
      new Promise((_, reject) =>
        window.setTimeout(() => reject(new Error("asr-connect-timeout")), connectMs),
      ),
    ]);
  } catch (e) {
    cleanup();
    try {
      await invoke("asr_stop");
    } catch {
      /* ignore */
    }
    throw e;
  }

  return {
    async stop(): Promise<string> {
      if (stopped) return text();
      stopped = true;
      try {
        await invoke("asr_stop");
      } catch {
        /* ignore */
      }
      // brief grace so the trailing final (flushed by finish-task) is captured
      await new Promise((r) => window.setTimeout(r, 400));
      cleanup();
      return text();
    },
  };
}
