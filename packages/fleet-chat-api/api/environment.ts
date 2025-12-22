/**
 * Environment API
 *
 * Provides access to environment information and settings
 */

import { invoke } from "@tauri-apps/api/core";

export interface Environment {
  supportsArguments: boolean;
  theme: "light" | "dark";
  launchContext: LaunchContext;
  source: "cli" | "hotkey" | "menu";
  version: string;
  buildNumber: string;
}

export interface LaunchContext {
  command?: string;
  arguments?: Record<string, string>;
}

// Environment singleton
export const environment: Environment = {
  supportsArguments: true,
  theme: "light", // This would be determined from system preferences
  launchContext: {},
  source: "menu",
  version: "1.0.0", // This would come from app configuration
  buildNumber: "1",
};

export async function getEnvironment(): Promise<Environment> {
  try {
    const env = await invoke<Environment>("get_environment");
    return env;
  } catch (error) {
    console.error("Failed to get environment:", error);
    return environment;
  }
}

export enum EnvironmentTheme {
  Light = "light",
  Dark = "dark",
}

export enum LaunchSource {
  CLI = "cli",
  Hotkey = "hotkey",
  Menu = "menu",
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

export async function resetPreferences(): Promise<void> {
  await invoke("reset_preferences");
}
