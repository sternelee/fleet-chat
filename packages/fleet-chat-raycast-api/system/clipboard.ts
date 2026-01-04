/**
 * Raycast-Compatible Clipboard API
 *
 * Provides Clipboard.copy(), Clipboard.paste(), etc. following Raycast's API
 */

import { Clipboard } from '@fleet-chat/core-api/api/clipboard';

/**
 * Raycast-compatible Clipboard API
 */
export class ClipboardAPI {
  /**
   * Copy text to clipboard
   */
  static async copy(text: string): Promise<void> {
    return Clipboard.writeText(text);
  }

  /**
   * Copy image to clipboard
   */
  static async copyImage(image: Uint8Array): Promise<void> {
    return Clipboard.writeImage(image);
  }

  /**
   * Read text from clipboard
   */
  static async paste(): Promise<string> {
    return Clipboard.readText();
  }

  /**
   * Read image from clipboard
   */
  static async readImage(): Promise<Uint8Array> {
    return Clipboard.readImage();
  }

  /**
   * Check if clipboard has text
   */
  static async hasText(): Promise<boolean> {
    return Clipboard.hasText();
  }

  /**
   * Clear clipboard
   */
  static async clear(): Promise<void> {
    return Clipboard.clear();
  }
}

// Export as default for Raycast compatibility
export const Clipboard = ClipboardAPI;
