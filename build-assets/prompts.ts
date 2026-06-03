// These prompts ask the text model to produce the EXACT spoken line (no quotes,
// no narration) so it can be fed straight to TTS.

export function questionPrompt(persona: string, word: string, isPlural: boolean): string {
  const verb = isPlural ? "are" : "is";
  return [
    `You are ${persona} speaking to a young child in a kindergarten English game.`,
    `You cannot find your ${word}. Say ONE short, warm English line asking where ${isPlural ? "they" : "it"} ${isPlural ? "are" : "is"}.`,
    `It MUST literally contain the phrase "Where ${verb} my ${word}?".`,
    `Output only the spoken line, no quotes, max 12 words.`,
  ].join(" ");
}

export function encouragePrompt(persona: string): string {
  return [
    `You are ${persona} speaking to a young child in a kindergarten English game.`,
    `The child just gave a wrong answer. Say ONE short, warm, encouraging English line:`,
    `tell them it's okay and to try again. Gentle and kind.`,
    `Output only the spoken line, no quotes, max 12 words.`,
  ].join(" ");
}

export function thanksPrompt(persona: string, luckyNumber: number): string {
  return [
    `You are ${persona} speaking to a young child in a kindergarten English game.`,
    `Thank the child warmly and give them a lucky number.`,
    `It MUST literally contain "lucky number" and the digit ${luckyNumber}.`,
    `Output only the spoken line, no quotes, max 16 words.`,
  ].join(" ");
}
