/**
 * Storage API
 *
 * Provides local storage and cache functionality for plugins
 */

import { invoke } from "@tauri-apps/api/core";

// LocalStorage implementation
export class LocalStorage {
  private namespace: string;

  constructor(namespace?: string) {
    this.namespace = namespace || "default";
  }

  async get<T = any>(key: string): Promise<T | null> {
    try {
      const value = await invoke<T | null>("local_storage_get", {
        namespace: this.namespace,
        key,
      });
      return value;
    } catch (error) {
      console.error("Failed to get from local storage:", error);
      return null;
    }
  }

  async set<T = any>(key: string, value: T): Promise<void> {
    await invoke("local_storage_set", {
      namespace: this.namespace,
      key,
      value,
    });
  }

  async remove(key: string): Promise<void> {
    await invoke("local_storage_remove", {
      namespace: this.namespace,
      key,
    });
  }

  async clear(): Promise<void> {
    await invoke("local_storage_clear", {
      namespace: this.namespace,
    });
  }

  async keys(): Promise<string[]> {
    try {
      const keys = await invoke<string[]>("local_storage_keys", {
        namespace: this.namespace,
      });
      return keys;
    } catch (error) {
      console.error("Failed to get local storage keys:", error);
      return [];
    }
  }

  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }
}

// Cache implementation
export class Cache {
  private namespace: string;
  private defaultTTL: number;

  constructor(namespace?: string, defaultTTL: number = 24 * 60 * 60 * 1000) {
    // 24 hours default
    this.namespace = namespace || "cache";
    this.defaultTTL = defaultTTL;
  }

  async get<T = any>(key: string): Promise<T | null> {
    try {
      const entry = await invoke<{ value: T; timestamp: number; ttl: number } | null>("cache_get", {
        namespace: this.namespace,
        key,
      });

      if (!entry) return null;

      // Check if expired
      const now = Date.now();
      if (now - entry.timestamp > entry.ttl) {
        await this.remove(key);
        return null;
      }

      return entry.value;
    } catch (error) {
      console.error("Failed to get from cache:", error);
      return null;
    }
  }

  async set<T = any>(key: string, value: T, ttl?: number): Promise<void> {
    await invoke("cache_set", {
      namespace: this.namespace,
      key,
      value,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  async remove(key: string): Promise<void> {
    await invoke("cache_remove", {
      namespace: this.namespace,
      key,
    });
  }

  async clear(): Promise<void> {
    await invoke("cache_clear", {
      namespace: this.namespace,
    });
  }

  async keys(): Promise<string[]> {
    try {
      const keys = await invoke<string[]>("cache_keys", {
        namespace: this.namespace,
      });
      return keys;
    } catch (error) {
      console.error("Failed to get cache keys:", error);
      return [];
    }
  }

  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  async size(): Promise<number> {
    try {
      const size = await invoke<number>("cache_size", {
        namespace: this.namespace,
      });
      return size;
    } catch (error) {
      console.error("Failed to get cache size:", error);
      return 0;
    }
  }

  // Cache cleanup
  async cleanup(): Promise<number> {
    try {
      const removed = await invoke<number>("cache_cleanup", {
        namespace: this.namespace,
        now: Date.now(),
      });
      return removed;
    } catch (error) {
      console.error("Failed to cleanup cache:", error);
      return 0;
    }
  }
}

// Default instances
export const localStorage = new LocalStorage();
export const cache = new Cache();

// Preferences
export async function getPreferenceValues<T = Record<string, any>>(): Promise<T> {
  try {
    const preferences = await invoke<T>("get_preference_values");
    return preferences;
  } catch (error) {
    console.error("Failed to get preference values:", error);
    return {} as T;
  }
}
