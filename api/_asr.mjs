// Shared ASR helper: transcribe base64 audio via Alibaba DashScope (qwen3-asr-flash).
// Confirmed contract: POST .../multimodal-generation/generation with a base64 data URI
// audio part; transcript at output.choices[0].message.content[0].text.
const ENDPOINT =
  "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";

export async function transcribe(audioBase64, mime, apiKey) {
  if (!apiKey) throw new Error("missing DASHSCOPE_API_KEY");
  if (!audioBase64) throw new Error("missing audio");
  const dataUri = `data:${mime || "audio/wav"};base64,${audioBase64}`;
  const body = JSON.stringify({
    model: "qwen3-asr-flash",
    input: { messages: [{ role: "user", content: [{ audio: dataUri }] }] },
  });

  // HK→mainland DashScope can be slow/flaky; retry a few times before giving up.
  let res;
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body,
        signal: AbortSignal.timeout(22000),
      });
      break;
    } catch (e) {
      lastErr = e;
    }
  }
  if (!res) throw lastErr ?? new Error("asr: connection failed");
  if (!res.ok) throw new Error(`asr failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const msg = data?.output?.choices?.[0]?.message;
  const content = msg?.content;
  const text = Array.isArray(content) ? content.find((c) => c.text)?.text ?? "" : "";
  const ann = msg?.annotations?.find((a) => a.type === "audio_info");
  return { transcript: String(text).trim(), language: ann?.language ?? null };
}
