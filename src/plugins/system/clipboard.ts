/**
 * FCClipboard - Fleet Chat Clipboard Component
 * Provides clipboard functionality for plugins
 */

export interface ClipboardOptions {
  text?: string;
}

export interface ClipboardResult {
  success: boolean;
  data?: string;
  error?: string;
}

export class FCClipboard {
  /**
   * Read text from clipboard
   */
  static async readText(): Promise<string> {
    try {
      // Try Tauri clipboard first if available
      if (typeof window !== 'undefined' && window.__TAURI__) {
        const { readText } = await import('@tauri-apps/plugin-clipboard-manager');
        return await readText();
      }

      // Fallback to browser clipboard
      if (navigator.clipboard && navigator.clipboard.readText) {
        return await navigator.clipboard.readText();
      }

      throw new Error('Clipboard API not available');
    } catch (error) {
      console.error('Clipboard readText error:', error);
      throw error;
    }
  }

  /**
   * Write text to clipboard
   */
  static async writeText(text: string): Promise<void> {
    try {
      // Try Tauri clipboard first if available
      if (typeof window !== 'undefined' && window.__TAURI__) {
        const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
        await writeText(text);
        return;
      }

      // Fallback to browser clipboard
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return;
      }

      throw new Error('Clipboard API not available');
    } catch (error) {
      console.error('Clipboard writeText error:', error);
      throw error;
    }
  }

  /**
   * Read clipboard content (legacy method)
   */
  static async read(): Promise<string> {
    return this.readText();
  }

  /**
   * Write clipboard content (legacy method)
   */
  static async write(text: string): Promise<void> {
    await this.writeText(text);
  }

  /**
   * Check if clipboard API is available
   */
  static async isAvailable(): Promise<boolean> {
    try {
      // Check if Tauri clipboard is available
      if (typeof window !== 'undefined' && window.__TAURI__) {
        return true;
      }

      // Check if browser clipboard is available
      return !!(navigator.clipboard && (navigator.clipboard.readText || navigator.clipboard.writeText));
    } catch {
      return false;
    }
  }

  /**
   * Clear clipboard content
   */
  static async clear(): Promise<void> {
    try {
      await this.writeText('');
    } catch (error) {
      console.error('Clipboard clear error:', error);
      throw error;
    }
  }

  /**
   * Check if clipboard has text content
   */
  static async hasText(): Promise<boolean> {
    try {
      const text = await this.readText();
      return text.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get clipboard text length
   */
  static async getLength(): Promise<number> {
    try {
      const text = await this.readText();
      return text.length;
    } catch {
      return 0;
    }
  }
}