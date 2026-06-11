"use client"

import { invoke } from "@tauri-apps/api/core"
import { cachedInvoke } from "@/lib/cache"
import { Kbd } from "@/components/ui/kbd"
import { motion, AnimatePresence } from "framer-motion"
import { ReactLenis } from "lenis/react"
import Image from "next/image"
import {
  FileText,
  FolderOpen,
  Languages,
  Layout,
  MapPin,
  MoreVertical,
  Palette,
  RotateCcw,
  Sparkles,
  Volume2,
  Globe,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { BarsSpinner } from "@/components/ui/spinner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Toggle } from "@/components/ui/toggle"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Config = {
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

const PRAYER_METHODS = [
  { id: 1, name: "University of Islamic Sciences, Karachi" },
  { id: 2, name: "Islamic Society of North America (ISNA)" },
  { id: 3, name: "Muslim World League (MWL)" },
  { id: 4, name: "Umm Al-Qura University, Makkah" },
  { id: 5, name: "Egyptian General Authority of Survey" },
  { id: 8, name: "Gulf Region" },
  { id: 9, name: "Kuwait" },
  { id: 10, name: "Qatar" },
  { id: 11, name: "Majlis Ugama Islam Singapura, Singapore" },
  { id: 12, name: "Union Organization islamic de France" },
  { id: 13, name: "Diyanet İşleri Başkanlığı, Turkey" },
  { id: 14, name: "Spiritual Administration of Muslims of Russia" },
]

export default function SettingsPage() {
  const { setTheme } = useTheme()
  const [config, setConfig] = useState<Config | null>(null)
  const [azanList, setAzanList] = useState<string[]>([])
  const [configPath, setConfigPath] = useState<string>("")
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    invoke<Config>("get_settings")
      .then(setConfig)
      .catch((e) => console.error("Failed to load settings:", e))
    cachedInvoke<string[]>("get_azan_list")
      .then(setAzanList)
      .catch((e) => console.error("Failed to load azan list:", e))
    invoke<string>("get_config_path")
      .then(setConfigPath)
      .catch((e) => console.error("Failed to load config path:", e))
  }, [])

  const cityCountryDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestConfigRef = useRef<Config | null>(null)
  latestConfigRef.current = config

  useEffect(() => {
    return () => {
      if (cityCountryDebounce.current) clearTimeout(cityCountryDebounce.current)
    }
  }, [])

  const updateSetting = <K extends keyof Config>(
    key: K,
    value: Config[K]
  ) => {
    setConfig((prev) => (prev ? { ...prev, [key]: value } : prev))

    if (key === "city" || key === "country") {
      if (cityCountryDebounce.current) clearTimeout(cityCountryDebounce.current)
      cityCountryDebounce.current = setTimeout(async () => {
        const current = latestConfigRef.current
        if (!current) return
        try {
          await invoke("save_settings", {
            settings: { city: current.city, country: current.country },
          })
        } catch (e) {
          console.error("Failed to save location:", e)
          invoke<Config>("get_settings").then(setConfig)
        }
      }, 500)
      return
    }

    const backendKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase())
    invoke("save_settings", { settings: { [backendKey]: value } }).catch(
      (e) => {
        console.error("Failed to save setting:", e)
        invoke<Config>("get_settings").then(setConfig)
      }
    )
  }
  const handleOpenFolder = async () => {
    try {
      await invoke("open_config_folder")
    } catch (e) {
      console.error(e)
      alert("Failed to open folder.")
    }
  }

  const handleReset = async () => {
    setResetDialogOpen(false)
    setResetting(true)
    try {
      const defaultCfg = await invoke<Config>("reset_settings")
      setConfig(defaultCfg)
      setTheme(defaultCfg.theme)
      alert("Settings have been reset to default.")
    } catch (e) {
      console.error(e)
      alert("Failed to reset settings.")
    } finally {
      setResetting(false)
    }
  }

  if (!config) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <BarsSpinner size={28} />
      </main>
    )
  }

  return (
    <ReactLenis root>
      <main className="min-h-screen px-4 py-5 pb-20 sm:px-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
          <motion.header
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <div className="flex size-12 items-center justify-center rounded-xl bg-gold/10 text-gold">
              <Image
                src="/icon.ico"
                alt="icon"
                width={40}
                height={40}
                draggable={false}
              />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-semibold tracking-normal">
                Settings
              </h1>
              <p className="text-sm text-muted-foreground">
                Configure QuranBuddy just how you like it
              </p>
            </div>
          </motion.header>
          <div className="grid gap-6">
            <SettingsSection title="General" delay={0.1}>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">
                    <MapPin className="size-3" /> City
                  </label>
                  <Input
                    value={config.city}
                    onChange={(e) => updateSetting("city", e.target.value)}
                    placeholder="e.g. Dubai"
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">
                    <Globe className="size-3" /> Country
                  </label>
                  <Input
                    value={config.country}
                    onChange={(e) => updateSetting("country", e.target.value)}
                    placeholder="e.g. UAE"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-xs font-medium text-muted-foreground uppercase">
                  Calculation Method
                </label>
                <Select
                  value={String(config.method)}
                  onValueChange={(v) => updateSetting("method", Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRAYER_METHODS.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground">
                    <Palette className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Theme</p>
                    <p className="text-xs text-muted-foreground">
                      Change the theme, you could also press{" "}
                      <Kbd className="text-xs text-muted-foreground">D</Kbd>
                    </p>
                  </div>
                </div>
                <Select
                  value={config.theme}
                  onValueChange={(v) => {
                    updateSetting("theme", v)
                    setTheme(v)
                  }}
                >
                  <SelectTrigger className="w-30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </SettingsSection>

            <SettingsSection title="Quran Reader" delay={0.2}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground">
                    <Sparkles className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Tajweed</p>
                    <p className="text-xs text-muted-foreground">
                      Colored tajweed text
                    </p>
                  </div>
                </div>
                <Toggle
                  checked={config.tajweed_enabled}
                  onCheckedChange={(v) => updateSetting("tajweed_enabled", v)}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground">
                    <Languages className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Translations</p>
                    <p className="text-xs text-muted-foreground">
                      Show verse translations
                    </p>
                  </div>
                </div>
                <Toggle
                  checked={config.translations_enabled}
                  onCheckedChange={(v) =>
                    updateSetting("translations_enabled", v)
                  }
                />
              </div>
            </SettingsSection>

            <SettingsSection title="Azan & Notifications" delay={0.3}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground">
                    <Volume2 className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Prayer Notifications</p>
                    <p className="text-xs text-muted-foreground">
                      Alert and azan at prayer times
                    </p>
                  </div>
                </div>
                <Toggle
                  checked={config.prayer_notifications_enabled}
                  onCheckedChange={(v) =>
                    updateSetting("prayer_notifications_enabled", v)
                  }
                />
              </div>

              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase">
                    Azan Style
                  </label>
                  <Select
                    value={config.selected_azan}
                    onValueChange={(v) => updateSetting("selected_azan", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {azanList.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <label className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                      Azan Volume
                    </label>
                    <span className="font-mono text-xs text-gold">
                      {Math.round(config.azan_volume * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[config.azan_volume * 100]}
                    min={0}
                    max={100}
                    step={5}
                    onValueChange={(v) =>
                      updateSetting("azan_volume", v[0] / 100)
                    }
                  />
                </div>
              </div>

              <hr className="my-2 border-border/50" />

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground">
                    <Layout className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Pre-prayer Reminders</p>
                    <p className="text-xs text-muted-foreground">
                      Remind me before prayer starts
                    </p>
                  </div>
                </div>
                <Toggle
                  checked={config.reminders_enabled}
                  onCheckedChange={(v) => updateSetting("reminders_enabled", v)}
                />
              </div>

              <AnimatePresence initial={false}>
                {config.reminders_enabled && (
                  <motion.div
                    key="reminder-minutes"
                    initial={{ height: 0, opacity: 0, marginTop: 0 }}
                    animate={{
                      height: "auto",
                      opacity: 1,
                      marginTop: 8,
                    }}
                    exit={{ height: 0, opacity: 0, marginTop: 0 }}
                    transition={{
                      height: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
                      opacity: { duration: 0.2, ease: "easeOut" },
                      marginTop: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
                    }}
                    className="space-y-2 overflow-hidden"
                  >
                    <label className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                      Reminder Minutes (Before)
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="60"
                      value={config.reminder_minutes ?? 10}
                      onChange={(e) =>
                        updateSetting(
                          "reminder_minutes",
                          parseInt(e.target.value) || 0
                        )
                      }
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </SettingsSection>

            <SettingsSection title="Advanced" delay={0.4}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <FileText className="size-4 text-gold" />
                    Config File Path
                  </div>
                  <p className="mt-2 rounded-md bg-muted/50 p-2 font-mono text-[10px] break-all text-muted-foreground">
                    {configPath || "Loading path..."}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleOpenFolder}
                    title="Open Folder"
                    className="rounded-full"
                  >
                    <FolderOpen className="size-4" />
                  </Button>

                  <div className="relative">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="mr-[5px] rounded-full"
                        >
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setResetDialogOpen(true)}
                          disabled={resetting}
                        >
                          <RotateCcw className="size-4" />
                          Reset to Defaults
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </SettingsSection>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              <h3 className="mb-4 font-medium">About QuranBuddy</h3>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Version 0.1.0</p>
                <p>
                  A modern, Quran and Prayer Times application built with Tauri
                  and Next.js.
                </p>
              </div>
            </motion.div>
          </div>
        </div>

        <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
          <DialogContent showCloseButton={false} className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Reset Settings</DialogTitle>
              <DialogDescription>
                Are you sure you want to reset all settings to default? This
                action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-row justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setResetDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReset}
                disabled={resetting}
              >
                {resetting ? "Resetting..." : "Reset"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </ReactLenis>
  )
}

function SettingsSection({
  title,
  children,
  delay,
}: {
  title: string
  children: React.ReactNode
  delay: number
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm"
    >
      <h3 className="font-mono text-sm font-bold text-[#b59043]">{title}</h3>
      <div className="grid gap-4">{children}</div>
    </motion.section>
  )
}
