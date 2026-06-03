#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      // Windows WebView2 denies getUserMedia by default; auto-grant mic/camera so the
      // voice feature works in the packaged .exe.
      #[cfg(target_os = "windows")]
      grant_media_permissions(app);
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[cfg(target_os = "windows")]
fn grant_media_permissions(app: &tauri::App) {
  use tauri::Manager;
  let Some(window) = app.get_webview_window("main") else {
    return;
  };
  let _ = window.with_webview(|webview| {
    use webview2_com::Microsoft::Web::WebView2::Win32::{
      COREWEBVIEW2_PERMISSION_KIND_CAMERA, COREWEBVIEW2_PERMISSION_KIND_MICROPHONE,
      COREWEBVIEW2_PERMISSION_STATE_ALLOW,
    };
    use webview2_com::PermissionRequestedEventHandler;
    unsafe {
      if let Ok(core) = webview.controller().CoreWebView2() {
        let handler = PermissionRequestedEventHandler::create(Box::new(|_sender, args| {
          if let Some(args) = args {
            let kind = args.PermissionKind()?;
            if kind == COREWEBVIEW2_PERMISSION_KIND_MICROPHONE
              || kind == COREWEBVIEW2_PERMISSION_KIND_CAMERA
            {
              args.SetState(COREWEBVIEW2_PERMISSION_STATE_ALLOW)?;
            }
          }
          Ok(())
        }));
        let mut token = Default::default();
        let _ = core.add_PermissionRequested(&handler, &mut token);
      }
    }
  });
}
