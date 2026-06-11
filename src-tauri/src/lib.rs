mod api;
mod config;

use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{Manager, Emitter};
use std::io::Cursor;
use rodio::{Decoder, OutputStream, Sink};
use chrono::{Local, Timelike};
use tauri_plugin_notification::NotificationExt;
use std::sync::mpsc::{channel, Sender};

enum AudioCommand {
    Play(Vec<u8>, f32),
    Stop,
}

struct AppState {
    config: Mutex<config::Config>,
    audio_tx: Sender<AudioCommand>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StartupSetting {
    pub enabled: bool,
    pub supported: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PrayerTime {
    pub name: String,
    pub time: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PrayerTimesResult {
    pub city: String,
    pub country: String,
    pub method: u32,
    pub date: String,
    pub hijri_date: String,
    pub timings: Vec<PrayerTime>,
}

#[tauri::command]
fn get_settings(state: tauri::State<'_, AppState>) -> config::Config {
    state.config.lock().unwrap().clone()
}

#[tauri::command]
fn save_settings(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    settings: serde_json::Value,
) -> Result<(), String> {
    let mut cfg = state.config.lock().unwrap();

    if let Some(v) = settings.get("city").and_then(|v| v.as_str()) {
        cfg.city = v.to_string();
    }
    if let Some(v) = settings.get("country").and_then(|v| v.as_str()) {
        cfg.country = v.to_string();
    }
    if let Some(v) = settings.get("method").and_then(|v| v.as_u64()) {
        cfg.method = v as u32;
    }
    if let Some(v) = settings.get("theme").and_then(|v| v.as_str()) {
        cfg.theme = v.to_string();
    }
    if let Some(v) = settings.get("remindersEnabled").and_then(|v| v.as_bool()) {
        cfg.reminders_enabled = v;
    }
    if let Some(v) = settings.get("reminderMinutes").and_then(|v| v.as_u64()) {
        cfg.reminder_minutes = v as u32;
    }
    if let Some(v) = settings.get("lastSurah").and_then(|v| v.as_u64()) {
        cfg.last_surah = v as u32;
    }
    if let Some(v) = settings.get("reciterId").and_then(|v| v.as_u64()) {
        cfg.reciter_id = v as u32;
    }
    if let Some(v) = settings.get("tajweedEnabled").and_then(|v| v.as_bool()) {
        cfg.tajweed_enabled = v;
    }
    if let Some(v) = settings.get("translationsEnabled").and_then(|v| v.as_bool()) {
        cfg.translations_enabled = v;
    }
    if let Some(v) = settings.get("prayerNotificationsEnabled").and_then(|v| v.as_bool()) {
        cfg.prayer_notifications_enabled = v;
    }
    if let Some(v) = settings.get("selectedAzan").and_then(|v| v.as_str()) {
        cfg.selected_azan = v.to_string();
    }
    if let Some(v) = settings.get("azanVolume").and_then(|v| v.as_f64()) {
        cfg.azan_volume = v as f32;
    }

    config::save(&app, &cfg)?;
    Ok(())
}

#[tauri::command]
fn get_startup_setting() -> StartupSetting {
    #[cfg(target_os = "windows")]
    {
        let key = winreg::RegKey::predef(winreg::enums::HKEY_CURRENT_USER)
            .open_subkey_with_flags(
                r"Software\Microsoft\Windows\CurrentVersion\Run",
                winreg::enums::KEY_READ,
            );
        match key {
            Ok(k) => {
                let enabled = k.get_value::<String, _>("quranbuddy").is_ok();
                return StartupSetting { enabled, supported: true };
            }
            Err(_) => {
                return StartupSetting { enabled: false, supported: false };
            }
        }
    }
    #[cfg(not(target_os = "windows"))]
    StartupSetting { enabled: false, supported: false }
}

#[tauri::command]
fn set_startup_setting(enabled: bool) -> Result<StartupSetting, String> {
    #[cfg(target_os = "windows")]
    {
        let key = winreg::RegKey::predef(winreg::enums::HKEY_CURRENT_USER)
            .open_subkey_with_flags(
                r"Software\Microsoft\Windows\CurrentVersion\Run",
                winreg::enums::KEY_SET_VALUE | winreg::enums::KEY_READ,
            )
            .map_err(|e| format!("Failed to open registry: {e}"))?;

        if enabled {
            let exe = std::env::current_exe()
                .map_err(|e| format!("Failed to get exe path: {e}"))?
                .to_string_lossy()
                .to_string();
            key.set_value("quranbuddy", &exe)
                .map_err(|e| format!("Failed to set registry: {e}"))?;
        } else {
            key.delete_value("quranbuddy")
                .map_err(|e| format!("Failed to delete registry: {e}"))?;
        }

        Ok(StartupSetting { enabled, supported: true })
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = enabled;
        Err("Startup setting not supported on this platform".into())
    }
}

#[tauri::command]
fn minimize_to_orb(window: tauri::Window) -> Result<(), String> {
    window.hide().map_err(|e| e.to_string())
}

#[tauri::command]
fn quit_app(app: tauri::AppHandle) -> Result<(), String> {
    app.exit(0);
    Ok(())
}

#[tauri::command]
fn update_reminder_schedule(
    data: serde_json::Value,
) -> Result<(), String> {
    log::info!("Reminder schedule update: {data:?}");
    Ok(())
}

#[tauri::command]
async fn get_prayer_times(state: tauri::State<'_, AppState>) -> Result<PrayerTimesResult, String> {
    let cfg = state.config.lock().unwrap().clone();
    let city = cfg.city.trim();
    let country = cfg.country.trim();

    if city.is_empty() || country.is_empty() {
        return Err("City and country must be configured first".to_string());
    }

    let url = format!(
        "https://api.aladhan.com/v1/timingsByCity?city={}&country={}&method={}",
        city.replace(' ', "%20"),
        country.replace(' ', "%20"),
        cfg.method
    );

    let body: api::AladhanResponse = reqwest::Client::builder()
        .user_agent("quranbuddy/1.0")
        .build()
        .map_err(|e| e.to_string())?
        .get(url)
        .send()
        .await
        .map_err(|e| format!("Prayer times request failed: {e}"))?
        .error_for_status()
        .map_err(|e| format!("Prayer times request returned an error: {e}"))?
        .json()
        .await
        .map_err(|e| format!("Failed to parse prayer times: {e}"))?;

    let filtered = api::filter_prayer_timings(&body.data.timings);
    let timings = api::prayer_order()
        .iter()
        .filter_map(|name| {
            filtered.get(*name).map(|time| PrayerTime {
                name: (*name).to_string(),
                time: time.clone(),
            })
        })
        .collect();

    Ok(PrayerTimesResult {
        city: cfg.city,
        country: cfg.country,
        method: cfg.method,
        date: body.data.date.gregorian.date,
        hijri_date: body.data.date.hijri.date,
        timings,
    })
}

#[tauri::command]
fn on_app_opening() {
    log::info!("App opening animation triggered");
}

#[tauri::command]
fn on_focus_quran_reader() {
    log::info!("Quran reader focus requested");
}

#[tauri::command]
fn get_config_path(app: tauri::AppHandle) -> String {
    config::config_path(&app).to_string_lossy().to_string()
}

#[tauri::command]
fn reset_settings(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<config::Config, String> {
    let cfg = config::Config::default();
    config::save(&app, &cfg)?;
    *state.config.lock().unwrap() = cfg.clone();
    Ok(cfg)
}

#[tauri::command]
fn open_config_folder(app: tauri::AppHandle) -> Result<(), String> {
    let path = config::config_path(&app);
    let folder = path.parent().ok_or("No parent folder")?;
    
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(folder)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(folder)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(folder)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

use tauri::menu::{Menu, MenuItem};
use tauri::tray::{TrayIconBuilder, MouseButton, MouseButtonState, TrayIconEvent};

const TRAY_ICON: tauri::image::Image<'_> = tauri::include_image!("./icons/32x32.png");

fn toggle_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}

fn start_audio_thread(app_handle: tauri::AppHandle) -> Sender<AudioCommand> {
    let (tx, rx) = channel::<AudioCommand>();
    std::thread::spawn(move || {
        let mut _stream: Option<OutputStream> = None;
        let mut sink: Option<Sink> = None;

        while let Ok(cmd) = rx.recv() {
            match cmd {
                AudioCommand::Play(bytes, volume) => {
                    if let Some(s) = sink.take() {
                        s.stop();
                    }
                    if let Ok((s, stream_handle)) = OutputStream::try_default() {
                        if let Ok(sk) = Sink::try_new(&stream_handle) {
                            let cursor = Cursor::new(bytes);
                            if let Ok(source) = Decoder::new(cursor) {
                                sk.set_volume(volume);
                                sk.append(source);
                                _stream = Some(s);
                                sink = Some(sk);
                            }
                        }
                    }
                }
                AudioCommand::Stop => {
                    if let Some(s) = sink.take() {
                        s.stop();
                    }
                    _stream = None;
                    let _ = app_handle.emit("azan-stopped", ());
                }
            }
        }
    });
    tx
}

#[tauri::command]
async fn preview_azan(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    azan_name: String,
) -> Result<(), String> {
    let url = api::AZAN_MAP.iter()
        .find(|(name, _)| *name == azan_name)
        .map(|(_, url)| *url)
        .ok_or_else(|| "Azan not found".to_string())?;

    let volume = state.config.lock().unwrap().azan_volume;
    play_azan_background(state, app, url.to_string(), volume).await
}

#[tauri::command]
fn stop_azan(state: tauri::State<'_, AppState>) {
    let _ = state.audio_tx.send(AudioCommand::Stop);
}

#[tauri::command]
fn get_azan_list() -> Vec<String> {
    api::AZAN_MAP.iter().map(|(name, _)| name.to_string()).collect()
}

async fn play_azan_background(
    state: tauri::State<'_, AppState>,
    app: tauri::AppHandle,
    url: String,
    volume: f32,
) -> Result<(), String> {
    let client = api::http_client()?;
    let resp = client.get(url).send().await.map_err(|e| e.to_string())?
        .error_for_status().map_err(|e| e.to_string())?;
    let bytes = resp.bytes().await.map_err(|e| e.to_string())?;

    let _ = state.audio_tx.send(AudioCommand::Play(bytes.to_vec(), volume));
    let _ = app.emit("azan-started", ());
    Ok(())
}

fn subtract_minutes(time: &str, minutes: u32) -> Option<String> {
    let clean = time.split_whitespace().next().unwrap_or(time);
    let parts: Vec<&str> = clean.split(':').collect();
    let hour: u32 = parts.first()?.parse().ok()?;
    let minute: u32 = parts.get(1)?.parse().ok()?;
    let total = hour * 60 + minute;
    let result = if total >= minutes { total - minutes } else { 0 };
    Some(format!("{:02}:{:02}", result / 60, result % 60))
}

fn start_prayer_scheduler(app: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        let mut last_triggered: Option<(String, String)> = None;
        let mut reminded: std::collections::HashSet<String> = std::collections::HashSet::new();

        loop {
            let now = Local::now();
            let current_time = format!("{:02}:{:02}", now.hour(), now.minute());
            let current_date = now.format("%Y-%m-%d").to_string();

            let state = app.state::<AppState>();
            let (enabled, reminders_enabled, reminder_minutes, selected_azan, volume, city) = {
                let cfg = state.config.lock().unwrap();
                (cfg.prayer_notifications_enabled, cfg.reminders_enabled, cfg.reminder_minutes, cfg.selected_azan.clone(), cfg.azan_volume, cfg.city.clone())
            };

            if enabled || reminders_enabled {
                if let Ok(result) = get_prayer_times(app.state::<AppState>()).await {
                    for prayer in result.timings {
                        let prayer_time = prayer.time.split_whitespace().next().unwrap_or(&prayer.time);

                        if enabled && prayer_time == current_time {
                            let trigger_key = (current_date.clone(), prayer.name.clone());
                            if last_triggered.as_ref() != Some(&trigger_key) {
                                last_triggered = Some(trigger_key);

                                let _ = app.notification()
                                    .builder()
                                    .title(format!("Time for {}", prayer.name))
                                    .body(format!("It is now time for {} prayer in {}.", prayer.name, city))
                                    .show();

                                let azan_url = api::AZAN_MAP.iter()
                                    .find(|(name, _)| *name == selected_azan)
                                    .map(|(_, url)| *url)
                                    .unwrap_or(api::AZAN_MAP[0].1);

                                let _ = play_azan_background(state.clone(), app.clone(), azan_url.to_string(), volume).await;
                            }
                        }

                        if reminders_enabled && reminder_minutes > 0 {
                            if let Some(reminder_time) = subtract_minutes(prayer_time, reminder_minutes) {
                                if reminder_time == current_time {
                                    let key = format!("{}-{}-{}", current_date, prayer.name, reminder_minutes);
                                    if reminded.insert(key) {
                                        let _ = app.notification()
                                            .builder()
                                            .title(format!("{} prayer soon", prayer.name))
                                            .body(format!("{} will begin in {} minute(s).", prayer.name, reminder_minutes))
                                            .show();
                                    }
                                }
                            }
                        }
                    }
                }
            }
            
            tokio::time::sleep(tokio::time::Duration::from_secs(30)).await;
        }
    });
}

#[tauri::command]
async fn trigger_test_notification(app: tauri::AppHandle, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let (selected_azan, volume, city) = {
        let cfg = state.config.lock().unwrap();
        (cfg.selected_azan.clone(), cfg.azan_volume, cfg.city.clone())
    };

    let _ = app.notification()
        .builder()
        .title("Test Notification")
        .body(format!("This is a test notification from QuranBuddy for {}.", city))
        .show();

    let azan_url = api::AZAN_MAP.iter()
        .find(|(name, _)| *name == selected_azan)
        .map(|(_, url)| *url)
        .unwrap_or(api::AZAN_MAP[0].1);

    play_azan_background(state, app, azan_url.to_string(), volume).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let cfg = config::load(app.handle());
            let audio_tx = start_audio_thread(app.handle().clone());
            app.manage(AppState {
                config: Mutex::new(cfg),
                audio_tx,
            });

            let app_handle = app.handle().clone();
            start_prayer_scheduler(app_handle);

            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Show/Hide", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            let _tray = TrayIconBuilder::new()
                .icon(TRAY_ICON)
                .tooltip("quranbuddy")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "quit" => app.exit(0),
                        "show" => toggle_main_window(app),
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        toggle_main_window(tray.app_handle());
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            api::fetch_json,
            api::get_chapter,
            api::get_chapters,
            api::get_recitations,
            api::get_chapter_audio,
            api::get_verses_by_chapter,
            api::get_verses_page,
            api::get_verses_fallback,
            api::get_verses_tajweed,
            api::get_verses_tajweed_batch,
            api::get_verses_audio,
            api::download_chapter_audio,
            api::get_chapter_audio_path,
            api::get_bulk_chapter_audio_status,
            api::get_downloaded_chapter_reciters,
            api::delete_chapter_audio,
            api::get_chapter_audio_bytes,
            api::search_verses,
            api::get_verses_words_audio,
            api::fetch_audio_bytes,
            api::cache_chapter_audio,
            get_settings,
            save_settings,
            get_startup_setting,
            set_startup_setting,
            get_prayer_times,
            minimize_to_orb,
            quit_app,
            update_reminder_schedule,
            on_app_opening,
            on_focus_quran_reader,
            preview_azan,
            stop_azan,
            get_azan_list,
            get_config_path,
            reset_settings,
            open_config_folder,
            trigger_test_notification,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
