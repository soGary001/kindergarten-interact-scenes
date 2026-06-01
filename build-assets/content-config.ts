export interface ConfigItem { id: string; word: string; isPlural: boolean; sprite: string; scale?: number; }
export interface ConfigLocation { id: string; labelEn: string; preposition: string; anchor: { xPct: number; yPct: number }; }
export interface ConfigScene { id: string; background: string; locations: ConfigLocation[]; }
export interface ConfigCharacter { id: string; nameEn: string; persona: string; portrait: string; sceneId: string; items: ConfigItem[]; }
export interface ContentConfig { scenes: ConfigScene[]; characters: ConfigCharacter[]; }

const livingRoom: ConfigScene = {
  id: "living-room",
  background: "scene-living-room.png",
  locations: [
    { id: "table",      labelEn: "table",      preposition: "on",    anchor: { xPct: 38, yPct: 73 } },
    { id: "tv-cabinet", labelEn: "TV cabinet", preposition: "on",    anchor: { xPct: 11, yPct: 64 } },
    { id: "chair",      labelEn: "chair",      preposition: "on",    anchor: { xPct: 27, yPct: 62 } },
    { id: "sofa",       labelEn: "sofa",       preposition: "on",    anchor: { xPct: 66, yPct: 62 } },
    { id: "windowsill", labelEn: "windowsill", preposition: "on",    anchor: { xPct: 42, yPct: 43 } },
    { id: "desk-lamp",  labelEn: "lamp",       preposition: "by",    anchor: { xPct: 58, yPct: 58 } },
    { id: "carpet",     labelEn: "carpet",     preposition: "on",    anchor: { xPct: 41, yPct: 85 } },
    { id: "wardrobe",   labelEn: "wardrobe",   preposition: "in",    anchor: { xPct: 82, yPct: 60 } },
    { id: "bookshelf",  labelEn: "bookshelf",  preposition: "on",    anchor: { xPct: 90, yPct: 62 } },
    { id: "pillow",     labelEn: "pillow",     preposition: "under", anchor: { xPct: 54, yPct: 62 } },
  ],
};

const boyScene: ConfigScene = {
  id: "boy-room",
  background: "scene-boy-room.png",
  locations: [
    { id: "door",       labelEn: "door",       preposition: "by", anchor: { xPct: 29, yPct: 70 } },
    { id: "grass",      labelEn: "grass",      preposition: "on", anchor: { xPct: 50, yPct: 70 } },
    { id: "shelf",      labelEn: "shelf",      preposition: "on", anchor: { xPct: 14, yPct: 30 } },
    { id: "chair",      labelEn: "chair",      preposition: "on", anchor: { xPct: 16, yPct: 66 } },
    { id: "sofa",       labelEn: "sofa",       preposition: "on", anchor: { xPct: 82, yPct: 66 } },
    { id: "windowsill", labelEn: "windowsill", preposition: "on", anchor: { xPct: 81, yPct: 47 } },
    { id: "carpet",     labelEn: "carpet",     preposition: "on", anchor: { xPct: 46, yPct: 90 } },
  ],
};

const girlScene: ConfigScene = {
  id: "girl-outdoor",
  background: "scene-girl-outdoor.png",
  locations: [
    { id: "station", labelEn: "station", preposition: "at", anchor: { xPct: 11, yPct: 66 } },
    { id: "park",    labelEn: "park",    preposition: "in", anchor: { xPct: 32, yPct: 74 } },
    { id: "garden",  labelEn: "garden",  preposition: "in", anchor: { xPct: 58, yPct: 70 } },
    { id: "balcony", labelEn: "balcony", preposition: "on", anchor: { xPct: 88, yPct: 36 } },
    { id: "shelf",   labelEn: "shelf",   preposition: "on", anchor: { xPct: 88, yPct: 62 } },
    { id: "carpet",  labelEn: "carpet",  preposition: "on", anchor: { xPct: 80, yPct: 88 } },
  ],
};

export const CONTENT_CONFIG: ContentConfig = {
  scenes: [livingRoom, boyScene, girlScene],
  characters: [
    { id: "grandma", nameEn: "Grandma", persona: "a warm, gentle grandmother", portrait: "char-grandma.png", sceneId: "living-room",
      items: [{ id: "glasses", word: "glasses", isPlural: true, sprite: "item-glasses.png" }] },
    { id: "boy", nameEn: "Little Boy", persona: "an energetic, cheerful little boy", portrait: "char-boy.png", sceneId: "boy-room",
      items: [
        { id: "football", word: "football", isPlural: false, sprite: "item-football.png", scale: 0.7 },
        { id: "toys", word: "toys", isPlural: true, sprite: "item-toys.png", scale: 1.5 },
      ] },
    { id: "girl", nameEn: "Little Girl", persona: "a sweet, curious little girl", portrait: "char-girl.png", sceneId: "girl-outdoor",
      items: [
        { id: "puppy", word: "puppy", isPlural: false, sprite: "item-puppy.png", scale: 0.78 },
        { id: "kitten", word: "kitten", isPlural: false, sprite: "item-kitten.png", scale: 0.78 },
      ] },
    { id: "dad", nameEn: "Dad", persona: "a calm, friendly father", portrait: "char-dad.png", sceneId: "living-room",
      items: [
        { id: "keys", word: "keys", isPlural: true, sprite: "item-keys.png", scale: 0.65 },
        { id: "wallet", word: "wallet", isPlural: false, sprite: "item-wallet.png", scale: 0.7 },
        { id: "newspaper", word: "newspaper", isPlural: false, sprite: "item-newspaper.png" },
      ] },
    { id: "mom", nameEn: "Mom", persona: "a kind, gentle mother", portrait: "char-mom.png", sceneId: "living-room",
      items: [
        { id: "handbag", word: "handbag", isPlural: false, sprite: "item-handbag.png", scale: 0.75 },
        { id: "necklace", word: "necklace", isPlural: false, sprite: "item-necklace.png", scale: 0.6 },
        { id: "ring", word: "ring", isPlural: false, sprite: "item-ring.png", scale: 0.6 },
      ] },
  ],
};

export type AudioKind = "question" | "thanks";
export interface AudioLine {
  characterId: string;
  kind: AudioKind;
  key: string;        // itemId for question; "1".."10" for thanks
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
  }
  return lines;
}
