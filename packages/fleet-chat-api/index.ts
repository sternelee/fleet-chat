/**
 * Fleet Chat Plugin API
 *
 * Core API for Fleet Chat plugins providing Raycast-compatible functionality
 * with Tauri integration for native system access
 */

// UI Components
export { default as List } from './components/List.js';
export { default as Grid } from './components/Grid.js';
export { default as Detail } from './components/Detail.js';

// API Functions
export {
  showToast,
  showHUD,
  getApplications,
  open,
  closeMainWindow,
  useNavigation,
  pop,
  push,
  clearSearchBar,
  getSelectedText,
  popToRoot,
  updateCommandMetadata
} from './api/index.js';

// Data Storage
export { LocalStorage, Cache, getPreferenceValues } from './api/storage.js';
export { openCommandPreferences, openExtensionPreferences } from './api/preferences.js';

// Environment
export { environment } from './api/environment.js';
export type { Environment } from './api/environment.js';

// UI Utilities
export {
  Image,
  Icon,
  Color,
  Keyboard,
  Toast,
  confirmAlert,
  Alert
} from './api/ui.js';

// Hooks - Simple implementations for compatibility
export function useState<T>(initialValue: T): [T, (value: T) => void] {
  let value = initialValue;
  return [value, (newValue: T) => { value = newValue; }];
}

export function useEffect(_effect: () => void | (() => void), _deps?: any[]): void {
  // Simple effect implementation
}

export function useCallback<T extends (...args: any[]) => any>(callback: T, _deps?: any[]): T {
  return callback;
}

// Advanced Features
export { AI } from './api/ai.js';
export { OAuth } from './api/oauth.js';

// Type exports
export type {
  LaunchContext,
  ToastOptions,
  ActionPanelProps,
  ListProps,
  GridProps,
  DetailProps,
  Application,
  ImageLike,
  IconLike,
  ColorLike,
  KeyboardShortcut,
  NavigationOptions,
  CacheOptions,
  AlertOptions,
  OAuthOptions,
  AIOptions
} from './types/index.js';
