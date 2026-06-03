# 语音互动 + Vercel 部署 — 设计

**日期：** 2026-06-02
**状态：** 待确认（Vercel 授权 + 录音 UX）后实现

## 目标
孩子说出英文答案 → 识别成文字并显示 → 宽松判断对错 → **对了自动跳转到幸运数字页**；**错了温柔鼓励、原地重说**。语音识别走阿里云 DashScope，由 Vercel **香港函数(hkg1)** 代理（Key 藏服务端）。网页版部署到 Vercel；**网页 / 桌面 / APK 三端都接入语音**（都 HTTPS 调香港函数，不再纯离线）。

## 已验证的关键事实（DashScope ASR）
- `POST https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation`
- `{ "model":"qwen3-asr-flash", "input":{"messages":[{"role":"user","content":[{"audio":"data:audio/wav;base64,<...>"}]}]} }`
- 直接接受 base64 录音；转写在 `output.choices[0].message.content[0].text`；附带语言/情绪标注。

## 架构
- 前端（现有游戏，静态）+ 新增 Serverless 函数 `api/asr`（区域 `hkg1`）。
- `api/asr`：收 `{audio:base64, mime}` → 调 DashScope qwen3-asr-flash → 返回 `{transcript, language}`。读 `DASHSCOPE_API_KEY`（Vercel 环境变量，服务端）。带 CORS（桌面/APK 跨源调用）。
- 客户端 API 地址：网页同源 `/api/asr`；桌面/APK 用绝对地址 `VITE_API_BASE`（构建时注入部署后的 Vercel 域名）。Key 不下发到任何客户端。
- Mimo 生成的台词/音频/插画仍随包（离线播放）；只有"识别"是联网的。

## 流程（问答页新增）
1. 角色提问（同现在）。
2. 孩子点 🎤「我要回答 / Answer」→ 录音（单声道 16k WAV，点停止或静音/超时自动停）。
3. 上传 `/api/asr` → 显示「You said: …（识别文字）」。
4. **宽松判断**（本地）：识别文字（小写归一）中是否包含正确地点词（`location.labelEn`，多词如 "tv cabinet" 取末词兜底）。
   - ✅ 对 → 显示 ✓ + 表扬（中英）→ 自动跳转幸运数字页。
   - ❌ 错 → 显示识别文字 + 温柔鼓励（中英，配已生成的鼓励语音）→ 原地可再录。
5. 老师仍可用键盘强制下一步/跳过。

## 改动文件
- `api/asr.js`、`vercel.json`（buildCommand=npm run build，outputDirectory=dist，`regions:["hkg1"]`，函数 maxDuration）
- `src/config.ts`（API_BASE）、`src/recorder.ts`（WAV 录音）、`src/asr-client.ts`、`src/judge.ts`（宽松判断）
- `app-controller.ts` 新增状态：`listening` / `checking` / `retry`（question→reward 仍保留）
- `render.ts` + `memphis.css`：录音按钮、识别文字、表扬/鼓励 UI（中英双语）
- 麦克风权限：网页 getUserMedia(HTTPS)；macOS Info.plist `NSMicrophoneUsageDescription` + audio-input 权限；Android `RECORD_AUDIO` + WebView 授权
- 鼓励语音：构建期用 Mimo 为每个角色生成几句「再试一次」鼓励语，随包

## 待落实 / 风险
- **Vercel 授权**：CLI 部署需要一个 Vercel Access Token（或 `vercel login`）。
- **hkg1 区域**：Serverless 函数选香港区在 Hobby 计划可能受限（默认区域），可能需 Pro；先尝试，必要时退回默认区/改 Edge。
- 桌面/APK 的 WebView 麦克风授权较繁琐（尤其 Android），作为第二阶段。
- 录音格式：浏览器 MediaRecorder 默认 webm/opus；为保证 DashScope 兼容，前端用 AudioContext 编码 16k 单声道 WAV。
