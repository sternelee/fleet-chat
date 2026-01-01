mod a2ui;
mod axum_app;
mod gemini_agent;
mod plugins;
mod rig_agent;
mod routes;
mod search;
mod tauri_axum;
use axum::Router;
use axum_app::create_axum_app;
use search::{
    ask_ai_provider, generate_search_insights, get_all_applications, get_application_icon, get_available_ai_providers,
    get_default_application, get_frontmost_application, get_running_applications, search_applications, search_files,
    unified_search, search_app_suggestions, search_file_suggestions,
};
use std::sync::Arc;
use tauri::Manager;
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

    let mut builder = tauri::Builder::default();
    #[cfg(desktop)]
    {
        builder = builder
            .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
                let _ = app.get_webview_window("main").expect("no main window").set_focus();
            }))
            .plugin(tauri_plugin_process::init());
    }

    builder
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_clipboard::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_oauth::init())
        .plugin(tauri_plugin_persisted_scope::init())
        .manage(app_state)
        .setup(move |app| {
            #[cfg(desktop)]
            {
                let _ = app.handle().plugin(tauri_plugin_positioner::init());
                tauri::tray::TrayIconBuilder::new()
                    .on_tray_icon_event(|tray_handle, event| {
                        tauri_plugin_positioner::on_tray_event(tray_handle.app_handle(), &event);
                    })
                    .build(app)?;
            }
            // Note: Window is now configured via tauri.conf.json (windows array)
            // No need to manually create window here, as it causes duplicate window error
            // Initialize plugin system
            match plugins::init_plugin_system(app) {
                Ok(_) => Ok(()),
                Err(e) => {
                    eprintln!("Error setting up plugin system: {}", e);
                    Err(e)
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            local_app_request,
            search_applications,
            search_files,
            unified_search,
            generate_search_insights,
            get_available_ai_providers,
            ask_ai_provider,
            get_all_applications,
            get_application_icon,
            get_frontmost_application,
            get_running_applications,
            get_default_application,
            search_app_suggestions,
            search_file_suggestions,
            // Plugin system commands
            plugins::load_plugin,
            plugins::unload_plugin,
            plugins::execute_plugin_command,
            plugins::get_loaded_plugins,
            plugins::get_plugin_commands,
            plugins::reload_plugin,
            plugins::read_extension_manifest,
            plugins::get_user_extensions_dir
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
