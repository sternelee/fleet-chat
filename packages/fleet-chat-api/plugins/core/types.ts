/**
 * Fleet Chat Plugin System Types
 *
 * Complete type definitions for the Fleet Chat plugin system
 * providing 100% Raycast API compatibility
 */

// Re-export all base types from fleet-chat-api
export * from '../../types/index.js'

// Plugin Manifest Types
export interface PluginManifest {
  $schema?: string
  icon: string
  name: string
  title: string
  description: string
  author?: string
  license: 'MIT' | 'Apache-2.0' | 'GPL-3.0'
  commands: PluginCommand[]
  preferences?: PluginPreference[]
  dependencies?: Record<string, string>
  version: string
  categories?: string[]
}

export interface PluginCommand {
  name: string
  title: string
  description?: string
  mode: 'view' | 'no-view'
  arguments?: CommandArgument[]
  shortcut?: string
  keywords?: string[]
  icon?: string
}

export interface CommandArgument {
  name: string
  required: boolean
  type: 'text' | 'textarea' | 'checkbox' | 'dropdown'
  placeholder?: string
  default?: string | boolean
  options?: { name: string; value: string }[]
}

export interface PluginPreference {
  name: string
  type: 'textfield' | 'checkbox' | 'dropdown' | 'password'
  required?: boolean
  title: string
  description?: string
  default?: string | boolean
  placeholder?: string
  data?: string[] // For dropdown options
  icon?: string
}

// Plugin Runtime Types
export interface PluginContext {
  manifest: PluginManifest
  commandName: string
  supportPath: string
  assetsPath: string
  isDevelopment: boolean
  theme: 'light' | 'dark'
  arguments?: Record<string, any>
  preferences?: Record<string, any>
}

export interface PluginAPI {
  // UI Components - Raycast compatible
  List: any // typeof import("../components/List").List;
  Grid: any // typeof import("../components/Grid").Grid;
  Detail: any // typeof import("../components/Detail").Detail;
  Form: any // typeof import("../components/Form").Form;
  Action: any // typeof import("../components/Action").Action;
  ActionPanel: any // typeof import("../components/ActionPanel").ActionPanel;
  MenuBar: any // typeof import("../components/MenuBar").MenuBar;
  Dropdown: any // typeof import("../components/Dropdown").Dropdown;

  // Enhanced Navigation - from fleet-chat/api
  pop: () => Promise<void>
  push: (view: HTMLElement, options?: any) => Promise<void>
  replace: (view: HTMLElement, options?: any) => Promise<void>
  popToRoot: (type?: 'immediate' | 'animated') => Promise<void>
  clear: () => Promise<void>

  // System APIs - from fleet-chat/api
  showToast: (options: any) => Promise<void>
  showHUD: (message: string) => Promise<void>
  getApplications: () => Promise<any[]>
  openApplication: (path: string) => Promise<void>

  // Data Storage - from fleet-chat/api
  LocalStorage: any
  Cache: any

  // Environment - from fleet-chat/api
  environment: any

  // Clipboard - enhanced implementation
  Clipboard: any // typeof import("../system/clipboard").Clipboard;

  // File System - enhanced implementation
  FileSystem: any // typeof import("../system/filesystem").FileSystem;
}

// Plugin Interface
export interface Plugin {
  manifest: PluginManifest
  initialize?(context: PluginContext, api: PluginAPI): Promise<void>
  destroy?(): Promise<void>
}

export interface ViewPlugin extends Plugin {
  createView(context: PluginContext, api: PluginAPI): Promise<HTMLElement>
}

export interface NoViewPlugin extends Plugin {
  execute(context: PluginContext, api: PluginAPI): Promise<void>
}

// Plugin Loader Types
export interface PluginLoadResult {
  plugin: Plugin
  errors: string[]
}

export interface PluginWorker {
  id: string
  worker: Worker
  plugin: Plugin | null
  pluginId?: string
  status: 'idle' | 'loading' | 'running' | 'terminated' | 'initialized'
  context?: PluginContext
}

// Plugin Manager Types
export interface PluginManagerConfig {
  maxWorkers?: number
  workerTimeout?: number
  enableHotReload?: boolean
  pluginPaths?: string[]
  securityPolicy?: SecurityPolicy
}

export interface SecurityPolicy {
  allowedDomains?: string[]
  allowFileSystem?: boolean
  allowNetwork?: boolean
  maxMemoryUsage?: number // in MB
}

// Event Types
export interface PluginEvent {
  type: string
  pluginId: string
  data?: any
  timestamp: number
}

export type PluginEventListener = (event: PluginEvent) => void

// Plugin State Types
export interface PluginState {
  id: string
  manifest: PluginManifest
  status: 'unloaded' | 'loading' | 'loaded' | 'error'
  loadTime?: number
  errors?: string[]
  lastUsed?: number
  usageCount?: number
  sourcePath?: string
}

// Registry Types
export interface PluginRegistry {
  plugins: Map<string, PluginState>
  commands: Map<string, { pluginId: string; command: PluginCommand }>
  listeners: Map<string, PluginEventListener[]>
}

// Export utility types
export type PluginComponent = HTMLElement & {
  updateProps?(props: any): void
  onDestroy?(): void
}

export type PluginRenderer = (component: PluginComponent) => void

// Worker Message Types
export interface WorkerMessage {
  id: string
  type: 'init' | 'execute' | 'cleanup' | 'response' | 'error'
  data?: any
  error?: string
}

export interface WorkerResponse {
  id: string
  type: 'success' | 'error' | 'render'
  data?: any
  error?: string
}

// Plugin Package Types (.fcp files)
export interface PluginPackage {
  manifest: PluginManifest
  code: string
  assets?: Map<string, ArrayBuffer>
}

// Enhanced Application type with icon support
export interface Application {
  name: string
  path: string
  bundleId?: string
  icon_base64?: string
  icon_path?: string
}
