use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Config {
    pub city: String,
    pub country: String,
    pub method: u32,
    pub theme: String,
    pub reminders_enabled: bool,
    pub reminder_minutes: u32,
    pub last_surah: u32,
    pub reciter_id: u32,
    pub tajweed_enabled: bool,
    pub translations_enabled: bool,
    pub prayer_notifications_enabled: bool,
    pub selected_azan: String,
    pub azan_volume: f32,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            city: "Dubai".into(),
            country: "UAE".into(),
            method: 2,
            theme: "dark".into(),
            reminders_enabled: false,
            reminder_minutes: 10,
            last_surah: 1,
            reciter_id: 7,
            tajweed_enabled: false,
            translations_enabled: true,
            prayer_notifications_enabled: false,
            selected_azan: "Makkah".into(),
            azan_volume: 0.5,
        }
    }
}

pub fn config_path(app: &tauri::AppHandle) -> PathBuf {
    let dir = app
        .path()
        .app_data_dir()
        .expect("failed to resolve app data dir");
    std::fs::create_dir_all(&dir).ok();
    dir.join("config.json")
}

pub fn load(app: &tauri::AppHandle) -> Config {
    let path = config_path(app);
    std::fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

pub fn save(app: &tauri::AppHandle, config: &Config) -> Result<(), String> {
    let path = config_path(app);
    let json = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    std::fs::write(&path, &json).map_err(|e| e.to_string())
}
