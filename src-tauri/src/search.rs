use crate::rig_agent::{AIOptions, AIProvider, RigAgent};
use serde::{Deserialize, Serialize};
use std::env;
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Application {
    pub name: String,
    pub path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon_base64: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileMatch {
    pub path: String,
    pub line_number: Option<usize>,
    pub line_content: Option<String>,
    pub match_type: String, // "name" or "content"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub applications: Vec<Application>,
    pub files: Vec<FileMatch>,
}

// ============================================================================
// Application Cache
// ============================================================================

/// Cache for storing application list with automatic refresh
#[derive(Clone)]
pub struct ApplicationCache {
    /// Cached applications
    applications: Arc<Mutex<Vec<Application>>>,
    /// Last refresh timestamp
    last_refresh: Arc<Mutex<Option<Instant>>>,
    /// Minimum duration between refreshes (for debouncing)
    min_refresh_interval: Duration,
    /// Whether the cache has been initialized
    initialized: Arc<Mutex<bool>>,
}

impl ApplicationCache {
    /// Create a new application cache
    pub fn new() -> Self {
        Self {
            applications: Arc::new(Mutex::new(Vec::new())),
            last_refresh: Arc::new(Mutex::new(None)),
            min_refresh_interval: Duration::from_secs(5), // Minimum 5 seconds between refreshes
            initialized: Arc::new(Mutex::new(false)),
        }
    }

    /// Check if a refresh is needed (cache is stale or not initialized)
    pub fn needs_refresh(&self) -> bool {
        let initialized = *self.initialized.lock().unwrap();
        if !initialized {
            return true;
        }

        let last_refresh = *self.last_refresh.lock().unwrap();
        match last_refresh {
            Some(instant) => instant.elapsed() >= self.min_refresh_interval,
            None => true,
        }
    }

    /// Refresh the application cache from the system
    pub async fn refresh(&self) -> Result<(), String> {
        use applications::{AppInfo, AppInfoContext};

        // Create context and refresh apps
        let mut ctx = AppInfoContext::new(vec![]);
        ctx.refresh_apps()
            .map_err(|e| format!("Failed to refresh applications: {}", e))?;

        // Get all applications
        let apps = ctx.get_all_apps();

        // Convert to our Application struct
        let results: Vec<Application> = apps
            .into_iter()
            .map(|app| {
                let exe_path = app
                    .app_path_exe
                    .as_ref()
                    .map(|p| p.to_string_lossy().to_string())
                    .unwrap_or_else(|| "Unknown".to_string());

                // Convert executable path to .app bundle root path
                let app_bundle_path = if exe_path.contains("/Contents/MacOS/") {
                    if let Some(bundle_end) = exe_path.find(".app/Contents/MacOS/") {
                        exe_path[..bundle_end + 4].to_string()
                    } else {
                        exe_path
                    }
                } else {
                    exe_path
                };

                let icon_base64 = extract_app_icon(&app_bundle_path);

                Application {
                    name: app.name.clone(),
                    path: app_bundle_path,
                    icon_path: None,
                    icon_base64,
                }
            })
            .collect();

        // Update cache
        *self.applications.lock().unwrap() = results;
        *self.last_refresh.lock().unwrap() = Some(Instant::now());
        *self.initialized.lock().unwrap() = true;

        println!("[ApplicationCache] Refreshed {} applications", self.applications.lock().unwrap().len());

        Ok(())
    }

    /// Get all cached applications
    pub fn get_all(&self) -> Vec<Application> {
        self.applications.lock().unwrap().clone()
    }

    /// Search applications by query (instant, in-memory search)
    pub fn search(&self, query: &str) -> Vec<Application> {
        let query_lower = query.to_lowercase();
        let apps = self.applications.lock().unwrap();

        let mut results: Vec<Application> = apps
            .iter()
            .filter(|app| app.name.to_lowercase().contains(&query_lower))
            .cloned()
            .collect();

        // Sort by relevance
        results.sort_by(|a, b| {
            let a_lower = a.name.to_lowercase();
            let b_lower = b.name.to_lowercase();

            if a_lower == query_lower {
                std::cmp::Ordering::Less
            } else if b_lower == query_lower {
                std::cmp::Ordering::Greater
            } else if a_lower.starts_with(&query_lower) && !b_lower.starts_with(&query_lower) {
                std::cmp::Ordering::Less
            } else if !a_lower.starts_with(&query_lower) && b_lower.starts_with(&query_lower) {
                std::cmp::Ordering::Greater
            } else {
                a.name.cmp(&b.name)
            }
        });

        // Limit results
        results.truncate(10);
        results
    }

    /// Force refresh regardless of time elapsed
    pub async fn force_refresh(&self) -> Result<(), String> {
        // Temporarily reset the last_refresh time to allow refresh
        *self.last_refresh.lock().unwrap() = None;
        self.refresh().await
    }
}

impl Default for ApplicationCache {
    fn default() -> Self {
        Self::new()
    }
}

// Global application cache instance
static APPLICATION_CACHE: once_cell::sync::Lazy<ApplicationCache> =
    once_cell::sync::Lazy::new(ApplicationCache::new);

/// Get the global application cache
pub fn get_application_cache() -> &'static ApplicationCache {
    &APPLICATION_CACHE
}

// ============================================================================
// Icon Extraction
// ============================================================================

#[cfg(target_os = "macos")]
fn extract_app_icon(app_path: &str) -> Option<String> {
    use std::fs;

    // macOS app bundles have structure: AppName.app/Contents/Resources/AppIcon.icns
    let path = Path::new(app_path);

    // Check if this is an app bundle
    if !app_path.ends_with(".app") {
        return None;
    }

    let resources_dir = path.join("Contents/Resources");
    if !resources_dir.exists() {
        return None;
    }

    // Try common icon names
    let common_icons = [
        "AppIcon.icns",
        "app.icns",
        "icon.icns",
        "application.icns",
        "AppIcon",
        "app",
        "icon",
        "application",
    ];

    for icon_name in common_icons.iter() {
        let icon_path = if icon_name.ends_with(".icns") {
            resources_dir.join(icon_name)
        } else {
            resources_dir.join(format!("{}.icns", icon_name))
        };

        if icon_path.exists() {
            if let Ok(icon_data) = convert_icns_to_png(&icon_path) {
                return Some(icon_data);
            }
        }
    }

    // List all files in Resources directory for additional icon files
    if let Ok(entries) = fs::read_dir(&resources_dir) {
        for entry in entries.flatten() {
            let file_name = entry.file_name();
            if let Some(name_str) = file_name.to_str() {
                if name_str.ends_with(".icns") {
                    // Try this file too
                    let icon_path = resources_dir.join(name_str);
                    if let Ok(icon_data) = convert_icns_to_png(&icon_path) {
                        return Some(icon_data);
                    }
                }
            }
        }
    }

    None
}

#[cfg(target_os = "macos")]
fn convert_icns_to_png(icon_path: &Path) -> Result<String, Box<dyn std::error::Error>> {
    use icns::{IconFamily, IconType};
    use std::fs::File;

    // Read the .icns file
    let file = File::open(icon_path)?;
    let icon_family = IconFamily::read(file)?;

    // Try to get the largest available icon (prefer 512x512 or 256x256)
    let icon_types = [
        IconType::RGBA32_512x512_2x,
        IconType::RGBA32_512x512,
        IconType::RGBA32_256x256_2x,
        IconType::RGBA32_256x256,
        IconType::RGBA32_128x128_2x,
        IconType::RGBA32_128x128,
        IconType::RGBA32_64x64,
        IconType::RGBA32_32x32,
        IconType::RGBA32_16x16,
    ];

    for icon_type in icon_types.iter() {
        if let Ok(img) = icon_family.get_icon_with_type(*icon_type) {
            return convert_image_to_base64(img);
        }
    }

    Err("No suitable icon found in .icns file".into())
}

#[cfg(target_os = "macos")]
fn convert_image_to_base64(image: icns::Image) -> Result<String, Box<dyn std::error::Error>> {
    use base64::{engine::general_purpose, Engine as _};
    use std::io::Cursor;

    // Convert to PNG and encode as base64
    let mut png_data = Vec::new();
    let mut cursor = Cursor::new(&mut png_data);

    image.write_png(&mut cursor)?;

    let base64_str = general_purpose::STANDARD.encode(&png_data);
    Ok(format!("data:image/png;base64,{}", base64_str))
}

#[cfg(not(target_os = "macos"))]
fn extract_app_icon(_app_path: &str) -> Option<String> {
    None
}

/// Search for applications installed on the system (uses cache)
#[command]
pub async fn search_applications(query: String) -> Result<Vec<Application>, String> {
    let cache = get_application_cache();

    // Refresh cache if needed (debounced - only if 5+ seconds have passed)
    if cache.needs_refresh() {
        cache.refresh().await?;
    }

    // Return instant search from cache
    Ok(cache.search(&query))
}

/// Search for files using ripgrep-style search
#[command]
pub async fn search_files(
    query: String,
    search_path: Option<String>,
    search_content: bool,
) -> Result<Vec<FileMatch>, String> {
    use ignore::WalkBuilder;
    use std::fs;
    use std::io::BufRead;

    let query_lower = query.to_lowercase();
    let base_path = search_path.unwrap_or_else(|| {
        std::env::var("HOME")
            .or_else(|_| std::env::var("USERPROFILE"))
            .unwrap_or_else(|_| ".".to_string())
    });

    let mut results = Vec::new();
    let max_results = 50;

    // Use ignore crate to respect .gitignore files
    let walker = WalkBuilder::new(&base_path)
        .hidden(false) // Show hidden files
        .git_ignore(true) // Respect .gitignore
        .max_depth(Some(5)) // Limit depth for performance
        .build();

    for entry in walker {
        if results.len() >= max_results {
            break;
        }

        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };

        if !entry.file_type().map(|ft| ft.is_file()).unwrap_or(false) {
            continue;
        }

        let path = entry.path();
        let path_str = path.to_string_lossy().to_string();

        // Search by filename
        if let Some(filename) = path.file_name() {
            let filename_str = filename.to_string_lossy().to_lowercase();
            if filename_str.contains(&query_lower) {
                results.push(FileMatch {
                    path: path_str.clone(),
                    line_number: None,
                    line_content: None,
                    match_type: "name".to_string(),
                });
                continue;
            }
        }

        // Search file content if requested
        if search_content && results.len() < max_results {
            // Only search text files (skip binary files)
            if let Ok(file) = fs::File::open(path) {
                let reader = std::io::BufReader::new(file);

                for (line_num, line_result) in reader.lines().enumerate().take(1000) {
                    if results.len() >= max_results {
                        break;
                    }

                    if let Ok(line) = line_result {
                        if line.to_lowercase().contains(&query_lower) {
                            results.push(FileMatch {
                                path: path_str.clone(),
                                line_number: Some(line_num + 1),
                                line_content: Some(line.trim().to_string()),
                                match_type: "content".to_string(),
                            });
                            break; // Only one match per file for content search
                        }
                    }
                }
            }
        }
    }

    Ok(results)
}

/// Combined search that returns both applications and files
#[command]
pub async fn unified_search(
    query: String,
    search_path: Option<String>,
    include_files: bool,
) -> Result<SearchResult, String> {
    let apps_future = search_applications(query.clone());

    let (applications, files) = if include_files {
        let files_future = search_files(query.clone(), search_path, false);
        tokio::join!(apps_future, files_future)
    } else {
        (apps_future.await, Ok(Vec::new()))
    };

    Ok(SearchResult {
        applications: applications?,
        files: files?,
    })
}

/// Get all applications installed on the system (uses cache)
#[command]
pub async fn get_applications() -> Result<Vec<Application>, String> {
    let cache = get_application_cache();

    // Ensure cache is initialized
    if cache.needs_refresh() {
        cache.refresh().await?;
    }

    Ok(cache.get_all())
}

/// Initialize the application cache (call on startup)
#[command]
pub async fn initialize_application_cache() -> Result<usize, String> {
    let cache = get_application_cache();
    cache.refresh().await?;
    Ok(cache.get_all().len())
}

/// Force refresh the application cache
#[command]
pub async fn refresh_application_cache() -> Result<usize, String> {
    let cache = get_application_cache();
    cache.force_refresh().await?;
    Ok(cache.get_all().len())
}

/// Get the frontmost application
#[command]
pub async fn get_frontmost_application() -> Result<Option<Application>, String> {
    use applications::{AppInfo, AppInfoContext};

    let mut ctx = AppInfoContext::new(vec![]);
    ctx.refresh_apps()
        .map_err(|e| format!("Failed to refresh applications: {}", e))?;

    match ctx.get_frontmost_application() {
        Ok(app) => {
            let exe_path = app
                .app_path_exe
                .as_ref()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_else(|| "Unknown".to_string());

            let app_bundle_path = if exe_path.contains("/Contents/MacOS/") {
                if let Some(bundle_end) = exe_path.find(".app/Contents/MacOS/") {
                    exe_path[..bundle_end + 4].to_string()
                } else {
                    exe_path
                }
            } else {
                exe_path
            };

            let icon_base64 = extract_app_icon(&app_bundle_path);

            Ok(Some(Application {
                name: app.name.clone(),
                path: app_bundle_path,
                icon_path: None,
                icon_base64,
            }))
        }
        Err(_) => Ok(None),
    }
}

/// Get all running applications
#[command]
pub async fn get_running_applications() -> Result<Vec<Application>, String> {
    use applications::{AppInfo, AppInfoContext};

    let mut ctx = AppInfoContext::new(vec![]);
    ctx.refresh_apps()
        .map_err(|e| format!("Failed to refresh applications: {}", e))?;

    let apps = ctx.get_running_apps();

    let results: Vec<Application> = apps
        .into_iter()
        .map(|app| {
            let exe_path = app
                .app_path_exe
                .as_ref()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_else(|| "Unknown".to_string());

            let app_bundle_path = if exe_path.contains("/Contents/MacOS/") {
                if let Some(bundle_end) = exe_path.find(".app/Contents/MacOS/") {
                    exe_path[..bundle_end + 4].to_string()
                } else {
                    exe_path
                }
            } else {
                exe_path
            };

            let icon_base64 = extract_app_icon(&app_bundle_path);

            Application {
                name: app.name.clone(),
                path: app_bundle_path,
                icon_path: None,
                icon_base64,
            }
        })
        .collect();

    Ok(results)
}

/// Get default application for file extension
#[command]
pub async fn get_default_application(extension: String) -> Result<Option<Application>, String> {
    use applications::{AppInfo, AppInfoContext};

    let mut ctx = AppInfoContext::new(vec![]);
    ctx.refresh_apps()
        .map_err(|e| format!("Failed to refresh applications: {}", e))?;

    // Note: The applications crate doesn't seem to have get_default_app method
    // This is a placeholder implementation that returns None
    // In a real implementation, you would need to use platform-specific APIs
    // to get the default application for a file extension
    println!("get_default_application called with extension: {}", extension);

    Ok(None)
}

/// Generate AI-powered insights for search results
#[command]
pub async fn generate_search_insights(query: String, search_results: SearchResult) -> Result<String, String> {
    // Initialize the Rig agent
    let agent = RigAgent::new().map_err(|e| format!("Failed to initialize AI agent: {}", e))?;

    // Build a context from the search results
    let app_count = search_results.applications.len();
    let file_count = search_results.files.len();

    let mut context = format!("User searched for: '{}'\n\nSearch Results Summary:\n", query);

    if app_count > 0 {
        context.push_str(&format!("- {} application(s) found:\n", app_count));
        for (i, app) in search_results.applications.iter().take(5).enumerate() {
            context.push_str(&format!("  {}. {} ({})\n", i + 1, app.name, app.path));
        }
        if app_count > 5 {
            context.push_str(&format!("  ... and {} more\n", app_count - 5));
        }
    }

    if file_count > 0 {
        context.push_str(&format!("- {} file(s) found:\n", file_count));
        for (i, file) in search_results.files.iter().take(5).enumerate() {
            let file_name = file.path.split('/').last().unwrap_or(&file.path);
            context.push_str(&format!("  {}. {}", i + 1, file_name));
            if let Some(line) = &file.line_content {
                context.push_str(&format!(" - {}", line));
            }
            context.push_str("\n");
        }
        if file_count > 5 {
            context.push_str(&format!("  ... and {} more\n", file_count - 5));
        }
    }

    // Create a prompt for the AI
    let prompt = format!(
        "{}\n\nProvide a brief, helpful summary of these search results. \
        Suggest what the user might want to do with these results. \
        If there are interesting patterns or insights, mention them. \
        Keep it concise (2-3 sentences).",
        context
    );

    // Generate the AI response
    let ai_options = AIOptions {
        prompt,
        model: None, // Use default model
        temperature: Some(0.7),
        max_tokens: Some(200),
        top_p: None,
        frequency_penalty: None,
        presence_penalty: None,
    };

    let response = agent
        .generate(ai_options)
        .await
        .map_err(|e| format!("Failed to generate AI insights: {}", e))?;

    Ok(response.text)
}

/// Get available AI providers
#[command]
pub async fn get_available_ai_providers() -> Result<Vec<String>, String> {
    let mut providers = Vec::new();

    if env::var("OPENAI_API_KEY").is_ok() {
        providers.push("OpenAI".to_string());
    }
    if env::var("ANTHROPIC_API_KEY").is_ok() {
        providers.push("Anthropic".to_string());
    }
    if env::var("GEMINI_API_KEY").is_ok() {
        providers.push("Gemini".to_string());
    }
    if env::var("DEEPSEEK_API_KEY").is_ok() {
        providers.push("DeepSeek".to_string());
    }
    if env::var("OPENROUTER_API_KEY").is_ok() {
        providers.push("OpenRouter".to_string());
    }

    Ok(providers)
}

/// Ask AI a question with a specific provider
#[command]
pub async fn ask_ai_provider(query: String, provider_name: String) -> Result<String, String> {
    // Map provider name to AIProvider enum
    let provider = match provider_name.as_str() {
        "OpenAI" => AIProvider::OpenAI,
        "Anthropic" => AIProvider::Anthropic,
        "Gemini" => AIProvider::Gemini,
        "DeepSeek" => AIProvider::DeepSeek,
        "OpenRouter" => AIProvider::OpenRouter,
        _ => return Err(format!("Unknown provider: {}", provider_name)),
    };

    // Initialize the Rig agent with specific provider
    let agent = RigAgent::with_provider(provider)
        .map_err(|e| format!("Failed to initialize {} agent: {}", provider_name, e))?;

    // Create the AI options
    let ai_options = AIOptions {
        prompt: query,
        model: None, // Use default model
        temperature: Some(0.8),
        max_tokens: Some(500),
        top_p: None,
        frequency_penalty: None,
        presence_penalty: None,
    };

    // Generate the AI response
    let response = agent
        .generate(ai_options)
        .await
        .map_err(|e| format!("Failed to generate response from {}: {}", provider_name, e))?;

    Ok(response.text)
}
