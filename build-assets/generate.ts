import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { CONTENT_CONFIG, enumerateAudioLines, type ContentConfig } from "./content-config";
import { MimoClient } from "./mimo-client";
import { questionPrompt, thanksPrompt, encouragePrompt } from "./prompts";
import type { Content, CharacterDef } from "../src/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, "../src");                       // content.json lives here (imported)
const AUDIO_DIR = resolve(__dirname, "../public/assets/audio"); // .wav clips live here (served via public/)

/** Pure: assemble the runtime manifest from config + planned audio filenames. */
export function buildManifest(cfg: ContentConfig, audioByLine: Map<string, string>): Content {
  const scenes = cfg.scenes.map((s) => ({
    id: s.id, background: s.background,
    locations: s.locations.map((l) => ({ ...l })),
  }));
  const characters: CharacterDef[] = cfg.characters.map((c) => {
    const questionAudio: Record<string, string> = {};
    for (const item of c.items) {
      questionAudio[item.id] = audioByLine.get(`${c.id}:question:${item.id}`) ?? "";
    }
    const thanksAudio: Record<string, string> = {};
    for (let n = 1; n <= 10; n++) {
      thanksAudio[String(n)] = audioByLine.get(`${c.id}:thanks:${n}`) ?? "";
    }
    return {
      id: c.id, nameEn: c.nameEn, portrait: c.portrait, sceneId: c.sceneId,
      items: c.items.map((i) => ({ ...i })),
      questionAudio, thanksAudio,
      encourageAudio: audioByLine.get(`${c.id}:encourage:`) ?? "",
    };
  });
  return { scenes, characters };
}

/** Live: call Mimo for each line, write .wav clips, write content.json. */
async function main(): Promise<void> {
  dotenv.config({ path: resolve(__dirname, ".env") });
  const { MIMO_BASE_URL, MIMO_API_KEY, MIMO_TEXT_MODEL, MIMO_TTS_MODEL } = process.env;
  if (!MIMO_BASE_URL || !MIMO_API_KEY) throw new Error("Set MIMO_BASE_URL and MIMO_API_KEY in build-assets/.env");

  const client = new MimoClient({ baseUrl: MIMO_BASE_URL, apiKey: MIMO_API_KEY });
  const textModel = MIMO_TEXT_MODEL ?? "mimo-v2.5";
  const ttsModel = MIMO_TTS_MODEL ?? "mimo-v2.5-tts-voicedesign";

  // voicedesign description strings (confirmed mechanism): each becomes the user message
  // that designs the character's voice. Tune wording to taste.
  const voiceByCharacter: Record<string, string> = {
    boy: "An energetic, cheerful young boy. Bright, playful, lively tone.",
    girl: "A sweet, curious little girl. Light, gentle, happy tone.",
    grandpa: "A warm elderly grandfather. Speaks slowly and very clearly, crisp and easy to understand, gentle and kind, not mumbled.",
    mom: "A kind, gentle adult woman. Soft, warm, caring tone.",
    brother: "A clear, cheerful young boy. Speaks slowly and very clearly, crisp and easy to understand, friendly and bright.",
    sister: "A happy young girl. Light, sweet, lively tone.",
    teacher: "A friendly kindergarten teacher. Clear, warm, encouraging adult tone.",
    sister2: "A sweet, cheerful girl. Gentle, happy tone.",
    brother2: "A friendly older boy. Confident, warm, lively tone.",
    dad: "A calm, friendly adult man. Warm, steady, reassuring tone.",
  };

  const lines = enumerateAudioLines(CONTENT_CONFIG);
  const audioByLine = new Map<string, string>();
  const audioDir = AUDIO_DIR;
  await mkdir(audioDir, { recursive: true });

  for (const line of lines) {
    const mapKey = `${line.characterId}:${line.kind}:${line.key}`;
    // Resume: keep already-generated clips (so re-runs only create new lines).
    if (existsSync(resolve(audioDir, line.filename))) {
      audioByLine.set(mapKey, line.filename);
      console.log(`• skip ${line.filename} (exists)`);
      continue;
    }
    const ch = CONTENT_CONFIG.characters.find((c) => c.id === line.characterId)!;
    let spoken: string;
    if (line.kind === "question") {
      const item = ch.items.find((i) => i.id === line.key)!;
      spoken = await client.chat(textModel, questionPrompt(ch.persona, item.word, item.isPlural));
    } else if (line.kind === "encourage") {
      spoken = await client.chat(textModel, encouragePrompt(ch.persona));
    } else {
      spoken = await client.chat(textModel, thanksPrompt(ch.persona, Number(line.key)));
    }
    const audio = await client.tts(ttsModel, spoken, voiceByCharacter[ch.id]);
    await writeFile(resolve(audioDir, line.filename), Buffer.from(audio));
    audioByLine.set(mapKey, line.filename);
    console.log(`✓ ${line.filename}: ${spoken}`);
  }

  const manifest = buildManifest(CONTENT_CONFIG, audioByLine);
  await writeFile(resolve(SRC, "content.json"), JSON.stringify(manifest, null, 2));
  console.log("✓ wrote src/content.json");
}

// Run only when invoked directly (not when imported by tests).
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
