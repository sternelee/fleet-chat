/**
 * Fleet Chat Plugin System
 *
 * A Raycast-compatible plugin system built on Tauri + Lit web components
 * Inspired by Vicinae architecture but adapted for web environment
 *
 * This module defines the core plugin types locally.
 * TODO: Once @fleet-chat/plugin-runtime is built, these can be re-exported from there.
 */

// ============================================================================
// Plugin Manifest Types
// ============================================================================

export interface PluginManifestData {
  name: string
  version: string
  title?: string
  description?: string
  author?: string
  commands: PluginCommandData[]
  permissions?: string[]
  preferences?: PreferenceData[]
  icon?: string
  license?: string
  categories?: string[]
}

export interface PluginCommandData {
  name: string
  title: string
  description?: string
  mode: 'view' | 'no-view'
  keywords?: string[]
  preferences?: PreferenceData[]
}

export interface PreferenceData {
  name: string
  type: 'textfield' | 'password' | 'checkbox' | 'dropdown' | 'textarea'
  title: string
  description?: string
  required?: boolean
  default?: string | boolean | number
  placeholder?: string
  options?: Array<{ title: string; value: string }>
}

// ============================================================================
// Plugin Types
// ============================================================================

export interface Plugin {
  id?: string
  manifest: PluginManifestData
  state?: PluginState
  context?: PluginContext
  execute?: (command: string, args?: any[]) => Promise<any>
  dispose?: () => Promise<void>
  initialize?: (context: PluginContext, api: PluginAPI) => Promise<void> | void
}

export type PluginState = 'unloaded' | 'loading' | 'loaded' | 'running' | 'error' | 'disposed'

// Runtime plugin state with metadata
export interface PluginRuntimeState {
  id: string
  manifest: PluginManifestData
  status: PluginState
  sourcePath?: string
  loadTime?: number
  lastUsed?: number
  usageCount?: number
  errors?: string[]
  code?: { [key: string]: string }
}

export interface PluginContext {
  manifest: PluginManifestData
  api?: PluginAPI
  state?: Map<string, any>
  commandName?: string
  supportPath: string
  assetsPath: string
  isDevelopment: boolean
  theme: 'light' | 'dark'
  arguments: Record<string, any>
  preferences: Record<string, any>
}

export interface PluginWorker {
  id: string
  pluginId?: string
  status: 'idle' | 'running' | 'initialized' | 'error'
  plugin: Plugin | null
  context?: PluginContext
  worker: Worker
  postMessage(message: any): void
  terminate(): void
}

// ============================================================================
// Plugin API Types
// ============================================================================

export interface PluginAPI {
  // UI Components
  List?: any
  Grid?: any
  Detail?: any
  Form?: any
  Action?: any
  ActionPanel?: any
  MenuBarExtra?: any
  MenuBar?: any
  Dropdown?: any

  // Navigation
  push: (view: HTMLElement, options?: any) => Promise<void> | void
  pop: () => Promise<void> | void
  replace?: (view: HTMLElement, options?: any) => Promise<void> | void
  popToRoot?: (type?: 'immediate' | 'animated') => Promise<void> | void
  clear?: () => Promise<void> | void
  open: (url: string) => Promise<void>
  closeMainWindow: () => Promise<void>

  // System Functions
  showToast: (options: any) => Promise<void> | void
  showHUD: (message: string) => Promise<void> | void
  alert?: (options: any) => Promise<void>
  confirm?: (options: any) => Promise<boolean>

  // Application Management
  getApplications: () => Promise<any[]> | any[]
  getFrontmostApplication?: () => Promise<any>
  openApplication: (path: string) => Promise<void> | void

  // Data Storage
  LocalStorage?: any
  Cache?: any

  // Environment
  environment?: {
    supports?: boolean
    theme?: string
    launchContext?: any
    supportsArguments?: boolean
  }

  // System APIs
  Clipboard?: any
  FileSystem?: any
}

// ============================================================================
// Plugin Manager Types
// ============================================================================

export interface PluginManagerConfig {
  maxWorkers?: number
  workerTimeout?: number
  enableHotReload?: boolean
  pluginPaths?: string[]
  securityPolicy?: SecurityPolicy
  debug?: boolean
}

export interface SecurityPolicy {
  allowedDomains?: string[]
  allowFileSystem?: boolean
  allowNetwork?: boolean
  maxMemoryUsage?: number
}

export interface PluginRegistry {
  plugins: Map<string, PluginRuntimeState>
  commands: Map<string, { pluginId: string; command: PluginCommandData }>
  listeners: Map<string, any[]>
  loadedPlugins?: Set<string>
  failedPlugins?: Map<string, string>
}

// ============================================================================
// Plugin Load Result Types
// ============================================================================

export interface PluginLoadResult {
  success: boolean
  pluginId?: string
  error?: string
}

// ============================================================================
// Re-export commonly used types
// ============================================================================

export type { PluginManifestData as PluginManifest }
