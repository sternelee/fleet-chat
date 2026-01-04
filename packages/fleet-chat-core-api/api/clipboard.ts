/**
 * Clipboard API
 *
 * Tauri-native clipboard operations using @tauri-apps/plugin-clipboard-manager
 */

import { Clipboard as TauriClipboard } from '@tauri-apps/plugin-clipboard-manager';

export interface ClipboardContent {
  text?: string;
  image?: Uint8Array;
  html?: string;
}

/**
 * Clipboard API class wrapping Tauri clipboard plugin
 */
export class Clipboard {
  /**
   * Read text from clipboard
   */
  static async readText(): Promise<string> {
    return TauriClipboard.readText();
  }

  /**
   * Write text to clipboard
   */
  static async writeText(text: string): Promise<void> {
    return TauriClipboard.writeText(text);
  }

  /**
   * Read image from clipboard
   */
  static async readImage(): Promise<Uint8Array> {
    return TauriClipboard.readImage();
  }

  /**
   * Write image to clipboard
   */
  static async writeImage(image: Uint8Array): Promise<void> {
    return TauriClipboard.writeImage(image);
  }

  /**
   * Read HTML from clipboard
   */
  static async readHTML(): Promise<string> {
    return TauriClipboard.readHtml();
  }

  /**
   * Write HTML to clipboard
   */
  static async writeHTML(html: string): Promise<void> {
    return TauriClipboard.writeHtml(html);
  }

  /**
   * Clear clipboard contents
   */
  static async clear(): Promise<void> {
    return TauriClipboard.clear();
  }

  /**
   * Check if clipboard has text content
   */
  static async hasText(): Promise<boolean> {
    try {
      await this.readText();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if clipboard has image content
   */
  static async hasImage(): Promise<boolean> {
    try {
      await this.readImage();
      return true;
    } catch {
      return false;
    }
  }
}
