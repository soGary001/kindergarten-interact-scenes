export interface ItemDef {
  id: string;          // "glasses"
  word: string;        // "glasses" (English noun shown/spoken)
  isPlural: boolean;   // glasses -> true (affects "is/are")
  sprite: string;      // filename under assets/img/, e.g. "item-glasses.svg"
  scale?: number;      // size multiplier on the base sprite width (default 1)
}

export interface LocationDef {
  id: string;          // "windowsill"
  labelEn: string;     // "windowsill"
  preposition: string; // "on" | "in" | "by" | "under" | "at"
  anchor: { xPct: number; yPct: number }; // 0..100, where the sprite is placed
}

export interface SceneDef {
  id: string;          // "living-room"
  background: string;  // filename under assets/img/, e.g. "scene-living-room.svg"
  locations: LocationDef[];
}

export interface CharacterDef {
  id: string;          // "grandma"
  nameEn: string;      // "Grandma"
  portrait: string;    // filename under assets/img/, e.g. "char-grandma.svg"
  sceneId: string;     // references SceneDef.id
  items: ItemDef[];
  questionAudio: Record<string, string>;        // itemId -> audio filename ("" if none yet)
  thanksAudio: Record<string, string>;          // "1".."10" -> audio filename ("" if none yet)
}

export interface Content {
  characters: CharacterDef[];
  scenes: SceneDef[];
}

export interface Round {
  character: CharacterDef;
  scene: SceneDef;
  item: ItemDef;
  location: LocationDef;
  luckyNumber: number;        // 1..10
  questionText: string;       // "Where are my glasses?"
  expectedAnswer: string;     // "They are on the windowsill."
  questionAudio: string;      // filename or ""
  thanksAudio: string;        // filename or ""
}
