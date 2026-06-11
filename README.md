<div align="center">
  <img src="public/quran.png" alt="QuranBuddy Icon" width="80" height="80" />

  # <span style="font-weight:300">Quran</span><span style="color:#b59043;font-weight:700">Buddy</span>

  **A modern desktop Quran reader with audio, prayer times, and more.**

  Built with [Tauri](https://v2.tauri.app) + [Next.js](https://nextjs.org) &middot; Dark/Light theme &middot; Cross-platform

  <p align="center">
    <a href="#features">Features</a> &middot;
    <a href="#tech-stack">Tech Stack</a> &middot;
    <a href="#faq">FAQ</a> &middot;
    <a href="#development">Development</a> &middot;
    <a href="#building">Building</a>
  </p>
</div>

---

## Features

### Quran Reader
- All **114 surahs** with Uthmani Arabic text
- **Saheeh International** translation (toggle on/off)
- **Tajweed color-coded** text highlighting 12 rules (ghunnah, ikhafa, qalaqah, madda variants, idgham types, etc.)
- **Word-by-word audio** — click any Arabic word to hear its pronunciation
- **Verse-by-verse audio** with full playback controls
- Smooth scroll with [Lenis](https://lenis.darkroom.engineering)

### Audio System
- **10 custom reciters** including Maher Al Muaiqly, Yasser Al Dossari, Salah Bukhatir, and more
- **Full audio player** with play/pause, skip, shuffle, repeat, seek bar, volume control
- **Play queue** — build a playlist of surahs
- **Shuffle mode** — random surah playback on completion
- **Download surahs** for offline listening
- **Real-time download progress** with speed and ETA
- **Audio output device selection** (when supported)

### Prayer Times
- **5 daily prayer times** fetched from the [Aladhan API](https://aladhan.com)
- **Countdown timer** to the next prayer
- **Hijri date** display
- **Azan notifications** with selectable azan styles (Makkah, Madinah, Egypt)
- **Pre-prayer reminders** (customizable minutes before)
- **Azan preview** from within the app

### Search feature
- **Global verse search** across the entire Quran
- Results display Arabic text (with tajweed) and translation
- Click to navigate directly to the verse in its surah

### UI & Experience
- **Dark / Light / System** theme modes (toggle with `D` key)
- **Custom title bar** with native window controls (minimize, maximize, close)
- **Command palette** (`cmdk`) for quick navigation
- **Surah icon font** — visual surah symbols from Tarteel AI
- **Page transitions** with Framer Motion
- **System tray** — minimize to tray with show/hide

### Settings
- City, country, and prayer calculation method (14 methods)
- Tajweed and translation toggles
- Azan style and volume
- Prayer notification preferences
- Config file management (path display, open folder, reset)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Desktop Shell** | [Tauri v2](https://v2.tauri.app) (Rust) |
| **Frontend** | [Next.js 16](https://nextjs.org) + [React 19](https://react.dev) |
| **Language** | TypeScript / Rust |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com) |
| **Animation** | [Framer Motion](https://motion.dev) |
| **UI Components** | [Radix UI](https://radix-ui.com) + [shadcn/ui](https://ui.shadcn.com) |
| **Icons** | [Lucide](https://lucide.dev) + [react-icons](https://react-icons.github.io/react-icons/) |
| **Smooth Scroll** | [Lenis](https://lenis.darkroom.engineering) |
| **Command Palette** | [cmdk](https://cmdk.paco.me) |
| **Audio (Rust)** | [rodio](https://github.com/RustAudio/rodio) |
| **HTTP (Rust)** | [reqwest](https://docs.rs/reqwest) |

---

## FAQ

### Do I need an internet connection?
Internet is required for the initial fetch of verses, translations, and prayer times. Once a surah's audio is **downloaded**, it plays offline. Prayer times are cached locally.

### Where are downloaded audio files stored?
In the app's data directory: `%APPDATA%/quranbuddy/audio/` on Windows, `~/.local/share/quranbuddy/audio/` on Linux, and `~/Library/Application Support/quranbuddy/audio/` on macOS.

### How do I add surahs to the play queue?
Open the **audio player bar** (bottom of the screen while playing), click the **queue** button, then **+** to search and add surahs. The queue persists across page navigation within your session.

### Why are some surahs greyed out?
Reciters like Younes Souilass (65 surahs) and Hazza Al-Balushi (91 surahs) have only recorded a subset of the Quran. Unavailable surahs are greyed out.

### How do I change reciters?
Use the **reciter selector** in the audio player bar, or switch from the surah page's toolbar. Your selection is saved.

### What are the custom reciters available?
| ID | Reciter |
|----|---------|
| 7001 | Maher Al Muaiqly |
| 7002 | Yasser Al Dossari |
| 7003 | Hazza Al-Balushi (91 surahs) |
| 7004 | Salah Bukhatir |
| 7005 | Nasser Al-Qatami |
| 7006 | Khalid Al-Jileel |
| 7007 | Abdullah Al-Juhany |
| 7008 | Ali Jaber |
| 7009 | Badr Al-Turki |
| 7010 | Younes Souilass (Aswelis) (65 surahs) |

### How do prayer notifications work?
Enable **Prayer Notifications** in Settings or on the Prayer Times page. A background task checks every 30 seconds if it's time for any prayer. When matched, you'll receive an OS notification and the selected azan will play.

### How do I reset the app?
Go to **Settings → Advanced → Reset to Defaults**. This clears all settings and returns the app to its initial state. Downloaded audio files are not affected.

### How do I report a bug or request a feature?
Open an issue at [github.com/anomalyco/quranbuddy](https://github.com/mnsartawi/quranbuddy).

---

## Development

### Prerequisites
- [Node.js](https://nodejs.org) >= 18
- [Rust](https://rustup.rs) toolchain (stable)
- [Tauri system dependencies](https://v2.tauri.app/start/prerequisites/)

### Getting Started

```bash
# Clone the repository
git clone https://github.com/anomalyco/quranbuddy.git
cd quranbuddy

# Install frontend dependencies
npm install

# Run the Tauri dev server
npm run tauri dev
```

The app will start with hot-reload enabled. Changes to Rust code require a rebuild.

### Project Structure

```
quranbuddy/
├── app/                     # Next.js App Router pages
│   ├── page.tsx             # Splash / landing page
│   ├── layout.tsx           # Root layout with providers
│   ├── home/page.tsx        # Chapter grid + download management
│   ├── surah/[id]/page.tsx  # Surah reader (114 generated routes)
│   ├── settings/page.tsx    # Settings page
│   └── ptimes/page.tsx      # Prayer times dashboard
├── components/              # React components
│   ├── audio-player.tsx     # Full audio player bar
│   ├── title-bar.tsx        # Custom window title bar
│   ├── page-loader.tsx      # Page transitions
│   ├── theme-provider.tsx   # Theme management
│   ├── tooltip.tsx          # Radix tooltip
│   └── ui/                  # shadcn/ui primitives
├── lib/
│   ├── cache.ts             # In-memory + localStorage caching
│   └── queue-context.tsx    # Play queue context
├── src-tauri/               # Rust / Tauri backend
│   ├── src/
│   │   ├── main.rs          # Entry point
│   │   ├── lib.rs           # App setup, commands, tray, scheduler
│   │   ├── api.rs           # Quran API commands
│   │   └── config.rs        # Config persistence
│   └── Cargo.toml           # Rust dependencies
└── public/                  # Static assets
```

---

## Building

### Desktop App

```bash
# Build the Tauri desktop app
npm run tauri build
```

The bundled installer will be in `src-tauri/target/release/bundle/`.

### Web Export (Static Site)

```bash
# Export as a static site (no Tauri backend)
npm run build
```

Output in `out/`. Note: Tauri commands won't work in the static export — use the Tauri build for full functionality.

---

## Acknowledgments

- [Quran.com API](https://quran.com) — chapters, verses, recitations, translations
- [Aladhan API](https://aladhan.com) — prayer times
- [mp3quran.net](https://mp3quran.net) — high-quality recitation audio
- [Tarteel AI](https://tarteel.ai) — surah icon font
- [shadcn/ui](https://ui.shadcn.com) — component system
- The open-source Quran apps community

---

<div align="center">
  <sub>Built with ❤️ for the love of Quran</sub>
</div>
