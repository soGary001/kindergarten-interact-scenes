// One-off TTS regenerator for a single character, using Alibaba Bailian (DashScope)
// qwen3-tts-flash — used when Mimo has no credit. Preset voices (not voice-design), so we
// pick a clear voice per character. Writes .wav clips to public/assets/audio/.
// Usage: DASHSCOPE_TTS_KEY=sk-... node build-assets/gen-grandpa-tts.mjs
import { writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const KEY = process.env.DASHSCOPE_TTS_KEY;
if (!KEY) throw new Error("set DASHSCOPE_TTS_KEY");
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../public/assets/audio");
const ENDPOINT = "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Grandpa (爷爷): clear, warm male voice. Item = glasses (plural → "them"/"they").
const CHARACTER = "grandpa";
const VOICE = "Ethan"; // clear adult male

const lines = [
  { file: `${CHARACTER}-q-glasses.wav`, text: "Oh dear, where are my glasses? Can you help me find them, please?" },
  { file: `${CHARACTER}-encourage.wav`, text: "That's okay! Let's try again together, you can do it!" },
];
for (let n = 1; n <= 10; n++) {
  lines.push({ file: `${CHARACTER}-t-${n}.wav`, text: `Thank you so much! Your lucky number is ${n}. Well done!` });
}

async function tts(text) {
  const body = { model: "qwen3-tts-flash", input: { text, voice: VOICE } };
  for (let attempt = 1; attempt <= 5; attempt++) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const j = await res.json();
      const url = j.output?.audio?.url;
      if (!url) throw new Error("no audio url: " + JSON.stringify(j).slice(0, 200));
      return Buffer.from(await (await fetch(url)).arrayBuffer());
    }
    if (res.status === 429) { await sleep(5000 * attempt); continue; }
    throw new Error(`HTTP ${res.status} ${await res.text()}`);
  }
  throw new Error("still 429 after retries");
}

await mkdir(OUT, { recursive: true });
for (const l of lines) {
  const audio = await tts(l.text);
  await writeFile(resolve(OUT, l.file), audio);
  console.log(`✓ ${l.file}: ${l.text}`);
  await sleep(400);
}
console.log("done");
