# Art Brief — English Fun Time (Task 18)

This lists every illustration the app needs, the **exact filename** each must use, and a ready-to-paste image-generation prompt for each. Drop the finished files into `public/assets/img/` (overwriting the emoji placeholders) and the app picks them up with no code changes — as long as you keep the filenames.

## Global style (prepend to every prompt)

> Flat vector children's-book illustration, Memphis design style, soft pastel palette (blush pink #FF6B9D tones, mint green, butter yellow, sky cyan, lilac purple), bold rounded shapes, thick clean outlines, playful and cheerful, high-contrast, simple, no text, no words.

Keep all 5 characters and all items in the **same** style so they sit together on a scene.

## Format & naming rules

- **Keep the exact filenames below** (they match `build-assets/content-config.ts`). Easiest path: deliver **SVG** with the same names → true drop-in, zero code changes.
- If you deliver **PNG** instead of SVG, the base names are the same but the extension differs. After dropping the PNGs in `public/assets/img/`, update the extensions in `build-assets/content-config.ts` (the `background` / `portrait` / `sprite` fields) from `.svg` to `.png`, then refresh the manifest **offline** (no API call, audio untouched):
  ```bash
  npx tsx -e "(async()=>{const g=await import('./build-assets/generate.ts');const{CONTENT_CONFIG,enumerateAudioLines}=await import('./build-assets/content-config.ts');const map=new Map(enumerateAudioLines(CONTENT_CONFIG).map(l=>[l.characterId+':'+l.kind+':'+l.key,l.filename]));require('fs').writeFileSync('src/content.json',JSON.stringify(g.buildManifest(CONTENT_CONFIG,map),null,2));console.log('content.json refreshed — no API used')})()"
  ```
- **Scenes:** 16:9, 1600×900, opaque background OK.
- **Characters & items:** **transparent** background (PNG with alpha, or SVG). Characters ~600×800 (portrait), items ~512×512 (centered single object).

---

## A. Scenes (3) — 1600×900, 16:9

Scenes must show each named spot clearly and **spaced apart**, because the app overlays the lost-item sprite on top of one spot at a time (positions are tuned via `anchor` coords). Don't draw the lost items themselves into the scene.

| Filename | Prompt (after the global style prefix) |
|---|---|
| `scene-living-room.svg` | A cozy, tidy living room interior, wide view, clearly showing all of: a low table, a TV cabinet with a TV, a single armchair, a sofa with a pillow on it, a window with a windowsill, a desk lamp, a patterned floor carpet/rug, a tall wardrobe, and a bookshelf. Each piece of furniture clearly separated and fully visible, warm and inviting, daytime. |
| `scene-boy-room.svg` | A bright child's playroom on the left with an open door in the middle leading out to a sunny grassy garden on the right. Clearly show: the open door, green grass outside, a wall shelf, a small chair, a sofa, a window with windowsill, and a floor carpet. Cheerful, airy. |
| `scene-girl-outdoor.svg` | A cute stylized outdoor panorama for a little girl, clearly showing all of: a small train/bus station with a sign post, a park with trees and a bench, a flower garden, a house balcony, a wall shelf, and a picnic carpet on the ground. Sunny, friendly, storybook. |

---

## B. Characters (5) — transparent, ~600×800, friendly, facing forward, gentle smile/waving

| Filename | Prompt (after the global style prefix) |
|---|---|
| `char-grandma.svg` | A warm, kind elderly grandmother, round glasses, grey hair in a bun, cozy cardigan, gentle smile, waving hello, full body, transparent background. |
| `char-boy.svg` | An energetic, cheerful little boy, short hair, bright t-shirt and shorts, big happy smile, waving, full body, transparent background. |
| `char-girl.svg` | A sweet, curious little girl, cute dress, hair with a bow, happy smile, waving, full body, transparent background. |
| `char-dad.svg` | A calm, friendly young father, short neat hair, casual shirt, warm smile, waving, full body, transparent background. |
| `char-mom.svg` | A kind, gentle mother, shoulder-length hair, casual blouse, soft smile, waving, full body, transparent background. |

---

## C. Item sprites (11) — transparent, ~512×512, single centered object, slightly chunky/cute

| Filename | Object | Prompt (after the global style prefix) |
|---|---|---|
| `item-glasses.svg` | glasses | A single pair of round reading glasses, cute, centered, transparent background. |
| `item-football.svg` | football | A single classic black-and-white soccer ball, cute, centered, transparent background. |
| `item-toys.svg` | toys | A small pile of cute toys (teddy bear + building blocks), centered, transparent background. |
| `item-puppy.svg` | puppy | A single adorable cartoon puppy sitting, centered, transparent background. |
| `item-kitten.svg` | kitten | A single adorable cartoon kitten sitting, centered, transparent background. |
| `item-keys.svg` | keys | A small bunch of house keys on a ring, cute, centered, transparent background. |
| `item-wallet.svg` | wallet | A single closed wallet, cute, centered, transparent background. |
| `item-newspaper.svg` | newspaper | A single folded newspaper (no readable text), cute, centered, transparent background. |
| `item-handbag.svg` | handbag | A single stylish lady's handbag, cute, centered, transparent background. |
| `item-necklace.svg` | necklace | A single pretty pearl/bead necklace, cute, centered, transparent background. |
| `item-ring.svg` | ring | A single sparkly diamond ring, cute, centered, transparent background. |

---

## D. After dropping art in — tune item placement

Each lost item is overlaid on its scene at an `anchor` (percentage) coordinate defined per location in `build-assets/content-config.ts`. Once real backgrounds are in:

1. `npm run dev`, press Start repeatedly to cycle through characters/items.
2. For any item sitting in the wrong spot, edit that location's `anchor: { xPct, yPct }` in `content-config.ts` (0–100, measured on the 16:9 stage; `xPct` left→right, `yPct` top→bottom).
3. Refresh the manifest offline with the one-liner in "Format & naming rules" above (no API call).
4. Repeat until every item lands naturally on its spot.

Also re-check sprite/character sizing in `src/styles/memphis.css` (`.scene-item { width: 9% }`, `.character { width: 18% }`) if your art has very different proportions than the square placeholders.

---

## Checklist (19 files)

- [ ] scene-living-room · scene-boy-room · scene-girl-outdoor
- [ ] char-grandma · char-boy · char-girl · char-dad · char-mom
- [ ] item-glasses · item-football · item-toys · item-puppy · item-kitten · item-keys · item-wallet · item-newspaper · item-handbag · item-necklace · item-ring
