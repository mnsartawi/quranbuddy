/* eslint-disable react-hooks/set-state-in-effect */
"use client"
import { motion, AnimatePresence } from "framer-motion"
import { invoke } from "@tauri-apps/api/core"
import { cachedInvoke } from "@/lib/cache"
import { listen } from "@tauri-apps/api/event"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Check, Trash2 } from "lucide-react"
import { BarsSpinner } from "@/components/ui/spinner"
import { ReactLenis } from "lenis/react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/tooltip"

type Chapter = {
  id: number
  name_simple: string
  name_arabic: string
  verses_count: number
  revelation_place: string
  translated_name: { name: string } | null
}

type Recitation = {
  id: number
  reciter_name: string | null
  translated_name: { name: string } | null
  style: string | null
}

type DownloadProgress = {
  chapter_id: number
  reciter_id: number
  downloaded: number
  total: number | null
  percent: number | null
  bytes_per_second: number | null
  status: string
}

const DEFAULT_RECITER_ID = 7001

const CUSTOM_RECITER_AVAILABLE_CHAPTERS: Record<number, Set<number>> = {
  7003: new Set([
    1, 6, 8, 12, 13, 14, 15, 17, 18, 19, 20, 21, 22,
    25, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
    41, 42, 43, 44, 45, 47, 49, 50, 51, 52, 53, 54, 55,
    56, 57, 61, 63, 67, 68, 69, 70, 71, 72, 73, 74, 75,
    76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88,
    89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101,
    102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114,
  ]),
  7010: new Set([
    1, 2, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33,
    34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 45, 46, 47,
    48, 50, 51, 52, 53, 54, 56, 57, 67, 71, 73, 76, 77,
    78, 79, 80, 81, 82, 86, 89, 90, 91, 93, 95, 97, 112,
  ]),
}

function isChapterAvailable(reciterId: number, chapterId: number): boolean {
  const chapters = CUSTOM_RECITER_AVAILABLE_CHAPTERS[reciterId]
  if (!chapters) return true
  return chapters.has(chapterId)
}

function useDownloadedChapters(reciterId: number) {
  const [downloaded, setDownloaded] = useState<Set<number>>(new Set())

  const refresh = useCallback(async () => {
    try {
      const downloadedIds: number[] = await invoke(
        "get_bulk_chapter_audio_status",
        { reciterId }
      )
      setDownloaded(new Set(downloadedIds))
    } catch (e) {
      console.error("Error refreshing downloaded chapters:", e)
    }
  }, [reciterId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { downloaded, refresh }
}

function reciterLabel(r: Recitation) {
  const name = r.reciter_name ?? r.translated_name?.name ?? `Reciter ${r.id}`
  return r.style ? `${name} — ${r.style}` : name
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  const units = ["KB", "MB", "GB"]
  let value = bytes / 1024
  let unit = units[0]

  for (let i = 1; i < units.length && value >= 1024; i++) {
    value /= 1024
    unit = units[i]
  }

  return `${value.toFixed(value >= 10 ? 1 : 2)} ${unit}`
}

function ChapterCard({
  chapter,
  index,
  isDownloaded,
  isAvailable,
  onClick,
  onManage,
}: {
  chapter: Chapter
  index: number
  isDownloaded: boolean
  isAvailable: boolean
  onClick: () => void
  onManage: () => void
}) {
  const content = (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.015 }}
      onClick={isAvailable ? onClick : undefined}
      onContextMenu={isAvailable ? (event) => {
        event.preventDefault()
        onManage()
      } : undefined}
      className={cn(
        "rounded-lg border border-border bg-card px-4 py-3 transition-colors",
        isAvailable
          ? "group cursor-pointer hover:bg-muted/50"
          : "cursor-not-allowed opacity-40"
      )}
    >
      <div className="flex items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded bg-muted text-xs font-semibold text-muted-foreground">
          {chapter.id}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm leading-tight font-semibold text-foreground">
            {chapter.name_simple}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {chapter.translated_name?.name ?? ""}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-0.5">
          {isDownloaded && (
            <span className="mb-0.5">
              <Check size={11} className="text-green-500" />
            </span>
          )}
          <div className="surah-icon text-3xl leading-none text-amber-400/80">
            surah{String(chapter.id).padStart(3, "0")}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {chapter.verses_count} Ayahs
          </p>
        </div>
      </div>
    </motion.div>
  )

  if (!isAvailable) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent>
          This surah is not available for this reciter
        </TooltipContent>
      </Tooltip>
    )
  }

  return content
}

export default function HomePage() {
  const router = useRouter()
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [reciters, setReciters] = useState<Recitation[]>([])
  const [pendingChapter, setPendingChapter] = useState<Chapter | null>(null)
  const [manageChapter, setManageChapter] = useState<Chapter | null>(null)
  const [managedReciters, setManagedReciters] = useState<number[]>([])
  const [skippedDownloads, setSkippedDownloads] = useState<Set<number>>(() => {
    if (typeof window !== "undefined") {
      try {
        const skipped = localStorage.getItem("quranbuddy_skipped_downloads")
        if (skipped) return new Set(JSON.parse(skipped) as number[])
      } catch { localStorage.removeItem("quranbuddy_skipped_downloads") }
    }
    return new Set()
  })
  const [selectedReciterId, setSelectedReciterId] = useState<number>(
    DEFAULT_RECITER_ID
  )
  const [downloading, setDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] =
    useState<DownloadProgress | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const { downloaded, refresh } = useDownloadedChapters(selectedReciterId)

  useEffect(() => {
    cachedInvoke<Chapter[]>("get_chapters")
      .then(setChapters)
      .catch((e) => console.error("Failed to load chapters:", e))
    invoke<Recitation[]>("get_recitations")
      .then(setReciters)
      .catch((e) => console.error("Failed to load reciters:", e))
  }, [])

  const saveSkippedDownloads = useCallback((next: Set<number>) => {
    setSkippedDownloads(next)
    localStorage.setItem(
      "quranbuddy_skipped_downloads",
      JSON.stringify([...next])
    )
  }, [])

  useEffect(() => {
    let unlisten: (() => void) | undefined

    listen<DownloadProgress>("chapter-audio-download-progress", (event) => {
      setDownloadProgress((current) => {
        if (
          current &&
          (event.payload.chapter_id !== current.chapter_id ||
            event.payload.reciter_id !== current.reciter_id)
        ) {
          return current
        }

        return event.payload
      })
    }).then((cleanup) => {
      unlisten = cleanup
    })

    return () => unlisten?.()
  }, [])

  const handleCardClick = (chapter: Chapter) => {
    if (downloaded.has(chapter.id) || skippedDownloads.has(chapter.id)) {
      router.push(`/surah/${chapter.id}`)
    } else {
      setDownloadError(null)
      setDownloadProgress(null)
      setPendingChapter(chapter)
    }
  }

  const refreshManagedReciters = useCallback(async (chapter: Chapter) => {
    const ids = await invoke<number[]>("get_downloaded_chapter_reciters", {
      chapterId: chapter.id,
    })
    setManagedReciters(ids)
  }, [])

  const handleManage = async (chapter: Chapter) => {
    setManageChapter(chapter)
    setSelectedReciterId(DEFAULT_RECITER_ID)
    setDownloadError(null)
    setDownloadProgress(null)
    await refreshManagedReciters(chapter)
  }

  const downloadChapterAudio = async (
    chapter: Chapter,
    navigateAfter: boolean
  ) => {
    setDownloading(true)
    setDownloadError(null)
    setDownloadProgress({
      chapter_id: chapter.id,
      reciter_id: selectedReciterId,
      downloaded: 0,
      total: null,
      percent: 0,
      bytes_per_second: null,
      status: "starting",
    })
    try {
      await invoke("download_chapter_audio", {
        chapterId: chapter.id,
        reciterId: selectedReciterId,
      })
      await refresh()
      saveSkippedDownloads(
        new Set([...skippedDownloads].filter((id) => id !== chapter.id))
      )
      if (navigateAfter) {
        setPendingChapter(null)
        router.push(`/surah/${chapter.id}`)
      }
    } catch (e) {
      console.error(e)
      setDownloadError(e instanceof Error ? e.message : String(e))
    } finally {
      setDownloading(false)
    }
  }

  const handleDownload = async () => {
    if (!pendingChapter) return
    await downloadChapterAudio(pendingChapter, true)
  }

  const handleSkip = () => {
    if (!pendingChapter) return
    const id = pendingChapter.id
    saveSkippedDownloads(new Set(skippedDownloads).add(id))
    setPendingChapter(null)
    router.push(`/surah/${id}`)
  }

  const handleManagedDownload = async () => {
    if (!manageChapter) return
    await downloadChapterAudio(manageChapter, false)
    await refreshManagedReciters(manageChapter)
  }

  const handleDeleteReciter = async (reciterId: number) => {
    if (!manageChapter) return
    await invoke("delete_chapter_audio", {
      chapterId: manageChapter.id,
      reciterId,
    })
    await refreshManagedReciters(manageChapter)
    await refresh()
  }

  return (
    <TooltipProvider>
    <ReactLenis root>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="p-4"
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {chapters.map((chapter, i) => (
            <ChapterCard
              key={chapter.id}
              chapter={chapter}
              index={i}
              isDownloaded={downloaded.has(chapter.id)}
              isAvailable={isChapterAvailable(selectedReciterId, chapter.id)}
              onClick={() => handleCardClick(chapter)}
              onManage={() => handleManage(chapter)}
            />
          ))}
        </div>
      </motion.div>

      <Dialog
        open={!!pendingChapter}
        onOpenChange={(open) => {
          if (!open && !downloading) setPendingChapter(null)
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Download for offline?</DialogTitle>
            <DialogDescription>
              Save{" "}
              <span className="font-medium text-foreground">
                {pendingChapter?.name_simple}
              </span>{" "}
              ({pendingChapter?.translated_name?.name}) for offline listening.
              {downloadProgress?.total
                ? ` Approx. ${formatBytes(downloadProgress.total)}.`
                : " About 5–10 MB."}
            </DialogDescription>
          </DialogHeader>

          <Select
            value={String(selectedReciterId)}
            onValueChange={(v: string) => {
              setSelectedReciterId(Number(v))
              setDownloadError(null)
              setDownloadProgress(null)
            }}
            disabled={downloading}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select reciter" />
            </SelectTrigger>
            <SelectContent>
              {reciters.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>
                  {reciterLabel(r)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <AnimatePresence>
            {(downloadProgress || downloadError) && (
              <motion.div
                key="download-status"
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 0 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{
                  height: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
                  opacity: { duration: 0.2, ease: "easeOut" },
                }}
                className="overflow-hidden"
              >
                <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
                  {downloadProgress && (
                    <>
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-muted-foreground capitalize">
                          {downloadProgress.status}
                        </span>
                        <span className="font-medium text-foreground tabular-nums">
                          {downloadProgress.percent != null
                            ? `${Math.min(downloadProgress.percent, 100).toFixed(1)}%`
                            : "Unknown"}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-background">
                        <div
                          className="h-full rounded-full bg-amber-400 transition-[width]"
                          style={{
                            width: `${Math.min(
                              downloadProgress.percent ?? 0,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                        <span className="tabular-nums">
                          {formatBytes(downloadProgress.downloaded)}
                          {downloadProgress.total
                            ? ` / ${formatBytes(downloadProgress.total)}`
                            : ""}
                        </span>
                        <span className="tabular-nums">
                          {downloadProgress.bytes_per_second
                            ? `${formatBytes(downloadProgress.bytes_per_second)}/s`
                            : ""}
                        </span>
                      </div>
                    </>
                  )}
                  {downloadError && (
                    <p className="text-xs text-destructive">{downloadError}</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!isChapterAvailable(selectedReciterId, pendingChapter?.id ?? 0) && (
            <p className="text-xs text-destructive">
              This surah has not been recorded by the selected reciter.
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={handleSkip} disabled={downloading}>
              Not now
            </Button>
            <Button
              onClick={handleDownload}
              disabled={
                downloading ||
                !isChapterAvailable(selectedReciterId, pendingChapter?.id ?? 0)
              }
            >
              {downloading ? (
                <>
                  <BarsSpinner size={14} className="mr-2" />
                  Downloading…
                </>
              ) : (
                "Download"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!manageChapter}
        onOpenChange={(open) => {
          if (!open && !downloading) setManageChapter(null)
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Manage reciters</DialogTitle>
            <DialogDescription>
              {manageChapter?.name_simple} offline audio.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {managedReciters.length === 0 ? (
              <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                No reciters downloaded for this surah.
              </p>
            ) : (
              managedReciters.map((id) => {
                const reciter = reciters.find((r) => r.id === id)
                return (
                  <div
                    key={id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                  >
                    <span className="min-w-0 truncate text-sm">
                      {reciter ? reciterLabel(reciter) : `Reciter ${id}`}
                    </span>
                    <button
                      onClick={() => handleDeleteReciter(id)}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )
              })
            )}
          </div>

          <Select
            value={String(selectedReciterId)}
            onValueChange={(v: string) => setSelectedReciterId(Number(v))}
            disabled={downloading}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select reciter" />
            </SelectTrigger>
            <SelectContent>
              {reciters.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>
                  {reciterLabel(r)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DialogFooter>
            <Button onClick={handleManagedDownload} disabled={downloading}>
              {downloading ? "Downloading..." : "Download reciter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ReactLenis>
    </TooltipProvider>
  )
}
