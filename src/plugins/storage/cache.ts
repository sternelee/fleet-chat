/**
 * FCCache - Fleet Chat Cache Component
 * Provides caching functionality for plugins with TTL support
 */

export interface CacheOptions {
  key: string;
  value?: string;
  ttl?: number; // Time to live in milliseconds
}

export interface CacheEntry {
  value: string;
  timestamp: number;
  ttl?: number;
}

export interface CacheResult {
  success: boolean;
  data?: string;
  error?: string;
}

export class FCCache {
  private static readonly CACHE_PREFIX = 'fc_cache_';
  private static memoryCache = new Map<string, CacheEntry>();

  /**
   * Get a value from cache (memory first, then localStorage)
   */
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
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set a value in cache with optional TTL
   */
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

      // Store in localStorage with compression for large values
      const serialized = JSON.stringify(entry);
      localStorage.setItem(fullKey, serialized);
    } catch (error) {
      console.error('Cache set error:', error);
      throw error;
    }
  }

  /**
   * Remove a value from cache
   */
  static async remove(key: string): Promise<void> {
    try {
      const fullKey = this.CACHE_PREFIX + key;
      this.memoryCache.delete(fullKey);
      localStorage.removeItem(fullKey);
    } catch (error) {
      console.error('Cache remove error:', error);
      throw error;
    }
  }

  /**
   * Clear all cache
   */
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
      console.error('Cache clear error:', error);
      throw error;
    }
  }

  /**
   * Check if a cache key exists and is not expired
   */
  static async has(key: string): Promise<boolean> {
    try {
      const value = await this.get(key);
      return value !== null;
    } catch (error) {
      console.error('Cache has error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  static async getStats(): Promise<{
    memorySize: number;
    storageSize: number;
    totalKeys: number;
  }> {
    try {
      let storageSize = 0;
      let totalKeys = 0;

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.CACHE_PREFIX)) {
          totalKeys++;
          const value = localStorage.getItem(key);
          if (value) {
            storageSize += key.length + value.length;
          }
        }
      }

      return {
        memorySize: this.memoryCache.size,
        storageSize,
        totalKeys
      };
    } catch (error) {
      console.error('Cache getStats error:', error);
      return { memorySize: 0, storageSize: 0, totalKeys: 0 };
    }
  }

  /**
   * Clean up expired entries
   */
  static async cleanup(): Promise<void> {
    try {
      // Clean memory cache
      for (const [key, entry] of this.memoryCache.entries()) {
        if (this.isExpired(entry)) {
          this.memoryCache.delete(key);
        }
      }

      // Clean localStorage cache
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.CACHE_PREFIX)) {
          keys.push(key);
        }
      }

      for (const key of keys) {
        const stored = localStorage.getItem(key);
        if (stored) {
          const entry: CacheEntry = JSON.parse(stored);
          if (this.isExpired(entry)) {
            localStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.error('Cache cleanup error:', error);
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