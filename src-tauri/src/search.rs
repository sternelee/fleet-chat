use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Application {
    pub name: String,
    pub path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon_path: Option<String>,
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

/// Search for applications installed on the system
#[command]
pub async fn search_applications(query: String) -> Result<Vec<Application>, String> {
    let query_lower = query.to_lowercase();

    // Get all applications using the applications crate
    let apps = applications::get_all_applications().map_err(|e| format!("Failed to get applications: {}", e))?;

    // Filter and map to our Application struct
    let mut results: Vec<Application> = apps
        .into_iter()
        .filter(|app| app.name.to_lowercase().contains(&query_lower))
        .map(|app| Application {
            name: app.name.clone(),
            path: app.path.to_string_lossy().to_string(),
            icon_path: None, // Applications crate doesn't provide icons directly
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
