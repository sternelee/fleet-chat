/**
 * UI API
 *
 * Provides UI utilities and components for plugins
 */

import { invoke } from "@tauri-apps/api/core";

// Image handling
export class Image {
  constructor(
    private source: string,
    private options?: {
      fallback?: string;
      mask?: ImageMask;
    },
  ) {}

  static from(source: string | ImageLike): Image {
    if (typeof source === "string") {
      return new Image(source);
    } else {
      return new Image(source.source, { fallback: source.fallback, mask: source.mask });
    }
  }

  getSource(): string {
    return this.source;
  }

  getFallback(): string | undefined {
    return this.options?.fallback;
  }

  getMask(): ImageMask | undefined {
    return this.options?.mask;
  }
}

export interface ImageLike {
  source: string;
  fallback?: string;
  mask?: ImageMask;
}

export enum ImageMask {
  Circle = "circle",
  RoundRect = "roundRect",
  Squircle = "squircle",
}

// Icon handling
export class Icon {
  constructor(
    private source: string,
    private options?: {
      fallback?: string;
      tintColor?: ColorLike;
    },
  ) {}

  static from(source: string | IconLike): Icon {
    if (typeof source === "string") {
      return new Icon(source);
    } else {
      return new Icon(source.source, { fallback: source.fallback, tintColor: source.tintColor });
    }
  }

  getSource(): string {
    return this.source;
  }

  getFallback(): string | undefined {
    return this.options?.fallback;
  }

  getTintColor(): ColorLike | undefined {
    return this.options?.tintColor;
  }
}

export interface IconLike {
  source: string;
  fallback?: string;
  tintColor?: ColorLike;
}

// Color handling
export class Color {
  constructor(
    private light: string,
    private dark?: string,
  ) {}

  static from(color: string | ColorLike): Color {
    if (typeof color === "string") {
      return new Color(color);
    } else {
      return new Color(color.light, color.dark);
    }
  }

  getLight(): string {
    return this.light;
  }

  getDark(): string {
    return this.dark || this.light;
  }

  toString(theme?: "light" | "dark"): string {
    if (theme === "dark") {
      return this.getDark();
    }
    return this.getLight();
  }
}

export interface ColorLike {
  light: string;
  dark?: string;
}

// Keyboard shortcuts
export interface KeyboardShortcut {
  key: string;
  modifiers?: KeyModifier[];
}

export enum KeyModifier {
  Cmd = "cmd",
  Ctrl = "ctrl",
  Alt = "alt",
  Shift = "shift",
  Meta = "meta",
}

export class Keyboard {
  static shortcut(key: string, modifiers?: KeyModifier[]): KeyboardShortcut {
    return { key, modifiers };
  }

  static toString(shortcut: KeyboardShortcut): string {
    const parts: string[] = (shortcut.modifiers || []) as string[];
    parts.push(shortcut.key);
    return parts.join("+");
  }
}

// Alert dialogs
export interface AlertOptions {
  title: string;
  message?: string;
  icon?: string;
  primaryAction?: AlertAction;
  secondaryAction?: AlertAction;
}

export interface AlertAction {
  title: string;
  style?: "default" | "cancel" | "destructive";
  action?: () => void | Promise<void>;
}

export async function confirmAlert(options: AlertOptions): Promise<boolean> {
  try {
    const result = await invoke<boolean>("confirm_alert", { options });
    return result;
  } catch (error) {
    console.error("Failed to show confirm alert:", error);
    return false;
  }
}

export class Alert {
  static async confirm(options: AlertOptions): Promise<boolean> {
    return confirmAlert(options);
  }
}

// Toast notifications
export interface ToastOptions {
  title: string;
  message?: string;
  style?: "success" | "error" | "warning" | "info";
  duration?: number;
  primaryAction?: ToastAction;
  secondaryAction?: ToastAction;
}

export interface ToastAction {
  title: string;
  onAction: () => void | Promise<void>;
}

export async function showToast(options: ToastOptions): Promise<void> {
  await invoke("show_toast", { options });
}

export class Toast {
  static async show(options: ToastOptions): Promise<void> {
    return showToast(options);
  }

  static async success(title: string, message?: string): Promise<void> {
    await showToast({ title, message, style: "success" });
  }

  static async error(title: string, message?: string): Promise<void> {
    await showToast({ title, message, style: "error" });
  }

  static async warning(title: string, message?: string): Promise<void> {
    await showToast({ title, message, style: "warning" });
  }

  static async info(title: string, message?: string): Promise<void> {
    await showToast({ title, message, style: "info" });
  }
}

// HUD (Heads-Up Display)
export async function showHUD(message: string): Promise<void> {
  await invoke("show_hud", { message });
}
