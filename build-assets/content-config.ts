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
  // 1. boy — football — under the tree (tree is on the LEFT, base ~y80 on the grass)
  { id: "yard-tree",   background: "scene-tree-yard.png",  // NEW (also used by #6)
    locations: [{ id: "tree",  labelEn: "tree",  preposition: "under",  anchor: { xPct: 22, yPct: 83 }, maxItemScale: 0.5 }] },
  // 2. girl — pencil — in the box (open box center-left, rim ~y64)
  { id: "box-room",    background: "scene-box-room.png",   // NEW
    locations: [{ id: "box",   labelEn: "box",   preposition: "in",     anchor: { xPct: 38, yPct: 64 }, maxItemScale: 0.42 }] },
  // 3. grandpa — glasses — on the desk (desktop right of the lamp, ~y56)
  { id: "desk-room",   background: "scene-desk-room.png",  // NEW
    locations: [{ id: "desk",  labelEn: "desk",  preposition: "on",     anchor: { xPct: 62, yPct: 56 }, maxItemScale: 0.42 }] },
  // 4. mom — phone — under the pillow (pillow at bed head, left, ~x17)
  { id: "bedroom",     background: "scene-bedroom.png",    // NEW (also used by #10)
    locations: [{ id: "pillow", labelEn: "pillow", preposition: "under", anchor: { xPct: 21, yPct: 70 }, maxItemScale: 0.3 }] },
  // 5. brother — blocks — beside the sofa (on the floor left-front of the sofa)
  { id: "living-sofa", background: "scene-living-room.png", // reuse
    locations: [{ id: "sofa",  labelEn: "sofa",  preposition: "beside", anchor: { xPct: 46, yPct: 84 }, maxItemScale: 0.5 }] },
  // 6. sister — rabbit — in the grass (open grass to the right of the tree)
  { id: "grass-yard",  background: "scene-tree-yard.png",  // reuse (NEW)
    locations: [{ id: "grass", labelEn: "grass", preposition: "in",     anchor: { xPct: 64, yPct: 88 }, maxItemScale: 0.5 }] },
  // 7. teacher — ruler — under the desk (on the floor between the desk legs, ~y87)
  { id: "classroom",   background: "scene-classroom.png",  // NEW
    locations: [{ id: "desk",  labelEn: "desk",  preposition: "under",  anchor: { xPct: 50, yPct: 88 }, maxItemScale: 0.45 }] },
  // 8. sister2 — cake — in the kitchen (on the counter, center, ~y60)
  { id: "kitchen",     background: "scene-kitchen.png",    // NEW
    locations: [{ id: "kitchen", labelEn: "kitchen", preposition: "in", anchor: { xPct: 45, yPct: 60 }, maxItemScale: 0.45 }] },
  // 9. brother2 — keys — on the chair (the single armchair seat, left ~x30 y60)
  { id: "living-chair", background: "scene-living-room.png", // reuse
    locations: [{ id: "chair", labelEn: "chair", preposition: "on",     anchor: { xPct: 30, yPct: 60 }, maxItemScale: 0.4 }] },
  // 10. dad — book — on the bed (on the mattress, right of the pillow, ~x32)
  { id: "bedroom-bed", background: "scene-bedroom.png",    // reuse (NEW)
    locations: [{ id: "bed",   labelEn: "bed",   preposition: "on",     anchor: { xPct: 32, yPct: 60 }, maxItemScale: 0.45 }] },
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
