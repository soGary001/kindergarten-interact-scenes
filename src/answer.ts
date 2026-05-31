import type { ItemDef, LocationDef } from "./types";

export function buildQuestionText(item: ItemDef): string {
  const verb = item.isPlural ? "are" : "is";
  return `Where ${verb} my ${item.word}?`;
}

export function buildExpectedAnswer(item: ItemDef, loc: LocationDef): string {
  const subject = item.isPlural ? "They are" : "It's";
  return `${subject} ${loc.preposition} the ${loc.labelEn}.`;
}
