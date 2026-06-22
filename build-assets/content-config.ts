export interface ConfigItem { id: string; word: string; wordZh?: string; isPlural: boolean; sprite: string; scale?: number; }
export interface ConfigLocation { id: string; labelEn: string; preposition: string; anchor: { xPct: number; yPct: number }; maxItemScale?: number; }
export interface ConfigScene { id: string; background: string; locations: ConfigLocation[]; }
export interface ConfigCharacter { id: string; nameEn: string; persona: string; portrait: string; sceneId: string; items: ConfigItem[]; }
export interface ContentConfig { scenes: ConfigScene[]; characters: ConfigCharacter[]; }

// ── COMPETITION-2 content ────────────────────────────────────────────────────
// Ten FIXED scenes (unlike the original random model): each scene pairs exactly one
// character with one item and one correct location. The child must say the full
// sentence (e.g. "It's under the tree."). Each scene therefore has a single location;
// a character maps to a single scene. Backgrounds are reused where the room fits.
//
// NOTE: anchors below are reasonable first guesses — tune them against the generated art
// with the dev overlay before the contest. Item sprites/backgrounds/portraits marked NEW
// are produced by `node build-assets/gen-art.mjs`; audio by `npm run generate`.

const scenes: ConfigScene[] = [
  // 1. boy — football — under the tree
  { id: "yard-tree",   background: "scene-tree-yard.png",  // NEW (also used by #6)
    locations: [{ id: "tree",  labelEn: "tree",  preposition: "under",  anchor: { xPct: 40, yPct: 72 }, maxItemScale: 0.55 }] },
  // 2. girl — pencil — in the box
  { id: "box-room",    background: "scene-box-room.png",   // NEW
    locations: [{ id: "box",   labelEn: "box",   preposition: "in",     anchor: { xPct: 45, yPct: 70 }, maxItemScale: 0.5 }] },
  // 3. grandpa — glasses — on the desk
  { id: "desk-room",   background: "scene-desk-room.png",  // NEW
    locations: [{ id: "desk",  labelEn: "desk",  preposition: "on",     anchor: { xPct: 45, yPct: 58 }, maxItemScale: 0.5 }] },
  // 4. mom — phone — under the pillow
  { id: "bedroom",     background: "scene-bedroom.png",    // NEW (also used by #10)
    locations: [{ id: "pillow", labelEn: "pillow", preposition: "under", anchor: { xPct: 38, yPct: 60 }, maxItemScale: 0.45 }] },
  // 5. brother — blocks — beside the sofa
  { id: "living-sofa", background: "scene-living-room.png", // reuse
    locations: [{ id: "sofa",  labelEn: "sofa",  preposition: "beside", anchor: { xPct: 50, yPct: 78 }, maxItemScale: 0.5 }] },
  // 6. sister — rabbit — in the grass
  { id: "grass-yard",  background: "scene-tree-yard.png",  // reuse (NEW)
    locations: [{ id: "grass", labelEn: "grass", preposition: "in",     anchor: { xPct: 60, yPct: 82 }, maxItemScale: 0.55 }] },
  // 7. teacher — ruler — under the desk
  { id: "classroom",   background: "scene-classroom.png",  // NEW
    locations: [{ id: "desk",  labelEn: "desk",  preposition: "under",  anchor: { xPct: 45, yPct: 74 }, maxItemScale: 0.5 }] },
  // 8. sister2 — cake — in the kitchen
  { id: "kitchen",     background: "scene-kitchen.png",    // NEW
    locations: [{ id: "kitchen", labelEn: "kitchen", preposition: "in", anchor: { xPct: 50, yPct: 64 }, maxItemScale: 0.5 }] },
  // 9. brother2 — keys — on the chair
  { id: "living-chair", background: "scene-living-room.png", // reuse
    locations: [{ id: "chair", labelEn: "chair", preposition: "on",     anchor: { xPct: 27, yPct: 62 }, maxItemScale: 0.45 }] },
  // 10. dad — book — on the bed
  { id: "bedroom-bed", background: "scene-bedroom.png",    // reuse (NEW)
    locations: [{ id: "bed",   labelEn: "bed",   preposition: "on",     anchor: { xPct: 55, yPct: 66 }, maxItemScale: 0.5 }] },
];

export const CONTENT_CONFIG: ContentConfig = {
  scenes,
  characters: [
    { id: "boy", nameEn: "Little Boy", persona: "an energetic, cheerful little boy", portrait: "char-boy.png", sceneId: "yard-tree",
      items: [{ id: "football", word: "football", wordZh: "足球", isPlural: false, sprite: "item-football.png", scale: 0.55 }] },
    { id: "girl", nameEn: "Little Girl", persona: "a sweet, curious little girl", portrait: "char-girl.png", sceneId: "box-room",
      items: [{ id: "pencil", word: "pencil", wordZh: "铅笔", isPlural: false, sprite: "item-pencil.png", scale: 0.5 }] },
    { id: "grandpa", nameEn: "Grandpa", persona: "a warm, kind elderly grandfather", portrait: "char-grandpa.png", sceneId: "desk-room",
      items: [{ id: "glasses", word: "glasses", wordZh: "眼镜", isPlural: true, sprite: "item-glasses.png", scale: 0.5 }] },
    { id: "mom", nameEn: "Mom", persona: "a kind, gentle mother", portrait: "char-mom.png", sceneId: "bedroom",
      items: [{ id: "phone", word: "phone", wordZh: "手机", isPlural: false, sprite: "item-phone.png", scale: 0.42 }] },
    { id: "brother", nameEn: "Little Brother", persona: "a cheerful little boy", portrait: "char-boy.png", sceneId: "living-sofa",
      items: [{ id: "blocks", word: "blocks", wordZh: "积木", isPlural: true, sprite: "item-blocks.png", scale: 0.5 }] },
    { id: "sister", nameEn: "Big Sister", persona: "a happy, kind young girl", portrait: "char-girl.png", sceneId: "grass-yard",
      items: [{ id: "rabbit", word: "rabbit", wordZh: "兔子", isPlural: false, sprite: "item-rabbit.png", scale: 0.55 }] },
    { id: "teacher", nameEn: "Teacher", persona: "a friendly, kind kindergarten teacher", portrait: "char-teacher.png", sceneId: "classroom",
      items: [{ id: "ruler", word: "ruler", wordZh: "尺子", isPlural: false, sprite: "item-ruler.png", scale: 0.5 }] },
    { id: "sister2", nameEn: "Big Sister", persona: "a sweet, cheerful girl", portrait: "char-girl.png", sceneId: "kitchen",
      items: [{ id: "cake", word: "cake", wordZh: "蛋糕", isPlural: false, sprite: "item-cake.png", scale: 0.5 }] },
    { id: "brother2", nameEn: "Big Brother", persona: "a friendly older boy", portrait: "char-boy.png", sceneId: "living-chair",
      items: [{ id: "keys", word: "keys", wordZh: "钥匙", isPlural: true, sprite: "item-keys.png", scale: 0.45 }] },
    { id: "dad", nameEn: "Dad", persona: "a calm, friendly father", portrait: "char-dad.png", sceneId: "bedroom-bed",
      items: [{ id: "book", word: "book", wordZh: "书", isPlural: false, sprite: "item-book.png", scale: 0.5 }] },
  ],
};

export type AudioKind = "question" | "thanks" | "encourage";
export interface AudioLine {
  characterId: string;
  kind: AudioKind;
  key: string;        // itemId for question; "1".."10" for thanks; "" for encourage
  filename: string;   // output audio filename (.wav)
}

export function enumerateAudioLines(cfg: ContentConfig): AudioLine[] {
  const lines: AudioLine[] = [];
  for (const c of cfg.characters) {
    for (const item of c.items) {
      lines.push({ characterId: c.id, kind: "question", key: item.id, filename: `${c.id}-q-${item.id}.wav` });
    }
    for (let n = 1; n <= 10; n++) {
      lines.push({ characterId: c.id, kind: "thanks", key: String(n), filename: `${c.id}-t-${n}.wav` });
    }
    // One gentle "try again" line per character, spoken in their own voice.
    lines.push({ characterId: c.id, kind: "encourage", key: "", filename: `${c.id}-encourage.wav` });
  }
  return lines;
}
