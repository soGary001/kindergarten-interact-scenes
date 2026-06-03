import type { Round } from "./types";

/**
 * Lenient judging: the child is "correct" if the recognized transcript mentions the
 * right location. We don't require articles, prepositions, or full sentences — just
 * the key location word (e.g. "windowsill"), to be kind to young learners.
 */
export function isAnswerCorrect(transcript: string, round: Round): boolean {
  const t = transcript.toLowerCase();
  const label = round.location.labelEn.toLowerCase().trim();
  if (!label) return false;
  if (t.includes(label)) return true;
  // Multi-word labels (e.g. "tv cabinet"): also accept the distinctive last word.
  const last = label.split(/\s+/).pop() ?? "";
  if (last.length >= 3 && t.includes(last)) return true;
  return false;
}
