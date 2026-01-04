/**
 * Opener API
 *
 * Tauri-native URL/file opener using @tauri-apps/plugin-opener
 */

import { open } from '@tauri-apps/plugin-opener';

/**
 * Opener API class wrapping Tauri opener plugin
 */
export class Opener {
  /**
   * Open URL in default application
   */
  static async open(url: string): Promise<void> {
    return open(url);
  }

  /**
   * Open file in default application
   */
  static async openFile(path: string): Promise<void> {
    return open(`file://${path}`);
  }

  /**
   * Open email client
   */
  static async openEmail(email: string, subject?: string, body?: string): Promise<void> {
    const mailto = new URL(`mailto:${email}`);
    if (subject) mailto.searchParams.set('subject', subject);
    if (body) mailto.searchParams.set('body', body);
    return open(mailto.toString());
  }

  /**
   * Open telephone
   */
  static async openTel(phone: string): Promise<void> {
    return open(`tel:${phone}`);
  }
}
