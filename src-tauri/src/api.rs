#![allow(dead_code)]

use serde::{Deserialize, Serialize};
use std::time::Instant;
use tauri::{Emitter, Manager};
use tokio::io::AsyncWriteExt;
const PRAYER_ORDER: [&str; 5] = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
pub const AZAN_MAP: [(&str, &str); 3] = [
    ("Makkah", "https://raw.githubusercontent.com/Kiwifu/adhan-mp3/master/Ali_Ibn_Ahmad_Mala_HQ.mp3"),
    ("Madinah", "https://raw.githubusercontent.com/AalianKhan/adhans/master/adhan.mp3"),
    ("Egypt", "https://raw.githubusercontent.com/Kiwifu/adhan-mp3/master/Abdulbasit_Abdusamad_1_-_Egypt_(%D8%B9%D8%A8%D8%AF_%D8%A7%D9%84%D8%A8%D8%A7%D8%B3%D8%B7_%D8%B9%D8%A8%D8%AF_%D8%A7%D9%84%D8%B5%D9%85%D8%AF_-_%D9%85%D8%B5%D8%B1).mp3"),
];
const DEFAULT_RECITER_ID: u32 = 7;
const MAHER_RECITER_ID: u32 = 7001;
const MAHER_RECITER_NAME: &str = "Maher Al Muaiqly";
const MAHER_FULL_SURAH_BASE_URL: &str = "https://server12.mp3quran.net/maher";
const YASSER_RECITER_ID: u32 = 7002;
const YASSER_RECITER_NAME: &str = "Yasser Al Dossari";
const YASSER_FULL_SURAH_BASE_URL: &str = "https://server11.mp3quran.net/download/yasser";
const HAZZA_RECITER_ID: u32 = 7003;
const HAZZA_RECITER_NAME: &str = "Hazza Al-Balushi";
const HAZZA_FULL_SURAH_BASE_URL: &str = "https://server11.mp3quran.net/hazza";
const BUKHATIR_RECITER_ID: u32 = 7004;
const BUKHATIR_RECITER_NAME: &str = "Salah Bukhatir";
const BUKHATIR_FULL_SURAH_BASE_URL: &str = "https://server8.mp3quran.net/bu_khtr";
const QATAMI_RECITER_ID: u32 = 7005;
const QATAMI_RECITER_NAME: &str = "Nasser Al-Qatami";
const QATAMI_FULL_SURAH_BASE_URL: &str = "https://server6.mp3quran.net/qtm";
const JILEEL_RECITER_ID: u32 = 7006;
const JILEEL_RECITER_NAME: &str = "Khalid Al-Jileel";
const JILEEL_FULL_SURAH_BASE_URL: &str = "https://server10.mp3quran.net/download/jleel";
const JUHANY_RECITER_ID: u32 = 7007;
const JUHANY_RECITER_NAME: &str = "Abdullah Al-Juhany";
const JUHANY_FULL_SURAH_BASE_URL: &str = "https://server13.mp3quran.net/jhn";
const JABER_RECITER_ID: u32 = 7008;
const JABER_RECITER_NAME: &str = "Ali Jaber";
const JABER_FULL_SURAH_BASE_URL: &str = "https://server11.mp3quran.net/a_jbr";
const BADER_RECITER_ID: u32 = 7009;
const BADER_RECITER_NAME: &str = "Badr Al-Turki";
const BADER_FULL_SURAH_BASE_URL: &str = "https://server10.mp3quran.net/download/bader/Rewayat-Hafs-A-n-Assem";
const YOUNES_RECITER_ID: u32 = 7010;
const YOUNES_RECITER_NAME: &str = "Younes Souilass (Aswelis)";
const YOUNES_FULL_SURAH_BASE_URL: &str = "https://server16.mp3quran.net/souilass/Rewayat-Warsh-A-n-Nafi";
const TRANSLATION_ID: u32 = 20;

#[derive(Debug, Serialize, Deserialize)]
pub struct AladhanResponse {
    pub data: AladhanData,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AladhanData {
    pub timings: std::collections::HashMap<String, String>,
    pub date: AladhanDate,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AladhanDate {
    pub gregorian: AladhanGregorian,
    pub hijri: AladhanHijri,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AladhanGregorian {
    pub date: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AladhanHijri {
    pub date: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChaptersResponse {
    pub chapters: Vec<Chapter>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Chapter {
    pub id: u32,
    pub name_simple: String,
    pub name_arabic: String,
    pub verses_count: u32,
    pub revelation_place: String,
    pub translated_name: Option<TranslatedName>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RecitationsResponse {
    pub recitations: Vec<Recitation>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Recitation {
    pub id: u32,
    #[serde(default)]
    pub reciter_name: Option<String>,
    pub translated_name: Option<TranslatedName>,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub style: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TranslatedName {
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChapterRecitationResponse {
    pub audio_file: Option<AudioFile>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AudioFile {
    pub audio_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VersesResponse {
    pub verses: Option<Vec<Verse>>,
    pub pagination: Option<Pagination>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Verse {
    pub verse_key: Option<String>,
    #[serde(default)]
    pub text_uthmani: Option<String>,
    #[serde(default)]
    pub text_imlaei: Option<String>,
    #[serde(default)]
    pub translations: Option<Vec<Translation>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Translation {
    pub text: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Pagination {
    pub next_page: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UthmaniResponse {
    pub verses: Option<Vec<UthmaniVerse>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UthmaniVerse {
    pub verse_key: Option<String>,
    #[serde(default)]
    pub text_uthmani: Option<String>,
    #[serde(default)]
    pub text_imlaei: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TranslationsResponse {
    pub translations: Option<Vec<TranslationRow>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TranslationRow {
    pub verse_key: Option<String>,
    pub text: Option<String>,
}

pub fn http_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .user_agent("quranbuddy/1.0")
        .build()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn fetch_json(url: String) -> Result<serde_json::Value, String> {
    let client = http_client()?;

    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {e}"))?;

    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse JSON: {e}"))?;

    Ok(body)
}

#[tauri::command]
pub async fn get_chapter(id: u32) -> Result<Chapter, String> {
    let chapters = get_chapters_inner().await?;
    chapters
        .into_iter()
        .find(|c| c.id == id)
        .ok_or_else(|| format!("Chapter {id} not found"))
}

async fn get_chapters_inner() -> Result<Vec<Chapter>, String> {
    let client = http_client()?;
    let resp = client
        .get("https://api.quran.com/api/v4/chapters?language=en")
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {e}"))?;

    let body: ChaptersResponse = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse chapters: {e}"))?;

    Ok(body.chapters)
}

#[tauri::command]
pub async fn get_chapters() -> Result<Vec<Chapter>, String> {
    get_chapters_inner().await
}

#[tauri::command]
fn custom_recitation(id: u32, name: &str) -> Recitation {
    Recitation {
        id,
        reciter_name: Some(name.to_string()),
        name: None,
        translated_name: Some(TranslatedName {
            name: name.to_string(),
        }),
        style: None,
    }
}

#[tauri::command]
pub async fn get_recitations() -> Result<Vec<Recitation>, String> {
    let client = http_client()?;
    let resp = client
        .get("https://api.quran.com/api/v4/resources/recitations?language=en")
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {e}"))?;

    let body: RecitationsResponse = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse recitations: {e}"))?;

    let mut all = vec![
        custom_recitation(MAHER_RECITER_ID, MAHER_RECITER_NAME),
        custom_recitation(YASSER_RECITER_ID, YASSER_RECITER_NAME),
        custom_recitation(HAZZA_RECITER_ID, HAZZA_RECITER_NAME),
        custom_recitation(BUKHATIR_RECITER_ID, BUKHATIR_RECITER_NAME),
        custom_recitation(QATAMI_RECITER_ID, QATAMI_RECITER_NAME),
        custom_recitation(JILEEL_RECITER_ID, JILEEL_RECITER_NAME),
        custom_recitation(JUHANY_RECITER_ID, JUHANY_RECITER_NAME),
        custom_recitation(JABER_RECITER_ID, JABER_RECITER_NAME),
        custom_recitation(BADER_RECITER_ID, BADER_RECITER_NAME),
        custom_recitation(YOUNES_RECITER_ID, YOUNES_RECITER_NAME),
    ];
    all.extend(body.recitations);
    Ok(all)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AudioResult {
    pub audio_url: String,
    pub is_maher: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct DownloadProgress {
    pub chapter_id: u32,
    pub reciter_id: u32,
    pub downloaded: u64,
    pub total: Option<u64>,
    pub percent: Option<f64>,
    pub bytes_per_second: Option<f64>,
    pub status: String,
}

#[tauri::command]
pub async fn get_chapter_audio(chapter_id: u32, reciter_id: u32) -> Result<AudioResult, String> {
    if reciter_id == MAHER_RECITER_ID {
        return Ok(AudioResult {
            audio_url: maher_audio_url(chapter_id),
            is_maher: true,
        });
    }

    if reciter_id == YASSER_RECITER_ID {
        return Ok(AudioResult {
            audio_url: yasser_audio_url(chapter_id),
            is_maher: false,
        });
    }

    if reciter_id == HAZZA_RECITER_ID {
        return Ok(AudioResult {
            audio_url: hazza_audio_url(chapter_id),
            is_maher: false,
        });
    }

    if reciter_id == BUKHATIR_RECITER_ID {
        return Ok(AudioResult {
            audio_url: bukhatir_audio_url(chapter_id),
            is_maher: false,
        });
    }

    if reciter_id == QATAMI_RECITER_ID {
        return Ok(AudioResult {
            audio_url: qatami_audio_url(chapter_id),
            is_maher: false,
        });
    }

    if reciter_id == JILEEL_RECITER_ID {
        return Ok(AudioResult {
            audio_url: jileel_audio_url(chapter_id),
            is_maher: false,
        });
    }

    if reciter_id == JUHANY_RECITER_ID {
        return Ok(AudioResult {
            audio_url: juhany_audio_url(chapter_id),
            is_maher: false,
        });
    }

    if reciter_id == JABER_RECITER_ID {
        return Ok(AudioResult {
            audio_url: jaber_audio_url(chapter_id),
            is_maher: false,
        });
    }

    if reciter_id == BADER_RECITER_ID {
        return Ok(AudioResult {
            audio_url: bader_audio_url(chapter_id),
            is_maher: false,
        });
    }

    if reciter_id == YOUNES_RECITER_ID {
        return Ok(AudioResult {
            audio_url: younes_audio_url(chapter_id),
            is_maher: false,
        });
    }

    let client = http_client()?;
    let url = format!("https://api.quran.com/api/v4/chapter_recitations/{reciter_id}/{chapter_id}");
    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {e}"))?;

    let body: ChapterRecitationResponse = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse audio response: {e}"))?;

    let raw_url = body
        .audio_file
        .and_then(|f| f.audio_url)
        .ok_or_else(|| "Missing audio URL in response".to_string())?;

    Ok(AudioResult {
        audio_url: normalize_audio_url(&raw_url),
        is_maher: false,
    })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VerseEntry {
    pub verse_key: String,
    pub arabic: String,
    pub translation: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VersesPage {
    pub verses: Vec<VerseEntry>,
    pub next_page: Option<u32>,
}

#[tauri::command]
pub async fn get_verses_page(chapter_id: u32, page: u32) -> Result<VersesPage, String> {
    let client = http_client()?;
    let url = format!(
        "https://api.quran.com/api/v4/verses/by_chapter/{chapter_id}?language=en&words=false&translations={TRANSLATION_ID}&fields=text_uthmani,translations.text&per_page=50&page={page}"
    );
    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {e}"))?;

    let body: VersesResponse = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse verses: {e}"))?;

    let mut verses = Vec::new();
    if let Some(chunk) = body.verses {
        for v in chunk {
            if let Some(key) = v.verse_key {
                verses.push(VerseEntry {
                    verse_key: key,
                    arabic: v.text_uthmani.or(v.text_imlaei).unwrap_or_default(),
                    translation: v
                        .translations
                        .and_then(|t| t.into_iter().next())
                        .and_then(|t| t.text)
                        .unwrap_or_default(),
                });
            }
        }
    }

    Ok(VersesPage {
        next_page: body.pagination.and_then(|p| p.next_page),
        verses,
    })
}

#[tauri::command]
pub async fn get_verses_by_chapter(chapter_id: u32) -> Result<Vec<VerseEntry>, String> {
    let client = http_client()?;
    let mut verses: Vec<VerseEntry> = Vec::new();
    let mut page: u32 = 1;

    loop {
        let url = format!(
            "https://api.quran.com/api/v4/verses/by_chapter/{chapter_id}?language=en&words=false&translations={TRANSLATION_ID}&fields=text_uthmani,translations.text&per_page=50&page={page}"
        );
        let resp = client
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("HTTP request failed: {e}"))?;

        let body: VersesResponse = resp
            .json()
            .await
            .map_err(|e| format!("Failed to parse verses: {e}"))?;

        if let Some(chunk) = body.verses {
            for v in chunk {
                if let Some(key) = v.verse_key {
                    verses.push(VerseEntry {
                        verse_key: key,
                        arabic: v.text_uthmani.or(v.text_imlaei).unwrap_or_default(),
                        translation: v
                            .translations
                            .and_then(|t| t.into_iter().next())
                            .and_then(|t| t.text)
                            .unwrap_or_default(),
                    });
                }
            }
        }

        match body.pagination.and_then(|p| p.next_page) {
            Some(next) => page = next,
            None => break,
        }
    }

    if verses.is_empty() {
        return Err("No verses returned from primary endpoint".to_string());
    }

    Ok(verses)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VerseAudio {
    pub verse_key: String,
    pub audio_url: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct VerseAudioResponse {
    verses: Vec<VerseAudioInner>,
    pagination: Option<Pagination>,
}

#[derive(Debug, Serialize, Deserialize)]
struct VerseAudioInner {
    verse_key: String,
    audio: Option<AudioInfo>,
}

#[derive(Debug, Serialize, Deserialize)]
struct AudioInfo {
    url: String,
}

#[tauri::command]
pub async fn get_verses_audio(chapter_id: u32, reciter_id: u32) -> Result<Vec<VerseAudio>, String> {
    let client = http_client()?;
    let mut audio_list: Vec<VerseAudio> = Vec::new();
    let mut page: u32 = 1;

    loop {
        let url = format!(
            "https://api.quran.com/api/v4/verses/by_chapter/{chapter_id}?audio={reciter_id}&per_page=50&page={page}"
        );
        let resp = client
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("HTTP request failed: {e}"))?;

        let body: VerseAudioResponse = resp
            .json()
            .await
            .map_err(|e| format!("Failed to parse verse audio: {e}"))?;

        for v in body.verses {
            if let Some(a) = v.audio {
                audio_list.push(VerseAudio {
                    verse_key: v.verse_key,
                    audio_url: a.url,
                });
            }
        }

        match body.pagination.and_then(|p| p.next_page) {
            Some(next) => page = next,
            None => break,
        }
    }

    if audio_list.is_empty() {
        return Err("No verse audio returned".to_string());
    }

    Ok(audio_list)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TajweedVerse {
    pub verse_key: String,
    pub text_uthmani_tajweed: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TajweedVersesResponse {
    pub verses: Vec<TajweedVerse>,
}

#[tauri::command]
pub async fn get_verses_tajweed(chapter_id: u32) -> Result<Vec<TajweedVerse>, String> {
    let client = http_client()?;
    let url = format!(
        "https://api.quran.com/api/v4/quran/verses/uthmani_tajweed?chapter_number={chapter_id}"
    );
    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {e}"))?;

    let body: TajweedVersesResponse = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse tajweed verses: {e}"))?;

    if body.verses.is_empty() {
        return Err("No tajweed verses returned".to_string());
    }

    Ok(body.verses)
}

#[tauri::command]
pub async fn get_verses_tajweed_batch(
    verse_keys: Vec<String>,
) -> Result<Vec<TajweedVerse>, String> {
    let mut unique_chapters: Vec<u32> = verse_keys
        .iter()
        .filter_map(|k| k.split(':').next()?.parse().ok())
        .collect();
    unique_chapters.sort();
    unique_chapters.dedup();

    if unique_chapters.is_empty() {
        return Ok(vec![]);
    }

    let client = http_client()?;
    let mut handles = Vec::new();

    for ch in unique_chapters {
        let url = format!(
            "https://api.quran.com/api/v4/quran/verses/uthmani_tajweed?chapter_number={ch}"
        );
        let client = client.clone();
        handles.push(tauri::async_runtime::spawn(async move {
            match client.get(&url).send().await {
                Ok(resp) => resp
                    .json::<TajweedVersesResponse>()
                    .await
                    .map(|b| b.verses)
                    .unwrap_or_default(),
                Err(_) => vec![],
            }
        }));
    }

    let mut all_verses = Vec::new();
    for handle in handles {
        all_verses.extend(handle.await.unwrap_or_default());
    }

    let requested_set: std::collections::HashSet<&str> =
        verse_keys.iter().map(|s| s.as_str()).collect();

    Ok(all_verses
        .into_iter()
        .filter(|v| requested_set.contains(v.verse_key.as_str()))
        .collect())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FallbackVersesResult {
    pub verses: Vec<VerseEntry>,
}

#[tauri::command]
pub async fn get_verses_fallback(chapter_id: u32) -> Result<Vec<VerseEntry>, String> {
    let client = http_client()?;

    let (arabic_body, translation_body): (UthmaniResponse, TranslationsResponse) = {
        let arabic_fut = client
            .get(format!(
                "https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number={chapter_id}"
            ))
            .send()
            .await
            .map_err(|e| format!("Arabic request failed: {e}"))?;

        let translation_fut = client
            .get(format!(
                "https://api.quran.com/api/v4/quran/translations/{TRANSLATION_ID}?chapter_number={chapter_id}"
            ))
            .send()
            .await
            .map_err(|e| format!("Translation request failed: {e}"))?;

        (
            arabic_fut
                .json::<UthmaniResponse>()
                .await
                .map_err(|e| format!("Failed to parse Arabic verses: {e}"))?,
            translation_fut
                .json::<TranslationsResponse>()
                .await
                .map_err(|e| format!("Failed to parse translations: {e}"))?,
        )
    };

    let translation_by_key: std::collections::HashMap<&str, &str> = translation_body
        .translations
        .as_deref()
        .unwrap_or_default()
        .iter()
        .filter_map(|row| {
            row.verse_key
                .as_deref()
                .map(|key| (key, row.text.as_deref().unwrap_or("")))
        })
        .collect();

    let verses: Vec<VerseEntry> = arabic_body
        .verses
        .unwrap_or_default()
        .into_iter()
        .filter_map(|v| {
            let key = v.verse_key?;
            let arabic = v.text_uthmani.or(v.text_imlaei).unwrap_or_default();
            if key.is_empty() || arabic.is_empty() {
                return None;
            }
            Some(VerseEntry {
                verse_key: key.clone(),
                arabic,
                translation: translation_by_key
                    .get(key.as_str())
                    .copied()
                    .unwrap_or("")
                    .to_string(),
            })
        })
        .collect();

    if verses.is_empty() {
        return Err("No verses from fallback endpoint".to_string());
    }

    Ok(verses)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchHit {
    pub verse_key: String,
    pub text: String,
    pub translations: Vec<SearchTranslation>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchTranslation {
    pub text: String,
    pub name: String,
    pub language_name: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct SearchResponse {
    search: SearchBody,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchBody {
    query: String,
    total_results: u32,
    current_page: u32,
    total_pages: u32,
    results: Vec<SearchHit>,
}

#[tauri::command]
pub async fn search_verses(query: String, page: Option<u32>) -> Result<SearchBody, String> {
    let client = http_client()?;
    let p = page.unwrap_or(1);
    let url = format!(
        "https://api.quran.com/api/v4/search?q={}&language=en&per_page=20&page={p}",
        &query.trim().replace(' ', "%20")
    );
    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Search request failed: {e}"))?;

    let body: SearchResponse = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse search results: {e}"))?;

    Ok(body.search)
}

pub fn filter_prayer_timings(
    timings: &std::collections::HashMap<String, String>,
) -> std::collections::HashMap<String, String> {
    let mut filtered = std::collections::HashMap::new();
    for prayer in PRAYER_ORDER {
        if let Some(time) = timings.get(prayer) {
            filtered.insert(prayer.to_string(), time.clone());
        }
    }
    filtered
}

pub fn format_track_number(surah_id: u32) -> String {
    format!("{:03}", surah_id)
}

pub fn maher_audio_url(surah_id: u32) -> String {
    format!(
        "{MAHER_FULL_SURAH_BASE_URL}/{}.mp3",
        format_track_number(surah_id)
    )
}

pub fn yasser_audio_url(surah_id: u32) -> String {
    format!(
        "{YASSER_FULL_SURAH_BASE_URL}/{}.mp3",
        format_track_number(surah_id)
    )
}

pub fn hazza_audio_url(surah_id: u32) -> String {
    format!(
        "{HAZZA_FULL_SURAH_BASE_URL}/{}.mp3",
        format_track_number(surah_id)
    )
}

pub fn bukhatir_audio_url(surah_id: u32) -> String {
    format!(
        "{BUKHATIR_FULL_SURAH_BASE_URL}/{}.mp3",
        format_track_number(surah_id)
    )
}

pub fn qatami_audio_url(surah_id: u32) -> String {
    format!(
        "{QATAMI_FULL_SURAH_BASE_URL}/{}.mp3",
        format_track_number(surah_id)
    )
}

pub fn jileel_audio_url(surah_id: u32) -> String {
    format!(
        "{JILEEL_FULL_SURAH_BASE_URL}/{}.mp3",
        format_track_number(surah_id)
    )
}

pub fn juhany_audio_url(surah_id: u32) -> String {
    format!(
        "{JUHANY_FULL_SURAH_BASE_URL}/{}.mp3",
        format_track_number(surah_id)
    )
}

pub fn jaber_audio_url(surah_id: u32) -> String {
    format!(
        "{JABER_FULL_SURAH_BASE_URL}/{}.mp3",
        format_track_number(surah_id)
    )
}

pub fn bader_audio_url(surah_id: u32) -> String {
    format!(
        "{BADER_FULL_SURAH_BASE_URL}/{}.mp3",
        format_track_number(surah_id)
    )
}

pub fn younes_audio_url(surah_id: u32) -> String {
    format!(
        "{YOUNES_FULL_SURAH_BASE_URL}/{}.mp3",
        format_track_number(surah_id)
    )
}

pub fn normalize_audio_url(url: &str) -> String {
    if url.starts_with("//") {
        format!("https:{url}")
    } else if url.starts_with("wbw/") {
        format!("https://verses.quran.com/{url}")
    } else {
        url.to_string()
    }
}

pub fn parse_time(time_text: &str) -> Option<(u32, u32)> {
    let mut parts = time_text.splitn(2, ':');
    let hours: u32 = parts.next()?.parse().ok()?;
    let minutes: u32 = parts.next()?.parse().ok()?;
    Some((hours, minutes))
}

pub fn prayer_order() -> &'static [&'static str] {
    &PRAYER_ORDER
}

pub fn default_reciter_id() -> u32 {
    DEFAULT_RECITER_ID
}

pub fn maher_reciter_id() -> u32 {
    MAHER_RECITER_ID
}

pub fn maher_reciter_name() -> &'static str {
    MAHER_RECITER_NAME
}

pub fn translation_id() -> u32 {
    TRANSLATION_ID
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Word {
    pub id: Option<u32>,
    #[serde(default)]
    pub text_uthmani: Option<String>,
    #[serde(default)]
    pub text_indopak: Option<String>,
    #[serde(default)]
    pub char_type: Option<String>,
    #[serde(default)]
    pub position: Option<u32>,
    #[serde(default)]
    pub audio: Option<WordAudio>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WordAudio {
    pub url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VerseWithWords {
    pub verse_key: Option<String>,
    #[serde(default)]
    pub words: Option<Vec<Word>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VersesWithWordsResponse {
    pub verses: Option<Vec<VerseWithWords>>,
    pub pagination: Option<Pagination>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WordAudioEntry {
    pub verse_key: String,
    pub word_position: u32,
    pub audio_url: String,
}

#[tauri::command]
pub async fn get_verse_words(
    chapter_id: u32,
    verse_number: u32,
) -> Result<Vec<WordAudioEntry>, String> {
    let client = http_client()?;
    let url = format!(
        "https://api.quran.com/api/v4/verses/by_key/{chapter_id}:{verse_number}?words=true&translations={TRANSLATION_ID}"
    );
    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {e}"))?;

    let body: VersesWithWordsResponse = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse verse words: {e}"))?;

    if let Some(verses) = body.verses {
        if let Some(verse) = verses.into_iter().next() {
            if let (Some(verse_key), Some(words)) = (verse.verse_key, verse.words) {
                let mut word_audio = Vec::new();
                for (index, word) in words.into_iter().enumerate() {
                    if let Some(audio) = word.audio {
                        if let Some(audio_url) = audio.url {
                            let normalized_url = normalize_audio_url(&audio_url);
                            word_audio.push(WordAudioEntry {
                                verse_key: verse_key.clone(),
                                word_position: index as u32 + 1,
                                audio_url: normalized_url,
                            });
                        }
                    }
                }
                return Ok(word_audio);
            }
        }
    }
    Err("No words found for verse".to_string())
}

#[tauri::command]
pub async fn get_verses_words_audio(chapter_id: u32) -> Result<Vec<WordAudioEntry>, String> {
    let client = http_client()?;
    let mut all_words = Vec::new();
    let mut page: u32 = 1;

    loop {
        let url = format!(
            "https://api.quran.com/api/v4/verses/by_chapter/{chapter_id}?words=true&per_page=50&page={page}"
        );

        let resp = client
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("HTTP request failed: {e}"))?;

        let body: VersesWithWordsResponse = resp
            .json()
            .await
            .map_err(|e| format!("Failed to parse verse words: {e}"))?;

        if let Some(verses) = body.verses {
            for verse in verses {
                let verse_key = match verse.verse_key {
                    Some(v) => v,
                    None => continue,
                };

                let verse_number = verse_key
                    .split(':')
                    .nth(1)
                    .and_then(|v| v.parse::<u32>().ok())
                    .unwrap_or(1);

                if let Some(words) = verse.words {
                    for (index, _) in words.into_iter().enumerate() {
                        let audio_url = format!(
                            "https://verses.quran.com/wbw/{:03}_{:03}_{:03}.mp3",
                            chapter_id,
                            verse_number,
                            (index as u32 + 1)
                        );

                        all_words.push(WordAudioEntry {
                            verse_key: verse_key.clone(),
                            word_position: index as u32 + 1,
                            audio_url,
                        });
                    }
                }
            }
        }

        match body.pagination.and_then(|p| p.next_page) {
            Some(next) => page = next,
            None => break,
        }
    }

    if all_words.is_empty() {
        return Err("No word audio found for chapter".to_string());
    }

    Ok(all_words)
}
#[tauri::command]
pub async fn download_chapter_audio(
    app: tauri::AppHandle,
    chapter_id: u32,
    reciter_id: u32,
) -> Result<String, String> {
    let result = get_chapter_audio(chapter_id, reciter_id).await?;
    let audio_url = result.audio_url;
    let client = http_client()?;

    let response = client
        .get(&audio_url)
        .send()
        .await
        .map_err(|e| format!("Failed to start audio download: {e}"))?
        .error_for_status()
        .map_err(|e| format!("Audio download returned an error: {e}"))?;
    let total = response.content_length();

    let _ = app.emit("chapter-audio-download-progress", DownloadProgress {
        chapter_id,
        reciter_id,
        downloaded: 0,
        total,
        percent: Some(0.0),
        bytes_per_second: None,
        status: "starting".to_string(),
    });

    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("audio");
    tokio::fs::create_dir_all(&dir)
        .await
        .map_err(|e| e.to_string())?;

    let file_path = dir.join(format!("{:03}_{}.mp3", chapter_id, reciter_id));
    let temp_path = dir.join(format!("{:03}_{}.mp3.part", chapter_id, reciter_id));
    let mut file = tokio::fs::File::create(&temp_path)
        .await
        .map_err(|e| format!("Failed to create audio file: {e}"))?;
    let mut downloaded = 0_u64;
    let started_at = Instant::now();
    let mut response = response;

    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|e| format!("Failed while downloading audio: {e}"))?
    {
        file.write_all(&chunk)
            .await
            .map_err(|e| format!("Failed to write audio file: {e}"))?;
        downloaded += chunk.len() as u64;

        let elapsed = started_at.elapsed().as_secs_f64();
        let bytes_per_second = (elapsed > 0.0).then_some(downloaded as f64 / elapsed);
        let percent = total.map(|total| {
            if total == 0 {
                0.0
            } else {
                (downloaded as f64 / total as f64) * 100.0
            }
        });

        let _ = app.emit("chapter-audio-download-progress", DownloadProgress {
            chapter_id,
            reciter_id,
            downloaded,
            total,
            percent,
            bytes_per_second,
            status: "downloading".to_string(),
        });
    }

    file.flush()
        .await
        .map_err(|e| format!("Failed to flush audio file: {e}"))?;
    drop(file);

    tokio::fs::rename(&temp_path, &file_path)
        .await
        .map_err(|e| format!("Failed to finish audio file: {e}"))?;

    let _ = app.emit("chapter-audio-download-progress", DownloadProgress {
        chapter_id,
        reciter_id,
        downloaded,
        total,
        percent: Some(100.0),
        bytes_per_second: None,
        status: "complete".to_string(),
    });

    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn get_chapter_audio_path(app: tauri::AppHandle, chapter_id: u32, reciter_id: u32) -> Result<Option<String>, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("audio");
    
    let file_path = dir.join(format!("{:03}_{}.mp3", chapter_id, reciter_id));
    
    if file_path.exists() {
        Ok(Some(file_path.to_string_lossy().to_string()))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn get_downloaded_chapter_reciters(
    app: tauri::AppHandle,
    chapter_id: u32,
) -> Result<Vec<u32>, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("audio");

    if !dir.exists() {
        return Ok(Vec::new());
    }

    let prefix = format!("{:03}_", chapter_id);
    let mut reciters = Vec::new();
    for entry in std::fs::read_dir(&dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().to_string();
        if !name.starts_with(&prefix) || !name.ends_with(".mp3") {
            continue;
        }

        let reciter_text = name
            .trim_start_matches(&prefix)
            .trim_end_matches(".mp3");
        if let Ok(reciter_id) = reciter_text.parse::<u32>() {
            reciters.push(reciter_id);
        }
    }

    reciters.sort_unstable();
    reciters.dedup();
    Ok(reciters)
}

#[tauri::command]
pub async fn delete_chapter_audio(
    app: tauri::AppHandle,
    chapter_id: u32,
    reciter_id: u32,
) -> Result<(), String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("audio");
    let file_path = dir.join(format!("{:03}_{}.mp3", chapter_id, reciter_id));
    let temp_path = dir.join(format!("{:03}_{}.mp3.part", chapter_id, reciter_id));

    if file_path.exists() {
        std::fs::remove_file(&file_path).map_err(|e| e.to_string())?;
    }
    if temp_path.exists() {
        std::fs::remove_file(&temp_path).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub async fn get_chapter_audio_bytes(app: tauri::AppHandle, chapter_id: u32, reciter_id: u32) -> Result<Vec<u8>, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("audio");
    
    let file_path = dir.join(format!("{:03}_{}.mp3", chapter_id, reciter_id));
    
    if !file_path.exists() {
        return Err("Audio file not found".to_string());
    }
    
    std::fs::read(&file_path)
        .map_err(|e| format!("Failed to read audio file: {}", e))
}

#[tauri::command]
pub async fn fetch_audio_bytes(url: String) -> Result<Vec<u8>, String> {
    let client = http_client()?;
    let bytes = client
        .get(&url)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .bytes()
        .await
        .map_err(|e| e.to_string())?;
    Ok(bytes.to_vec())
}

#[tauri::command]
pub async fn cache_chapter_audio(
    app: tauri::AppHandle,
    chapter_id: u32,
    reciter_id: u32,
) -> Result<String, String> {
    let result = get_chapter_audio(chapter_id, reciter_id).await?;
    let audio_url = result.audio_url;
    let client = http_client()?;

    let response = client
        .get(&audio_url)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch audio: {e}"))?
        .error_for_status()
        .map_err(|e| format!("Audio fetch error: {e}"))?;

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read audio response: {e}"))?;

    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("audio");
    tokio::fs::create_dir_all(&dir)
        .await
        .map_err(|e| e.to_string())?;

    let file_path = dir.join(format!("{:03}_{}.mp3", chapter_id, reciter_id));
    tokio::fs::write(&file_path, &bytes)
        .await
        .map_err(|e| format!("Failed to write audio file: {e}"))?;

    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn get_bulk_chapter_audio_status(
    app: tauri::AppHandle,
    reciter_id: u32,
) -> Result<Vec<u32>, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("audio");

    if !dir.exists() {
        return Ok(Vec::new());
    }

    let suffix = format!("_{}.mp3", reciter_id);
    let mut downloaded = Vec::new();

    for entry in std::fs::read_dir(&dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().to_string();
        if name.ends_with(&suffix) {
            if let Ok(chapter_id) = name[..3].parse::<u32>() {
                downloaded.push(chapter_id);
            }
        }
    }

    downloaded.sort_unstable();
    Ok(downloaded)
}
