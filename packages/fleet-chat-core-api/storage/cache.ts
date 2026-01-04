/**
 * Cache API
 *
 * In-memory cache with TTL support
 */

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
}

/**
 * Cache class for in-memory caching with expiration
 */
export class Cache {
  private static cache = new Map<string, CacheEntry<unknown>>();

  /**
   * Get value from cache
   */
  static get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Set value in cache with optional TTL
   */
  static set<T>(key: string, value: T, options?: CacheOptions): void {
    const ttl = options?.ttl ?? 5 * 60 * 1000; // Default 5 minutes
    const expiresAt = Date.now() + ttl;

    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Remove value from cache
   */
  static delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  static clear(): void {
    this.cache.clear();
  }

  /**
   * Check if key exists and is not expired
   */
  static has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Get or set value
   */
  static async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions,
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, options);
    return value;
  }

  /**
   * Clean up expired entries
   */
  static cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// Auto-cleanup every minute
if (typeof globalThis.setInterval !== 'undefined') {
  globalThis.setInterval(() => Cache.cleanup(), 60 * 1000);
}
