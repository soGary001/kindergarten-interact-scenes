// Vercel Serverless Function (region hkg1, see vercel.json): browser/desktop/APK
// POST { audio: <base64>, mime } here; we proxy to Alibaba DashScope and return the
// transcript. The API key stays server-side (DASHSCOPE_API_KEY env var).
import { transcribe } from "./_asr.mjs";

export default async function handler(req, res) {
  // Allow cross-origin calls from the packaged desktop/APK clients (tauri:// etc.).
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const body = await readJson(req);
    const out = await transcribe(body?.audio, body?.mime, process.env.DASHSCOPE_API_KEY);
    return res.status(200).json(out);
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}

async function readJson(req) {
  if (req.body) return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
