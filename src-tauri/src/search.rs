use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
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

#[cfg(target_os = "macos")]
fn extract_app_icon(app_path: &str) -> Option<String> {
    use std::fs;
    use base64::{Engine as _, engine::general_purpose};
    use std::io::Cursor;
    use icns::{IconFamily, IconType};

    // macOS app bundles have structure: AppName.app/Contents/Resources/AppIcon.icns
    let path = Path::new(app_path);

    // Check if this is an app bundle
    if !app_path.ends_with(".app") {
        return None;
    }

    // Look for Info.plist to get the icon file name
    let info_plist = path.join("Contents/Info.plist");
    if !info_plist.exists() {
        return None;
    }

    // Try to read the plist and extract icon file name
    let icon_file = if let Ok(content) = fs::read_to_string(&info_plist) {
        // Simple parsing - look for CFBundleIconFile
        content
            .lines()
            .skip_while(|line| !line.contains("CFBundleIconFile"))
            .nth(1)
            .and_then(|line| {
                line.trim()
                    .trim_start_matches("<string>")
                    .trim_end_matches("</string>")
                    .trim()
                    .to_string()
                    .into()
            })
    } else {
        None
    };

    let icon_name = icon_file.unwrap_or_else(|| "AppIcon".to_string());
    let icon_name = if icon_name.ends_with(".icns") {
        icon_name
    } else {
        format!("{}.icns", icon_name)
    };

    // Try to find the icon file
    let resources_dir = path.join("Contents/Resources");
    let icon_path = resources_dir.join(&icon_name);

    // First try the icon specified in Info.plist
    if icon_path.exists() {
        eprintln!("Found icon at: {:?}", icon_path);
        if let Ok(icon_data) = convert_icns_to_png(&icon_path) {
            return Some(icon_data);
        } else {
            eprintln!("Failed to convert icon: {:?}", icon_path);
        }
    }

    // Try common icon names if the specified one doesn't work
    let common_icons = ["AppIcon.icns", "app.icns", "icon.icns", "application.icns"];
    for icon_name in common_icons.iter() {
        let test_path = resources_dir.join(icon_name);
        if test_path.exists() && test_path != icon_path {
            eprintln!("Trying common icon: {:?}", test_path);
            if let Ok(icon_data) = convert_icns_to_png(&test_path) {
                return Some(icon_data);
            }
        }
    }

    eprintln!("No suitable icon found for app: {}", app_path);
    None
}

#[cfg(target_os = "macos")]
fn convert_icns_to_png(icon_path: &Path) -> Result<String, Box<dyn std::error::Error>> {
    use std::fs::File;
    use std::io::Cursor;
    use base64::{Engine as _, engine::general_purpose};
    use icns::{IconFamily, IconType};

    // Read the .icns file
    let file = File::open(icon_path)?;
    let icon_family = IconFamily::read(file)
        .map_err(|e| {
            eprintln!("Failed to read icon family from {:?}: {}", icon_path, e);
            e
        })?;

    eprintln!("Found and reading icon family: {:?}", icon_path);

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
            eprintln!("Successfully extracted icon with type: {:?}", icon_type);
            return convert_image_to_base64(img);
        }
    }

    eprintln!("No suitable icon found in .icns file: {:?}", icon_path);
    Err("No suitable icon found in .icns file".into())
}

#[cfg(target_os = "macos")]
fn convert_image_to_base64(image: icns::Image) -> Result<String, Box<dyn std::error::Error>> {
    use std::io::Cursor;
    use base64::{Engine as _, engine::general_purpose};

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

/// Search for applications installed on the system
#[command]
pub async fn search_applications(query: String) -> Result<Vec<Application>, String> {
    use applications::{AppInfoContext, AppInfo, AppTrait};

    let query_lower = query.to_lowercase();

    // Create context and refresh apps
    let mut ctx = AppInfoContext::new(vec![]);
    ctx.refresh_apps().map_err(|e| format!("Failed to refresh applications: {}", e))?;

    // Get all applications
    let apps = ctx.get_all_apps();

    // Filter and map to our Application struct
    let mut results: Vec<Application> = apps
        .into_iter()
        .filter(|app| app.name.to_lowercase().contains(&query_lower))
        .map(|app| {
            let path_str = app.app_path_exe
                .as_ref()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_else(|| "Unknown".to_string());
            let icon_base64 = extract_app_icon(&path_str);

            Application {
                name: app.name.clone(),
                path: path_str,
                icon_path: None,
                icon_base64,
            }
        })
        .collect();

    // Sort by relevance (exact matches first, then starts with, then contains)
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

    Ok(results)
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
