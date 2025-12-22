/**
 * Fleet Chat Raycast Utils Compatibility
 *
 * Provides compatibility with @raycast/utils for enhanced functionality
 */

// Re-export commonly used utilities from @raycast/utils
export * from '@raycast/utils';

// Fleet Chat specific utilities that extend or enhance @raycast/utils

/**
 * Enhanced local storage with TTL support
 */
export class CacheStorage {
  private prefix = 'fleet-chat-cache-';

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const item = {
      value,
      timestamp: Date.now(),
      ttl: ttl || 0
    };

    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(this.prefix + key, JSON.stringify(item));
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (typeof window !== 'undefined' && window.localStorage) {
      const item = localStorage.getItem(this.prefix + key);
      if (!item) return null;

      try {
        const parsed = JSON.parse(item);

        // Check TTL
        if (parsed.ttl > 0 && Date.now() - parsed.timestamp > parsed.ttl) {
          localStorage.removeItem(this.prefix + key);
          return null;
        }

        return parsed.value;
      } catch {
        return null;
      }
    }
    return null;
  }

  async remove(key: string): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(this.prefix + key);
    }
  }

  async clear(): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
      const keys = Object.keys(localStorage).filter(key => key.startsWith(this.prefix));
      keys.forEach(key => localStorage.removeItem(key));
    }
  }
}

/**
 * Enhanced clipboard with history
 */
export class ClipboardHistory {
  private history: string[] = [];
  private maxSize = 10;

  async copy(text: string): Promise<void> {
    try {
      if (typeof window !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        this.addToHistory(text);
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }

  async paste(): Promise<string> {
    try {
      if (typeof window !== 'undefined' && navigator.clipboard) {
        return await navigator.clipboard.readText();
      }
    } catch (error) {
      console.error('Failed to paste from clipboard:', error);
    }
    return '';
  }

  getHistory(): string[] {
    return [...this.history];
  }

  private addToHistory(text: string): void {
    // Avoid duplicates
    this.history = this.history.filter(item => item !== text);
    this.history.unshift(text);

    // Limit size
    if (this.history.length > this.maxSize) {
      this.history = this.history.slice(0, this.maxSize);
    }
  }

  clearHistory(): void {
    this.history = [];
  }
}

/**
 * Enhanced notification system
 */
export class NotificationCenter {
  async notify(options: {
    title: string;
    subtitle?: string;
    body?: string;
    icon?: string;
    sound?: 'default' | 'silent';
  }): Promise<void> {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(options.title, {
          body: options.subtitle ? `${options.subtitle}: ${options.body || ''}` : (options.body || ''),
          icon: options.icon,
          silent: options.sound === 'silent'
        });
      } else if (Notification.permission !== 'denied') {
        await Notification.requestPermission();
        if (Notification.permission === 'granted') {
          this.notify(options);
        }
      }
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return await Notification.requestPermission();
    }
    return 'denied';
  }
}

/**
 * Enhanced file system operations
 */
export class FileSystemExtensions {
  async readFileAsText(path: string): Promise<string> {
    try {
      // This would need to be implemented with Tauri APIs or File System Access API
      // For now, return a placeholder
      console.log('Reading file:', path);
      return '';
    } catch (error) {
      console.error('Failed to read file:', error);
      throw error;
    }
  }

  async writeFile(path: string, content: string): Promise<void> {
    try {
      // This would need to be implemented with Tauri APIs or File System Access API
      console.log('Writing file:', path, 'with content length:', content.length);
    } catch (error) {
      console.error('Failed to write file:', error);
      throw error;
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      // This would need to be implemented with Tauri APIs
      console.log('Checking if file exists:', path);
      return false;
    } catch (error) {
      console.error('Failed to check file existence:', error);
      return false;
    }
  }
}

/**
 * Date utilities extending @raycast/utils
 */
export const DateUtils = {
  /**
   * Format date in various formats
   */
  format(date: Date, format: 'short' | 'medium' | 'long' | 'full'): string {
    const options: Intl.DateTimeFormatOptions = {
      short: { dateStyle: 'short' },
      medium: { dateStyle: 'medium' },
      long: { dateStyle: 'long' },
      full: { dateStyle: 'full' }
    }[format];

    return new Intl.DateTimeFormat(undefined, options).format(date);
  },

  /**
   * Get relative time string
   */
  getRelativeTime(date: Date): string {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const diffInSeconds = Math.abs(diff) / 1000;

    if (diffInSeconds < 60) {
      return 'just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return diff > 0 ? `in ${minutes} minute${minutes > 1 ? 's' : ''}` : `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return diff > 0 ? `in ${hours} hour${hours > 1 ? 's' : ''}` : `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return diff > 0 ? `in ${days} day${days > 1 ? 's' : ''}` : `${days} day${days > 1 ? 's' : ''} ago`;
    }
  },

  /**
   * Check if date is today
   */
  isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  },

  /**
   * Check if date is yesterday
   */
  isYesterday(date: Date): boolean {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return date.getDate() === yesterday.getDate() &&
           date.getMonth() === yesterday.getMonth() &&
           date.getFullYear() === yesterday.getFullYear();
  },

  /**
   * Check if date is tomorrow
   */
  isTomorrow(date: Date): boolean {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date.getDate() === tomorrow.getDate() &&
           date.getMonth() === tomorrow.getMonth() &&
           date.getFullYear() === tomorrow.getFullYear();
  }
};

/**
 * String utilities
 */
export const StringUtils = {
  /**
   * Check if string is a URL
   */
  isUrl(str: string): boolean {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Extract URLs from text
   */
  extractUrls(text: string): string[] {
    const urlRegex = /https?:\/\/[^\s<>"]+/g;
    return text.match(urlRegex) || [];
  },

  /**
   * Truncate string with ellipsis
   */
  truncate(str: string, maxLength: number, suffix = '...'): string {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - suffix.length) + suffix;
  },

  /**
   * Convert to title case
   */
  toTitleCase(str: string): string {
    return str.replace(/\w\S*/g, txt =>
      txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
    );
  }
};

/**
 * Array utilities
 */
export const ArrayUtils = {
  /**
   * Remove duplicates from array
   */
  unique<T>(array: T[]): T[] {
    return [...new Set(array)];
  },

  /**
   * Group array by key
   */
  groupBy<T, K extends keyof T>(array: T[], key: K): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const groupKey = String(item[key]);
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  },

  /**
   * Sort array by key
   */
  sortBy<T, K extends keyof T>(array: T[], key: K, order: 'asc' | 'desc' = 'asc'): T[] {
    return [...array].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];

      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }
};

// Create default instances
export const cacheStorage = new CacheStorage();
export const clipboardHistory = new ClipboardHistory();
export const notificationCenter = new NotificationCenter();
export const fileSystemExtensions = new FileSystemExtensions();

// Export all utilities
export {
  CacheStorage,
  ClipboardHistory,
  NotificationCenter,
  FileSystemExtensions
};