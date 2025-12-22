/**
 * Fleet Chat Storage System
 *
 * Unified storage system for Fleet Chat plugins
 * Re-exports the Tauri-based storage implementations from api/storage.ts
 */

// Re-export storage implementations from api/storage.ts
export {
  LocalStorage,
  Cache,
  preferences,
} from '../api/storage.js';

// Re-export types
export type {
  Preferences
} from '../api/storage.js';

// For plugin compatibility, also provide browser-based fallbacks
// when running outside of Tauri environment

/**
 * Browser-based localStorage fallback
 * This is only used when Tauri APIs are not available
 */
export class BrowserLocalStorage {
  static async get(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('BrowserLocalStorage get error:', error);
      return null;
    }
  }

  static async set(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error('BrowserLocalStorage set error:', error);
      throw error;
    }
  }

  static async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('BrowserLocalStorage remove error:', error);
      throw error;
    }
  }

  static async clear(): Promise<void> {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('BrowserLocalStorage clear error:', error);
      throw error;
    }
  }

  static async getAllKeys(): Promise<string[]> {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          keys.push(key);
        }
      }
      return keys;
    } catch (error) {
      console.error('BrowserLocalStorage getAllKeys error:', error);
      return [];
    }
  }

  static async has(key: string): Promise<boolean> {
    try {
      return localStorage.getItem(key) !== null;
    } catch (error) {
      console.error('BrowserLocalStorage has error:', error);
      return false;
    }
  }
}

/**
 * Browser-based cache fallback
 * This is only used when Tauri APIs are not available
 */
export interface CacheEntry {
  value: string;
  timestamp: number;
  ttl?: number;
}

export class BrowserCache {
  private static readonly CACHE_PREFIX = 'fc_cache_';
  private static memoryCache = new Map<string, CacheEntry>();

  static async get(key: string): Promise<string | null> {
    try {
      const fullKey = this.CACHE_PREFIX + key;

      // Check memory cache first
      const memoryEntry = this.memoryCache.get(fullKey);
      if (memoryEntry && !this.isExpired(memoryEntry)) {
        return memoryEntry.value;
      }

      // Check localStorage
      const stored = localStorage.getItem(fullKey);
      if (stored) {
        const entry: CacheEntry = JSON.parse(stored);
        if (!this.isExpired(entry)) {
          // Restore to memory cache
          this.memoryCache.set(fullKey, entry);
          return entry.value;
        } else {
          // Remove expired entry
          localStorage.removeItem(fullKey);
        }
      }

      return null;
    } catch (error) {
      console.error('BrowserCache get error:', error);
      return null;
    }
  }

  static async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      const fullKey = this.CACHE_PREFIX + key;
      const entry: CacheEntry = {
        value,
        timestamp: Date.now(),
        ttl
      };

      // Store in memory cache
      this.memoryCache.set(fullKey, entry);

      // Store in localStorage
      const serialized = JSON.stringify(entry);
      localStorage.setItem(fullKey, serialized);
    } catch (error) {
      console.error('BrowserCache set error:', error);
      throw error;
    }
  }

  static async remove(key: string): Promise<void> {
    try {
      const fullKey = this.CACHE_PREFIX + key;
      this.memoryCache.delete(fullKey);
      localStorage.removeItem(fullKey);
    } catch (error) {
      console.error('BrowserCache remove error:', error);
      throw error;
    }
  }

  static async clear(): Promise<void> {
    try {
      this.memoryCache.clear();

      // Clear localStorage cache entries
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.CACHE_PREFIX)) {
          keys.push(key);
        }
      }

      keys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('BrowserCache clear error:', error);
      throw error;
    }
  }

  static async has(key: string): Promise<boolean> {
    try {
      const value = await this.get(key);
      return value !== null;
    } catch (error) {
      console.error('BrowserCache has error:', error);
      return false;
    }
  }

  /**
   * Check if a cache entry is expired
   */
  private static isExpired(entry: CacheEntry): boolean {
    if (!entry.ttl) {
      return false;
    }
    return Date.now() - entry.timestamp > entry.ttl;
  }
}
