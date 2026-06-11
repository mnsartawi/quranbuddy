/* eslint-disable react-hooks/set-state-in-effect */
"use client"
import { AnimatePresence, motion } from "framer-motion"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  Suspense,
  useMemo,
} from "react"
import { convertFileSrc, invoke } from "@tauri-apps/api/core"
import { cachedInvoke } from "@/lib/cache"
import { ReactLenis } from "lenis/react"
import { LenisContext } from "lenis/react"
import AudioPlayer from "@/components/audio-player"
import { BarsSpinner } from "@/components/ui/spinner"
import { Input } from "@/components/ui/input"
import { FastForward, Play, Pause, ArrowLeft, Languages } from "lucide-react"
import { Toggle } from "@/components/ui/toggle"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { useQueue } from "@/lib/queue-context"
import { TooltipProvider } from "@/components/tooltip"

const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"]
const toArabicDigits = (str: string) =>
  str.replace(/[0-9]/g, (d) => arabicDigits[Number(d)])

type VerseEntry = {
  verse_key: string
  arabic: string
  translation: string
}

type Chapter = {
  id: number
  name_simple: string
  name_arabic: string
  verses_count: number
  revelation_place: string
  translated_name: { name: string } | null
}

function ClickableArabicText({
  html,
  verseKey,
  onWordClick,
  className = "",
}: {
  html: string
  verseKey: string
  onWordClick: (verseKey: string, position: number) => void
  className?: string
}) {
  const containerRef = useRef<HTMLSpanElement>(null)
  const wordClickHandlersRef = useRef<Map<Element, (e: Event) => void>>(
    new Map()
  )

  useEffect(() => {
    const container = containerRef.current
    const handlers = wordClickHandlersRef.current
    if (!container) return

    const attachHandlers = () => {
      const spans = container.querySelectorAll("span[data-word-position]")
      spans.forEach((span) => {
        if (handlers.has(span)) return
        const handleClick = () => {
          const pos = span.getAttribute("data-word-position")
          if (pos) onWordClick(verseKey, Number(pos))
        }
        const handleMouseEnter = () => {
          ;(span as HTMLElement).style.color = "rgba(181, 144, 67, 1)"
        }
        const handleMouseLeave = () => {
          ;(span as HTMLElement).style.backgroundColor = ""
          ;(span as HTMLElement).style.color = ""
        }
        span.addEventListener("click", handleClick)
        span.addEventListener("mouseenter", handleMouseEnter)
        span.addEventListener("mouseleave", handleMouseLeave)
        handlers.set(span, handleClick)
      })
    }

    attachHandlers()
    const observer = new MutationObserver(attachHandlers)
    observer.observe(container, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      handlers.forEach((handler, span) =>
        span.removeEventListener("click", handler)
      )
      handlers.clear()
    }
  }, [verseKey, onWordClick])

  const processedHtml = useMemo(() => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, "text/html")
    let wordIndex = 0

    const splitTextNode = (node: Node) => {
      if (node.nodeType !== Node.TEXT_NODE) return
      const text = node.textContent || ""
      if (!/\s/.test(text)) return
      const parent = node.parentNode
      if (!parent) return
      const fragments = text.split(/(\s+)/).filter((s) => s !== "")
      for (const fragment of fragments)
        parent.insertBefore(document.createTextNode(fragment), node)
      parent.removeChild(node)
    }

    const wrapWordGroup = (group: Node[]) => {
      const wrapper = document.createElement("span")
      wrapper.setAttribute("data-word-position", String(++wordIndex))
      wrapper.setAttribute("title", `${verseKey}:${wordIndex}`)
      wrapper.style.cursor = "pointer"
      wrapper.style.display = "inline-block"
      wrapper.style.padding = "0 2px"
      wrapper.style.borderRadius = "2px"
      wrapper.style.transition = "background-color 0.15s ease"
      const parent = group[0].parentNode
      if (!parent) return
      parent.insertBefore(wrapper, group[0])
      for (const node of group) wrapper.appendChild(node)
    }

    const groupWordsInParent = (parent: Node) => {
      const children = Array.from(parent.childNodes)
      const groups: Node[][] = []
      let currentGroup: Node[] = []
      const flushGroup = () => {
        if (currentGroup.length > 0) {
          groups.push(currentGroup)
          currentGroup = []
        }
      }
      for (const child of children) {
        if (
          child.nodeType === Node.TEXT_NODE &&
          /^\s*$/.test(child.textContent || "")
        ) {
          flushGroup()
          continue
        }
        currentGroup.push(child)
      }
      flushGroup()
      for (const group of groups) {
        if (group.length > 0) wrapWordGroup(group)
      }
    }

    const normalizeNode = (node: Node) => {
      for (const child of Array.from(node.childNodes)) {
        if (child.nodeType === Node.TEXT_NODE) splitTextNode(child)
        else if (child.nodeType === Node.ELEMENT_NODE) normalizeNode(child)
      }
    }

    normalizeNode(doc.body)
    groupWordsInParent(doc.body)

    const endMarkers = doc.querySelectorAll("span.end")
    const verseNum = verseKey.split(":")[1] || ""
    const arabicVerseNum = toArabicDigits(verseNum)

    if (endMarkers.length > 0) {
      endMarkers.forEach((marker) => {
        marker.textContent = arabicVerseNum
      })
    } else {
      doc.body.appendChild(document.createTextNode(" "))
      const endSpan = document.createElement("span")
      endSpan.className = "end"
      endSpan.textContent = arabicVerseNum
      doc.body.appendChild(endSpan)
    }

    return doc.body.innerHTML
  }, [html, verseKey])

  return (
    <span
      ref={containerRef}
      dir="rtl"
      className={className}
      dangerouslySetInnerHTML={{ __html: processedHtml }}
    />
  )
}

type TajweedVerse = { verse_key: string; text_uthmani_tajweed: string }
type Recitation = {
  id: number
  reciter_name: string | null
  translated_name?: { name: string } | null
  style: string | null
}

const CUSTOM_RECITER_AVAILABLE_CHAPTERS: Record<number, Set<number>> = {
  7003: new Set([
    1, 6, 8, 12, 13, 14, 15, 17, 18, 19, 20, 21, 22, 25, 29, 30, 31, 32, 33, 34,
    35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 47, 49, 50, 51, 52, 53, 54, 55,
    56, 57, 61, 63, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81,
    82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100,
    101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114,
  ]),
  7010: new Set([
    1, 2, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26,
    27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 45, 46,
    47, 48, 50, 51, 52, 53, 54, 56, 57, 67, 71, 73, 76, 77, 78, 79, 80, 81, 82,
    86, 89, 90, 91, 93, 95, 97, 112,
  ]),
}

function isChapterAvailable(reciterId: number, chapterId: number): boolean {
  const chapters = CUSTOM_RECITER_AVAILABLE_CHAPTERS[reciterId]
  if (!chapters) return true
  return chapters.has(chapterId)
}

function reciterLabel(reciter: Recitation) {
  const name =
    reciter.reciter_name ??
    reciter.translated_name?.name ??
    `Reciter ${reciter.id}`
  return reciter.style ? `${name} - ${reciter.style}` : name
}
type SearchTranslation = { text: string; name: string; language_name: string }
type SearchHit = {
  verse_key: string
  text: string
  translations: SearchTranslation[]
}
type SearchBody = {
  query: string
  total_results: number
  current_page: number
  total_pages: number
  results: SearchHit[]
}
type WordAudioEntry = {
  verse_key: string
  word_position: number
  audio_url: string
}

export default function SurahPage() {
  const params = useParams()
  const chapterId = Number(params.id)
  const [allChapters, setAllChapters] = useState<Chapter[]>([])

  useEffect(() => {
    cachedInvoke<Chapter[]>("get_chapters")
      .then(setAllChapters)
      .catch(console.error)
  }, [])

  return (
    <Suspense fallback={null}>
      <SurahSearchParams chapterId={chapterId} allChapters={allChapters} />
    </Suspense>
  )
}

function SurahSearchParams({
  chapterId,
  allChapters,
}: {
  chapterId: number
  allChapters: Chapter[]
}) {
  const searchParams = useSearchParams()
  const verse = searchParams.get("verse") || undefined
  return (
    <SurahContent
      key={chapterId}
      chapterId={chapterId}
      allChapters={allChapters}
      scrollToVerse={verse}
    />
  )
}

function SurahContent({
  chapterId,
  allChapters,
  scrollToVerse,
}: {
  chapterId: number
  allChapters: Chapter[]
  scrollToVerse?: string
}) {
  const router = useRouter()
  const { queue, setActiveItem, clearQueue } = useQueue()
  const queueRef = useRef(queue)

  useEffect(() => {
    queueRef.current = queue
  }, [queue])

  useEffect(() => {
    const currentQueue = queueRef.current
    const activeItem = currentQueue.find(
      (item) => Number(item.id) === chapterId
    )

    const currentlyActive = currentQueue.find((item) => item.active)

    if (
      activeItem &&
      (!currentlyActive || currentlyActive.key !== activeItem.key)
    ) {
      setActiveItem(activeItem.key)
    } else if (!activeItem && currentlyActive) {
      setActiveItem(null)
    }
  }, [chapterId, setActiveItem])

  const [verses, setVerses] = useState<VerseEntry[] | null>(null)
  const [chapter, setChapter] = useState<Chapter | null>(null)
  const [jumpOpen, setJumpOpen] = useState(false)
  const [jumpSearch, setJumpSearch] = useState("")

  const filteredJumpChapters = useMemo(() => {
    const chaptersToFilter = allChapters
    if (!jumpSearch) return chaptersToFilter.slice(0, 15)
    const searchLower = jumpSearch.toLowerCase()
    return chaptersToFilter
      .filter((ch) => {
        const searchStr =
          `${ch.id} ${ch.name_simple} ${ch.translated_name?.name ?? ""} ${ch.name_arabic}`.toLowerCase()
        return searchStr.includes(searchLower)
      })
      .slice(0, 15)
  }, [allChapters, jumpSearch])

  const [search, setSearch] = useState("")
  const [searchResults, setSearchResults] = useState<SearchHit[] | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [tajweedEnabled, setTajweedEnabled] = useState(false)
  const [translationsEnabled, setTranslationsEnabled] = useState(true)
  const [tajweedData, setTajweedData] = useState<Record<string, string>>({})
  const [searchTajweedData, setSearchTajweedData] = useState<
    Record<string, string>
  >({})
  const [recitations, setRecitations] = useState<Recitation[]>([])
  const [selectedReciter, setSelectedReciter] = useState(7)

  useEffect(() => {
    invoke<{ reciter_id: number }>("get_settings")
      .then((cfg) => {
        const id =
          cfg.reciter_id ||
          Number(sessionStorage.getItem("surah_reciter_id")) ||
          7
        setSelectedReciter(id)
        sessionStorage.setItem("surah_reciter_id", String(id))
      })
      .catch(() => {
        const id = Number(sessionStorage.getItem("surah_reciter_id")) || 7
        setSelectedReciter(id)
      })
  }, [])
  const [audioLoading, setAudioLoading] = useState(false)
  const [wordAudio, setWordAudio] = useState<
    Record<string, Record<number, string>>
  >({})

  const [playing, setPlaying] = useState(false)
  const [activeVerseKey, setActiveVerseKey] = useState<string | null>(null)
  const [currentTrack, setCurrentTrack] = useState<{
    title: string
    artists: string
    albumArt?: string
  } | null>(null)
  const [playerClosed, setPlayerClosed] = useState(false)
  const localAudioPathRef = useRef<string | null>(null)
  const [volume, setVolume] = useState(0.8)
  const [shuffle, setShuffle] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("surah_shuffle") === "true"
    }
    return false
  })

  const handleShuffleChange = useCallback((val: boolean) => {
    setShuffle(val)
    sessionStorage.setItem("surah_shuffle", String(val))
  }, [])

  const shuffleRef = useRef(shuffle)
  useEffect(() => {
    shuffleRef.current = shuffle
  }, [shuffle])

  const chapterIdRef = useRef(chapterId)
  useEffect(() => {
    chapterIdRef.current = chapterId
  }, [chapterId])

  const selectedReciterRef = useRef(selectedReciter)
  useEffect(() => {
    selectedReciterRef.current = selectedReciter
  }, [selectedReciter])

  const surahAudioRef = useRef<HTMLAudioElement>(null)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
  const onEndedRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    return () => {
      if (surahAudioRef.current) {
        surahAudioRef.current.pause()
        surahAudioRef.current.src = ""
      }
      if (currentAudioRef.current) {
        currentAudioRef.current.pause()
        currentAudioRef.current.src = ""
      }
    }
  }, [])
  const lenisCtx = useContext(LenisContext)
  const searchParams = useSearchParams()
  const loading = verses === null

  const stopCurrentAudio = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current.currentTime = 0
      currentAudioRef.current = null
    }
  }, [])

  const playQueuedChapter = useCallback(
    (item: { id?: string | number }) => {
      const nextId = Number(item.id)
      if (!Number.isFinite(nextId) || nextId === chapterIdRef.current) return
      router.push(`/surah/${nextId}?play=true`)
    },
    [router]
  )

  const closeAudioPlayer = useCallback(() => {
    const audio = surahAudioRef.current
    if (audio) {
      audio.pause()
      audio.removeAttribute("src")
      audio.load()
    }
    setPlaying(false)
    setActiveVerseKey(null)
    setCurrentTrack(null)
    setPlayerClosed(true)
  }, [])

  const skipNext = useCallback(() => {
    const currentIndex = queue.findIndex((q) => q.active)

    if (queue.length > 0 && currentIndex < queue.length - 1) {
      const nextItem = queue[currentIndex + 1]
      setActiveItem(nextItem.key)
      playQueuedChapter(nextItem)
      return
    }

    if (queue.length > 0) {
      setActiveItem(null)
      clearQueue()
      closeAudioPlayer()
      return
    }

    const nextId = chapterIdRef.current + 1
    if (nextId > 114) {
      closeAudioPlayer()
    } else {
      router.push(`/surah/${nextId}?play=true`)
    }
  }, [
    queue,
    playQueuedChapter,
    setActiveItem,
    clearQueue,
    closeAudioPlayer,
    router,
  ])

  const onEndedNext = useCallback(() => {
    const currentIndex = queue.findIndex((q) => q.active)

    if (queue.length > 0 && currentIndex < queue.length - 1) {
      const nextItem = queue[currentIndex + 1]
      setActiveItem(nextItem.key)
      playQueuedChapter(nextItem)
      return
    }

    if (queue.length > 0) {
      setActiveItem(null)
      clearQueue()
      closeAudioPlayer()
      return
    }

    if (shuffleRef.current) {
      let nextId: number
      let attempts = 0
      do {
        nextId = Math.floor(Math.random() * 114) + 1
        attempts++
      } while (
        (nextId === chapterIdRef.current ||
          !isChapterAvailable(selectedReciterRef.current, nextId)) &&
        attempts < 114
      )
      router.push(`/surah/${nextId}?play=true`)
    } else {
      const nextId = chapterIdRef.current + 1
      if (nextId > 114) {
        closeAudioPlayer()
      } else {
        router.push(`/surah/${nextId}?play=true`)
      }
    }
  }, [
    queue,
    playQueuedChapter,
    setActiveItem,
    clearQueue,
    closeAudioPlayer,
    router,
  ])

  const skipPrev = useCallback(() => {
    const currentIndex = queue.findIndex((q) => q.active)

    if (queue.length > 0 && currentIndex > 0) {
      const prevItem = queue[currentIndex - 1]
      setActiveItem(prevItem.key)
      playQueuedChapter(prevItem)
      return
    }

    if (queue.length > 0) return

    const prevId = chapterIdRef.current - 1
    if (prevId >= 1) {
      router.push(`/surah/${prevId}?play=true`)
    }
  }, [queue, setActiveItem, playQueuedChapter, router])

  const handlePlay = useCallback(
    async (reciterOverride?: number) => {
      if (!verses) return
      setPlayerClosed(false)
      const reciterId = reciterOverride ?? selectedReciter

      if (!isChapterAvailable(reciterId, chapterId)) {
        return
      }

      if (playing && reciterOverride == null) {
        surahAudioRef.current?.pause()
        setPlaying(false)
        return
      }

      if (reciterOverride != null && surahAudioRef.current) {
        surahAudioRef.current.pause()
        surahAudioRef.current.removeAttribute("src")
        surahAudioRef.current.load()
        setPlaying(false)
        setCurrentTrack(null)
      }

      if (
        surahAudioRef.current?.src &&
        !playing &&
        currentTrack &&
        reciterOverride == null
      ) {
        surahAudioRef.current.play().catch(console.error)
        setPlaying(true)
        return
      }

      const localPath =
        reciterId === selectedReciter
          ? (localAudioPathRef.current ??
            (await invoke<string | null>("get_chapter_audio_path", {
              chapterId,
              reciterId,
            })))
          : await invoke<string | null>("get_chapter_audio_path", {
              chapterId,
              reciterId,
            })

      if (localPath) {
        try {
          if (surahAudioRef.current) {
            const audio = surahAudioRef.current
            audio.src = convertFileSrc(localPath)

            setCurrentTrack({
              title: `${chapterId}. ${chapter?.name_simple || "Quran"}`,
              artists: chapter?.translated_name?.name || "Recitation",
            })

            if (onEndedRef.current) {
              audio.removeEventListener("ended", onEndedRef.current)
            }

            audio.play().catch((err) => {
              if (err.name !== "AbortError") {
                console.error("Failed to play local audio:", err)
                setPlaying(false)
                setCurrentTrack(null)
              }
            })

            setPlaying(true)

            const onEnded = () => {
              audio.removeEventListener("ended", onEnded)
              onEndedRef.current = null
              setPlaying(false)
              setActiveVerseKey(null)
              setCurrentTrack(null)
              onEndedNext()
            }
            onEndedRef.current = onEnded
            audio.addEventListener("ended", onEnded)
          }
        } catch (err) {
          console.error("Failed to fetch audio bytes:", err)
          setPlaying(false)
          setCurrentTrack(null)
        }
      } else {
        try {
          setAudioLoading(true)

          let audioSrc: string
          if (reciterId >= 7000) {
            const cachedPath = await invoke<string>("cache_chapter_audio", {
              chapterId,
              reciterId,
            })
            audioSrc = convertFileSrc(cachedPath)
          } else {
            const result = await invoke<{ audio_url: string }>(
              "get_chapter_audio",
              {
                chapterId,
                reciterId,
              }
            )
            audioSrc = result.audio_url
          }

          if (surahAudioRef.current) {
            const audio = surahAudioRef.current
            audio.src = audioSrc

            setCurrentTrack({
              title: `${chapterId}. ${chapter?.name_simple || "Quran"}`,
              artists: chapter?.translated_name?.name || "Recitation",
            })

            if (onEndedRef.current) {
              audio.removeEventListener("ended", onEndedRef.current)
            }

            audio.play().catch((err) => {
              if (err.name !== "AbortError") {
                console.error("Failed to play remote audio:", err)
                setPlaying(false)
                setCurrentTrack(null)
              }
            })

            setPlaying(true)

            const onEnded = () => {
              audio.removeEventListener("ended", onEnded)
              onEndedRef.current = null
              setPlaying(false)
              setActiveVerseKey(null)
              setCurrentTrack(null)
              onEndedNext()
            }
            onEndedRef.current = onEnded
            audio.addEventListener("ended", onEnded)
          }
        } catch (err) {
          console.error("Failed to fetch remote chapter audio:", err)
        } finally {
          setAudioLoading(false)
        }
      }
    },
    [
      playing,
      verses,
      chapterId,
      chapter,
      currentTrack,
      selectedReciter,
      onEndedNext,
    ]
  )

  const handleReciterChange = useCallback(
    (reciterId: number) => {
      setSelectedReciter(reciterId)
      sessionStorage.setItem("surah_reciter_id", String(reciterId))
      invoke("save_settings", { settings: { reciterId } }).catch(console.error)
      if (currentTrack) {
        void handlePlay(reciterId)
      }
    },
    [currentTrack, handlePlay]
  )

  useEffect(() => {
    if (
      searchParams.get("play") === "true" &&
      verses &&
      !playing &&
      !currentTrack &&
      !playerClosed
    ) {
      handlePlay()
    }
  }, [searchParams, verses, handlePlay, playing, currentTrack, playerClosed])

  const playWordAudio = useCallback(
    (verseKey: string, wordPosition: number) => {
      stopCurrentAudio()
      const url = wordAudio[verseKey]?.[wordPosition]
      if (!url) return
      let normalized = url
      if (normalized.startsWith("//")) normalized = `https:${normalized}`
      else if (normalized.startsWith("wbw/"))
        normalized = `https://verses.quran.com/${normalized}`

      const audio = new Audio()
      audio.src = normalized
      audio.play().catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Failed to play word audio:", err)
        }
      })
      currentAudioRef.current = audio
    },
    [wordAudio, stopCurrentAudio]
  )

  const scrollToElement = useCallback(
    (verseKey: string) => {
      let cancelled = false
      let retries = 0
      const maxRetries = 200
      const doScroll = () => {
        const el = document.getElementById(verseKey)
        if (!el || cancelled) return false
        if (lenisCtx?.lenis) lenisCtx.lenis.scrollTo(el)
        else el.scrollIntoView({ behavior: "smooth", block: "center" })
        return true
      }
      const observer = new MutationObserver(() => {
        if (!cancelled && doScroll()) observer.disconnect()
      })
      observer.observe(document.body, { childList: true, subtree: true })
      const attempt = () => {
        if (cancelled || doScroll()) {
          observer.disconnect()
          return
        }
        if (retries < maxRetries) {
          retries++
          setTimeout(attempt, retries < 50 ? 0 : retries < 100 ? 16 : 50)
        } else observer.disconnect()
      }
      setTimeout(attempt, 50)
      return () => {
        cancelled = true
        observer.disconnect()
      }
    },
    [lenisCtx]
  )

  useEffect(() => {
    if (surahAudioRef.current) {
      surahAudioRef.current.volume = volume
    }
  }, [volume])

  useEffect(() => {
    if (!verses || !scrollToVerse) return
    return scrollToElement(scrollToVerse)
  }, [verses, scrollToVerse, scrollToElement])

  useEffect(() => {
    if (!chapterId || chapterId <= 0) return
    setPlaying(false)
    setActiveVerseKey(null)
    setPlayerClosed(false)
    localAudioPathRef.current = null
    if (surahAudioRef.current) {
      surahAudioRef.current.pause()
      surahAudioRef.current.src = ""
    }

    Promise.all([
      cachedInvoke<VerseEntry[]>("get_verses_by_chapter", { chapterId }).then(
        setVerses
      ),
      cachedInvoke<Chapter>("get_chapter", { id: chapterId }).then(setChapter),
      cachedInvoke<TajweedVerse[]>("get_verses_tajweed", { chapterId })
        .then((data) => {
          const map: Record<string, string> = {}
          for (const v of data) map[v.verse_key] = v.text_uthmani_tajweed
          setTajweedData(map)
        })
        .catch(() => {}),
    ]).catch(console.error)
  }, [chapterId])

  useEffect(() => {
    if (!chapterId) return
    localAudioPathRef.current = null
    invoke<string | null>("get_chapter_audio_path", {
      chapterId,
      reciterId: selectedReciter,
    })
      .then((path) => {
        localAudioPathRef.current = path
      })
      .catch(() => {})
  }, [chapterId, selectedReciter])

  useEffect(() => {
    if (!chapterId) return
    cachedInvoke<WordAudioEntry[]>("get_verses_words_audio", { chapterId })
      .then((data) => {
        const map: Record<string, Record<number, string>> = {}
        for (const entry of data) {
          if (!map[entry.verse_key]) map[entry.verse_key] = {}
          map[entry.verse_key][entry.word_position] = entry.audio_url
        }
        setWordAudio(map)
      })
      .catch(console.error)
  }, [chapterId])

  useEffect(() => {
    invoke<{ tajweed_enabled: boolean; translations_enabled: boolean }>(
      "get_settings"
    )
      .then((cfg) => {
        setTajweedEnabled(cfg.tajweed_enabled)
        setTranslationsEnabled(cfg.translations_enabled)
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    invoke<Recitation[]>("get_recitations")
      .then(setRecitations)
      .catch(console.error)
  }, [])

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchResults(null)
      setSearchOpen(false)
      return
    }
    setSearchLoading(true)
    try {
      const body = await cachedInvoke<SearchBody>("search_verses", { query: q })
      setSearchResults(body.results)
      setSearchOpen(body.results.length > 0)
    } catch {
      setSearchResults(null)
    } finally {
      setSearchLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(search), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search, doSearch])

  useEffect(() => {
    if (!tajweedEnabled || !searchResults?.length) return
    cachedInvoke<TajweedVerse[]>("get_verses_tajweed_batch", {
      verseKeys: searchResults.map((r) => r.verse_key),
    })
      .then((data) => {
        const map: Record<string, string> = {}
        for (const v of data) map[v.verse_key] = v.text_uthmani_tajweed
        setSearchTajweedData(map)
      })
      .catch(() => {})
  }, [tajweedEnabled, searchResults])

  function handleTajweedToggle(checked: boolean) {
    setTajweedEnabled(checked)
    invoke("save_settings", { settings: { tajweedEnabled: checked } }).catch(
      console.error
    )
  }

  function handleTranslationsToggle() {
    const next = !translationsEnabled
    setTranslationsEnabled(next)
    invoke("save_settings", { settings: { translationsEnabled: next } }).catch(
      console.error
    )
  }

  if (loading) {
    return (
      <div className="mx-auto flex max-w-3xl items-center justify-center px-6 py-24 text-muted-foreground">
        <BarsSpinner />
      </div>
    )
  }

  return (
    <TooltipProvider>
      <ReactLenis root>
        <div className="relative">
          <audio
            ref={surahAudioRef}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            preload="metadata"
            className="hidden"
          />
          <div className="absolute top-4 left-6 z-10">
            <motion.button
              onClick={() => router.push("/home")}
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft size={15} />
            </motion.button>
          </div>
          <div className="absolute top-4 right-6 z-10">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="relative">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="Search verses..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setSearch("")
                      setSearchOpen(false)
                    }
                  }}
                  onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
                  className="h-10 w-72 rounded-xl border border-border bg-card pr-8 pl-10 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
                />
                {search && (
                  <button
                    onClick={() => {
                      setSearch("")
                      setSearchOpen(false)
                      inputRef.current?.focus()
                    }}
                    className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
              <AnimatePresence>
                {(searchOpen || searchLoading) && search.trim() && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    transition={{
                      duration: 0.2,
                      ease: [0.23, 1, 0.32, 1],
                    }}
                    className="absolute top-full right-0 z-50 mt-2 w-96 origin-top"
                  >
                    <div className="rounded-xl border border-border bg-card shadow-lg">
                      <Command>
                        <CommandList className="max-h-none overflow-visible">
                          {searchLoading && (
                            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                              Searching...
                            </div>
                          )}
                          {!searchLoading && searchResults?.length === 0 && (
                            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                              No results found.
                            </div>
                          )}
                          {!searchLoading &&
                            searchResults &&
                            searchResults.length > 0 && (
                              <CommandGroup>
                                {searchResults.map((hit) => (
                                  <CommandItem
                                    key={hit.verse_key}
                                    value={hit.verse_key}
                                    onSelect={() => {
                                      const ch = Number(
                                        hit.verse_key.split(":")[0]
                                      )
                                      setSearchOpen(false)
                                      setSearch("")
                                      if (ch === chapterId) {
                                        const cancel = scrollToElement(
                                          hit.verse_key
                                        )
                                        setTimeout(() => cancel?.(), 2000)
                                      } else {
                                        router.push(
                                          `/surah/${ch}?verse=${hit.verse_key}`
                                        )
                                      }
                                    }}
                                    className="flex flex-col items-start gap-1 py-3"
                                  >
                                    <span className="text-xs font-medium text-muted-foreground">
                                      {hit.verse_key.replace(
                                        /[0-9]/g,
                                        (d) =>
                                          [
                                            "٠",
                                            "١",
                                            "٢",
                                            "٣",
                                            "٤",
                                            "٥",
                                            "٦",
                                            "٧",
                                            "٨",
                                            "٩",
                                          ][Number(d)]
                                      )}
                                    </span>
                                    {tajweedEnabled &&
                                    searchTajweedData[hit.verse_key] ? (
                                      <span
                                        className="text-lg leading-relaxed"
                                        dir="rtl"
                                        dangerouslySetInnerHTML={{
                                          __html:
                                            searchTajweedData[hit.verse_key],
                                        }}
                                      />
                                    ) : (
                                      <span
                                        className="text-lg leading-relaxed"
                                        dir="rtl"
                                        dangerouslySetInnerHTML={{
                                          __html:
                                            hit.text +
                                            '<span class="end">' +
                                            toArabicDigits(
                                              hit.verse_key.split(":")[1] || ""
                                            ) +
                                            "</span>",
                                        }}
                                      />
                                    )}
                                    {hit.translations[0] && (
                                      <span className="line-clamp-2 text-xs text-muted-foreground">
                                        {hit.translations[0].text.replace(
                                          /<[^>]*>/g,
                                          ""
                                        )}
                                      </span>
                                    )}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            )}
                        </CommandList>
                      </Command>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mx-auto max-w-3xl px-6 py-12"
          >
            {chapter && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
                className="mb-12 flex flex-col items-center gap-4"
              >
                <div className="flex items-center justify-center gap-4">
                  <div
                    className="surah-icon text-6xl leading-none text-amber-400/80"
                    dir="rtl"
                  >
                    surah{String(chapter.id).padStart(3, "0")}
                  </div>
                  <div>
                    <p className="text-xl font-semibold text-foreground">
                      {chapterId}. {chapter.name_simple}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {chapter.translated_name?.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 pr-16">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Tajweed (Beta)
                    </span>
                    <Toggle
                      checked={tajweedEnabled}
                      onCheckedChange={handleTajweedToggle}
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <motion.button
                      onClick={() => handlePlay()}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      disabled={audioLoading || !verses}
                      className="flex size-8 items-center justify-center rounded-full bg-foreground text-background transition-opacity disabled:opacity-40"
                    >
                      <AnimatePresence mode="wait" initial={false}>
                        {playing ? (
                          <motion.div
                            key="pause"
                            initial={{ scale: 0.6, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.6, opacity: 0 }}
                            transition={{ duration: 0.1 }}
                          >
                            <Pause size={14} fill="currentColor" />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="play"
                            initial={{ scale: 0.6, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.6, opacity: 0 }}
                            transition={{ duration: 0.1 }}
                          >
                            <Play
                              size={14}
                              fill="currentColor"
                              className="ml-0.5"
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>

                    <motion.button
                      onClick={handleTranslationsToggle}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                      className={cn(
                        "transition-colors",
                        translationsEnabled
                          ? "text-[#b59043]"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Languages size={20} />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="flex flex-col items-center gap-8">
              {verses?.length === 0 && (
                <p className="text-muted-foreground">No verses found.</p>
              )}
              {verses?.map((verse, i) => (
                <div
                  key={verse.verse_key}
                  id={verse.verse_key}
                  className="w-full"
                >
                  <motion.div
                    key={`key-${verse.verse_key}-${tajweedEnabled}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: i * 0.04 }}
                    className="mb-1 flex items-center justify-center gap-3"
                  >
                    <span
                      className={`text-xs font-medium transition-colors ${activeVerseKey === verse.verse_key ? "text-amber-400" : "text-muted-foreground"}`}
                    >
                      {verse.verse_key.replace(
                        /[0-9]/g,
                        (d) =>
                          ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"][
                            Number(d)
                          ]
                      )}
                    </span>
                    <span
                      className={`h-px flex-1 transition-colors ${activeVerseKey === verse.verse_key ? "bg-amber-400/30" : "bg-border/50"}`}
                    />
                  </motion.div>
                  <motion.div
                    key={`${verse.verse_key}-arabic-${tajweedEnabled}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.7 }}
                    className={`text-center text-3xl leading-loose transition-colors ${activeVerseKey === verse.verse_key ? "text-foreground" : "text-foreground/80"}`}
                  >
                    <ClickableArabicText
                      html={
                        tajweedEnabled && tajweedData[verse.verse_key]
                          ? tajweedData[verse.verse_key]
                          : verse.arabic
                      }
                      verseKey={verse.verse_key}
                      onWordClick={playWordAudio}
                    />
                  </motion.div>
                  <AnimatePresence initial={false}>
                    {translationsEnabled && verse.translation && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{
                          duration: 0.4,
                          ease: [0.04, 0.62, 0.23, 0.98],
                        }}
                        className="overflow-hidden"
                      >
                        <p
                          className="mt-2 text-center text-sm leading-relaxed text-muted-foreground"
                          dangerouslySetInnerHTML={{
                            __html: verse.translation
                              .replace(/<sup[^>]*>.*?<\/sup>/g, "") // Remove <sup>
                              .replace(/\[\d+\]/g, "") // Remove [numbers]
                              .replace(
                                /([a-zA-Z.,;:\u0600-\u06FF]+)(\d+)\b/g,
                                "$1"
                              ) // Remove numbers directly attached to words (English & Arabic)
                              .replace(/\s\d+\b/g, ""), // Remove numbers preceded by a space
                          }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}

              {verses && verses.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {chapterId > 1 && (
                    <motion.button
                      onClick={() => router.push(`/surah/${chapterId - 1}`)}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="cursor-pointer rounded-lg border border-border px-6 py-2 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted/50"
                    >
                      &larr; Previous
                    </motion.button>
                  )}
                  {chapterId < 114 && (
                    <motion.button
                      onClick={() => router.push(`/surah/${chapterId + 1}`)}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="cursor-pointer rounded-lg border border-border px-6 py-2 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted/50"
                    >
                      Next &rarr;
                    </motion.button>
                  )}
                  <button
                    onClick={() => setJumpOpen(true)}
                    className="inline-flex cursor-pointer items-center rounded-lg border border-border px-6 py-2 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted/50"
                  >
                    Jump to <FastForward className="ml-2 size-4" />
                  </button>
                </div>
              )}
            </div>

            <CommandDialog
              open={jumpOpen}
              onOpenChange={(open) => {
                setJumpOpen(open)
                if (!open) setJumpSearch("")
              }}
            >
              <Command>
                <CommandInput
                  placeholder="Search surah by number, name, or Arabic..."
                  value={jumpSearch}
                  onValueChange={setJumpSearch}
                />
                <CommandList className="overflow-visible pb-4">
                  <CommandEmpty>No surah found.</CommandEmpty>
                  <CommandGroup className="pb-4">
                    {filteredJumpChapters.map((ch) => (
                      <CommandItem
                        key={ch.id}
                        value={`${ch.id} ${ch.name_simple} ${ch.translated_name?.name ?? ""} ${ch.name_arabic}`}
                        onSelect={() => {
                          setJumpOpen(false)
                          setJumpSearch("")
                          router.push(`/surah/${ch.id}`)
                        }}
                      >
                        <span className="flex size-6 items-center justify-center rounded bg-muted text-xs font-medium text-muted-foreground">
                          {ch.id}
                        </span>
                        <span className="surah-icon text-base leading-none text-amber-400/80">
                          surah{String(ch.id).padStart(3, "0")}
                        </span>
                        <span>{ch.name_simple}</span>
                        <span className="text-xs text-muted-foreground">
                          {ch.translated_name?.name}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </CommandDialog>
          </motion.div>

          <AnimatePresence>
            {(currentTrack || audioLoading) && (
              <AudioPlayer
                key="audio-player"
                track={currentTrack ?? { title: "Loading...", artists: "" }}
                audioRef={surahAudioRef}
                playing={playing}
                onPlayPause={handlePlay}
                onSeek={(time) => {
                  if (surahAudioRef.current) {
                    surahAudioRef.current.currentTime = time
                  }
                }}
                volume={volume}
                onVolumeChange={setVolume}
                onSkipNext={skipNext}
                onSkipPrev={skipPrev}
                shuffle={shuffle}
                onShuffleChange={handleShuffleChange}
                surahs={allChapters.map((ch) => ({
                  id: ch.id,
                  name: ch.name_simple,
                }))}
                onQueueItemSelect={playQueuedChapter}
                onClose={closeAudioPlayer}
                reciters={recitations.map((reciter) => ({
                  id: reciter.id,
                  label: reciterLabel(reciter),
                  available: isChapterAvailable(reciter.id, chapterId),
                }))}
                selectedReciterId={selectedReciter}
                onReciterChange={handleReciterChange}
              />
            )}
          </AnimatePresence>
        </div>
      </ReactLenis>
    </TooltipProvider>
  )
}
