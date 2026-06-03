mod asr;
mod commands;
mod mic;
mod secret;
mod xor;

use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(AppState::default())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![asr_start, asr_stop, check_connectivity])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
