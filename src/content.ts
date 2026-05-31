import type { Content } from "./types";

export function loadContent(raw: unknown): Content {
  const c = raw as Content;
  if (!c || !Array.isArray(c.characters) || !Array.isArray(c.scenes)) {
    throw new Error("content: missing characters or scenes");
  }
  const sceneIds = new Set(c.scenes.map((s) => s.id));
  for (const ch of c.characters) {
    if (!sceneIds.has(ch.sceneId)) {
      throw new Error(`content: character ${ch.id} references missing scene ${ch.sceneId}`);
    }
    if (!ch.items || ch.items.length === 0) {
      throw new Error(`content: character ${ch.id} has no items`);
    }
  }
  return c;
}
