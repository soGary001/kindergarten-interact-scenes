import type { ItemDef, LocationDef } from "./types";

export function buildQuestionText(item: ItemDef): string {
  const verb = item.isPlural ? "are" : "is";
  return `Where ${verb} my ${item.word}?`;
}

export function buildExpectedAnswer(item: ItemDef, loc: LocationDef): string {
  const subject = item.isPlural ? "They are" : "It's";
  return `${subject} ${loc.preposition} the ${loc.labelEn}.`;
}

// Chinese gloss of the question, shown small under the English. Falls back to the
// English word if no Chinese is provided.
export function buildQuestionTextZh(item: ItemDef): string {
  return `我的${item.wordZh ?? item.word}在哪里呀？`;
}
