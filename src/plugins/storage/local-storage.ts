/**
 * FCLocalStorage - Fleet Chat Local Storage Component
 * Provides persistent storage functionality for plugins
 */

export interface StorageOptions {
  key: string;
  value?: string;
}

export interface StorageResult {
  success: boolean;
  data?: string;
  error?: string;
}

export class FCLocalStorage {
  /**
   * Get a value from local storage
   */
  static async get(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('LocalStorage get error:', error);
      return null;
    }
  }

  /**
   * Set a value in local storage
   */
  static async set(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error('LocalStorage set error:', error);
      throw error;
    }
  }

  /**
   * Remove a value from local storage
   */
  static async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('LocalStorage remove error:', error);
      throw error;
    }
  }

  /**
   * Clear all local storage
   */
  static async clear(): Promise<void> {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('LocalStorage clear error:', error);
      throw error;
    }
  }

  /**
   * Get all keys from local storage
   */
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
      console.error('LocalStorage getAllKeys error:', error);
      return [];
    }
  }

  /**
   * Check if a key exists in local storage
   */
  static async has(key: string): Promise<boolean> {
    try {
      return localStorage.getItem(key) !== null;
    } catch (error) {
      console.error('LocalStorage has error:', error);
      return false;
    }
  }
}