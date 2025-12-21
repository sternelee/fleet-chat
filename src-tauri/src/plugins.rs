/**
 * Plugins module for Fleet Chat
 * 
 * Provides Tauri commands and backend support for the plugin system
 */

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{command, AppHandle, Manager, State};
use tokio::sync::Mutex;

// Plugin state structure
#[derive(Clone, serde::Serialize, serde::Deserialize)]
pub struct PluginInfo {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub author: String,
    pub status: String,
    pub commands: Vec<PluginCommand>,
}

#[derive(Clone, serde::Serialize, serde::Deserialize)]
pub struct PluginCommand {
    pub name: String,
    pub title: String,
    pub description: Option<String>,
    pub mode: String,
    pub keywords: Vec<String>,
}

// Plugin manager state
pub struct PluginManagerState {
    plugins: Arc<Mutex<HashMap<String, PluginInfo>>>,
    extension_manager: Arc<Mutex<Option<crate::plugins::extension_manager::ExtensionManager>>>,
}

impl Default for PluginManagerState {
    fn default() -> Self {
        Self {
            plugins: Arc::new(Mutex::new(HashMap::new())),
            extension_manager: Arc::new(Mutex::new(None)),
        }
    }
}

// Plugin management commands
#[command]
pub async fn load_plugin(
    app: AppHandle,
    state: State<'_, PluginManagerState>,
    plugin_path: String,
) -> Result<String, String> {
    let plugin_id = extract_plugin_id(&plugin_path)?;
    
    // Initialize extension manager if not already done
    let mut extension_manager = state.extension_manager.lock().await;
    if extension_manager.is_none() {
        let manager = crate::plugins::extension_manager::ExtensionManager::new(app);
        *extension_manager = Some(manager);
    }

    // Load the plugin
    if let Some(ref manager) = *extension_manager {
        manager.load_extension(&plugin_path).await
            .map_err(|e| format!("Failed to load plugin: {}", e))?;
    }

    // Update plugin state
    let mut plugins = state.plugins.lock().await;
    let plugin_info = PluginInfo {
        id: plugin_id.clone(),
        name: format!("Plugin {}", plugin_id),
        version: "1.0.0".to_string(),
        description: "A Fleet Chat plugin".to_string(),
        author: "Unknown".to_string(),
        status: "loaded".to_string(),
        commands: vec![],
    };
    plugins.insert(plugin_id.clone(), plugin_info);

    Ok(plugin_id)
}

#[command]
pub async fn unload_plugin(
    state: State<'_, PluginManagerState>,
    plugin_id: String,
) -> Result<(), String> {
    // Remove from plugin state
    let mut plugins = state.plugins.lock().await;
    plugins.remove(&plugin_id);

    // Unload from extension manager
    let extension_manager = state.extension_manager.lock().await;
    if let Some(ref manager) = *extension_manager {
        manager.unload_extension(&plugin_id).await
            .map_err(|e| format!("Failed to unload plugin: {}", e))?;
    }

    Ok(())
}

#[command]
pub async fn execute_plugin_command(
    app: AppHandle,
    state: State<'_, PluginManagerState>,
    plugin_id: String,
    command_name: String,
    context: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let extension_manager = state.extension_manager.lock().await;
    
    if let Some(ref manager) = *extension_manager {
        let result = manager.execute_command(&plugin_id, &command_name, context).await.map_err(|e| e.to_string())?;
        Ok(result)
    } else {
        Err("Extension manager not initialized".to_string())
    }
}

#[command]
pub async fn get_loaded_plugins(
    state: State<'_, PluginManagerState>,
) -> Result<Vec<PluginInfo>, String> {
    let plugins = state.plugins.lock().await;
    Ok(plugins.values().cloned().collect())
}

#[command]
pub async fn get_plugin_commands(
    state: State<'_, PluginManagerState>,
) -> Result<Vec<(String, PluginCommand)>, String> {
    let extension_manager = state.extension_manager.lock().await;
    
    if let Some(ref manager) = *extension_manager {
        let commands = manager.get_all_commands().await.map_err(|e| e.to_string())?;
        Ok(commands)
    } else {
        Ok(vec![])
    }
}

#[command]
pub async fn reload_plugin(
    state: State<'_, PluginManagerState>,
    plugin_id: String,
) -> Result<(), String> {
    let extension_manager = state.extension_manager.lock().await;
    
    if let Some(ref manager) = *extension_manager {
        manager.reload_extension(&plugin_id).await
            .map_err(|e| format!("Failed to reload plugin: {}", e))?;
    }

    Ok(())
}

// File system utilities for plugins
#[command]
pub async fn read_extension_manifest(path: String) -> Result<String, String> {
    use std::fs;
    
    let content = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read manifest: {}", e))?;
    
    Ok(content)
}

#[command]
pub async fn get_user_extensions_dir() -> Result<String, String> {
    let mut path = dirs::home_dir()
        .ok_or("Could not find home directory")?
        .join(".fleet-chat");
    path.push("extensions");
    
    // Create directory if it doesn't exist
    std::fs::create_dir_all(&path)
        .map_err(|e| format!("Failed to create extensions directory: {}", e))?;
    
    Ok(path.to_string_lossy().to_string())
}

// Utility functions
fn extract_plugin_id(plugin_path: &str) -> Result<String, String> {
    let path = PathBuf::from(plugin_path);
    let plugin_id = path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or("Invalid plugin path")?
        .to_string();
    
    Ok(plugin_id)
}

// Extension Manager implementation
pub mod extension_manager {
    use super::*;
    use tauri::AppHandle;

    pub struct ExtensionManager {
        app: AppHandle,
        plugins: Arc<Mutex<HashMap<String, PluginInfo>>>,
    }

    impl ExtensionManager {
        pub fn new(app: AppHandle) -> Self {
            Self {
                app,
                plugins: Arc::new(Mutex::new(HashMap::new())),
            }
        }

        pub async fn load_extension(&self, path: &str) -> Result<(), Box<dyn std::error::Error>> {
            let plugin_id = extract_plugin_id(path)?;
            
            // In a real implementation, this would:
            // 1. Load the plugin manifest
            // 2. Create a Web Worker or isolate
            // 3. Load the plugin code
            // 4. Register commands
            
            println!("Loading extension: {}", plugin_id);
            Ok(())
        }

        pub async fn unload_extension(&self, plugin_id: &str) -> Result<(), Box<dyn std::error::Error>> {
            println!("Unloading extension: {}", plugin_id);
            Ok(())
        }

        pub async fn execute_command(
            &self,
            plugin_id: &str,
            command_name: &str,
            context: Option<serde_json::Value>,
        ) -> Result<serde_json::Value, Box<dyn std::error::Error>> {
            println!("Executing command: {} from plugin: {}", command_name, plugin_id);
            
            // Mock response for now
            Ok(serde_json::json!({
                "type": "success",
                "message": format!("Command {} executed successfully", command_name)
            }))
        }

        pub async fn get_all_commands(&self) -> Result<Vec<(String, PluginCommand)>, Box<dyn std::error::Error>> {
            let plugins = self.plugins.lock().await;
            let mut commands = Vec::new();
            
            for (plugin_id, plugin_info) in plugins.iter() {
                for command in plugin_info.commands.iter() {
                    commands.push((plugin_id.clone(), command.clone()));
                }
            }
            
            Ok(commands)
        }

        pub async fn reload_extension(&self, plugin_id: &str) -> Result<(), Box<dyn std::error::Error>> {
            println!("Reloading extension: {}", plugin_id);
            Ok(())
        }
    }
}

// Initialize plugin system
pub fn init_plugin_system(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let plugin_state = PluginManagerState::default();
    app.manage(plugin_state);
    
    Ok(())
}