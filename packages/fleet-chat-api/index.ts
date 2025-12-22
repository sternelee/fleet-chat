/**
 * Fleet Chat Plugin API - Full Raycast Compatibility
 *
 * Complete API for Fleet Chat plugins providing 100% Raycast API compatibility
 * with Tauri integration for native system access and complete plugin system
 */

// Re-export everything from @raycast/api for full compatibility
export * from '@raycast/api';

// Re-export our Tauri-specific implementations
export { LocalStorage, Cache, preferences } from './api/storage.js';
export { getApplications as tauriGetApplications, getFrontmostApplication, getRunningApplications } from './api/applications.js';
export { showToast, showHUD } from './api/ui.js';
export { environment } from './api/environment.js';
export type { Environment } from './api/environment.js';

// React Hooks compatibility
export * from './hooks/index.js';

// Plugin System - Core functionality
export { PluginManager } from './plugins/core/manager.js';
export type {
  PluginManifest,
  PluginCommand,
  PluginContext,
  PluginAPI,
  Plugin,
  ViewPlugin,
  NoViewPlugin,
  PluginState,
  PluginManagerConfig,
  SecurityPolicy,
  Application,
  PluginLoadResult,
  PluginWorker,
  WorkerMessage,
  WorkerResponse
} from './plugins/core/types.js';

// UI Components - Enhanced Fleet Chat components
export {
  FCList, FCAction, FCActionPanel, FCActionSeparator, FCActionPanelItem,
  List, Action, ActionPanel, ActionPanelItem, ActionPanelSeparator,
  Detail, Grid
} from './components/index.js';

export type {
  ListItemProps,
  ListAccessory,
  ListAction,
  ActionProps,
  ActionPanelItemProps
} from './components/index.js';

// Storage System - Unified storage with Tauri and browser fallbacks
export {
  BrowserLocalStorage,
  BrowserCache
} from './storage/index.js';

// System APIs - Clipboard, filesystem, and system integration
export {
  Clipboard,
  FileSystem,
  FCClipboard,
  FCFileSystem
} from './system/index.js';

// React-to-Lit Renderer - JSX compilation for plugins
export {
  ReactToLitCompiler,
  createElement,
  h,
  Fragment,
  reactToLitCompiler
} from './renderer/index.js';

export type {
  ReactElement,
  ReactNode,
  ComponentInstance
} from './renderer/index.js';

// Examples and documentation
export {
  helloWorldManifest,
  exampleHelloWorldCommand,
  exampleDetailCommand,
  exampleActionCommand,
  pluginDevelopmentGuide,
  createExamplePlugin
} from './examples/index.js';

// Export all Fleet Chat specific types
export type {
  LaunchContext,
  ToastOptions,
  ActionPanelProps,
  ListProps,
  GridProps,
  DetailProps,
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
