import type { Round } from "./types";

// Very lenient, kindergarten-friendly judging: the child passes as long as they say the
// LOCATION word — prepositions/articles/direction (in/on/near...) are ignored entirely.
// We also accept common kid synonyms and tolerate spacing ("window sill" == "windowsill").
const SYNONYMS: Record<string, string[]> = {
  table: ["table", "desk"],
  "tv-cabinet": ["tv cabinet", "tv", "television", "cabinet"],
  chair: ["chair"],
  sofa: ["sofa", "couch"],
  windowsill: ["windowsill", "window sill", "window", "sill"],
  "desk-lamp": ["lamp", "light", "desk lamp"],
  carpet: ["carpet", "rug", "mat"],
  wardrobe: ["wardrobe", "closet", "cupboard"],
  bookshelf: ["bookshelf", "book shelf", "shelf", "bookcase", "books"],
  pillow: ["pillow", "cushion"],
  door: ["door", "doorway"],
  grass: ["grass", "lawn"],
  shelf: ["shelf", "shelves"],
  station: ["station"],
  park: ["park"],
  garden: ["garden", "flowers", "flower"],
  balcony: ["balcony"],
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function isAnswerCorrect(transcript: string, round: Round): boolean {
  const t = norm(transcript);
  if (!t) return false;
  const label = round.location.labelEn.trim();
  const last = label.split(/\s+/).pop() ?? "";
  // Per-location synonyms when known; otherwise fall back to the label + its last word.
  const keywords = SYNONYMS[round.location.id] ?? [label, last];
  return keywords.some((w) => {
    const n = norm(w);
    return n.length >= 2 && t.includes(n);
  });
}
