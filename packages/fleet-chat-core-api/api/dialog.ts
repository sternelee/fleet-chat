/**
 * Dialog API
 *
 * Tauri-native file dialogs using @tauri-apps/plugin-dialog
 */

import {
  open,
  save,
  message,
  ask,
  confirm,
} from '@tauri-apps/plugin-dialog';

export interface FileDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: DialogFilter[];
  multiple?: boolean;
  directory?: boolean;
}

export interface DialogFilter {
  name: string;
  extensions: string[];
}

export interface MessageDialogOptions {
  title?: string;
  type?: 'info' | 'warning' | 'error';
}

/**
 * Dialog API class wrapping Tauri dialog plugin
 */
export class Dialog {
  /**
   * Open file selection dialog
   */
  static async openFile(options?: FileDialogOptions): Promise<string | string[] | null> {
    return open({
      title: options?.title,
      defaultPath: options?.defaultPath,
      filters: options?.filters,
      multiple: options?.multiple,
      directory: options?.directory,
    });
  }

  /**
   * Open save file dialog
   */
  static async saveFile(options?: FileDialogOptions): Promise<string | null> {
    return save({
      title: options?.title,
      defaultPath: options?.defaultPath,
      filters: options?.filters,
    });
  }

  /**
   * Show message dialog
   */
  static async message(message: string, options?: MessageDialogOptions): Promise<void> {
    return message(message, {
      title: options?.title,
      kind: options?.type,
    });
  }

  /**
   * Show ask dialog with yes/no buttons
   */
  static async ask(question: string, options?: MessageDialogOptions): Promise<boolean> {
    return ask(question, {
      title: options?.title,
      kind: options?.type,
    });
  }

  /**
   * Show confirm dialog
   */
  static async confirm(message: string, options?: MessageDialogOptions): Promise<boolean> {
    return confirm(message, {
      title: options?.title,
      kind: options?.type,
    });
  }
}
