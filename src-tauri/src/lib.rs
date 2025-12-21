mod a2ui;
mod axum_app;
mod gemini_agent;
mod search;
mod tauri_axum;
mod window;
use axum::Router;
use axum_app::create_axum_app;
use std::sync::Arc;
use tauri::{async_runtime::Mutex, State};
use tauri_axum::{LocalRequest, LocalResponse};

struct AppState {
    router: Arc<Mutex<Router>>,
}

#[tauri::command]
async fn local_app_request(state: State<'_, AppState>, local_request: LocalRequest) -> Result<LocalResponse, ()> {
    let mut router = state.router.lock().await;

    let response = local_request.send_to_router(&mut router).await;

    Ok(response)
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let router: Router = create_axum_app();

    let app_state = AppState {
        router: Arc::new(Mutex::new(router)),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_shell::init())
        .manage(app_state)
        .setup(|app| {
            // Setup the customized main window
            match window::setup_window(app) {
                Ok(_) => Ok(()),
                Err(e) => {
                    eprintln!("Error setting up window: {}", e);
                    Err(e)
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            local_app_request,
            search_applications,
            search_files,
            unified_search
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
