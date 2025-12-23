/**
 * Storage API
 *
 * Provides local storage and cache functionality for plugins using @tauri-apps/plugin-store
 */

import { Store, load } from '@tauri-apps/plugin-store'

// Store cache to avoid creating multiple instances
const storeCache = new Map<string, Store>()

// Helper function to get or create store instance
async function getStore(path: string): Promise<Store> {
  if (!storeCache.has(path)) {
    const store = await load(path, {
      defaults: {},
      autoSave: false, // We'll manually save for better control
    })
    storeCache.set(path, store)
  }
  return storeCache.get(path)!
}

// LocalStorage implementation
export class LocalStorage {
  private namespace: string
  private store: Store | null = null

  constructor(namespace?: string) {
    this.namespace = namespace || 'default'
  }

  private async getStore(): Promise<Store> {
    if (!this.store) {
      const storePath = `storage_${this.namespace}.dat`
      this.store = await getStore(storePath)
    }
    return this.store
  }

  async get<T = any>(key: string): Promise<T | null> {
    try {
      const store = await this.getStore()
      const value = await store.get<T>(key)
      return value !== undefined ? value : null
    } catch (error) {
      console.error('Failed to get from local storage:', error)
      return null
    }
  }

  async set<T = any>(key: string, value: T): Promise<void> {
    try {
      const store = await this.getStore()
      await store.set(key, value)
      await store.save()
    } catch (error) {
      console.error('Failed to set local storage:', error)
      throw error
    }
  }

  async remove(key: string): Promise<void> {
    try {
      const store = await this.getStore()
      await store.delete(key)
      await store.save()
    } catch (error) {
      console.error('Failed to remove from local storage:', error)
      throw error
    }
  }

  async clear(): Promise<void> {
    try {
      const store = await this.getStore()
      const keys = await store.keys()
      for (const key of keys) {
        await store.delete(key)
      }
      await store.save()
    } catch (error) {
      console.error('Failed to clear local storage:', error)
      throw error
    }
  }

  async keys(): Promise<string[]> {
    try {
      const store = await this.getStore()
      return await store.keys()
    } catch (error) {
      console.error('Failed to get local storage keys:', error)
      return []
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const store = await this.getStore()
      return await store.has(key)
    } catch (error) {
      console.error('Failed to check local storage key:', error)
      return false
    }
  }
}

// Cache entry interface
interface CacheEntry<T> {
  value: T
  timestamp: number
  ttl: number
}

// Cache implementation
export class Cache {
  private namespace: string
  private defaultTTL: number
  private store: Store | null = null

  constructor(namespace?: string, defaultTTL: number = 24 * 60 * 60 * 1000) {
    // 24 hours default
    this.namespace = namespace || 'cache'
    this.defaultTTL = defaultTTL
  }

  private async getStore(): Promise<Store> {
    if (!this.store) {
      const storePath = `cache_${this.namespace}.dat`
      this.store = await getStore(storePath)
    }
    return this.store
  }

  private createCacheEntry<T>(value: T, ttl: number): CacheEntry<T> {
    return {
      value,
      timestamp: Date.now(),
      ttl,
    }
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    const now = Date.now()
    return now - entry.timestamp > entry.ttl
  }

  async get<T = any>(key: string): Promise<T | null> {
    try {
      const store = await this.getStore()
      const entry = await store.get<CacheEntry<T>>(`cache:${key}`)

      if (entry === undefined) return null

      // Check if expired
      if (this.isExpired(entry)) {
        await this.remove(key)
        return null
      }

      return entry.value
    } catch (error) {
      console.error('Failed to get from cache:', error)
      return null
    }
  }

  async set<T = any>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const store = await this.getStore()
      const entry = this.createCacheEntry(value, ttl || this.defaultTTL)
      await store.set(`cache:${key}`, entry)
      await store.save()
    } catch (error) {
      console.error('Failed to set cache:', error)
      throw error
    }
  }

  async remove(key: string): Promise<void> {
    try {
      const store = await this.getStore()
      await store.delete(`cache:${key}`)
      await store.save()
    } catch (error) {
      console.error('Failed to remove from cache:', error)
      throw error
    }
  }

  async clear(): Promise<void> {
    try {
      const store = await this.getStore()
      const keys = await store.keys()
      const cacheKeys = keys.filter((key) => key.startsWith('cache:'))

      for (const key of cacheKeys) {
        await store.delete(key)
      }
      await store.save()
    } catch (error) {
      console.error('Failed to clear cache:', error)
      throw error
    }
  }

  async keys(): Promise<string[]> {
    try {
      const store = await this.getStore()
      const keys = await store.keys()
      return keys.filter((key) => key.startsWith('cache:')).map((key) => key.replace('cache:', ''))
    } catch (error) {
      console.error('Failed to get cache keys:', error)
      return []
    }
  }

  async has(key: string): Promise<boolean> {
    const value = await this.get(key)
    return value !== null
  }

  async size(): Promise<number> {
    try {
      const store = await this.getStore()
      const keys = await store.keys()
      const cacheKeys = keys.filter((key) => key.startsWith('cache:'))

      let validEntries = 0
      for (const fullKey of cacheKeys) {
        const entry = await store.get<CacheEntry<any>>(fullKey)
        if (entry !== undefined && !this.isExpired(entry)) {
          validEntries++
        }
      }

      return validEntries
    } catch (error) {
      console.error('Failed to get cache size:', error)
      return 0
    }
  }

  // Cache cleanup - removes expired entries
  async cleanup(): Promise<number> {
    try {
      const store = await this.getStore()
      const keys = await store.keys()
      const cacheKeys = keys.filter((key) => key.startsWith('cache:'))

      let removed = 0
      const keysToDelete: string[] = []

      for (const fullKey of cacheKeys) {
        const entry = await store.get<CacheEntry<any>>(fullKey)
        if (entry !== undefined && this.isExpired(entry)) {
          keysToDelete.push(fullKey)
        }
      }

      for (const key of keysToDelete) {
        await store.delete(key)
        removed++
      }

      if (removed > 0) {
        await store.save()
      }

      return removed
    } catch (error) {
      console.error('Failed to cleanup cache:', error)
      return 0
    }
  }
}

// Default instances
export const localStorage = new LocalStorage()
export const cache = new Cache()

// Preferences
export class Preferences {
  private store: Store | null = null

  private async getStore(): Promise<Store> {
    if (!this.store) {
      this.store = await getStore('preferences.dat')
    }
    return this.store
  }

  async get<T = Record<string, any>>(): Promise<T> {
    try {
      const store = await this.getStore()
      const preferences = await store.get<T>('preferences')
      return preferences !== undefined ? preferences : ({} as T)
    } catch (error) {
      console.error('Failed to get preference values:', error)
      return {} as T
    }
  }

  async set<T = Record<string, any>>(preferences: T): Promise<void> {
    try {
      const store = await this.getStore()
      await store.set('preferences', preferences)
      await store.save()
    } catch (error) {
      console.error('Failed to set preference values:', error)
      throw error
    }
  }

  async update<T = Record<string, any>>(updates: Partial<T>): Promise<void> {
    try {
      const current = await this.get<T>()
      const updated = { ...current, ...updates }
      await this.set(updated)
    } catch (error) {
      console.error('Failed to update preference values:', error)
      throw error
    }
  }

  async clear(): Promise<void> {
    try {
      const store = await this.getStore()
      await store.delete('preferences')
      await store.save()
    } catch (error) {
      console.error('Failed to clear preference values:', error)
      throw error
    }
  }
}

// Default preferences instance
export const preferences = new Preferences()

// Legacy function for backward compatibility
export async function getPreferenceValues<T = Record<string, any>>(): Promise<T> {
  return preferences.get<T>()
}
