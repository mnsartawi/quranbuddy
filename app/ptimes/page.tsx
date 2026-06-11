/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import { cachedInvoke } from "@/lib/cache"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import {
  AlertCircle,
  Clock3,
  MapPin,
  Moon,
  Play,
  RefreshCw,
  Settings,
  Square,
  Sun,
  Sunrise,
  Sunset,
  Volume2,
} from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { BarsSpinner } from "@/components/ui/spinner"
import { Toggle } from "@/components/ui/toggle"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type PrayerTime = {
  name: string
  time: string
}

type PrayerTimesResult = {
  city: string
  country: string
  method: number
  date: string
  hijri_date: string
  timings: PrayerTime[]
}

type AppSettings = {
  city: string
  country: string
  method: number
  theme: string
  reminders_enabled: boolean
  reminder_minutes: number
  last_surah: number
  reciter_id: number
  tajweed_enabled: boolean
  translations_enabled: boolean
  prayer_notifications_enabled: boolean
  selected_azan: string
  azan_volume: number
}

const PRAYER_TIMES_CACHE_KEY = "quranbuddy_prayer_times"

const prayerIcons: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  Fajr: Sunrise,
  Dhuhr: Sun,
  Asr: Clock3,
  Maghrib: Sunset,
  Isha: Moon,
}

function cleanTime(time: string) {
  return time.replace(/\s*\(.+\)\s*$/, "")
}

function toSeconds(time: string) {
  const [hour, minute] = cleanTime(time).split(":").map(Number)
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null
  return hour * 60 * 60 + minute * 60
}

function nextPrayer(timings: PrayerTime[], now: Date) {
  if (timings.length === 0) return null

  const currentSeconds =
    now.getHours() * 60 * 60 + now.getMinutes() * 60 + now.getSeconds()
  const daySeconds = 24 * 60 * 60

  for (const prayer of timings) {
    const prayerSeconds = toSeconds(prayer.time)
    if (prayerSeconds == null) continue
    if (prayerSeconds > currentSeconds) {
      return {
        name: prayer.name,
        secondsUntil: prayerSeconds - currentSeconds,
      }
    }
  }

  const firstPrayer = timings[0]
  const firstPrayerSeconds = toSeconds(firstPrayer.time)
  if (firstPrayerSeconds == null) return null

  return {
    name: firstPrayer.name,
    secondsUntil: daySeconds - currentSeconds + firstPrayerSeconds,
  }
}

function formatCountdown(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`
  }

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`
  }

  return `${remainingSeconds}s`
}

function currentPrayer(timings: PrayerTime[], currentTime: Date) {
  const current =
    currentTime.getHours() * 60 * 60 +
    currentTime.getMinutes() * 60 +
    currentTime.getSeconds()
  let active = timings[0]?.name ?? null

  for (const prayer of timings) {
    const seconds = toSeconds(prayer.time)
    if (seconds == null) continue
    if (current >= seconds) active = prayer.name
  }

  return active
}

function readCachedPrayerTimes() {
  if (typeof window === "undefined") return null

  try {
    const cached = window.localStorage.getItem(PRAYER_TIMES_CACHE_KEY)
    return cached ? (JSON.parse(cached) as PrayerTimesResult) : null
  } catch {
    return null
  }
}

export default function PrayerTimesPage() {
  const [data, setData] = useState<PrayerTimesResult | null>(() =>
    readCachedPrayerTimes()
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(() => new Date())
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [azanList, setAzanList] = useState<string[]>([])
  const [previewing, setPreviewing] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const loadPrayerTimes = async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await invoke<PrayerTimesResult>("get_prayer_times")
      setData(result)
      window.localStorage.setItem(
        PRAYER_TIMES_CACHE_KEY,
        JSON.stringify(result)
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const style = document.body.style
    const htmlStyle = document.documentElement.style

    style.overflow = "hidden"
    htmlStyle.overflow = "hidden"

    return () => {
      style.overflow = "unset"
      htmlStyle.overflow = "unset"
    }
  }, [])

  useEffect(() => {
    void loadPrayerTimes()
    invoke<AppSettings>("get_settings")
      .then(setSettings)
      .catch((e) => console.error("Failed to load settings:", e))
    cachedInvoke<string[]>("get_azan_list")
      .then(setAzanList)
      .catch((e) => console.error("Failed to load azan list:", e))
  }, [])

  useEffect(() => {
    let unlistenStarted: (() => void) | undefined
    let unlistenStopped: (() => void) | undefined

    listen("azan-started", () => setPreviewing(true)).then(
      (fn) => (unlistenStarted = fn)
    )
    listen("azan-stopped", () => setPreviewing(false)).then(
      (fn) => (unlistenStopped = fn)
    )

    return () => {
      unlistenStarted?.()
      unlistenStopped?.()
    }
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const updateSetting = async <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev))
    try {
      const backendKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase())
      await invoke("save_settings", { settings: { [backendKey]: value } })
      const next = await invoke<AppSettings>("get_settings")
      setSettings(next)
    } catch (e) {
      console.error(e)
    }
  }

  const togglePreview = async () => {
    if (previewing) {
      await invoke("stop_azan")
      setPreviewing(false)
    } else {
      if (!settings) {
        console.error("Settings not loaded yet")
        return
      }
      setPreviewing(true)
      try {
        await invoke("preview_azan", { azanName: settings.selected_azan })
      } catch (e) {
        console.error(e)
        setPreviewing(false)
      }
    }
  }

  const triggerTest = async () => {
    try {
      await invoke("trigger_test_notification")
    } catch (e) {
      console.error(e)
    }
  }

  const activePrayer = data ? currentPrayer(data.timings, now) : null
  const upcomingPrayer = data ? nextPrayer(data.timings, now) : null

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between gap-4"
        >
          <div className="flex min-w-0 items-center gap-3">
            <Image
              src="/icon.ico"
              alt="QuranBuddy"
              draggable={false}
              width={80}
              height={80}
              className="size-20 shrink-0"
            />
            <div className="min-w-0">
              <h1 className="font-heading text-2xl font-semibold tracking-normal">
                Prayer Times
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-4" />
                  {data ? `${data.city}, ${data.country}` : "Loading location"}
                </span>
                {data && (
                  <>
                    <span>{data.date}</span>
                    <span>{data.hijri_date} AH</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowSettings(!showSettings)}
              className={showSettings ? "bg-accent" : ""}
              aria-label="Notification settings"
            >
              <Settings className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={loadPrayerTimes}
              disabled={loading}
              aria-label="Refresh prayer times"
            >
              {loading ? (
                <BarsSpinner size={16} />
              ) : (
                <RefreshCw className="size-4" />
              )}
            </Button>
          </div>
        </motion.header>

        <AnimatePresence>
          {showSettings && settings && (
            <motion.section
              key="notification-settings"
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: "auto", marginBottom: 20 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
              className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
            >
              <div className="p-5">
                <h2 className="mb-4 flex items-center gap-2 font-semibold">
                  <Volume2 className="size-4 text-gold" />
                  Azan & Notifications
                </h2>

                <div className="space-y-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">
                        Prayer Notifications
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Receive a notification and play azan at prayer times
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={triggerTest}
                        className="h-8 px-3 text-xs"
                      >
                        Test
                      </Button>
                      <Toggle
                        checked={settings.prayer_notifications_enabled}
                        onCheckedChange={(checked) =>
                          updateSetting("prayer_notifications_enabled", checked)
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Select Azan</p>
                    <div className="flex items-center gap-3">
                      <Select
                        value={settings.selected_azan}
                        onValueChange={(v) => updateSetting("selected_azan", v)}
                      >
                        <SelectTrigger className="flex-1 text-[#b59043]">
                          <SelectValue placeholder="Choose azan" />
                        </SelectTrigger>
                        <SelectContent>
                          {azanList.map((name) => (
                            <SelectItem key={name} value={name}>
                              {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={togglePreview}
                        className="shrink-0 gap-2"
                      >
                        {previewing ? (
                          <>
                            <Square className="size-3 fill-current" /> Stop
                          </>
                        ) : (
                          <>
                            <Play className="size-3 fill-current" /> Preview
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {error && (
            <motion.div
              key="ptimes-error"
              initial={{ opacity: 0, height: 0, y: 6 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: 6 }}
              transition={{
                height: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
                opacity: { duration: 0.2, ease: "easeOut" },
                y: { duration: 0.2, ease: "easeOut" },
              }}
              className="overflow-hidden"
            >
              <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <p>{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <section className="grid gap-2">
          {loading && !data
            ? Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="h-18 animate-pulse rounded-lg border border-border bg-muted/40"
                />
              ))
            : data?.timings.map((prayer, index) => {
                const Icon = prayerIcons[prayer.name] ?? Clock3
                const active = prayer.name === activePrayer

                return (
                  <motion.div
                    key={prayer.name}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.035 }}
                    className={[
                      "flex items-center justify-between gap-4 rounded-lg border px-4 py-3",
                      active
                        ? "border-gold/60 bg-gold/10"
                        : "border-border bg-card",
                    ].join(" ")}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={[
                          "flex size-10 shrink-0 items-center justify-center rounded-md",
                          active
                            ? "bg-gold text-white"
                            : "bg-muted text-muted-foreground",
                        ].join(" ")}
                      >
                        <Icon className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">
                          {prayer.name}
                        </p>
                        {active && (
                          <p className="text-xs text-muted-foreground">
                            {upcomingPrayer
                              ? `${formatCountdown(
                                  upcomingPrayer.secondsUntil
                                )} till ${upcomingPrayer.name}`
                              : "Next prayer unavailable"}
                          </p>
                        )}
                      </div>
                    </div>

                    <time className="shrink-0 text-xl font-semibold tabular-nums">
                      {cleanTime(prayer.time)}
                    </time>
                  </motion.div>
                )
              })}
        </section>
      </div>
    </main>
  )
}
