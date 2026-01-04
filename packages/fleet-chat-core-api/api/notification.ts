/**
 * Notification API
 *
 * Tauri-native system notifications using @tauri-apps/plugin-notification
 */

import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  sound?: string;
}

/**
 * Notification API class wrapping Tauri notification plugin
 */
export class Notification {
  /**
   * Check if notification permission is granted
   */
  static async isPermissionGranted(): Promise<boolean> {
    return isPermissionGranted();
  }

  /**
   * Request notification permission
   */
  static async requestPermission(): Promise<boolean> {
    return requestPermission();
  }

  /**
   * Send notification
   */
  static async send(options: NotificationOptions): Promise<void> {
    return sendNotification({
      title: options.title,
      body: options.body,
      icon: options.icon,
      sound: options.sound,
    });
  }

  /**
   * Show notification (ensures permission first)
   */
  static async show(options: NotificationOptions): Promise<void> {
    const granted = await this.isPermissionGranted();
    if (!granted) {
      await this.requestPermission();
    }
    return this.send(options);
  }
}
