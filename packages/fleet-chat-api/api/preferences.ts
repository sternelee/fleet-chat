/**
 * Preferences API
 *
 * Provides access to application preferences and settings
 */

import { invoke } from "@tauri-apps/api/core";

export interface PreferenceValue {
  type: "textfield" | "passwordfield" | "checkbox" | "dropdown";
  title: string;
  description?: string;
  default?: any;
  required?: boolean;
  data?: any; // for dropdown options
}

export interface Preferences {
  [key: string]: PreferenceValue;
}

export async function getPreferenceValues<T = Record<string, any>>(): Promise<T> {
  try {
    const preferences = await invoke<T>("get_preference_values");
    return preferences;
  } catch (error) {
    console.error("Failed to get preference values:", error);
    return {} as T;
  }
}

export async function setPreferenceValue(key: string, value: any): Promise<void> {
  await invoke("set_preference_value", { key, value });
}

export async function openCommandPreferences(): Promise<void> {
  await invoke("open_command_preferences");
}

export async function openExtensionPreferences(): Promise<void> {
  await invoke("open_extension_preferences");
}

export async function resetPreferences(): Promise<void> {
  await invoke("reset_preferences");
}

// Preference utilities
export class PreferenceManager {
  private namespace: string;

  constructor(namespace: string) {
    this.namespace = namespace;
  }

  async get<T = any>(key: string): Promise<T | undefined> {
    try {
      const value = await invoke<T | undefined>("get_preference_value", {
        namespace: this.namespace,
        key,
      });
      return value;
    } catch (error) {
      console.error(`Failed to get preference ${key}:`, error);
      return undefined;
    }
  }

  async set<T = any>(key: string, value: T): Promise<void> {
    await invoke("set_preference_value", {
      namespace: this.namespace,
      key,
      value,
    });
  }

  async remove(key: string): Promise<void> {
    await invoke("remove_preference_value", {
      namespace: this.namespace,
      key,
    });
  }

  async clear(): Promise<void> {
    await invoke("clear_namespace_preferences", {
      namespace: this.namespace,
    });
  }

  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== undefined;
  }
}

// Create default preference manager
export const preferences = new PreferenceManager("default");

