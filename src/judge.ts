import type { Round } from "./types";

// Judging requires a COMPLETE SENTENCE, not just the location word. To pass, the child's
// answer must contain all three of:
//   1. the correct LOCATION word (synonyms allowed, spacing tolerated),
//   2. a be-verb — covers "it's / they're / it is / they are / is / are ...", and
//   3. a preposition (on/in/under/by/at/near...). Any preposition passes — we don't grade
//      which direction word they pick, only that they actually spoke a full sentence.
// So "It's on the sofa." / "They are on the table." pass; bare "sofa" or "on the sofa" do not.
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
  // competition-2 locations
  tree: ["tree"],
  box: ["box", "case"],
  desk: ["desk", "table"],
  kitchen: ["kitchen"],
  bed: ["bed"],
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const BE_VERBS = new Set(["is", "are", "am", "was", "were", "be"]);
const PREPOSITIONS = new Set([
  "on", "in", "under", "by", "at", "near", "beside", "behind", "inside", "above", "below", "next",
]);

// Split into word tokens, expanding the common contractions first so "it's"/"they're"
// (and the apostrophe-less "its"/"theyre" that ASR often produces) count as a be-verb.
function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/\bit'?s\b/g, "it is")
    .replace(/\bthey'?re\b/g, "they are")
    .replace(/\bthere'?s\b/g, "there is")
    .replace(/\bhere'?s\b/g, "here is")
    .replace(/\bthat'?s\b/g, "that is")
    .replace(/'re\b/g, " are")
    .replace(/'m\b/g, " am")
    .replace(/'s\b/g, " is")
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function isAnswerCorrect(transcript: string, round: Round): boolean {
  const t = norm(transcript);
  if (!t) return false;

  // 1. Correct location word (synonyms when known; otherwise the label + its last word).
  const label = round.location.labelEn.trim();
  const last = label.split(/\s+/).pop() ?? "";
  const keywords = SYNONYMS[round.location.id] ?? [label, last];
  const hasLocation = keywords.some((w) => {
    const n = norm(w);
    return n.length >= 2 && t.includes(n);
  });
  if (!hasLocation) return false;

  // 2 + 3. It must be a full sentence: a be-verb AND a preposition.
  const toks = tokenize(transcript);
  const hasBeVerb = toks.some((w) => BE_VERBS.has(w));
  const hasPreposition = toks.some((w) => PREPOSITIONS.has(w));
  return hasBeVerb && hasPreposition;
}
