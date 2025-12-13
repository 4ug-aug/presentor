use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ImageEntry {
    pub name: String,
    pub path: String,
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

/// Save an image to the images directory within the storage path
/// Returns the filename of the saved image
#[tauri::command]
fn save_image(storage_dir: String, source_path: String) -> Result<String, String> {
    let images_dir = PathBuf::from(&storage_dir).join("images");
    
    // Create images directory if it doesn't exist
    fs::create_dir_all(&images_dir).map_err(|e| e.to_string())?;
    
    // Get the filename from the source path
    let source = PathBuf::from(&source_path);
    let filename = source
        .file_name()
        .ok_or_else(|| "Invalid source path".to_string())?
        .to_string_lossy()
        .to_string();
    
    // Generate a unique filename if one already exists
    let mut dest_filename = filename.clone();
    let mut dest_path = images_dir.join(&dest_filename);
    let mut counter = 1;
    
    while dest_path.exists() {
        let stem = source.file_stem().unwrap_or_default().to_string_lossy();
        let ext = source.extension().map(|e| e.to_string_lossy().to_string()).unwrap_or_default();
        dest_filename = if ext.is_empty() {
            format!("{}-{}", stem, counter)
        } else {
            format!("{}-{}.{}", stem, counter, ext)
        };
        dest_path = images_dir.join(&dest_filename);
        counter += 1;
    }
    
    // Copy the file
    fs::copy(&source_path, &dest_path).map_err(|e| format!("Failed to copy image: {}", e))?;
    
    Ok(dest_filename)
}

/// List all images in the images directory
#[tauri::command]
fn list_images(storage_dir: String) -> Result<Vec<ImageEntry>, String> {
    let images_dir = PathBuf::from(&storage_dir).join("images");
    
    if !images_dir.exists() {
        // Create directory if it doesn't exist
        fs::create_dir_all(&images_dir).map_err(|e| e.to_string())?;
        return Ok(Vec::new());
    }
    
    let image_extensions = ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"];
    
    let entries = fs::read_dir(&images_dir)
        .map_err(|e| e.to_string())?
        .filter_map(|entry| {
            entry.ok().and_then(|e| {
                let path = e.path();
                let name = e.file_name().to_string_lossy().to_string();
                
                // Only include image files
                if path.is_file() {
                    let ext = path.extension()
                        .map(|e| e.to_string_lossy().to_lowercase())
                        .unwrap_or_default();
                    
                    if image_extensions.contains(&ext.as_str()) {
                        return Some(ImageEntry {
                            name,
                            path: path.to_string_lossy().to_string(),
                        });
                    }
                }
                None
            })
        })
        .collect();
    
    Ok(entries)
}

/// Delete an image from the images directory
#[tauri::command]
fn delete_image(image_path: String) -> Result<(), String> {
    fs::remove_file(&image_path).map_err(|e| format!("Failed to delete image: {}", e))
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
            save_image,
            list_images,
            delete_image,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

