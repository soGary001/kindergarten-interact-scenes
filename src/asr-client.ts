import { ASR_URL } from "./config";

export interface AsrResult {
  transcript: string;
  language: string | null;
}

/** Send base64 audio to the Hong Kong ASR function and get the transcript back. */
export async function recognize(base64: string, mime: string): Promise<AsrResult> {
  const res = await fetch(ASR_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audio: base64, mime }),
  });
  if (!res.ok) throw new Error(`ASR HTTP ${res.status}: ${await res.text().catch(() => "")}`);
  return (await res.json()) as AsrResult;
}
