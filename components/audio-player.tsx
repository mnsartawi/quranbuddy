/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Shuffle,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Repeat,
  Rows4,
  MonitorSpeaker,
  Volume2,
  VolumeX,
  X,
  Plus,
  Trash2,
  Mic2,
} from "lucide-react"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/tooltip"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import Image from "next/image"

import { cn } from "@/lib/utils"

type AudioSinkElement = HTMLAudioElement & {
  setSinkId?: (sinkId: string) => Promise<void>
  sinkId?: string
}

type QueueItem = {
  id?: string | number
  title: string
  artists: string
  active?: boolean
  key: string
}

type ReciterItem = {
  id: number
  label: string
  available?: boolean
}

type PlayerBarProps = {
  track: {
    title: string
    artists: string
    albumArt?: string
  }
  audioRef: React.RefObject<HTMLAudioElement | null>
  playing: boolean
  onPlayPause: () => void
  current?: number
  duration?: number
  onSeek?: (time: number) => void
  volume: number
  onVolumeChange: (vol: number) => void
  onSkipNext?: () => void
  onSkipPrev?: () => void
  shuffle?: boolean
  onShuffleChange?: (val: boolean) => void
  surahs?: { id: number; name: string }[]
  onQueueItemSelect?: (item: QueueItem) => void
  onClose?: () => void
  reciters?: ReciterItem[]
  selectedReciterId?: number
  onReciterChange?: (reciterId: number) => void
}

const fallbackOutput: MediaDeviceInfo = {
  deviceId: "default",
  groupId: "",
  kind: "audiooutput",
  label: "Default",
  toJSON: () => ({}),
}

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  return `${m}:${Math.floor(s % 60)
    .toString()
    .padStart(2, "0")}`
}

import { useQueue } from "@/lib/queue-context"

// ... (in AudioPlayer component)
export default function AudioPlayer({
  track,
  audioRef,
  playing,
  onPlayPause,
  current = 0,
  duration = 0,
  onSeek,
  volume,
  onVolumeChange,
  onSkipNext,
  onSkipPrev,
  shuffle = false,
  onShuffleChange,
  surahs = [],
  onQueueItemSelect,
  onClose,
  reciters = [],
  selectedReciterId,
  onReciterChange,
}: PlayerBarProps) {
  const { queue, addToQueue, clearQueue } = useQueue()
  const [muted, setMuted] = useState(false)
  const [repeat, setRepeat] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [outputOpen, setOutputOpen] = useState(false)
  const [queueOpen, setQueueOpen] = useState(false)
  const [reciterOpen, setReciterOpen] = useState(false)
  const [addQueueOpen, setAddQueueOpen] = useState(false)
  const [outputs, setOutputs] = useState<MediaDeviceInfo[]>([])
  const [selectedOutput, setSelectedOutput] = useState("default")
  const [outputSupported, setOutputSupported] = useState(false)
  const [localCurrent, setLocalCurrent] = useState(current)
  const [localDuration, setLocalDuration] = useState(duration)

  const outputRef = useRef<HTMLDivElement>(null)
  const queueRef = useRef<HTMLDivElement>(null)
  const reciterRef = useRef<HTMLDivElement>(null)
  const lastTimeUpdateRef = useRef(0)

  const loadOutputs = useCallback(async () => {
    const audio = audioRef.current as AudioSinkElement | null
    setOutputSupported(Boolean(audio?.setSinkId))

    if (!navigator.mediaDevices?.enumerateDevices) return

    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      setOutputs(devices.filter((device) => device.kind === "audiooutput"))
    } catch (err) {
      console.error("Failed to enumerate audio outputs:", err)
    }
  }, [audioRef])

  useEffect(() => {
    const audio = audioRef.current as AudioSinkElement | null
    if (audio) audio.loop = repeat
  }, [audioRef, repeat])

  useEffect(() => {
    lastTimeUpdateRef.current = 0
    setLocalCurrent(0)
    setLocalDuration(0)
  }, [track.title])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const syncDuration = () => {
      if (Number.isFinite(audio.duration)) {
        setLocalDuration(audio.duration)
      }
    }

    const syncTime = () => {
      const now = performance.now()
      if (now - lastTimeUpdateRef.current < 250) return
      lastTimeUpdateRef.current = now
      setLocalCurrent(audio.currentTime)
    }

    const resetTime = () => {
      setLocalCurrent(0)
      syncDuration()
    }

    syncDuration()
    setLocalCurrent(audio.currentTime || current)

    audio.addEventListener("durationchange", syncDuration)
    audio.addEventListener("loadedmetadata", syncDuration)
    audio.addEventListener("timeupdate", syncTime)
    audio.addEventListener("seeking", syncTime)
    audio.addEventListener("ended", resetTime)

    return () => {
      audio.removeEventListener("durationchange", syncDuration)
      audio.removeEventListener("loadedmetadata", syncDuration)
      audio.removeEventListener("timeupdate", syncTime)
      audio.removeEventListener("seeking", syncTime)
      audio.removeEventListener("ended", resetTime)
    }
  }, [audioRef, current])

  useEffect(() => {
    loadOutputs()
    navigator.mediaDevices?.addEventListener?.("devicechange", loadOutputs)

    return () => {
      navigator.mediaDevices?.removeEventListener?.("devicechange", loadOutputs)
    }
  }, [loadOutputs])

  useEffect(() => {
    if (!outputOpen && !queueOpen && !reciterOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node

      if (outputOpen && !outputRef.current?.contains(target)) {
        setOutputOpen(false)
      }

      if (queueOpen && !queueRef.current?.contains(target)) {
        setQueueOpen(false)
      }

      if (reciterOpen && !reciterRef.current?.contains(target)) {
        setReciterOpen(false)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [outputOpen, queueOpen, reciterOpen])

  const requestOutputAccess = async () => {
    if (!navigator.mediaDevices?.getUserMedia) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((track) => track.stop())
      await loadOutputs()
    } catch (err) {
      console.error("Failed to request audio output access:", err)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value)
    onSeek?.(val)
    setLocalCurrent(val)
    if (audioRef.current) audioRef.current.currentTime = val
  }

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value)
    onVolumeChange(val)
    if (audioRef.current) audioRef.current.volume = val
    setMuted(val === 0)
  }

  const toggleMute = () => {
    if (!audioRef.current) return
    const next = !muted
    setMuted(next)
    audioRef.current.volume = next ? 0 : volume
  }

  const selectOutput = async (deviceId: string) => {
    const audio = audioRef.current as AudioSinkElement | null
    if (!audio?.setSinkId) return

    try {
      await audio.setSinkId(deviceId)
      setSelectedOutput(deviceId)
      setOutputOpen(false)
    } catch (err) {
      console.error("Failed to switch audio output:", err)
    }
  }

  const progress = localDuration > 0 ? (localCurrent / localDuration) * 100 : 0
  const visibleQueue = queue
  const outputOptions = outputs.length > 0 ? outputs : [fallbackOutput]

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
      className="fixed right-0 bottom-0 left-0 z-50 flex h-18 items-center justify-between border-t border-border bg-background px-4"
    >
      <CommandDialog
        open={addQueueOpen}
        onOpenChange={setAddQueueOpen}
        title="Add to queue"
        description="Search for a surah to add to your queue"
      >
        <Command>
          <CommandInput placeholder="Search surah..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Surahs">
              {surahs.map((surah) => (
                <CommandItem
                  key={surah.id}
                  onSelect={() => {
                    addToQueue({
                      id: surah.id,
                      title: surah.name,
                      artists: "Surah",
                    })
                    setAddQueueOpen(false)
                  }}
                  className="data-selected:bg-[#b59043]/10 data-selected:text-[#b59043]"
                >
                  {surah.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>

      <div className="flex w-[30%] min-w-0 items-center gap-3">
        <AnimatePresence mode="wait">
          <motion.div
            key="album-art"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.2 }}
            className="shrink-0"
          >
            <Image
              src="/icon.ico"
              alt={track.title}
              width={48}
              height={48}
              draggable={false}
              className="rounded object-cover"
            />
          </motion.div>
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={track.title}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.2 }}
            className="min-w-0"
          >
            <p className="truncate text-sm font-medium text-foreground">
              {track.title}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {track.artists}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex w-[40%] flex-col items-center gap-2">
        <div className="flex items-center gap-5">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onShuffleChange?.(!shuffle)}
            className={cn(
              "transition-colors",
              shuffle
                ? "text-[#b59043]"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-label="Shuffle"
          >
            <Shuffle size={16} />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.85 }}
            onClick={onSkipPrev}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Previous"
          >
            <SkipBack size={18} />
          </motion.button>

          <motion.button
            onClick={() => onPlayPause()}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            className="flex size-8 items-center justify-center rounded-full bg-foreground text-background"
            aria-label={playing ? "Pause" : "Play"}
          >
            <AnimatePresence mode="wait" initial={false}>
              {playing ? (
                <motion.div
                  key="pause"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  transition={{ duration: 0.12 }}
                >
                  <Pause size={15} className="fill-background" />
                </motion.div>
              ) : (
                <motion.div
                  key="play"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  transition={{ duration: 0.12 }}
                >
                  <Play size={15} className="ml-0.5 fill-background" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.85 }}
            onClick={onSkipNext}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Next"
          >
            <SkipForward size={18} />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setRepeat((value) => !value)}
            className={cn(
              "transition-colors",
              repeat
                ? "text-[#b59043]"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-label="Repeat current track"
          >
            <Repeat size={16} />
          </motion.button>
        </div>

        <div className="flex w-full items-center gap-2">
          <span className="w-8 text-right text-[10px] text-muted-foreground tabular-nums">
            {formatTime(localCurrent)}
          </span>
          <div className="group relative flex h-3 flex-1 items-center">
            <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-foreground"
                style={{ width: `${progress}%` }}
                transition={{ duration: dragging ? 0 : 0.1 }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={localDuration || 100}
              step={0.1}
              value={localCurrent}
              onChange={handleSeek}
              onMouseDown={() => setDragging(true)}
              onMouseUp={() => setDragging(false)}
              className="absolute inset-0 w-full cursor-pointer opacity-0"
            />
          </div>
          <span className="w-8 text-[10px] text-muted-foreground tabular-nums">
            {formatTime(localDuration)}
          </span>
        </div>
      </div>

      <div className="flex w-[30%] items-center justify-end gap-3">
        <div ref={outputRef} className="relative">
          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              setOutputOpen((value) => !value)
              setQueueOpen(false)
              setReciterOpen(false)
              loadOutputs()
            }}
            className={cn(
              "text-muted-foreground hover:text-foreground",
              outputOpen && "text-foreground"
            )}
            aria-label="Choose audio output"
          >
            <MonitorSpeaker size={16} />
          </motion.button>

          <AnimatePresence>
            {outputOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 bottom-9 w-64 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-2xl"
              >
                <div className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">
                  Audio output
                </div>
                {outputSupported ? (
                  <div className="max-h-64 overflow-y-auto py-1">
                    {outputOptions.some((device) => !device.label) && (
                      <button
                        onClick={requestOutputAccess}
                        className="flex w-full px-3 py-2 text-left text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        Allow device names
                      </button>
                    )}
                    {outputOptions.map((device, index) => (
                      <button
                        key={device.deviceId || index}
                        onClick={() =>
                          selectOutput(device.deviceId || "default")
                        }
                        className={cn(
                          "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs text-muted-foreground hover:bg-muted hover:text-foreground",
                          selectedOutput === device.deviceId && "text-[#b59043]"
                        )}
                      >
                        <span className="truncate">
                          {device.label || `Output ${index + 1}`}
                        </span>
                        {selectedOutput === device.deviceId && (
                          <span className="size-1.5 shrink-0 rounded-full bg-[#b59043]" />
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="px-3 py-3 text-xs text-muted-foreground">
                    Output switching is not available in this WebView.
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {reciters.length > 0 && (
          <div ref={reciterRef} className="relative">
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                setReciterOpen((value) => !value)
                setOutputOpen(false)
                setQueueOpen(false)
              }}
              className={cn(
                "text-muted-foreground hover:text-foreground",
                reciterOpen && "text-foreground"
              )}
              aria-label="Choose reciter"
            >
              <Mic2 size={16} />
            </motion.button>

            <AnimatePresence>
              {reciterOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 bottom-9 flex w-80 flex-col overflow-visible rounded-md border border-border bg-popover py-1 text-popover-foreground shadow-2xl"
                >
                  {reciters.map((reciter) => {
                    const available = reciter.available !== false
                    const btn = (
                      <button
                        key={reciter.id}
                        onClick={() => {
                          if (!available) return
                          setReciterOpen(false)
                          onReciterChange?.(reciter.id)
                        }}
                        className={cn(
                          "flex h-8 w-full items-center justify-between gap-3 px-3 text-left text-xs text-muted-foreground",
                          available && "hover:bg-muted hover:text-foreground",
                          selectedReciterId === reciter.id && "text-[#b59043]",
                          !available && "cursor-not-allowed opacity-40"
                        )}
                      >
                        <span className="truncate">{reciter.label}</span>
                        {selectedReciterId === reciter.id && (
                          <span className="size-1.5 shrink-0 rounded-full bg-[#b59043]" />
                        )}
                      </button>
                    )

                    if (!available) {
                      return (
                        <Tooltip key={reciter.id}>
                          <TooltipTrigger asChild>{btn}</TooltipTrigger>
                          <TooltipContent>
                            This reciter doesn&apos;t have this surah recorded
                          </TooltipContent>
                        </Tooltip>
                      )
                    }

                    return btn
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <div ref={queueRef} className="relative">
          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              setQueueOpen((value) => !value)
              setOutputOpen(false)
              setReciterOpen(false)
            }}
            className={cn(
              "text-muted-foreground hover:text-foreground",
              queueOpen && "text-foreground"
            )}
            aria-label="Open queue"
          >
            <Rows4 size={16} />
          </motion.button>

          <AnimatePresence>
            {queueOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 bottom-9 w-72 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-border px-3 py-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Queue
                  </span>
                  <div className="flex items-center gap-1">
                    {queue.length > 0 && (
                      <button
                        onClick={() => {
                          clearQueue()
                          setQueueOpen(false)
                        }}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Clear queue"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setAddQueueOpen(true)
                        setQueueOpen(false)
                      }}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Add to queue"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
                <div className="py-1">
                  {queue.length === 0 ? (
                    <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                      Queue is empty
                    </div>
                  ) : (
                    visibleQueue.map((item, index) => (
                      <button
                        key={item.key}
                        onClick={() => {
                          setQueueOpen(false)
                          onQueueItemSelect?.(item)
                        }}
                        className={cn(
                          "flex h-11 w-full items-center gap-3 px-3 text-left hover:bg-muted",
                          item.active &&
                            "border-l-2 border-[#b59043] bg-[#b59043]/10"
                        )}
                      >
                        <span className="w-5 text-right text-[10px] text-muted-foreground tabular-nums">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              "truncate text-xs font-medium",
                              item.active ? "text-[#b59043]" : "text-foreground"
                            )}
                          >
                            {item.title}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {item.artists}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onClick={toggleMute}
          className="text-muted-foreground hover:text-foreground"
          aria-label={muted || volume === 0 ? "Unmute" : "Mute"}
        >
          <AnimatePresence mode="wait" initial={false}>
            {muted || volume === 0 ? (
              <motion.div
                key="muted"
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
                transition={{ duration: 0.1 }}
              >
                <VolumeX size={16} />
              </motion.div>
            ) : (
              <motion.div
                key="vol"
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
                transition={{ duration: 0.1 }}
              >
                <Volume2 size={16} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        <div className="relative flex h-3 w-24 items-center">
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-foreground"
              style={{ width: `${muted ? 0 : volume * 100}%` }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            onChange={handleVolume}
            className="absolute inset-0 w-full cursor-pointer opacity-0"
          />
        </div>

        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Close audio player"
        >
          <X size={16} />
        </motion.button>
      </div>
    </motion.div>
  )
}
