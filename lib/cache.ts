"use client"

import { invoke } from "@tauri-apps/api/core"

const CACHE_PREFIX = "qbuddy_cache_"
const DEFAULT_TTL = 5 * 60 * 1000

const memoryCache = new Map<string, { data: unknown; storedAt: number }>()
const inFlight = new Map<string, Promise<unknown>>()

function cacheKey(cmd: string, args?: Record<string, unknown>): string {
  return `${CACHE_PREFIX}${cmd}::${args ? JSON.stringify(args) : ""}`
}

function getFromStorage<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw) as T
  } catch {}
  return undefined
}

function setInStorage(key: string, data: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (err) {
    console.warn("Cache storage full, clearing old entries:", err)
    try {
      const toRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k?.startsWith(CACHE_PREFIX)) toRemove.push(k)
      }
      toRemove.forEach((k) => localStorage.removeItem(k))
      localStorage.setItem(key, JSON.stringify(data))
    } catch {}
  }
}

export async function cachedInvoke<T>(
  cmd: string,
  args?: Record<string, unknown>,
  ttl: number = DEFAULT_TTL
): Promise<T> {
  const key = cacheKey(cmd, args)

  const mem = memoryCache.get(key)
  if (mem && Date.now() - mem.storedAt < ttl) return mem.data as T
  if (mem) memoryCache.delete(key)

  const stored = getFromStorage<{ data: T; storedAt: number }>(key)
  if (stored && Date.now() - stored.storedAt < ttl) {
    memoryCache.set(key, stored)
    return stored.data
  }

  const pending = inFlight.get(key)
  if (pending) return pending as Promise<T>

  const promise = invoke<T>(cmd, args).then((data) => {
    const entry = { data, storedAt: Date.now() }
    memoryCache.set(key, entry)
    setInStorage(key, entry)
    return data
  }).finally(() => {
    inFlight.delete(key)
  })

  inFlight.set(key, promise)
  return promise
}

export function clearCache(): void {
  memoryCache.clear()
  const toRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k?.startsWith(CACHE_PREFIX)) toRemove.push(k)
  }
  toRemove.forEach((k) => localStorage.removeItem(k))
}
