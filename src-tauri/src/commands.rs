use crate::{asr, secret};
use std::sync::Mutex;
use tauri::{AppHandle, State};

#[derive(Default)]
pub struct AppState {
    pub asr: Mutex<Option<asr::AsrSession>>,
}

/// Start native mic capture (cpal) + a streaming ASR session. Partial/final transcripts
/// are emitted to the frontend as `asr://partial` / `asr://final` events.
#[tauri::command]
pub async fn asr_start(app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    let key = secret::api_key();
    if key.is_empty() {
        return Err("no embedded API key".into());
    }
    let mut session = asr::run_session(app.clone(), key).await?;
    let mic_handle = crate::mic::start_capture(session.audio_tx.clone())?;
    session.mic = Some(mic_handle);
    *state.asr.lock().unwrap() = Some(session);
    Ok(())
}

/// Stop the mic and tell the ASR task to finish (flushes the final result).
#[tauri::command]
pub fn asr_stop(state: State<AppState>) -> Result<(), String> {
    if let Some(s) = state.asr.lock().unwrap().as_ref() {
        if let Some(m) = &s.mic {
            m.stop();
        }
        let _ = s.stop_tx.send(());
    }
    Ok(())
}

#[tauri::command]
pub async fn check_connectivity() -> bool {
    reqwest::Client::new()
        .get("https://dashscope.aliyuncs.com")
        .timeout(std::time::Duration::from_secs(5))
        .send()
        .await
        .is_ok()
}
