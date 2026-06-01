export interface ConfigItem { id: string; word: string; isPlural: boolean; sprite: string; }
export interface ConfigLocation { id: string; labelEn: string; preposition: string; anchor: { xPct: number; yPct: number }; }
export interface ConfigScene { id: string; background: string; locations: ConfigLocation[]; }
export interface ConfigCharacter { id: string; nameEn: string; persona: string; portrait: string; sceneId: string; items: ConfigItem[]; }
export interface ContentConfig { scenes: ConfigScene[]; characters: ConfigCharacter[]; }

const livingRoom: ConfigScene = {
  id: "living-room",
  background: "scene-living-room.png",
  locations: [
    { id: "table",      labelEn: "table",      preposition: "on",    anchor: { xPct: 20, yPct: 70 } },
    { id: "tv-cabinet", labelEn: "TV cabinet", preposition: "on",    anchor: { xPct: 64, yPct: 60 } },
    { id: "chair",      labelEn: "chair",      preposition: "on",    anchor: { xPct: 30, yPct: 66 } },
    { id: "sofa",       labelEn: "sofa",       preposition: "on",    anchor: { xPct: 50, yPct: 72 } },
    { id: "windowsill", labelEn: "windowsill", preposition: "on",    anchor: { xPct: 80, yPct: 35 } },
    { id: "desk-lamp",  labelEn: "lamp",       preposition: "by",    anchor: { xPct: 72, yPct: 50 } },
    { id: "carpet",     labelEn: "carpet",     preposition: "on",    anchor: { xPct: 50, yPct: 88 } },
    { id: "wardrobe",   labelEn: "wardrobe",   preposition: "in",    anchor: { xPct: 88, yPct: 65 } },
    { id: "bookshelf",  labelEn: "bookshelf",  preposition: "on",    anchor: { xPct: 12, yPct: 30 } },
    { id: "pillow",     labelEn: "pillow",     preposition: "under", anchor: { xPct: 35, yPct: 50 } },
  ],
};

const boyScene: ConfigScene = {
  id: "boy-room",
  background: "scene-boy-room.png",
  locations: [
    { id: "door",       labelEn: "door",       preposition: "by", anchor: { xPct: 15, yPct: 55 } },
    { id: "grass",      labelEn: "grass",      preposition: "on", anchor: { xPct: 78, yPct: 80 } },
    { id: "shelf",      labelEn: "shelf",      preposition: "on", anchor: { xPct: 40, yPct: 30 } },
    { id: "chair",      labelEn: "chair",      preposition: "on", anchor: { xPct: 30, yPct: 66 } },
    { id: "sofa",       labelEn: "sofa",       preposition: "on", anchor: { xPct: 55, yPct: 70 } },
    { id: "windowsill", labelEn: "windowsill", preposition: "on", anchor: { xPct: 85, yPct: 32 } },
    { id: "carpet",     labelEn: "carpet",     preposition: "on", anchor: { xPct: 50, yPct: 86 } },
  ],
};

const girlScene: ConfigScene = {
  id: "girl-outdoor",
  background: "scene-girl-outdoor.png",
  locations: [
    { id: "station", labelEn: "station", preposition: "at", anchor: { xPct: 18, yPct: 50 } },
    { id: "park",    labelEn: "park",    preposition: "in", anchor: { xPct: 40, yPct: 70 } },
    { id: "garden",  labelEn: "garden",  preposition: "in", anchor: { xPct: 62, yPct: 72 } },
    { id: "balcony", labelEn: "balcony", preposition: "on", anchor: { xPct: 82, yPct: 40 } },
    { id: "shelf",   labelEn: "shelf",   preposition: "on", anchor: { xPct: 30, yPct: 34 } },
    { id: "carpet",  labelEn: "carpet",  preposition: "on", anchor: { xPct: 55, yPct: 88 } },
  ],
};

export const CONTENT_CONFIG: ContentConfig = {
  scenes: [livingRoom, boyScene, girlScene],
  characters: [
    { id: "grandma", nameEn: "Grandma", persona: "a warm, gentle grandmother", portrait: "char-grandma.png", sceneId: "living-room",
      items: [{ id: "glasses", word: "glasses", isPlural: true, sprite: "item-glasses.png" }] },
    { id: "boy", nameEn: "Little Boy", persona: "an energetic, cheerful little boy", portrait: "char-boy.png", sceneId: "boy-room",
      items: [
        { id: "football", word: "football", isPlural: false, sprite: "item-football.png" },
        { id: "toys", word: "toys", isPlural: true, sprite: "item-toys.png" },
      ] },
    { id: "girl", nameEn: "Little Girl", persona: "a sweet, curious little girl", portrait: "char-girl.png", sceneId: "girl-outdoor",
      items: [
        { id: "puppy", word: "puppy", isPlural: false, sprite: "item-puppy.png" },
        { id: "kitten", word: "kitten", isPlural: false, sprite: "item-kitten.png" },
      ] },
    { id: "dad", nameEn: "Dad", persona: "a calm, friendly father", portrait: "char-dad.png", sceneId: "living-room",
      items: [
        { id: "keys", word: "keys", isPlural: true, sprite: "item-keys.png" },
        { id: "wallet", word: "wallet", isPlural: false, sprite: "item-wallet.png" },
        { id: "newspaper", word: "newspaper", isPlural: false, sprite: "item-newspaper.png" },
      ] },
    { id: "mom", nameEn: "Mom", persona: "a kind, gentle mother", portrait: "char-mom.png", sceneId: "living-room",
      items: [
        { id: "handbag", word: "handbag", isPlural: false, sprite: "item-handbag.png" },
        { id: "necklace", word: "necklace", isPlural: false, sprite: "item-necklace.png" },
        { id: "ring", word: "ring", isPlural: false, sprite: "item-ring.png" },
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
