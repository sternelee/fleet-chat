/**
 * Fleet Chat Plugin API - Full Raycast Compatibility
 *
 * Complete API for Fleet Chat plugins providing 100% Raycast API compatibility
 * with Tauri integration for native system access and complete plugin system
 */

// Re-export everything from @raycast/api for full compatibility
export * from '@raycast/api'

// Re-export our Tauri-specific implementations
export { getApplications as tauriGetApplications } from './api/applications.js'
export type { Environment } from './api/environment.js'
export { showHUD, showToast } from './api/ui.js'
export type {
  ActionPanelItemProps,
  ActionProps,
  ListAccessory,
  ListAction,
  ListItemProps,
} from './components/index.js'
// UI Components - Enhanced Fleet Chat components
export {
  Action,
  ActionPanel,
  ActionPanelItem,
  ActionPanelSeparator,
  Detail,
  FCAction,
  FCActionPanel,
  FCActionPanelItem,
  FCActionSeparator,
  FCList,
  Grid,
  List,
} from './components/index.js'
// Examples and documentation
export {
  createExamplePlugin,
  exampleActionCommand,
  exampleDetailCommand,
  exampleHelloWorldCommand,
  helloWorldManifest,
  pluginDevelopmentGuide,
} from './examples/index.js'
// React Hooks compatibility
export * from './hooks/index.js'
// Plugin System - Core functionality
export { PluginManager } from './plugins/core/manager.js'
export type {
  Application,
  NoViewPlugin,
  Plugin,
  PluginAPI,
  PluginCommand,
  PluginContext,
  PluginLoadResult,
  PluginManagerConfig,
  PluginManifest,
  PluginState,
  PluginWorker,
  SecurityPolicy,
  ViewPlugin,
  WorkerMessage,
  WorkerResponse,
} from './plugins/core/types.js'
// Re-export types from raycast-api
export type {
  FormFieldProps,
  FormProps,
  MenuBarExtraItemProps,
  MenuBarExtraProps,
} from './raycast-api/index.js'
// Re-export Raycast API compatibility layer components
export {
  FCClipboard,
  FCFileSystem,
  Form,
  // System APIs from raycast-api
  getFrontmostApplication,
  getRunningApplications,
  // MenuBarExtra and Form
  MenuBarExtra,
  openApplication,
  // Enhanced utilities
  RaycastAPI,
  ReactAction,
  ReactActionPanel,
  ReactDetail,
  ReactForm,
  ReactGrid,
  // React-wrapped components
  ReactList,
  ReactMenuBarExtra,
} from './raycast-api/index.js'
export type {
  ComponentInstance,
  ReactElement,
  ReactNode,
} from './renderer/index.js'

// React-to-Lit Renderer - JSX compilation for plugins
export {
  createElement,
  Fragment,
  h,
  ReactToLitCompiler,
  reactToLitCompiler,
} from './renderer/index.js'
// Storage System - Unified storage with Tauri and browser fallbacks
export {
  BrowserCache,
  BrowserLocalStorage,
} from './storage/index.js'
// System APIs - Clipboard, filesystem, and system integration
export {
  Clipboard,
  FCClipboard,
  FCFileSystem,
  FileSystem,
} from './system/index.js'

// Export all Fleet Chat specific types
export type {
  ActionPanelProps,
  AIOptions,
  AlertOptions,
  CacheOptions,
  ColorLike,
  DetailProps,
  GridProps,
  IconLike,
  ImageLike,
  KeyboardShortcut,
  LaunchContext,
  ListProps,
  NavigationOptions,
  OAuthOptions,
  ToastOptions,
} from './types/index.js'
