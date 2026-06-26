import type { Round } from "./types";

// Strict judging: the child must say a COMPLETE SENTENCE that contains the EXACT location
// word taught for that scene — NO synonyms (e.g. "couch" does NOT count for "sofa"). To pass:
//   1. the answer contains the location's own word (round.location.labelEn, spacing-tolerant),
//   2. a be-verb — "it's / they're / it is / they are / is / are ...", and
//   3. a preposition (on/in/under/by/at/near...). Any preposition is fine — we don't grade
//      which direction word they pick, only that they spoke a full sentence with the right word.
// So "It's on the sofa." passes; "It's on the couch." / bare "sofa" / "on the sofa" all fail.

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

  // 1. The EXACT location word for this scene — no synonyms. Spacing is tolerated so the
  //    spoken "TV cabinet" matches the label "TV cabinet" (both normalize to "tvcabinet").
  const label = norm(round.location.labelEn);
  if (label.length < 2 || !t.includes(label)) return false;

  // 2 + 3. It must be a full sentence: a be-verb AND a preposition.
  const toks = tokenize(transcript);
  const hasBeVerb = toks.some((w) => BE_VERBS.has(w));
  const hasPreposition = toks.some((w) => PREPOSITIONS.has(w));
  return hasBeVerb && hasPreposition;
}
