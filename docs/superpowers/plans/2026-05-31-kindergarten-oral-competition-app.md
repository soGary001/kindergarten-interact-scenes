# 幼儿园英语口语比赛互动 App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an offline, no-API-key desktop app (Windows `.exe` + Mac `.dmg`) where a child taps "Start", a randomly chosen AI character asks "Where is my X?" in an illustrated scene, the child answers aloud, and the character thanks them and gifts a 1–10 lucky number.

**Architecture:** Pure front-end web app (TypeScript + Vite) wrapped in a Tauri v2 shell. All spoken lines, audio, and art are **pre-generated once on the developer's machine** by a separate Node script that calls Mimo (text + TTS), then **committed to the repo**; the shipped app contains only static assets — **no API key, no network**. Because assets are committed, CI only *builds* — the API key never touches CI, and a clean clone builds an identical, fully-offline app. A `content.json` manifest drives random selection and rendering at runtime. The app degrades gracefully (shows subtitle, skips audio) when an audio file is missing, so it is runnable with placeholder content before the generation pipeline runs.

**Tech Stack:** TypeScript, Vite, Vitest (tests), Tauri v2 (desktop shell), Node (build-assets pipeline, dev-machine only), Mimo OpenAI-compatible API (build-time only), GitHub Actions + `tauri-action` (cross-platform packaging, build-only).

> **Pre-flight (do this BEFORE Task 0):** The Mimo TTS/chat request & response shapes, the valid `voice` mechanism, and the exact model ids are assumptions in this plan. See **Task -1 (Live Mimo API probe)** below — run it first and adjust `mimo-client.ts`/`.env.example`/`voiceByCharacter` to the confirmed reality. Everything downstream of audio depends on it.

---

## File Structure

```
package.json                  # npm scripts, deps
tsconfig.json
vite.config.ts                # Vite + Vitest config
index.html                    # single-page shell, mounts #app
src/
  main.ts                     # entry: build content -> AppController -> bind DOM + keyboard
  types.ts                    # shared content/runtime types
  selection.ts                # selectRound(), pickLuckyNumber() — pure, RNG injectable
  answer.ts                   # buildQuestionText(), buildExpectedAnswer() — pure
  app-controller.ts           # state machine: STANDBY -> QUESTION -> REWARD; emits ViewModel
  render.ts                   # renders a ViewModel into the DOM
  audio-player.ts             # plays a clip by id; no-op if missing
  content.ts                  # loadContent(): parse/validate content.json
  content.json                # runtime manifest (sample now; generated & committed later)
  styles/
    memphis.css               # Memphis/pastel visual system
public/                       # Vite copies this verbatim into dist/ (served at site root)
  assets/
    audio/                    # *.mp3 (generated on dev machine, COMMITTED so clean clones build offline)
    img/                      # backgrounds, characters, item sprites
tests/fixtures/
  sample-content.json         # frozen 2-character fixture for tests (decoupled from src/content.json)
build-assets/
  content-config.ts           # canonical data: characters, items, scenes, locations, line specs
  prompts.ts                  # persona prompt builders for the text model
  mimo-client.ts              # OpenAI-compatible client: chat() + tts(); fetch injectable
  generate.ts                 # orchestrate: chat -> tts -> write content.json + audio
  .env.example                # MIMO_BASE_URL=..., MIMO_API_KEY=...
tests/
  selection.test.ts
  answer.test.ts
  app-controller.test.ts
  content.test.ts
  content-config.test.ts
  mimo-client.test.ts
  generate.test.ts
src-tauri/                    # Tauri v2 scaffold (created by `tauri init`)
.github/workflows/build.yml   # matrix build: macOS .dmg + Windows .exe
docs/RUNBOOK.md               # how to generate assets, build, and operate at the event
```

Two responsibilities are kept apart: **runtime** (`src/`, consumes `content.json` + assets) and **build pipeline** (`build-assets/`, produces them). They meet only at the `content.json` schema defined in `src/types.ts`.

---

## Pre-flight — Confirm the Mimo API reality

### Task -1: Live Mimo API probe (do this first)

**Goal:** Replace guesses with facts before any code depends on them. The spec lists `mimo-v2.5-tts-voicedesign` / `mimo-v2.5-tts-voiceclone` / `mimo-v2.5-tts` — these may NOT be a plain OpenAI `/audio/speech` + catalog-`voice` shape. Confirm the truth.

**Files:** none committed — this is throwaway exploration. Use the key from a shell env var, never paste it into a file.

- [ ] **Step 1: Probe the chat endpoint**

```bash
export MIMO_KEY='tp-...'   # the real key, shell-only
curl -sS https://token-plan-cn.xiaomimimo.com/v1/chat/completions \
  -H "Authorization: Bearer $MIMO_KEY" -H "Content-Type: application/json" \
  -d '{"model":"mimo-v2.5","messages":[{"role":"user","content":"Say: Where are my glasses?"}]}'
```
Expected: a JSON body with `choices[0].message.content`. Record the working **text model id**.

- [ ] **Step 2: Probe TTS — try the OpenAI-style speech endpoint first**

```bash
curl -sS https://token-plan-cn.xiaomimimo.com/v1/audio/speech \
  -H "Authorization: Bearer $MIMO_KEY" -H "Content-Type: application/json" \
  -d '{"model":"mimo-v2.5-tts","input":"Hello there!","voice":"default","response_format":"mp3"}' \
  --output /tmp/mimo-probe.mp3 -w '%{http_code}\n'
file /tmp/mimo-probe.mp3
```
Expected: HTTP 200 and `/tmp/mimo-probe.mp3` is real audio. **If this fails**, the TTS API is not OpenAI-shaped — read Mimo's docs and record the real endpoint, request body (especially how voice is specified: a catalog id, OR a `voicedesign` text description, OR a `voiceclone` reference sample), response format, and model id.

- [ ] **Step 3: Determine the per-character voice mechanism**

Decide and record how to get 5 distinct voices (warm grandma / energetic boy / sweet girl / calm dad / gentle mom):
- If catalog voices exist → record the 5 voice ids → these feed `voiceByCharacter` in Task 15.
- If `voicedesign` (text-described voices) → the "voice" becomes a **description string** per character; note that `mimo-client.tts()` and `voiceByCharacter` must carry descriptions, not ids, and `.env` model becomes `mimo-v2.5-tts-voicedesign`.

- [ ] **Step 4: Write down the confirmed facts**

Record in a scratch note (or directly update the relevant later steps): real text model id, real TTS endpoint + body shape + model id, voice mechanism + the 5 voice ids/descriptions. Tasks 14, 15, and `.env.example` (Task 14) must be written to THESE facts, not the placeholder guesses. No commit — this task produces knowledge, not code.

---

## Phase 0 — Project scaffold

### Task 0: Initialize Vite + TypeScript + Vitest

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`

- [ ] **Step 1: Create the Vite project files**

`package.json`:

```json
{
  "name": "kindergarten-interact-scenes",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "generate": "tsx build-assets/generate.ts",
    "tauri": "tauri"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2",
    "tsx": "^4",
    "typescript": "^5",
    "vite": "^5",
    "vitest": "^2"
  },
  "dependencies": {
    "dotenv": "^16"
  }
}
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUnusedLocals": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["vite/client"]
  },
  "include": ["src", "build-assets", "tests"]
}
```

`vite.config.ts` (import `defineConfig` from **`vitest/config`**, not `vite` — the Vite export's type rejects the `test` key and would fail `tsc --noEmit`):

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Tauri expects a fixed dev port
  server: { port: 1420, strictPort: true },
  clearScreen: false,
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
```

`index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>English Fun Time</title>
    <link rel="stylesheet" href="/src/styles/memphis.css" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`src/main.ts` (temporary placeholder so the project runs):

```ts
document.querySelector<HTMLDivElement>("#app")!.innerHTML = "<h1>English Fun Time</h1>";
```

- [ ] **Step 2: Ensure `.gitignore` is correct**

This repo already has a `.gitignore`; confirm it contains exactly these rules (it must ignore secrets but **must NOT ignore `public/assets/audio/` or `public/assets/img/`**, which are committed assets):

`.gitignore`:

```
.superpowers/
.env
.env.*
!.env.example
/dist/
/build/
/src-tauri/target/
node_modules/
.DS_Store
```

Verify: `git check-ignore build-assets/.env public/assets/audio/x.mp3` should print only the first path (secrets ignored, audio tracked).

- [ ] **Step 3: Install dependencies**

Run: `npm install`
Expected: completes without errors; `node_modules/` created.

- [ ] **Step 4: Verify dev server boots**

Run: `npm run dev` then open `http://localhost:1420` (Ctrl-C to stop).
Expected: page shows "English Fun Time".

- [ ] **Step 5: Verify the test runner works**

Run: `npm test`
Expected: Vitest runs and reports "No test files found" (exit 0) — runner is wired.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html src/main.ts .gitignore
git commit -m "chore: scaffold Vite + TypeScript + Vitest project"
```

---

## Phase 1 — Content schema + sample content

### Task 1: Define runtime types

**Files:**
- Create: `src/types.ts`
- Test: `tests/content.test.ts` (added in Task 2)

- [ ] **Step 1: Write the types**

`src/types.ts`:

```ts
export interface ItemDef {
  id: string;          // "glasses"
  word: string;        // "glasses" (English noun shown/spoken)
  isPlural: boolean;   // glasses -> true (affects "is/are")
  sprite: string;      // filename under assets/img/, e.g. "item-glasses.svg"
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
  // audio: question clips keyed by itemId; thanks clips keyed by lucky number 1..10.
  questionAudio: Record<string, string>;        // itemId -> audio filename ("" if none yet)
  thanksAudio: Record<string, string>;          // "1".."10" -> audio filename ("" if none yet)
}

export interface Content {
  characters: CharacterDef[];
  scenes: SceneDef[];
}

// Runtime value produced by selection for one child's turn.
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
```

- [ ] **Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: add runtime content types"
```

### Task 2: Content loader with validation

**Files:**
- Create: `src/content.ts`
- Test: `tests/content.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/content.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { loadContent } from "../src/content";

const valid = {
  scenes: [
    { id: "s1", background: "bg.svg", locations: [
      { id: "table", labelEn: "table", preposition: "on", anchor: { xPct: 10, yPct: 20 } },
    ] },
  ],
  characters: [
    { id: "grandma", nameEn: "Grandma", portrait: "g.svg", sceneId: "s1",
      items: [{ id: "glasses", word: "glasses", isPlural: true, sprite: "i.svg" }],
      questionAudio: { glasses: "" }, thanksAudio: { "1": "" } },
  ],
};

describe("loadContent", () => {
  it("parses a valid manifest", () => {
    const c = loadContent(valid);
    expect(c.characters[0].id).toBe("grandma");
    expect(c.scenes[0].locations[0].preposition).toBe("on");
  });

  it("throws when a character references a missing scene", () => {
    const bad = structuredClone(valid);
    bad.characters[0].sceneId = "nope";
    expect(() => loadContent(bad)).toThrow(/scene/i);
  });

  it("throws when a character has no items", () => {
    const bad = structuredClone(valid);
    bad.characters[0].items = [];
    expect(() => loadContent(bad)).toThrow(/item/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/content.test.ts`
Expected: FAIL — `loadContent` not found.

- [ ] **Step 3: Write minimal implementation**

`src/content.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/content.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/content.ts tests/content.test.ts
git commit -m "feat: content manifest loader with validation"
```

### Task 3: Sample content.json + test fixture + asset folders

**Files:**
- Create: `src/content.json`, `tests/fixtures/sample-content.json`, `public/assets/audio/.gitkeep`, `public/assets/img/.gitkeep`

- [ ] **Step 1: Write a sample manifest covering two characters**

`src/content.json` (audio filenames are `""` until Phase 8; sprites/backgrounds use placeholder SVGs created in Phase 4):

```json
{
  "scenes": [
    {
      "id": "living-room",
      "background": "scene-living-room.svg",
      "locations": [
        { "id": "table",      "labelEn": "table",      "preposition": "on",    "anchor": { "xPct": 20, "yPct": 70 } },
        { "id": "sofa",       "labelEn": "sofa",       "preposition": "on",    "anchor": { "xPct": 50, "yPct": 72 } },
        { "id": "windowsill", "labelEn": "windowsill", "preposition": "on",    "anchor": { "xPct": 80, "yPct": 35 } },
        { "id": "bookshelf",  "labelEn": "bookshelf",  "preposition": "on",    "anchor": { "xPct": 12, "yPct": 30 } },
        { "id": "wardrobe",   "labelEn": "wardrobe",   "preposition": "in",    "anchor": { "xPct": 88, "yPct": 65 } },
        { "id": "pillow",     "labelEn": "pillow",     "preposition": "under", "anchor": { "xPct": 35, "yPct": 50 } }
      ]
    },
    {
      "id": "boy-room",
      "background": "scene-boy-room.svg",
      "locations": [
        { "id": "door",       "labelEn": "door",       "preposition": "by", "anchor": { "xPct": 15, "yPct": 55 } },
        { "id": "grass",      "labelEn": "grass",      "preposition": "on", "anchor": { "xPct": 78, "yPct": 80 } },
        { "id": "shelf",      "labelEn": "shelf",      "preposition": "on", "anchor": { "xPct": 40, "yPct": 30 } },
        { "id": "carpet",     "labelEn": "carpet",     "preposition": "on", "anchor": { "xPct": 55, "yPct": 82 } }
      ]
    }
  ],
  "characters": [
    {
      "id": "grandma",
      "nameEn": "Grandma",
      "portrait": "char-grandma.svg",
      "sceneId": "living-room",
      "items": [
        { "id": "glasses", "word": "glasses", "isPlural": true, "sprite": "item-glasses.svg" }
      ],
      "questionAudio": { "glasses": "" },
      "thanksAudio": { "1": "", "2": "", "3": "", "4": "", "5": "", "6": "", "7": "", "8": "", "9": "", "10": "" }
    },
    {
      "id": "boy",
      "nameEn": "Little Boy",
      "portrait": "char-boy.svg",
      "sceneId": "boy-room",
      "items": [
        { "id": "football", "word": "football", "isPlural": false, "sprite": "item-football.svg" },
        { "id": "toys",     "word": "toys",     "isPlural": true,  "sprite": "item-toys.svg" }
      ],
      "questionAudio": { "football": "", "toys": "" },
      "thanksAudio": { "1": "", "2": "", "3": "", "4": "", "5": "", "6": "", "7": "", "8": "", "9": "", "10": "" }
    }
  ]
}
```

- [ ] **Step 2: Freeze the same content as a test fixture**

Tests must NOT import `src/content.json` directly — Phase 8 regenerates that file (5 characters, full location lists), which would silently break index-based selection tests. Copy the sample to a frozen fixture that tests own:

Run: `mkdir -p tests/fixtures && cp src/content.json tests/fixtures/sample-content.json`

(From here on, `selection`, `app-controller`, and `render` tests import `../tests/fixtures/sample-content.json`. The `content.test.ts` already uses an inline object, so it's unaffected.)

- [ ] **Step 3: Create runtime asset folders under `public/`**

Vite copies `public/` verbatim into `dist/`, so these are the paths that survive the production build the Tauri app ships. (Do NOT put runtime media under `src/` — `/src/...` URLs 404 in the built app.)

Run: `mkdir -p public/assets/audio public/assets/img && touch public/assets/audio/.gitkeep public/assets/img/.gitkeep`

- [ ] **Step 4: Verify the sample loads**

Run: `npx tsx -e "import('./src/content.ts').then(async m => m.loadContent((await import('./src/content.json', { with: { type: 'json' } })).default)).then(() => console.log('OK'))"`
Expected: prints `OK`. (Requires Node ≥ 20.10 for JSON import attributes; CI pins this in Task 17.)

- [ ] **Step 5: Commit**

```bash
git add src/content.json tests/fixtures/sample-content.json public/assets/audio/.gitkeep public/assets/img/.gitkeep
git commit -m "feat: add sample content manifest, test fixture, and public asset folders"
```

---

## Phase 2 — Core logic (pure, TDD)

### Task 4: Answer/question text builders

**Files:**
- Create: `src/answer.ts`
- Test: `tests/answer.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/answer.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildQuestionText, buildExpectedAnswer } from "../src/answer";
import type { ItemDef, LocationDef } from "../src/types";

const glasses: ItemDef = { id: "glasses", word: "glasses", isPlural: true, sprite: "" };
const football: ItemDef = { id: "football", word: "football", isPlural: false, sprite: "" };
const windowsill: LocationDef = { id: "windowsill", labelEn: "windowsill", preposition: "on", anchor: { xPct: 0, yPct: 0 } };
const wardrobe: LocationDef = { id: "wardrobe", labelEn: "wardrobe", preposition: "in", anchor: { xPct: 0, yPct: 0 } };

describe("buildQuestionText", () => {
  it("uses 'are' for plural items", () => {
    expect(buildQuestionText(glasses)).toBe("Where are my glasses?");
  });
  it("uses 'is' for singular items", () => {
    expect(buildQuestionText(football)).toBe("Where is my football?");
  });
});

describe("buildExpectedAnswer", () => {
  it("plural + on", () => {
    expect(buildExpectedAnswer(glasses, windowsill)).toBe("They are on the windowsill.");
  });
  it("singular + in", () => {
    expect(buildExpectedAnswer(football, wardrobe)).toBe("It's in the wardrobe.");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/answer.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

`src/answer.ts`:

```ts
import type { ItemDef, LocationDef } from "./types";

export function buildQuestionText(item: ItemDef): string {
  const verb = item.isPlural ? "are" : "is";
  return `Where ${verb} my ${item.word}?`;
}

export function buildExpectedAnswer(item: ItemDef, loc: LocationDef): string {
  const subject = item.isPlural ? "They are" : "It's";
  return `${subject} ${loc.preposition} the ${loc.labelEn}.`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/answer.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/answer.ts tests/answer.test.ts
git commit -m "feat: question/answer text builders"
```

### Task 5: Random round selection

**Files:**
- Create: `src/selection.ts`
- Test: `tests/selection.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/selection.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { selectRound, pickLuckyNumber } from "../src/selection";
import { loadContent } from "../src/content";
import sample from "./fixtures/sample-content.json";

const content = loadContent(sample);

// Deterministic RNG: returns a fixed sequence of values in [0,1).
function seqRng(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

describe("pickLuckyNumber", () => {
  it("maps 0 -> 1 and ~0.99 -> 10, always within 1..10", () => {
    expect(pickLuckyNumber(() => 0)).toBe(1);
    expect(pickLuckyNumber(() => 0.999)).toBe(10);
  });
});

describe("selectRound", () => {
  it("produces a self-consistent round from the manifest", () => {
    // rng draws: character, item, location, luckyNumber
    const r = selectRound(content, seqRng([0, 0, 0, 0]));
    expect(r.character.id).toBe(content.characters[0].id);
    expect(r.scene.id).toBe(r.character.sceneId);
    expect(r.character.items).toContain(r.item);
    expect(r.scene.locations).toContain(r.location);
    expect(r.luckyNumber).toBe(1);
    expect(r.questionText).toBe(`Where ${r.item.isPlural ? "are" : "is"} my ${r.item.word}?`);
  });

  it("selects the boy + toys + grass with steered rng", () => {
    // character index 1 (boy): rng 0.5 over 2 chars -> index 1
    // item index 1 (toys): rng 0.6 over 2 items -> index 1
    // location index 1 (grass): rng 0.3 over 4 locations -> index 1
    const r = selectRound(content, seqRng([0.5, 0.6, 0.3, 0.5]));
    expect(r.character.id).toBe("boy");
    expect(r.item.id).toBe("toys");
    expect(r.location.id).toBe("grass");
    expect(r.expectedAnswer).toBe("They are on the grass.");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/selection.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

`src/selection.ts`:

```ts
import type { Content, Round } from "./types";
import { buildQuestionText, buildExpectedAnswer } from "./answer";

type Rng = () => number;

function pick<T>(arr: T[], rng: Rng): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function pickLuckyNumber(rng: Rng): number {
  return Math.floor(rng() * 10) + 1; // 1..10
}

export function selectRound(content: Content, rng: Rng = Math.random): Round {
  const character = pick(content.characters, rng);
  const item = pick(character.items, rng);
  const scene = content.scenes.find((s) => s.id === character.sceneId)!;
  const location = pick(scene.locations, rng);
  const luckyNumber = pickLuckyNumber(rng);
  return {
    character,
    scene,
    item,
    location,
    luckyNumber,
    questionText: buildQuestionText(item),
    expectedAnswer: buildExpectedAnswer(item, location),
    questionAudio: character.questionAudio[item.id] ?? "",
    thanksAudio: character.thanksAudio[String(luckyNumber)] ?? "",
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/selection.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/selection.ts tests/selection.test.ts
git commit -m "feat: random round selection with injectable RNG"
```

---

## Phase 3 — App state machine (TDD, DOM-free)

### Task 6: AppController

**Files:**
- Create: `src/app-controller.ts`
- Test: `tests/app-controller.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/app-controller.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { AppController } from "../src/app-controller";
import { loadContent } from "../src/content";
import sample from "./fixtures/sample-content.json";

const content = loadContent(sample);

describe("AppController", () => {
  it("starts in STANDBY and emits a standby view", () => {
    const views: any[] = [];
    const c = new AppController(content, () => 0, (v) => views.push(v));
    c.init();
    expect(views.at(-1).screen).toBe("standby");
  });

  it("start() -> QUESTION with a round, next() -> REWARD, next() -> STANDBY", () => {
    const views: any[] = [];
    const c = new AppController(content, () => 0, (v) => views.push(v));
    c.init();

    c.start();
    expect(views.at(-1).screen).toBe("question");
    expect(views.at(-1).round.character.id).toBe("grandma");

    c.next();
    expect(views.at(-1).screen).toBe("reward");
    expect(views.at(-1).round.luckyNumber).toBe(1);

    c.next();
    expect(views.at(-1).screen).toBe("standby");
  });

  it("start() ignores extra calls while not in standby", () => {
    const onView = vi.fn();
    const c = new AppController(content, () => 0, onView);
    c.init();
    c.start();
    const countAfterStart = onView.mock.calls.length;
    c.start(); // should be a no-op in QUESTION
    expect(onView.mock.calls.length).toBe(countAfterStart);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/app-controller.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

`src/app-controller.ts`:

```ts
import type { Content, Round } from "./types";
import { selectRound } from "./selection";

export type Screen = "standby" | "question" | "reward";

export interface ViewModel {
  screen: Screen;
  round: Round | null;
}

type Rng = () => number;
type OnView = (v: ViewModel) => void;

export class AppController {
  private screen: Screen = "standby";
  private round: Round | null = null;

  constructor(
    private content: Content,
    private rng: Rng = Math.random,
    private onView: OnView = () => {},
  ) {}

  init(): void {
    this.emit();
  }

  start(): void {
    if (this.screen !== "standby") return;
    this.round = selectRound(this.content, this.rng);
    this.screen = "question";
    this.emit();
  }

  next(): void {
    if (this.screen === "question") {
      this.screen = "reward";
    } else if (this.screen === "reward") {
      this.screen = "standby";
      this.round = null;
    } else {
      return; // standby ignores next()
    }
    this.emit();
  }

  toStandby(): void {
    this.screen = "standby";
    this.round = null;
    this.emit();
  }

  private emit(): void {
    this.onView({ screen: this.screen, round: this.round });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/app-controller.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app-controller.ts tests/app-controller.test.ts
git commit -m "feat: app state machine emitting view models"
```

---

## Phase 4 — Visual system, placeholder art, rendering

### Task 7: Memphis CSS + placeholder SVG assets

**Files:**
- Create: `src/styles/memphis.css`
- Create placeholder SVGs under `public/assets/img/` for **all 3 scenes, all 5 characters, and all 11 items** (random selection in the generated app can pick any character, so every referenced image must exist or it shows broken).

- [ ] **Step 1: Write the visual system**

`src/styles/memphis.css`:

```css
:root {
  --pink: #FF6B9D; --pink-dk: #C2185B;
  --cyan: #4DD0E1; --yellow: #FFD54F;
  --purple: #BA68C8; --green: #81C784;
  --bg: #FFF1F6; --ink: #3a3a3a;
  --radius: 28px;
}
* { box-sizing: border-box; }
html, body, #app { height: 100%; margin: 0; }
body {
  font-family: "Comic Sans MS", "Baloo 2", system-ui, sans-serif;
  color: var(--ink); background: var(--bg); overflow: hidden;
}
.screen {
  position: relative; height: 100vh; width: 100vw;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center; overflow: hidden;
}
.shape { position: absolute; opacity: 0.9; }
.shape.dot { border-radius: 50%; }
.shape.tri {
  width: 0; height: 0; border-left: 20px solid transparent;
  border-right: 20px solid transparent; border-bottom: 34px solid var(--cyan);
}
.title { font-size: 4rem; font-weight: 900; color: var(--pink); text-shadow: 4px 4px 0 var(--yellow); }
.subtitle { color: #888; font-size: 1.2rem; }
.btn-primary {
  font: inherit; font-size: 1.8rem; font-weight: 800; cursor: pointer;
  padding: 18px 56px; color: #fff; background: var(--pink);
  border: none; border-radius: 40px; box-shadow: 5px 5px 0 var(--pink-dk);
}
.btn-primary:active { transform: translate(3px, 3px); box-shadow: 2px 2px 0 var(--pink-dk); }
.scene-stage { position: relative; width: min(90vw, 1100px); aspect-ratio: 16/9; }
.scene-bg { width: 100%; height: 100%; object-fit: contain; }
.scene-item {
  position: absolute; width: 9%; transform: translate(-50%, -50%);
  animation: bob 1.4s ease-in-out infinite;
}
@keyframes bob { 0%,100% { transform: translate(-50%,-50%); } 50% { transform: translate(-50%,-62%); } }
.character { position: absolute; left: 3%; bottom: 4%; width: 18%; }
.bubble {
  position: absolute; left: 22%; bottom: 14%; max-width: 46%;
  background: #fff; border: 4px solid var(--pink); border-radius: 24px;
  padding: 16px 22px; font-size: 1.6rem; font-weight: 700; box-shadow: 4px 4px 0 var(--pink);
}
.hint { position: absolute; bottom: 18px; right: 24px; color: #aaa; font-size: 0.95rem; }
.lucky {
  font-size: 7rem; font-weight: 900; color: #fff; background: var(--purple);
  width: 200px; height: 200px; border-radius: 50%; display: flex; align-items: center;
  justify-content: center; box-shadow: 8px 8px 0 #7B1FA2; animation: pop 0.5s ease;
}
@keyframes pop { 0% { transform: scale(0); } 70% { transform: scale(1.15); } 100% { transform: scale(1); } }
.confetti { position: absolute; font-size: 2rem; animation: fall 2.4s linear infinite; }
@keyframes fall { 0% { transform: translateY(-10vh) rotate(0); } 100% { transform: translateY(110vh) rotate(360deg); } }
```

- [ ] **Step 2: Generate emoji placeholder SVGs for every referenced asset**

These keep the app fully runnable for all 5 characters before real art lands in Task 18. Create `build-assets/make-placeholders.sh` and run it once:

`build-assets/make-placeholders.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
DIR="public/assets/img"
mkdir -p "$DIR"

scene() { # name, bg-fill, emoji-strip
  printf '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900"><rect width="1600" height="900" fill="%s"/><text x="800" y="80" font-size="44" text-anchor="middle" fill="#999">%s (placeholder)</text></svg>' "$2" "$1" > "$DIR/scene-$1.svg"
}
emoji() { # filename, emoji, viewbox
  printf '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %s"><text x="50%%" y="78%%" font-size="100" text-anchor="middle">%s</text></svg>' "$3" "$2" > "$DIR/$1.svg"
}

scene "living-room" "#FFF7E6"
scene "boy-room"     "#E8F7FF"
scene "girl-outdoor" "#EAF7EA"

emoji "char-grandma" "👵" "200 260"
emoji "char-boy"     "👦" "200 260"
emoji "char-girl"    "👧" "200 260"
emoji "char-dad"     "👨" "200 260"
emoji "char-mom"     "👩" "200 260"

emoji "item-glasses"   "👓" "120 120"
emoji "item-football"  "⚽" "120 120"
emoji "item-toys"      "🧸" "120 120"
emoji "item-puppy"     "🐶" "120 120"
emoji "item-kitten"    "🐱" "120 120"
emoji "item-keys"      "🔑" "120 120"
emoji "item-wallet"    "👛" "120 120"
emoji "item-newspaper" "📰" "120 120"
emoji "item-handbag"   "👜" "120 120"
emoji "item-necklace"  "📿" "120 120"
emoji "item-ring"      "💍" "120 120"

echo "✓ wrote placeholder SVGs to $DIR"
```

Run: `bash build-assets/make-placeholders.sh`
Expected: 19 SVGs (3 scenes + 5 characters + 11 items) under `public/assets/img/`.

- [ ] **Step 3: Commit**

```bash
git add src/styles/memphis.css build-assets/make-placeholders.sh public/assets/img/*.svg
git commit -m "feat: Memphis visual system and emoji placeholder art for all assets"
```

### Task 8: Renderer

**Files:**
- Create: `src/render.ts`
- Test: `tests/render.test.ts`

- [ ] **Step 1: Add jsdom test environment for this file**

In `vite.config.ts`, the global `test.environment` is `node`. Add a per-file override by adding this comment at the top of the test (Vitest reads it):

`tests/render.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { renderView } from "../src/render";
import { loadContent } from "../src/content";
import { selectRound } from "../src/selection";
import sample from "./fixtures/sample-content.json";

const content = loadContent(sample);

describe("renderView", () => {
  let root: HTMLElement;
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    root = document.getElementById("app")!;
  });

  it("renders a Start button on standby", () => {
    renderView(root, { screen: "standby", round: null });
    expect(root.querySelector(".btn-primary")).not.toBeNull();
  });

  it("renders the question text and item sprite on question screen", () => {
    const round = selectRound(content, () => 0); // grandma + glasses + table
    renderView(root, { screen: "question", round });
    expect(root.querySelector(".bubble")!.textContent).toContain("Where are my glasses?");
    const item = root.querySelector(".scene-item") as HTMLElement;
    expect(item.style.left).toBe("20%"); // table anchor xPct
  });

  it("renders the lucky number on reward screen", () => {
    const round = selectRound(content, () => 0);
    renderView(root, { screen: "reward", round });
    expect(root.querySelector(".lucky")!.textContent).toBe(String(round.luckyNumber));
  });
});
```

- [ ] **Step 2: Install jsdom and run the test to verify it fails**

Run: `npm install -D jsdom && npx vitest run tests/render.test.ts`
Expected: FAIL — `renderView` not found.

- [ ] **Step 3: Write minimal implementation**

`src/render.ts`:

```ts
import type { ViewModel } from "./app-controller";

const IMG = (file: string) => `/assets/img/${file}`; // served from public/ in dev and dist

function scatterShapes(): string {
  return `
    <span class="shape dot" style="top:6%;left:8%;width:42px;height:42px;background:var(--yellow)"></span>
    <span class="shape tri" style="bottom:10%;right:9%"></span>
    <span class="shape dot" style="top:14%;right:16%;width:28px;height:28px;background:var(--purple)"></span>
    <span class="shape dot" style="bottom:16%;left:14%;width:34px;height:34px;background:var(--green)"></span>`;
}

export function renderView(root: HTMLElement, vm: ViewModel): void {
  if (vm.screen === "standby") {
    root.innerHTML = `
      <div class="screen">
        ${scatterShapes()}
        <div class="title">English Fun Time! 🎉</div>
        <p class="subtitle">幼儿园英语口语比赛</p>
        <button class="btn-primary" data-action="start">▶ 开始 Start</button>
      </div>`;
    return;
  }

  const r = vm.round!;
  if (vm.screen === "question") {
    root.innerHTML = `
      <div class="screen">
        ${scatterShapes()}
        <div class="scene-stage">
          <img class="scene-bg" src="${IMG(r.scene.background)}" alt="">
          <img class="scene-item" src="${IMG(r.item.sprite)}" alt=""
               style="left:${r.location.anchor.xPct}%;top:${r.location.anchor.yPct}%">
          <img class="character" src="${IMG(r.character.portrait)}" alt="">
          <div class="bubble">🔊 ${r.questionText}</div>
        </div>
        <div class="hint">老师按 → / 空格 进入下一步</div>
      </div>`;
    return;
  }

  // reward
  root.innerHTML = `
    <div class="screen">
      ${[..."🎊⭐🎈✨🌈"].map((c, i) =>
        `<span class="confetti" style="left:${(i + 1) * 16}%;animation-delay:${i * 0.3}s">${c}</span>`).join("")}
      <img class="character" style="position:static;width:140px" src="${IMG(r.character.portrait)}" alt="">
      <p class="subtitle" style="font-size:1.6rem;color:#7B1FA2">Thank you! Here is your lucky number…</p>
      <div class="lucky">${r.luckyNumber}</div>
      <div class="hint">老师按 → / 空格 回到开始</div>
    </div>`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/render.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/render.ts tests/render.test.ts package.json package-lock.json
git commit -m "feat: DOM renderer for all three screens"
```

---

## Phase 5 — Audio playback

### Task 9: Audio player (graceful no-op when missing)

**Files:**
- Create: `src/audio-player.ts`
- Test: `tests/audio-player.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/audio-player.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AudioPlayer } from "../src/audio-player";

describe("AudioPlayer", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("does nothing when the clip filename is empty", async () => {
    const player = new AudioPlayer();
    await expect(player.play("")).resolves.toBeUndefined();
  });

  it("creates and plays an Audio element for a real filename", async () => {
    const playSpy = vi
      .spyOn(HTMLMediaElement.prototype, "play")
      .mockResolvedValue(undefined as unknown as void);
    const player = new AudioPlayer();
    await player.play("grandma-q-glasses.mp3");
    expect(playSpy).toHaveBeenCalledOnce();
  });

  it("swallows playback errors (e.g. missing file) without throwing", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockRejectedValue(new Error("no file"));
    const player = new AudioPlayer();
    await expect(player.play("missing.mp3")).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/audio-player.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

`src/audio-player.ts`:

```ts
const AUDIO = (file: string) => `/assets/audio/${file}`; // served from public/ in dev and dist

export class AudioPlayer {
  private current: HTMLAudioElement | null = null;

  async play(file: string): Promise<void> {
    this.stop();
    if (!file) return;
    const el = new Audio(AUDIO(file));
    this.current = el;
    try {
      await el.play();
    } catch {
      // Missing file or autoplay block — degrade silently; subtitle still shows.
    }
  }

  stop(): void {
    if (this.current) {
      this.current.pause();
      this.current = null;
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/audio-player.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/audio-player.ts tests/audio-player.test.ts
git commit -m "feat: audio player with graceful degradation"
```

---

## Phase 6 — Wire it together (browser-runnable)

### Task 10: main.ts — bind controller, renderer, audio, keyboard

**Files:**
- Modify: `src/main.ts` (replace placeholder)

- [ ] **Step 1: Replace main.ts**

One key press = exactly one transition: in standby a press calls `start()`; otherwise it calls `next()`. We track the current screen from the view callback so the handler knows which to call (calling both would double-advance).

`src/main.ts`:

```ts
import { loadContent } from "./content";
import { AppController, type ViewModel } from "./app-controller";
import { renderView } from "./render";
import { AudioPlayer } from "./audio-player";
import rawContent from "./content.json";

const root = document.querySelector<HTMLDivElement>("#app")!;
const content = loadContent(rawContent);
const audio = new AudioPlayer();

let currentScreen: ViewModel["screen"] = "standby";

const controller = new AppController(content, Math.random, (vm: ViewModel) => {
  currentScreen = vm.screen;
  renderView(root, vm);
  if (vm.screen === "question") audio.play(vm.round!.questionAudio);
  else if (vm.screen === "reward") audio.play(vm.round!.thanksAudio);
  else audio.stop();
});

// Click delegation: the Start button (a real user gesture, so audio is allowed to play).
root.addEventListener("click", (e) => {
  const target = (e.target as HTMLElement).closest("[data-action='start']");
  if (target) controller.start();
});

// Operator keyboard controls: one press = one transition.
window.addEventListener("keydown", (e) => {
  if (e.key === " " || e.key === "Enter" || e.key === "ArrowRight") {
    e.preventDefault();
    if (currentScreen === "standby") controller.start();
    else controller.next();
  } else if (e.key === "Escape") {
    controller.toStandby();
  }
});

controller.init();
```

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: PASS — all suites green (content, answer, selection, app-controller, render, audio-player).

- [ ] **Step 3: Manually verify in the browser**

Run: `npm run dev`, open `http://localhost:1420`.
Verify: Start button → scene with character + glasses sprite + "Where are my glasses?" bubble → press Space → lucky number + confetti → press Space → back to standby. (No audio yet — expected before Phase 8.)

- [ ] **Step 4: Commit**

```bash
git add src/main.ts
git commit -m "feat: wire controller, renderer, audio, and operator keyboard controls"
```

---

## Phase 7 — Tauri desktop shell + local .dmg

### Task 11: Add Tauri v2 and build a local desktop app

**Files:**
- Create: `src-tauri/` (scaffolded by `tauri init`)
- Modify: `src-tauri/tauri.conf.json` (bundle targets, window)

- [ ] **Step 1: Verify Rust toolchain is present**

Run: `rustc --version || echo "INSTALL RUST: https://rustup.rs"`
Expected: prints a version. If not, install via `https://rustup.rs` before continuing.

- [ ] **Step 2: Initialize Tauri non-interactively**

Run:

```bash
npx tauri init --ci \
  --app-name "English Fun Time" \
  --window-title "English Fun Time" \
  --frontend-dist ../dist \
  --dev-url http://localhost:1420 \
  --before-dev-command "npm run dev" \
  --before-build-command "npm run build"
```

Expected: creates `src-tauri/` with `tauri.conf.json`, `Cargo.toml`, `src/main.rs`.

- [ ] **Step 3: Overwrite `src-tauri/tauri.conf.json` with the full known-good config**

Don't hand-merge — replace the generated file's contents with this complete v2 config (adjust the `$schema`/`version` only if `tauri init` wrote a different schema URL). The default identifier `com.tauri.dev` MUST be changed or `tauri build` refuses to bundle. `withGlobalTauri`/`security.csp` left at defaults; `dangerousUseHttpScheme` is not needed.

`src-tauri/tauri.conf.json`:

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "English Fun Time",
  "version": "0.1.0",
  "identifier": "com.kindergarten.englishfuntime",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:1420",
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build"
  },
  "app": {
    "windows": [
      { "title": "English Fun Time", "width": 1280, "height": 800, "resizable": true, "fullscreen": false }
    ],
    "security": { "csp": null }
  },
  "bundle": {
    "active": true,
    "targets": ["dmg", "nsis"],
    "icon": ["icons/32x32.png", "icons/128x128.png", "icons/icon.icns", "icons/icon.ico"]
  }
}
```

(`dmg` = macOS, `nsis` = Windows `.exe` installer. Each target only builds on its own OS — see Phase 9 for cross-building. The `icons/` are the defaults `tauri init` generates; keep them until real branding.)

- [ ] **Step 4: Allow audio autoplay in the webview**

The question/thank-you audio plays right after a Start click/keypress (a user gesture), which normally satisfies autoplay policy. To be safe across WebView2 (Windows) and WKWebView (macOS), and because playback is awaited across a microtask, explicitly allow autoplay. In `src-tauri/tauri.conf.json` the simplest portable approach is to rely on the user-gesture (already present) — but verify in the PACKAGED app, not just `npm run dev` (Chrome's dev autoplay rules differ). If the packaged app is silent, add to `src-tauri/src/lib.rs` (or `main.rs`) on the WebviewWindow builder for Windows:

```rust
// Windows (WebView2): allow autoplay without a gesture.
#[cfg(target_os = "windows")]
{
  // see tauri additional_browser_args / WebView2 "--autoplay-policy=no-user-gesture-required"
}
```

Record the outcome; do not block on it now since the gesture path should work. (Task 16 Step 4 is where audio is verified end to end.)

- [ ] **Step 5: Run the app in desktop dev mode**

Run: `npm run tauri dev`
Expected: a native window opens showing the standby screen; the full flow works with mouse + keyboard.

- [ ] **Step 6: Build a local installer for the current OS**

Run (on macOS): `npm run tauri build`
Expected: produces a `.dmg` under `src-tauri/target/release/bundle/dmg/`. Open it and confirm images AND audio work in the packaged app (this is the real test of the `public/` asset paths from B3 and autoplay from Step 4).

- [ ] **Step 7: Commit**

```bash
git add src-tauri package.json package-lock.json
git commit -m "feat: add Tauri v2 desktop shell (dmg + nsis targets)"
```

> The `.env`, `node_modules/`, `dist/`, and `src-tauri/target/` are already in `.gitignore` from project setup.

---

## Phase 8 — Build-assets generation pipeline

### Task 12: Canonical content config

**Files:**
- Create: `build-assets/content-config.ts`
- Test: `tests/content-config.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/content-config.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { CONTENT_CONFIG, enumerateAudioLines } from "../build-assets/content-config";

describe("CONTENT_CONFIG", () => {
  it("has all five characters", () => {
    expect(CONTENT_CONFIG.characters.map((c) => c.id).sort())
      .toEqual(["boy", "dad", "girl", "grandma", "mom"]);
  });

  it("every character's scene exists", () => {
    const scenes = new Set(CONTENT_CONFIG.scenes.map((s) => s.id));
    for (const c of CONTENT_CONFIG.characters) expect(scenes.has(c.sceneId)).toBe(true);
  });
});

describe("enumerateAudioLines", () => {
  it("produces one question line per item and 10 thanks lines per character", () => {
    const lines = enumerateAudioLines(CONTENT_CONFIG);
    const grandmaQ = lines.filter((l) => l.characterId === "grandma" && l.kind === "question");
    const grandmaT = lines.filter((l) => l.characterId === "grandma" && l.kind === "thanks");
    expect(grandmaQ).toHaveLength(1);   // grandma has 1 item (glasses)
    expect(grandmaT).toHaveLength(10);  // lucky numbers 1..10
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/content-config.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the config**

`build-assets/content-config.ts` (the canonical source of truth; anchors copied from `src/content.json` and extended to all 5 characters):

```ts
export interface ConfigItem { id: string; word: string; isPlural: boolean; sprite: string; }
export interface ConfigLocation { id: string; labelEn: string; preposition: string; anchor: { xPct: number; yPct: number }; }
export interface ConfigScene { id: string; background: string; locations: ConfigLocation[]; }
export interface ConfigCharacter { id: string; nameEn: string; persona: string; portrait: string; sceneId: string; items: ConfigItem[]; }
export interface ContentConfig { scenes: ConfigScene[]; characters: ConfigCharacter[]; }

const livingRoom: ConfigScene = {
  id: "living-room",
  background: "scene-living-room.svg",
  locations: [
    { id: "table",      labelEn: "table",      preposition: "on",    anchor: { xPct: 20, yPct: 70 } },
    { id: "tv-cabinet", labelEn: "TV cabinet", preposition: "on",    anchor: { xPct: 64, yPct: 60 } },
    { id: "chair",      labelEn: "chair",      preposition: "on",    anchor: { xPct: 30, yPct: 66 } },
    { id: "sofa",       labelEn: "sofa",       preposition: "on",    anchor: { xPct: 50, yPct: 72 } },
    { id: "windowsill", labelEn: "windowsill", preposition: "on",    anchor: { xPct: 80, yPct: 35 } },
    { id: "desk-lamp",  labelEn: "lamp",       preposition: "by",    anchor: { xPct: 72, yPct: 50 } },
    { id: "carpet",     labelEn: "carpet",     preposition: "on",    anchor: { xPct: 50, yPct: 88 } },
    { id: "wardrobe",   labelEn: "wardrobe",   preposition: "in",    anchor: { xPct: 88, yPct: 65 } },
    { id: "bookshelf",  labelEn: "bookshelf",  preposition: "on",    anchor: { xPct: 12, yPct: 30 } },
    { id: "pillow",     labelEn: "pillow",     preposition: "under", anchor: { xPct: 35, yPct: 50 } },
  ],
};

// Grandma/Dad/Mom share living-room. Grandma uses all incl. pillow;
// Dad/Mom use the same set (pillow harmless to include).
const boyScene: ConfigScene = {
  id: "boy-room",
  background: "scene-boy-room.svg",
  locations: [
    { id: "door",       labelEn: "door",       preposition: "by", anchor: { xPct: 15, yPct: 55 } },
    { id: "grass",      labelEn: "grass",      preposition: "on", anchor: { xPct: 78, yPct: 80 } },
    { id: "shelf",      labelEn: "shelf",      preposition: "on", anchor: { xPct: 40, yPct: 30 } },
    { id: "chair",      labelEn: "chair",      preposition: "on", anchor: { xPct: 30, yPct: 66 } },
    { id: "sofa",       labelEn: "sofa",       preposition: "on", anchor: { xPct: 55, yPct: 70 } },
    { id: "windowsill", labelEn: "windowsill", preposition: "on", anchor: { xPct: 85, yPct: 32 } },
    { id: "carpet",     labelEn: "carpet",     preposition: "on", anchor: { xPct: 50, yPct: 86 } },
  ],
};

const girlScene: ConfigScene = {
  id: "girl-outdoor",
  background: "scene-girl-outdoor.svg",
  locations: [
    { id: "station", labelEn: "station", preposition: "at", anchor: { xPct: 18, yPct: 50 } },
    { id: "park",    labelEn: "park",    preposition: "in", anchor: { xPct: 40, yPct: 70 } },
    { id: "garden",  labelEn: "garden",  preposition: "in", anchor: { xPct: 62, yPct: 72 } },
    { id: "balcony", labelEn: "balcony", preposition: "on", anchor: { xPct: 82, yPct: 40 } },
    { id: "shelf",   labelEn: "shelf",   preposition: "on", anchor: { xPct: 30, yPct: 34 } },
    { id: "carpet",  labelEn: "carpet",  preposition: "on", anchor: { xPct: 55, yPct: 88 } },
  ],
};

export const CONTENT_CONFIG: ContentConfig = {
  scenes: [livingRoom, boyScene, girlScene],
  characters: [
    { id: "grandma", nameEn: "Grandma", persona: "a warm, gentle grandmother", portrait: "char-grandma.svg", sceneId: "living-room",
      items: [{ id: "glasses", word: "glasses", isPlural: true, sprite: "item-glasses.svg" }] },
    { id: "boy", nameEn: "Little Boy", persona: "an energetic, cheerful little boy", portrait: "char-boy.svg", sceneId: "boy-room",
      items: [
        { id: "football", word: "football", isPlural: false, sprite: "item-football.svg" },
        { id: "toys", word: "toys", isPlural: true, sprite: "item-toys.svg" },
      ] },
    { id: "girl", nameEn: "Little Girl", persona: "a sweet, curious little girl", portrait: "char-girl.svg", sceneId: "girl-outdoor",
      items: [
        { id: "puppy", word: "puppy", isPlural: false, sprite: "item-puppy.svg" },
        { id: "kitten", word: "kitten", isPlural: false, sprite: "item-kitten.svg" },
      ] },
    { id: "dad", nameEn: "Dad", persona: "a calm, friendly father", portrait: "char-dad.svg", sceneId: "living-room",
      items: [
        { id: "keys", word: "keys", isPlural: true, sprite: "item-keys.svg" },
        { id: "wallet", word: "wallet", isPlural: false, sprite: "item-wallet.svg" },
        { id: "newspaper", word: "newspaper", isPlural: false, sprite: "item-newspaper.svg" },
      ] },
    { id: "mom", nameEn: "Mom", persona: "a kind, gentle mother", portrait: "char-mom.svg", sceneId: "living-room",
      items: [
        { id: "handbag", word: "handbag", isPlural: false, sprite: "item-handbag.svg" },
        { id: "necklace", word: "necklace", isPlural: false, sprite: "item-necklace.svg" },
        { id: "ring", word: "ring", isPlural: false, sprite: "item-ring.svg" },
      ] },
  ],
};

export type AudioKind = "question" | "thanks";
export interface AudioLine {
  characterId: string;
  kind: AudioKind;
  key: string;        // itemId for question; "1".."10" for thanks
  filename: string;   // output mp3 name
}

export function enumerateAudioLines(cfg: ContentConfig): AudioLine[] {
  const lines: AudioLine[] = [];
  for (const c of cfg.characters) {
    for (const item of c.items) {
      lines.push({ characterId: c.id, kind: "question", key: item.id, filename: `${c.id}-q-${item.id}.mp3` });
    }
    for (let n = 1; n <= 10; n++) {
      lines.push({ characterId: c.id, kind: "thanks", key: String(n), filename: `${c.id}-t-${n}.mp3` });
    }
  }
  return lines;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/content-config.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add build-assets/content-config.ts tests/content-config.test.ts
git commit -m "feat: canonical content config for all 5 characters + audio enumeration"
```

### Task 13: Prompt builders

**Files:**
- Create: `build-assets/prompts.ts`
- Test: covered indirectly; add a focused unit test `tests/prompts.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/prompts.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { questionPrompt, thanksPrompt } from "../build-assets/prompts";

describe("prompts", () => {
  it("question prompt mentions persona, item, and asks for one short line", () => {
    const p = questionPrompt("a warm, gentle grandmother", "glasses", true);
    expect(p).toMatch(/grandmother/);
    expect(p).toMatch(/glasses/);
    expect(p).toMatch(/Where are/);
  });
  it("thanks prompt includes the lucky number and a thank-you", () => {
    const p = thanksPrompt("an energetic, cheerful little boy", 7);
    expect(p).toMatch(/little boy/);
    expect(p).toMatch(/7/);
    expect(p).toMatch(/lucky number/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/prompts.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the prompt builders**

`build-assets/prompts.ts`:

```ts
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

export function thanksPrompt(persona: string, luckyNumber: number): string {
  return [
    `You are ${persona} speaking to a young child in a kindergarten English game.`,
    `Thank the child warmly and give them a lucky number.`,
    `It MUST literally contain "lucky number" and the digit ${luckyNumber}.`,
    `Output only the spoken line, no quotes, max 16 words.`,
  ].join(" ");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/prompts.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add build-assets/prompts.ts tests/prompts.test.ts
git commit -m "feat: persona prompt builders for spoken lines"
```

### Task 14: Mimo client (OpenAI-compatible)

**Files:**
- Create: `build-assets/mimo-client.ts`, `build-assets/.env.example`
- Test: `tests/mimo-client.test.ts`

- [ ] **Step 1: Write the failing test (fetch injected)**

`tests/mimo-client.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { MimoClient } from "../build-assets/mimo-client";

describe("MimoClient.chat", () => {
  it("posts to /chat/completions and returns the message content", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "Where are my glasses?" } }] }),
    });
    const c = new MimoClient({ baseUrl: "https://x/v1", apiKey: "k", fetchImpl: fetchMock as any });
    const text = await c.chat("model-x", "hi");
    expect(text).toBe("Where are my glasses?");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://x/v1/chat/completions");
    expect((init.headers as any).Authorization).toBe("Bearer k");
  });

  it("throws on non-ok response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => "err" });
    const c = new MimoClient({ baseUrl: "https://x/v1", apiKey: "k", fetchImpl: fetchMock as any });
    await expect(c.chat("m", "hi")).rejects.toThrow(/500/);
  });
});

describe("MimoClient.tts", () => {
  it("returns audio bytes from the speech endpoint", async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => bytes.buffer,
    });
    const c = new MimoClient({ baseUrl: "https://x/v1", apiKey: "k", fetchImpl: fetchMock as any });
    const out = await c.tts("mimo-v2.5-tts", "hello", "voice-1");
    expect(new Uint8Array(out)).toEqual(bytes);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe("https://x/v1/audio/speech");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/mimo-client.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the client**

`build-assets/mimo-client.ts`:

```ts
export interface MimoOptions {
  baseUrl: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
}

export class MimoClient {
  private fetchImpl: typeof fetch;
  constructor(private opts: MimoOptions) {
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  async chat(model: string, prompt: string): Promise<string> {
    const res = await this.fetchImpl(`${this.opts.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.opts.apiKey}` },
      body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], temperature: 0.8 }),
    });
    if (!res.ok) throw new Error(`chat failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return (data.choices?.[0]?.message?.content ?? "").trim();
  }

  async tts(model: string, input: string, voice: string): Promise<ArrayBuffer> {
    const res = await this.fetchImpl(`${this.opts.baseUrl}/audio/speech`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.opts.apiKey}` },
      body: JSON.stringify({ model, input, voice, response_format: "mp3" }),
    });
    if (!res.ok) throw new Error(`tts failed: ${res.status}`);
    return await res.arrayBuffer();
  }
}
```

`build-assets/.env.example` (set the model ids to whatever **Task -1 (probe)** confirmed — the values below are the starting guess; the spec mentioned `mimo-v2.5-tts-voicedesign`, so this may need to change):

```
MIMO_BASE_URL=https://token-plan-cn.xiaomimimo.com/v1
MIMO_API_KEY=replace-with-your-key
MIMO_TEXT_MODEL=mimo-v2.5
MIMO_TTS_MODEL=mimo-v2.5-tts
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/mimo-client.test.ts`
Expected: PASS (3 tests).

> **Note:** This client/test encodes the *assumed* OpenAI-compatible shape. **Task -1 (probe) is authoritative** — if the real TTS uses a `voicedesign` description instead of a catalog `voice`, or a different endpoint/body, update `tts()` (and this test) to match. The client isolates the API so only this file changes.

- [ ] **Step 5: Commit**

```bash
git add build-assets/mimo-client.ts build-assets/.env.example tests/mimo-client.test.ts
git commit -m "feat: OpenAI-compatible Mimo client (chat + tts)"
```

### Task 15: Generator orchestration

**Files:**
- Create: `build-assets/generate.ts`
- Test: `tests/generate.test.ts`

- [ ] **Step 1: Write the failing test (pure assembly, no real I/O)**

We test the pure assembly function `buildManifest`, which turns the config + a map of generated question texts into the runtime `Content`. The file-writing `main()` is exercised live in Task 16.

`tests/generate.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildManifest } from "../build-assets/generate";
import { CONTENT_CONFIG, enumerateAudioLines } from "../build-assets/content-config";
import { loadContent } from "../src/content";

describe("buildManifest", () => {
  it("produces a Content manifest that passes loadContent validation", () => {
    const lines = enumerateAudioLines(CONTENT_CONFIG);
    // every line maps to its planned filename
    const audioByLine = new Map(lines.map((l) => [`${l.characterId}:${l.kind}:${l.key}`, l.filename]));
    const manifest = buildManifest(CONTENT_CONFIG, audioByLine);
    expect(() => loadContent(manifest)).not.toThrow();
  });

  it("wires question audio filenames per item and thanks audio per number", () => {
    const lines = enumerateAudioLines(CONTENT_CONFIG);
    const audioByLine = new Map(lines.map((l) => [`${l.characterId}:${l.kind}:${l.key}`, l.filename]));
    const manifest = buildManifest(CONTENT_CONFIG, audioByLine);
    const grandma = manifest.characters.find((c) => c.id === "grandma")!;
    expect(grandma.questionAudio.glasses).toBe("grandma-q-glasses.mp3");
    expect(grandma.thanksAudio["7"]).toBe("grandma-t-7.mp3");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/generate.test.ts`
Expected: FAIL — `buildManifest` not found.

- [ ] **Step 3: Write the generator**

`build-assets/generate.ts`:

```ts
import { writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { CONTENT_CONFIG, enumerateAudioLines, type ContentConfig } from "./content-config";
import { MimoClient } from "./mimo-client";
import { questionPrompt, thanksPrompt } from "./prompts";
import type { Content, CharacterDef } from "../src/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, "../src");                       // content.json lives here (imported)
const AUDIO_DIR = resolve(__dirname, "../public/assets/audio"); // mp3s live here (served via public/)

/** Pure: assemble the runtime manifest from config + planned audio filenames. */
export function buildManifest(cfg: ContentConfig, audioByLine: Map<string, string>): Content {
  const scenes = cfg.scenes.map((s) => ({
    id: s.id, background: s.background,
    locations: s.locations.map((l) => ({ ...l })),
  }));
  const characters: CharacterDef[] = cfg.characters.map((c) => {
    const questionAudio: Record<string, string> = {};
    for (const item of c.items) {
      questionAudio[item.id] = audioByLine.get(`${c.id}:question:${item.id}`) ?? "";
    }
    const thanksAudio: Record<string, string> = {};
    for (let n = 1; n <= 10; n++) {
      thanksAudio[String(n)] = audioByLine.get(`${c.id}:thanks:${n}`) ?? "";
    }
    return {
      id: c.id, nameEn: c.nameEn, portrait: c.portrait, sceneId: c.sceneId,
      items: c.items.map((i) => ({ ...i })),
      questionAudio, thanksAudio,
    };
  });
  return { scenes, characters };
}

/** Live: call Mimo for each line, write mp3s, write content.json. */
async function main(): Promise<void> {
  dotenv.config({ path: resolve(__dirname, ".env") });
  const { MIMO_BASE_URL, MIMO_API_KEY, MIMO_TEXT_MODEL, MIMO_TTS_MODEL } = process.env;
  if (!MIMO_BASE_URL || !MIMO_API_KEY) throw new Error("Set MIMO_BASE_URL and MIMO_API_KEY in build-assets/.env");

  const client = new MimoClient({ baseUrl: MIMO_BASE_URL, apiKey: MIMO_API_KEY });
  const textModel = MIMO_TEXT_MODEL ?? "mimo-v2.5";
  const ttsModel = MIMO_TTS_MODEL ?? "mimo-v2.5-tts";

  // One distinct "voice" per character. NOTE: whether these are catalog voice ids OR
  // voicedesign description strings is decided in Task -1 (Live Mimo API probe).
  // Replace these values with whatever the probe confirmed.
  const voiceByCharacter: Record<string, string> = {
    grandma: "female_warm", boy: "child_boy", girl: "child_girl", dad: "male_calm", mom: "female_gentle",
  };

  const lines = enumerateAudioLines(CONTENT_CONFIG);
  const audioByLine = new Map<string, string>();
  const audioDir = AUDIO_DIR;
  await mkdir(audioDir, { recursive: true });

  for (const line of lines) {
    const ch = CONTENT_CONFIG.characters.find((c) => c.id === line.characterId)!;
    let spoken: string;
    if (line.kind === "question") {
      const item = ch.items.find((i) => i.id === line.key)!;
      spoken = await client.chat(textModel, questionPrompt(ch.persona, item.word, item.isPlural));
    } else {
      spoken = await client.chat(textModel, thanksPrompt(ch.persona, Number(line.key)));
    }
    const audio = await client.tts(ttsModel, spoken, voiceByCharacter[ch.id] ?? "default");
    await writeFile(resolve(audioDir, line.filename), Buffer.from(audio));
    audioByLine.set(`${line.characterId}:${line.kind}:${line.key}`, line.filename);
    console.log(`✓ ${line.filename}: ${spoken}`);
  }

  const manifest = buildManifest(CONTENT_CONFIG, audioByLine);
  await writeFile(resolve(SRC, "content.json"), JSON.stringify(manifest, null, 2));
  console.log("✓ wrote src/content.json");
}

// Run only when invoked directly (not when imported by tests).
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/generate.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add build-assets/generate.ts tests/generate.test.ts
git commit -m "feat: asset generator orchestration (pure manifest + live main)"
```

### Task 16: First live generation run (dev machine only)

This runs ONCE on the developer's machine that holds the key. The outputs (`src/content.json` + mp3s) are **committed**, so CI and clean clones never need the key.

**Files:**
- Create: `build-assets/.env` (NOT committed — gitignored)
- Modify/create (committed): `src/content.json`, `public/assets/audio/*.mp3`

- [ ] **Step 1: Create the .env from the example with the real key**

```bash
cp build-assets/.env.example build-assets/.env
# Edit build-assets/.env: set MIMO_API_KEY to the real key, and set the
# model ids / TTS settings to whatever Task -1 (the API probe) confirmed.
```

Verify it is ignored: `git check-ignore build-assets/.env` → should print the path (matched by the `.env` rule).

- [ ] **Step 2: Run the generator for real**

Run: `npm run generate`
Expected: prints `✓ <file>: <spoken line>` for each of the **61** lines (question lines = 1+2+2+3+3 = 11; thanks lines = 5×10 = 50) and `✓ wrote src/content.json`. mp3 files appear under `public/assets/audio/`.

- [ ] **Step 3: If the API shape differs, fix the client and rerun**

If chat or tts errors with a schema/voice problem, adjust `build-assets/mimo-client.ts` (request body / voice handling) to match what Task -1 found, keep `tests/mimo-client.test.ts` green, and rerun `npm run generate`. (`content-config.ts` is the ONLY source of truth — never hand-edit `src/content.json`; it is overwritten on every run.)

- [ ] **Step 4: Verify audio plays end-to-end**

Run: `npm run dev`, open the app, press Start. Confirm the character's question is spoken and the thank-you + number is spoken on the reward screen.

- [ ] **Step 5: Commit the generated manifest AND audio**

```bash
git add src/content.json public/assets/audio/*.mp3
git commit -m "chore: generate content manifest + TTS audio from Mimo"
```

> Audio is committed (≈61 short clips, a few MB) so a clean clone builds an identical app fully offline and CI never needs the API key. If the audio set ever grows too large for git, switch to Git LFS rather than gitignoring it (gitignoring would make clean-clone builds ship without sound).

---

## Phase 9 — Cross-platform packaging

### Task 17: GitHub Actions matrix build (.dmg + .exe)

**Files:**
- Create: `.github/workflows/build.yml`

- [ ] **Step 1: Write the workflow**

`.github/workflows/build.yml`:

```yaml
name: build
on:
  workflow_dispatch:
  push:
    tags: ["v*"]

jobs:
  build:
    strategy:
      fail-fast: false
      matrix:
        include:
          - os: macos-latest
          - os: windows-latest
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - uses: dtolnay/rust-toolchain@stable
      - name: Install deps
        run: npm ci
      # No asset generation in CI: content.json + audio are committed (Task 16),
      # so the API key NEVER enters CI and both OS builds are byte-identical content.
      - name: Build app
        uses: tauri-apps/tauri-action@v0
      - name: Upload installers
        uses: actions/upload-artifact@v4
        with:
          name: installer-${{ matrix.os }}
          path: |
            src-tauri/target/release/bundle/dmg/*.dmg
            src-tauri/target/release/bundle/nsis/*.exe
```

> Because generated assets are committed, CI needs **no secrets at all** — the API key lives only on the developer's machine in `build-assets/.env`. This also guarantees the `.dmg` and `.exe` speak the *same* lines (generating per-OS in CI would produce divergent content at temperature 0.8).

- [ ] **Step 2: Document local-only alternative (no CI)**

If not using GitHub: assets are already generated/committed (Task 16), so just build `.dmg` on a Mac (`npm run tauri build`) and `.exe` on a Windows machine (`npm run tauri build`). Both need their own OS; there is no reliable single-machine cross-build for Tauri.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/build.yml
git commit -m "ci: cross-platform Tauri build (dmg + exe) via tauri-action"
```

---

## Phase 10 — Final art + runbook

### Task 18: Replace placeholder art with AI-generated illustrations

**Files:**
- Replace: all `public/assets/img/*.svg` (or add `.png`) — backgrounds (3), characters (5), item sprites (11)

- [ ] **Step 1: Produce the illustrations**

Using an available image-generation tool (the open item from the spec — Mimo's listed models do not include image gen), produce flat, cute, Memphis-pastel art into `public/assets/img/`:
- 3 backgrounds: `scene-living-room`, `scene-boy-room`, `scene-girl-outdoor` (16:9, furniture/places visible at the anchor positions in `content-config.ts`).
- 5 character portraits (transparent): grandma, boy, girl, dad, mom.
- 11 item sprites (transparent): glasses, football, toys, puppy, kitten, keys, wallet, newspaper, handbag, necklace, ring.

Keep the **same filenames** the placeholders used so no code changes are needed. If switching to `.png`, change the `sprite`/`background`/`portrait` filenames in `build-assets/content-config.ts` (the single source of truth) and **rerun `npm run generate`** to refresh `content.json`. Never hand-edit `content.json` — it is regenerated.

- [ ] **Step 2: Tune anchor coordinates to the real backgrounds**

Run `npm run dev`, step through each character/item, and adjust each location's `anchor.xPct/yPct` in `build-assets/content-config.ts` so the item sprite visually sits at the right spot. Rerun `npm run generate` to apply (this rewrites `content.json` from config).

- [ ] **Step 3: Verify all scenes look correct**

Manually cycle Start → question for each of the 5 characters (rerun until each appears) and confirm item placement + character + bubble read well at fullscreen.

- [ ] **Step 4: Commit**

```bash
git add public/assets/img build-assets/content-config.ts src/content.json
git commit -m "feat: final AI-generated illustrations + tuned anchors"
```

### Task 19: Operator runbook

**Files:**
- Create: `docs/RUNBOOK.md`

- [ ] **Step 1: Write the runbook**

`docs/RUNBOOK.md`:

```markdown
# Operator Runbook — English Fun Time

## Before the event
- Install the app: macOS open the `.dmg` and drag to Applications; Windows run the `.exe` installer.
- First launch on macOS may warn "unidentified developer": right-click → Open → Open. Windows SmartScreen: More info → Run anyway. (App is unsigned; this is expected for internal use.)
- Launch and test one full round. The app is fully offline — no network needed.

## Running a child's turn
1. On the standby screen, click **▶ 开始 Start** (or press Space).
2. A random character appears and speaks "Where is my …?". The child looks at the scene and answers aloud to the judges.
3. Press **Space / → / Enter** to continue. The character thanks the child and shows the lucky number with confetti.
4. Press **Space / → / Enter** again to return to standby for the next child.
- Press **Esc** anytime to jump back to standby.

## Notes
- The app does not record or score anything; judges evaluate the spoken answer.
- Each Start is randomly chosen, so children get varied characters/items/locations.
```

- [ ] **Step 2: Final full-suite check**

Run: `npm test`
Expected: all suites pass.

- [ ] **Step 3: Commit**

```bash
git add docs/RUNBOOK.md
git commit -m "docs: operator runbook"
```

---

## Self-Review

**Spec coverage:**
- 5 characters / items / locations → Task 12 (`content-config.ts`) covers all 5 incl. dad/mom/girl; Tasks 1–3 schema + sample. ✅
- "Where is my X?" → location answer → Task 4 (`answer.ts`). ✅
- Scene reuse + anchor/sprite overlay → Task 12 scenes (living-room shared by grandma/dad/mom) + Task 8 renderer placing sprite at anchor. ✅
- Random selection, one character/one question per child → Task 5 + Task 6. ✅
- Lucky number 1–10, decorative, confetti → Task 5 `pickLuckyNumber`, Task 8 reward screen. ✅
- Offline, no API key, pre-generated → Phase 8 build pipeline + Phase 7/9 packaging; key lives ONLY in dev-machine `build-assets/.env`, never in CI, never in the bundle. ✅
- Tauri, both `.exe` + `.dmg` → Task 11 (targets dmg+nsis) + Task 17 (matrix). ✅
- English only + English subtitles → Task 8 bubble shows `questionText`; lines generated in English (Task 13 prompts). ✅
- No recording/mic/name entry → never introduced; standby is Start-only (Task 8). ✅
- Mimo text + distinct voices per character → Task 15 `voiceByCharacter`, mechanism confirmed in Task -1. ✅
- Open items (image-gen tool, voice ids/mechanism, preposition correctness) → Task -1 + Task 18 + config review. ✅

**Placeholder scan:** No "TBD/implement later" steps; every code step has real code. The genuinely external unknown (Mimo chat/TTS shape, voice mechanism, model ids) is now front-loaded into **Task -1 (live probe)** and isolated in `mimo-client.ts` — not a hidden placeholder.

**Type consistency:** `Content`/`CharacterDef`/`Round` defined in Task 1 are used consistently by `loadContent` (T2), `selectRound` (T5), `AppController`/`ViewModel` (T6), `renderView` (T8), and `buildManifest` (T15). `questionAudio` keyed by itemId and `thanksAudio` keyed by "1".."10" match between `content-config.enumerateAudioLines`, `buildManifest`, and `selectRound`. Field names (`anchor.xPct/yPct`, `preposition`, `labelEn`, `isPlural`) are uniform across schema, config, and renderer.

---

## Audit Revisions (post external review)

This plan was audited before execution; the following fixes were folded in:

- **🔴 Vitest types** — `vite.config.ts` now imports `defineConfig` from `vitest/config` so `tsc --noEmit` accepts the `test` key (Task 0).
- **🔴 Production asset paths** — runtime media moved to `public/assets/{img,audio}` (served at `/assets/...` in both dev and the packaged build); fixes the would-be 404s in the shipped app (Tasks 3, 7, 8, 9, 11, 15).
- **🔴 Gitignore/audio reconciliation** — generated `content.json` + audio are **committed**; `.gitignore` ownership added to Task 0; the API key never enters CI (Tasks 0, 16, 17).
- **🟡 Early API probe** — new **Task -1** validates Mimo chat/TTS/voice/model reality before any dependent code (Tasks -1, 14, 15, 16).
- **🟡 main.ts** — single correct one-press-one-transition handler, no committed-then-reverted bug (Task 10).
- **🟡 CI divergence** — CI is build-only; both installers ship identical committed content (Task 17).
- **🟢 Test isolation** — selection/controller/render tests use a frozen `tests/fixtures/sample-content.json`, so Phase 8 regeneration can't break them (Tasks 3, 5, 6, 8).
- **🟢 Full asset coverage** — placeholders for all 5 characters + 11 items + 3 scenes, so random selection never shows a broken image (Task 7).
- **🟢 content.json single source** — hand-edit escape hatches removed; `content-config.ts` is authoritative (Tasks 16, 18).

---
```

