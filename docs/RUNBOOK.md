# Operator Runbook — English Fun Time

## Before the event
- Install the app: macOS — open the `.dmg` and drag to Applications; Windows — run the `.exe` installer.
- First launch on macOS may warn "unidentified developer": right-click → Open → Open. Windows SmartScreen: More info → Run anyway. (The app is unsigned; this is expected for internal use.)
- Launch and run one full round to test. The app is **fully offline** — no network needed.

## Running a child's turn
1. On the standby screen, click **▶ 开始 Start** (or press Space).
2. A random character appears and speaks "Where is my …?". The child looks at the scene and answers aloud to the judges.
3. Press **Space / → / Enter** to continue. The character thanks the child and shows the lucky number with confetti.
4. Press **Space / → / Enter** again to return to standby for the next child.
- Press **Esc** at any time to jump back to standby.

## Notes
- The app does not record or score anything — judges evaluate the spoken answer.
- Each Start is randomly chosen, so children get varied characters / items / locations.

## For developers — regenerating content (rare)
- Spoken lines + voices are pre-generated and committed (`src/content.json` + `public/assets/audio/*.wav`); the app ships them, so you normally never touch this.
- To regenerate: copy `build-assets/.env.example` to `build-assets/.env`, set `MIMO_API_KEY`, run `npm run generate`, then commit `src/content.json` and the `.wav` files. The API key lives only in `build-assets/.env` (gitignored) — never in the app or CI.
- Art lives in `public/assets/img/`. Item placement per scene is tuned via `anchor` coordinates in `build-assets/content-config.ts`; rerun `npm run generate` after changing them.
