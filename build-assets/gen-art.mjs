// One-off art generator: Alibaba Bailian (DashScope) qwen-image-2.0-pro.
// Usage: DASHSCOPE_API_KEY=sk-... node build-assets/gen-art.mjs
// Writes PNGs to public/assets/img/. Characters/items get white background
// keyed out to transparency via ImageMagick; scenes stay opaque.
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const KEY = process.env.DASHSCOPE_API_KEY;
if (!KEY) throw new Error("set DASHSCOPE_API_KEY");
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../public/assets/img");
const ENDPOINT = "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";

const STYLE =
  "Flat vector children's book illustration, Memphis design style, soft pastel palette of blush pink, mint green, butter yellow, sky cyan and lilac, bold rounded shapes, thick clean outlines, playful and cheerful, high contrast, simple, no text, no words.";

const SCENE = "1664*928";
const SQUARE = "1328*1328";

// COMPETITION-2 assets. Reused files (already present in public/assets/img) are listed so
// the script documents the full set; gen() skips any PNG that already exists. New ones
// (backgrounds, items, the grandpa/teacher portraits) are generated.
// transparent: cut the white background to alpha after download
const ASSETS = [
  // scenes (opaque, 16:9)
  { f: "scene-living-room", size: SCENE, transparent: false, p: "A cozy tidy living room interior, wide view, clearly showing and spacing apart: a low table, a TV cabinet with a TV, a single armchair, a sofa with a pillow on it, a desk lamp, a patterned floor rug, a tall wardrobe, and a bookshelf. Warm inviting daytime, empty surfaces." }, // reuse
  { f: "scene-tree-yard", size: SCENE, transparent: false, p: "A sunny backyard with one big leafy round tree on the left casting shade on green grass, a low wooden fence behind, blue sky with a few fluffy clouds, open grassy foreground. Cheerful storybook, empty ground." }, // NEW (#1 tree, #6 grass)
  { f: "scene-box-room", size: SCENE, transparent: false, p: "A bright tidy child's room, wide view, with a single open cardboard toy box sitting on the floor in the middle, plain rug, a small shelf on the wall. Cheerful and airy, empty surfaces." }, // NEW (#2 box)
  { f: "scene-desk-room", size: SCENE, transparent: false, p: "A cozy home study, wide view, with one clear wooden desk and a chair in the middle, a small lamp, a window and a rug. Warm inviting daytime, empty desk surface." }, // NEW (#3 desk)
  { f: "scene-classroom", size: SCENE, transparent: false, p: "A cute kindergarten classroom, wide view, with a low wooden pupil desk and small chair in the middle, a green chalkboard on the wall, colorful posters, bright and friendly. Empty desk surface." }, // NEW (#7 under the desk)
  { f: "scene-bedroom", size: SCENE, transparent: false, p: "A cozy child's bedroom, wide view, with one neatly made bed with a single pillow on the left, a small nightstand, a window with curtains, a soft rug. Warm and calm daytime." }, // NEW (#4 pillow, #10 bed)
  { f: "scene-kitchen", size: SCENE, transparent: false, p: "A bright cheerful kitchen, wide view, with counters, wooden cupboards, a fridge, a small window, and a clear countertop in the middle. Clean and friendly storybook, empty surfaces." }, // NEW (#8 kitchen)
  // characters (transparent, square, full body)
  { f: "char-boy", size: SQUARE, transparent: true, p: "An energetic cheerful little boy, short hair, bright t-shirt and shorts, big happy smile, waving, full body, centered with margin, on a pure solid white background." }, // reuse
  { f: "char-girl", size: SQUARE, transparent: true, p: "A sweet curious little girl, cute dress, hair with a bow, happy smile, waving, full body, centered with margin, on a pure solid white background." }, // reuse
  { f: "char-dad", size: SQUARE, transparent: true, p: "A calm friendly young father, short neat hair, casual shirt, warm smile, waving, full body, centered with margin, on a pure solid white background." }, // reuse
  { f: "char-mom", size: SQUARE, transparent: true, p: "A kind gentle mother, shoulder-length hair, casual blouse, soft smile, waving, full body, centered with margin, on a pure solid white background." }, // reuse
  { f: "char-grandpa", size: SQUARE, transparent: true, p: "A warm kind elderly grandfather with round glasses, short grey hair, a small grey moustache, cozy cardigan and trousers, gentle smile, waving hello, full body, centered with margin, on a pure solid white background." }, // NEW
  { f: "char-teacher", size: SQUARE, transparent: true, p: "A friendly young kindergarten teacher, neat hair, smart casual blouse and skirt, warm encouraging smile, waving hello, full body, centered with margin, on a pure solid white background." }, // NEW
  // items (transparent, square, single centered object with margin)
  { f: "item-football", size: SQUARE, transparent: true, p: "A single classic black and white soccer ball, one object centered with wide margin, on a pure solid white background." }, // reuse
  { f: "item-glasses", size: SQUARE, transparent: true, p: "A single pair of round reading glasses, one object centered with wide margin, on a pure solid white background." }, // reuse
  { f: "item-keys", size: SQUARE, transparent: true, p: "A small bunch of house keys on a key ring, centered with wide margin, on a pure solid white background." }, // reuse
  { f: "item-pencil", size: SQUARE, transparent: true, p: "A single yellow pencil with a sharp tip and pink eraser, one object centered with wide margin, on a pure solid white background." }, // NEW
  { f: "item-phone", size: SQUARE, transparent: true, p: "A single modern smartphone with a blank colorful screen, one object centered with wide margin, on a pure solid white background." }, // NEW
  { f: "item-blocks", size: SQUARE, transparent: true, p: "A small neat stack of a few colorful toy building blocks, centered with wide margin, on a pure solid white background." }, // NEW
  { f: "item-rabbit", size: SQUARE, transparent: true, p: "A single adorable fluffy white cartoon rabbit sitting, one object centered with wide margin, on a pure solid white background." }, // NEW
  { f: "item-ruler", size: SQUARE, transparent: true, p: "A single straight wooden ruler with simple tick marks and no readable numbers, one object centered with wide margin, on a pure solid white background." }, // NEW
  { f: "item-cake", size: SQUARE, transparent: true, p: "A single cute slice of birthday cake with a cherry on top, one object centered with wide margin, on a pure solid white background." }, // NEW
  { f: "item-book", size: SQUARE, transparent: true, p: "A single closed hardcover storybook with a plain colorful cover and no readable text, one object centered with wide margin, on a pure solid white background." }, // NEW
];

async function callApi(a) {
  const body = {
    model: "qwen-image-2.0-pro",
    input: { messages: [{ role: "user", content: [{ text: `${STYLE} ${a.p}` }] }] },
    parameters: { size: a.size, n: 1, prompt_extend: false },
  };
  for (let attempt = 1; attempt <= 6; attempt++) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return res.json();
    if (res.status === 429) {
      const wait = 30000 * attempt; // 30s, 60s, 90s, ...
      console.log(`  …429 rate limit on ${a.f}, waiting ${wait / 1000}s (attempt ${attempt})`);
      await sleep(wait);
      continue;
    }
    throw new Error(`${a.f}: HTTP ${res.status} ${await res.text()}`);
  }
  throw new Error(`${a.f}: still 429 after retries`);
}

async function gen(a) {
  const data = await callApi(a);
  const url = data.output?.choices?.[0]?.message?.content?.find((c) => c.image)?.image;
  if (!url) throw new Error(`${a.f}: no image url in ${JSON.stringify(data).slice(0, 300)}`);
  const img = Buffer.from(await (await fetch(url)).arrayBuffer());
  const raw = resolve(OUT, `${a.f}.raw.png`);
  const final = resolve(OUT, `${a.f}.png`);
  await writeFile(raw, img);
  if (a.transparent) {
    // Add a 2px white border so all edge whites connect, floodfill from a corner
    // to alpha (preserves white inside the subject), shave border, trim margins.
    execFileSync("magick", [
      raw, "-alpha", "set", "-bordercolor", "white", "-border", "2",
      "-fuzz", "12%", "-fill", "none", "-draw", "color 0,0 floodfill",
      "-shave", "2x2", "-trim", "+repage", final,
    ]);
    execFileSync("rm", [raw]);
  } else {
    execFileSync("mv", [raw, final]);
  }
  console.log(`✓ ${a.f}.png`);
}

await mkdir(OUT, { recursive: true });
for (const a of ASSETS) {
  if (existsSync(resolve(OUT, `${a.f}.png`))) { console.log(`• skip ${a.f}.png (exists)`); continue; }
  try { await gen(a); } catch (e) { console.error(`✗ ${a.f}: ${e.message}`); }
  await sleep(20000); // throttle: stay under the account rate quota
}
console.log("done");
