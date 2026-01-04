/**
 * Raycast-Compatible LocalStorage API
 *
 * Provides LocalStorage API following Raycast's pattern
 */

import { LocalStorage as CoreLocalStorage } from '@fleet-chat/core-api/storage';

/**
 * Raycast-compatible LocalStorage API
 */
export const LocalStorage = {
  /**
   * Get item from storage
   */
  async getItem<T>(key: string): Promise<T | undefined> {
    const value = await CoreLocalStorage.getItem(key);
    if (!value) return undefined;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  },

  /**
   * Set item in storage
   */
  async setItem<T>(key: string, value: T): Promise<void> {
    return CoreLocalStorage.setObject(key, value);
  },

  /**
   * Remove item from storage
   */
  async removeItem(key: string): Promise<void> {
    return CoreLocalStorage.removeItem(key);
  },

  /**
   * Clear all storage
   */
  async clear(): Promise<void> {
    return CoreLocalStorage.clear();
  },

  /**
   * Get all keys
   */
  async all(): Promise<string[]> {
    return CoreLocalStorage.keys();
  },

  /**
   * Check if key exists
   */
  async contains(key: string): Promise<boolean> {
    return CoreLocalStorage.has(key);
  },
};
