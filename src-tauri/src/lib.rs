use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
}

#[tauri::command]
fn list_presentations(dir_path: String) -> Result<Vec<FileEntry>, String> {
    let path = PathBuf::from(&dir_path);
    
    if !path.exists() {
        // Create directory if it doesn't exist
        fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    }

    let entries = fs::read_dir(&path)
        .map_err(|e| e.to_string())?
        .filter_map(|entry| {
            entry.ok().and_then(|e| {
                let path = e.path();
                let name = e.file_name().to_string_lossy().to_string();
                
                // Only include .json files
                if path.is_file() && name.ends_with(".json") {
                    Some(FileEntry {
                        name,
                        path: path.to_string_lossy().to_string(),
                        is_dir: false,
                    })
                } else {
                    None
                }
            })
        })
        .collect();

    Ok(entries)
}

#[tauri::command]
fn read_presentation(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
fn save_presentation(path: String, content: String) -> Result<(), String> {
    // Ensure parent directory exists
    if let Some(parent) = PathBuf::from(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    
    fs::write(&path, content).map_err(|e| format!("Failed to save file: {}", e))
}

#[tauri::command]
fn delete_presentation(path: String) -> Result<(), String> {
    fs::remove_file(&path).map_err(|e| format!("Failed to delete file: {}", e))
}

#[tauri::command]
fn get_documents_path() -> Result<String, String> {
    dirs::document_dir()
        .map(|p| p.join("Presentor").to_string_lossy().to_string())
        .ok_or_else(|| "Could not find documents directory".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            list_presentations,
            read_presentation,
            save_presentation,
            delete_presentation,
            get_documents_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
