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

// transparent: cut the white background to alpha after download
const ASSETS = [
  // scenes (opaque, 16:9)
  { f: "scene-living-room", size: SCENE, transparent: false, p: "A cozy tidy living room interior, wide view, clearly showing and spacing apart: a low table, a TV cabinet with a TV, a single armchair, a sofa with a pillow on it, a window with a windowsill, a desk lamp, a patterned floor rug, a tall wardrobe, and a bookshelf. Warm inviting daytime, empty surfaces." },
  { f: "scene-boy-room", size: SCENE, transparent: false, p: "A bright child's playroom on the left with an open door in the middle leading out to a sunny grassy garden on the right. Clearly show the open door, green grass outside, a wall shelf, a small chair, a sofa, a window with windowsill, and a floor carpet. Cheerful and airy." },
  { f: "scene-girl-outdoor", size: SCENE, transparent: false, p: "A cute stylized outdoor panorama, clearly showing and spacing apart: a small train station with a sign post, a park with trees and a bench, a flower garden, a house balcony, a wall shelf, and a picnic blanket on the ground. Sunny friendly storybook." },
  // characters (transparent, square, full body)
  { f: "char-grandma", size: SQUARE, transparent: true, p: "A warm kind elderly grandmother with round glasses, grey hair in a bun, cozy cardigan, gentle smile, waving hello, full body, centered with margin, on a pure solid white background." },
  { f: "char-boy", size: SQUARE, transparent: true, p: "An energetic cheerful little boy, short hair, bright t-shirt and shorts, big happy smile, waving, full body, centered with margin, on a pure solid white background." },
  { f: "char-girl", size: SQUARE, transparent: true, p: "A sweet curious little girl, cute dress, hair with a bow, happy smile, waving, full body, centered with margin, on a pure solid white background." },
  { f: "char-dad", size: SQUARE, transparent: true, p: "A calm friendly young father, short neat hair, casual shirt, warm smile, waving, full body, centered with margin, on a pure solid white background." },
  { f: "char-mom", size: SQUARE, transparent: true, p: "A kind gentle mother, shoulder-length hair, casual blouse, soft smile, waving, full body, centered with margin, on a pure solid white background." },
  // items (transparent, square, single centered object with margin)
  { f: "item-glasses", size: SQUARE, transparent: true, p: "A single pair of round reading glasses, one object centered with wide margin, on a pure solid white background." },
  { f: "item-football", size: SQUARE, transparent: true, p: "A single classic black and white soccer ball, one object centered with wide margin, on a pure solid white background." },
  { f: "item-toys", size: SQUARE, transparent: true, p: "A small cute teddy bear next to a couple of toy building blocks, centered with wide margin, on a pure solid white background." },
  { f: "item-puppy", size: SQUARE, transparent: true, p: "A single adorable cartoon puppy sitting, one object centered with wide margin, on a pure solid white background." },
  { f: "item-kitten", size: SQUARE, transparent: true, p: "A single adorable cartoon kitten sitting, one object centered with wide margin, on a pure solid white background." },
  { f: "item-keys", size: SQUARE, transparent: true, p: "A small bunch of house keys on a key ring, centered with wide margin, on a pure solid white background." },
  { f: "item-wallet", size: SQUARE, transparent: true, p: "A single closed brown wallet, one object centered with wide margin, on a pure solid white background." },
  { f: "item-newspaper", size: SQUARE, transparent: true, p: "A single folded newspaper with no readable text, one object centered with wide margin, on a pure solid white background." },
  { f: "item-handbag", size: SQUARE, transparent: true, p: "A single stylish lady's handbag, one object centered with wide margin, on a pure solid white background." },
  { f: "item-necklace", size: SQUARE, transparent: true, p: "A single pretty pearl bead necklace, one object centered with wide margin, on a pure solid white background." },
  { f: "item-ring", size: SQUARE, transparent: true, p: "A single sparkly diamond ring, one object centered with wide margin, on a pure solid white background." },
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
