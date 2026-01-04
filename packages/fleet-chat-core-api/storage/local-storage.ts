/**
 * LocalStorage API
 *
 * Unified storage with Tauri and browser fallbacks
 */

import { Store } from '@tauri-apps/plugin-store';

const STORE_PATH = 'fleet-chat-storage.json';

/**
 * LocalStorage class providing unified storage interface
 */
export class LocalStorage {
  private static store: Store | null = null;
  private static fallback: Record<string, string> = {};

  /**
   * Initialize the Tauri store (call this on app startup)
   */
  static async init(): Promise<void> {
    try {
      this.store = await Store.load(STORE_PATH);
    } catch {
      // Fallback to browser localStorage
      this.fallback = this.loadBrowserFallback();
    }
  }

  /**
   * Get item from storage
   */
  static async getItem(key: string): Promise<string | null> {
    if (this.store) {
      return (await this.store.get<string>(key)) ?? null;
    }
    return this.fallback[key] ?? null;
  }

  /**
   * Set item in storage
   */
  static async setItem(key: string, value: string): Promise<void> {
    if (this.store) {
      await this.store.set(key, value);
      await this.store.save();
    } else {
      this.fallback[key] = value;
      this.saveBrowserFallback();
    }
  }

  /**
   * Remove item from storage
   */
  static async removeItem(key: string): Promise<void> {
    if (this.store) {
      await this.store.delete(key);
      await this.store.save();
    } else {
      delete this.fallback[key];
      this.saveBrowserFallback();
    }
  }

  /**
   * Clear all storage
   */
  static async clear(): Promise<void> {
    if (this.store) {
      await this.store.clear();
      await this.store.save();
    } else {
      this.fallback = {};
      this.saveBrowserFallback();
    }
  }

  /**
   * Get all keys
   */
  static async keys(): Promise<string[]> {
    if (this.store) {
      return await this.store.keys();
    }
    return Object.keys(this.fallback);
  }

  /**
   * Check if key exists
   */
  static async has(key: string): Promise<boolean> {
    if (this.store) {
      return await this.store.has(key);
    }
    return key in this.fallback;
  }

  /**
   * Get item with object parsing
   */
  static async getObject<T>(key: string): Promise<T | null> {
    const value = await this.getItem(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  /**
   * Set item with object stringification
   */
  static async setObject<T>(key: string, value: T): Promise<void> {
    await this.setItem(key, JSON.stringify(value));
  }

  private static loadBrowserFallback(): Record<string, string> {
    try {
      const data = window.localStorage.getItem('fleet-chat-storage');
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  private static saveBrowserFallback(): void {
    try {
      window.localStorage.setItem('fleet-chat-storage', JSON.stringify(this.fallback));
    } catch {
      // Ignore errors in private browsing mode
    }
  }
}
