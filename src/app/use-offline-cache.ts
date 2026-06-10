'use client'

/**
 * useOfflineCache Hook — IndexedDB-based offline data caching
 *
 * Features:
 * - Cache API responses in IndexedDB for offline access
 * - Serve cached data when offline with "Cached data" badge
 * - Auto-sync queued requests when back online
 * - Priority caching: agents, meetings, analytics
 * - TTL-based cache invalidation
 */

import { useState, useEffect, useCallback, useRef } from 'react'

// ============================================================
// Types
// ============================================================

interface CacheEntry<T = unknown> {
  key: string
  data: T
  cachedAt: number
  expiresAt: number
  priority: 'high' | 'medium' | 'low'
}

interface QueuedRequest {
  id: string
  url: string
  method: string
  body: string | null
  headers: Record<string, string>
  createdAt: number
}

interface OfflineCacheOptions {
  ttl?: number // Time-to-live in ms (default: 30 minutes)
  priority?: 'high' | 'medium' | 'low'
}

const DB_NAME = 'vlab-offline-cache'
const DB_VERSION = 1
const CACHE_STORE = 'responses'
const QUEUE_STORE = 'requests'

const DEFAULT_TTL = 30 * 60 * 1000 // 30 minutes

// ============================================================
// IndexedDB helpers
// ============================================================

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE, { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: 'id', autoIncrement: true })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function dbGet<T>(store: string, key: string): Promise<CacheEntry<T> | null> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly')
      const req = tx.objectStore(store).get(key)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => reject(req.error)
      tx.oncomplete = () => db.close()
    })
  } catch { return null }
}

async function dbPut<T>(store: string, entry: CacheEntry<T>): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite')
      const req = tx.objectStore(store).put(entry)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
      tx.oncomplete = () => db.close()
    })
  } catch { /* ignore */ }
}

async function dbGetAll<T>(store: string): Promise<T[]> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly')
      const req = tx.objectStore(store).getAll()
      req.onsuccess = () => resolve(req.result || [])
      req.onerror = () => reject(req.error)
      tx.oncomplete = () => db.close()
    })
  } catch { return [] }
}

async function dbDelete(store: string, key: string): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite')
      const req = tx.objectStore(store).delete(key)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
      tx.oncomplete = () => db.close()
    })
  } catch { /* ignore */ }
}

async function dbClear(store: string): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite')
      const req = tx.objectStore(store).clear()
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
      tx.oncomplete = () => db.close()
    })
  } catch { /* ignore */ }
}

// ============================================================
// useOfflineCache Hook
// ============================================================

export function useOfflineCache<T = unknown>(cacheKey: string, options: OfflineCacheOptions = {}) {
  const { ttl = DEFAULT_TTL, priority = 'medium' } = options
  const [data, setData] = useState<T | null>(null)
  const [isFromCache, setIsFromCache] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [hasCache, setHasCache] = useState(false)
  const initializedRef = useRef(false)

  // Load cached data on mount
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    const loadCache = async () => {
      setIsLoading(true)
      try {
        const entry = await dbGet<T>(CACHE_STORE, cacheKey)
        if (entry && entry.expiresAt > Date.now()) {
          setData(entry.data)
          setIsFromCache(true)
          setHasCache(true)
        } else if (entry) {
          // Expired — remove
          await dbDelete(CACHE_STORE, cacheKey)
        }
      } catch { /* ignore */ }
      setIsLoading(false)
    }
    loadCache()
  }, [cacheKey])

  // Set data and optionally cache it
  const setDataWithCache = useCallback(async (newData: T) => {
    setData(newData)
    setIsFromCache(false)

    // Cache the new data
    try {
      const entry: CacheEntry<T> = {
        key: cacheKey,
        data: newData,
        cachedAt: Date.now(),
        expiresAt: Date.now() + ttl,
        priority,
      }
      await dbPut(CACHE_STORE, entry)
      setHasCache(true)
    } catch { /* ignore */ }
  }, [cacheKey, ttl, priority])

  // Clear cache for this key
  const clearCache = useCallback(async () => {
    await dbDelete(CACHE_STORE, cacheKey)
    setHasCache(false)
  }, [cacheKey])

  return {
    data,
    setData: setDataWithCache,
    isFromCache,
    isLoading,
    hasCache,
    clearCache,
  }
}

// ============================================================
// useOfflineSync Hook — Auto-sync queued requests
// ============================================================

export function useOfflineSync() {
  const [queueLength, setQueueLength] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null)

  // Queue a request for later
  const queueRequest = useCallback(async (url: string, method = 'GET', body: string | null = null) => {
    const queued: QueuedRequest = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      url,
      method,
      body,
      headers: { 'Content-Type': 'application/json' },
      createdAt: Date.now(),
    }
    try {
      const db = await openDB()
      return new Promise<void>((resolve) => {
        const tx = db.transaction(QUEUE_STORE, 'readwrite')
        tx.objectStore(QUEUE_STORE).add(queued)
        tx.oncomplete = () => {
          db.close()
          setQueueLength(prev => prev + 1)
          resolve()
        }
      })
    } catch { /* ignore */ }
  }, [])

  // Process the queue
  const processQueue = useCallback(async () => {
    if (isSyncing) return
    setIsSyncing(true)

    try {
      const queued = await dbGetAll<QueuedRequest>(QUEUE_STORE)
      if (queued.length === 0) {
        setQueueLength(0)
        setIsSyncing(false)
        return
      }

      let successCount = 0
      for (const req of queued) {
        try {
          const response = await fetch(req.url, {
            method: req.method,
            body: req.body,
            headers: req.headers,
          })
          if (response.ok) {
            await dbDelete(QUEUE_STORE, req.id)
            successCount++
          }
        } catch { /* Will retry next time */ }
      }

      setQueueLength(prev => Math.max(0, prev - successCount))
      if (successCount > 0) setLastSyncAt(Date.now())
    } catch { /* ignore */ }

    setIsSyncing(false)
  }, [isSyncing])

  // Auto-process queue when coming back online
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleOnline = () => {
      // Small delay to ensure network is truly ready
      setTimeout(processQueue, 1000)
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [processQueue])

  // Load initial queue length
  useEffect(() => {
    const load = async () => {
      const queued = await dbGetAll<QueuedRequest>(QUEUE_STORE)
      setQueueLength(queued.length)
    }
    load()
  }, [])

  return { queueLength, isSyncing, lastSyncAt, queueRequest, processQueue }
}

// ============================================================
// Preload critical data into cache
// ============================================================

export async function preloadCache(urls: string[], priority: 'high' | 'medium' | 'low' = 'high') {
  const ttl = priority === 'high' ? 60 * 60 * 1000 : 30 * 60 * 1000

  for (const url of urls) {
    try {
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        await dbPut(CACHE_STORE, {
          key: url,
          data,
          cachedAt: Date.now(),
          expiresAt: Date.now() + ttl,
          priority,
        })
      }
    } catch { /* ignore — will be handled by offline cache */ }
  }
}

// Clear all cached data
export async function clearAllCache() {
  await dbClear(CACHE_STORE)
  await dbClear(QUEUE_STORE)
}
