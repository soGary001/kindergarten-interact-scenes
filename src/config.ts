// Where the ASR backend lives.
// - Web (served by Vercel): same origin -> "" -> "/api/asr".
// - Desktop / APK: set VITE_API_BASE at build time to the deployed Vercel origin,
//   e.g. VITE_API_BASE=https://kindergarten-interact-scenes.vercel.app
export const API_BASE: string = import.meta.env.VITE_API_BASE ?? "";
export const ASR_URL = `${API_BASE}/api/asr`;
