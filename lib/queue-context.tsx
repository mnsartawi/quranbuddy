"use client"
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react"

type QueueItem = {
  id?: string | number
  title: string
  artists: string
  active?: boolean
  key: string
}

type QueueContextType = {
  queue: QueueItem[]
  addToQueue: (item: Omit<QueueItem, "key">) => void
  removeFromQueue: (key: string) => void
  setActiveItem: (key: string | null) => void
  clearQueue: () => void
}

const QueueContext = createContext<QueueContextType | undefined>(undefined)

export function QueueProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<QueueItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem("surah_persistent_queue")
        if (saved) return JSON.parse(saved)
      } catch {}
    }
    return []
  })

  const queueStorageRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (queueStorageRef.current) clearTimeout(queueStorageRef.current)
    queueStorageRef.current = setTimeout(() => {
      sessionStorage.setItem("surah_persistent_queue", JSON.stringify(queue))
    }, 300)

    return () => {
      if (queueStorageRef.current) clearTimeout(queueStorageRef.current)
    }
  }, [queue])

  const addToQueue = (item: Omit<QueueItem, "key">) => {
    setQueue((prev) => [
      ...prev,
      { ...item, key: `${item.id ?? item.title}-${crypto.randomUUID()}` },
    ])
  }

  const removeFromQueue = (key: string) => {
    setQueue((prev) => prev.filter((item) => item.key !== key))
  }

  const setActiveItem = (key: string | null) => {
    setQueue((prev) => prev.map((q) => ({ ...q, active: q.key === key })))
  }

  const clearQueue = () => setQueue([])

  return (
    <QueueContext.Provider
      value={{ queue, addToQueue, removeFromQueue, setActiveItem, clearQueue }}
    >
      {children}
    </QueueContext.Provider>
  )
}

export function useQueue() {
  const context = useContext(QueueContext)
  if (context === undefined) {
    throw new Error("useQueue must be used within a QueueProvider")
  }
  return context
}
