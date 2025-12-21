/**
 * Main API functions for Fleet Chat plugins
 *
 * Provides core functionality for navigation, system integration, and UI operations
 */

import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { getApplications } from "./applications.js";

// Enhanced Navigation system - re-export from navigation module
export {
  useNavigation,
  useNavigationState,
  useCurrentComponent,
  useCanGoBack,
  useCanGoForward,
  useNavigationListener,
  useBackAction,
  useNavigationDepth,
  navigationManager,
  navigationStore,
  push,
  pop,
  popToRoot,
  replace,
  clear,
  attachKeyboardNavigation,
  type NavigationContext,
  type NavigationState,
  type NavigationItem,
  type NavigationOptions,
} from "./navigation.js";

// System operations
export async function open(url: string): Promise<void> {
  try {
    await openUrl(url);
  } catch (error) {
    console.error("Failed to open URL:", error);
    throw error;
  }
}

export async function showInFileBrowser(path: string): Promise<void> {
  await invoke("show_in_file_browser", { path });
}

export async function showInFinder(path: string): Promise<void> {
  await invoke("show_in_finder", { path });
}

export async function closeMainWindow(): Promise<void> {
  await invoke("close_main_window");
}

export async function showHUD(message: string): Promise<void> {
  await invoke("show_hud", { message });
}

export async function clearSearchBar(): Promise<void> {
  await invoke("clear_search_bar");
}

export async function getSelectedText(): Promise<string> {
  return await invoke("get_selected_text");
}

// Toast notifications
export async function showToast(options: {
  title: string;
  message?: string;
  style?: "success" | "error" | "warning" | "info";
  duration?: number;
}): Promise<void> {
  await invoke("show_toast", { options });
}

export class Toast {
  static async show(options: Parameters<typeof showToast>[0]): Promise<void> {
    return showToast(options);
  }
}

// Command metadata
export async function updateCommandMetadata(metadata: Record<string, any>): Promise<void> {
  await invoke("update_command_metadata", { metadata });
}

// Preferences
export async function openCommandPreferences(): Promise<void> {
  await invoke("open_command_preferences");
}

export async function openExtensionPreferences(): Promise<void> {
  await invoke("open_extension_preferences");
}

// Launch types
export enum LaunchType {
  UserInitiated = "user-initiated",
  Background = "background",
  Scheduled = "scheduled",
}

// Export applications
export { getApplications };

// Export new APIs
export * from "./command.js";
export * from "./keyboard.js";
export * from "./window-management.js";
export * from "./form.js";
export * from "./action.js";
