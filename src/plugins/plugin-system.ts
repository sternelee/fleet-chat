/**
 * Fleet Chat Plugin System
 *
 * A Raycast-compatible plugin system built on Tauri + Lit web components
 * Inspired by Vicinae architecture but adapted for web environment
 */

// Plugin Manifest Types
export interface PluginManifest {
  $schema?: string;
  icon: string;
  name: string;
  title: string;
  description: string;
  author?: string;
  license: "MIT" | "Apache-2.0" | "GPL-3.0";
  commands: PluginCommand[];
  preferences?: PluginPreference[];
  dependencies?: Record<string, string>;
  version: string;
  categories?: string[];
}

export interface PluginCommand {
  name: string;
  title: string;
  description?: string;
  mode: "view" | "no-view";
  arguments?: CommandArgument[];
  shortcut?: string;
  keywords?: string[];
  icon?: string;
}

export interface CommandArgument {
  name: string;
  required: boolean;
  type: "text" | "textarea" | "checkbox" | "dropdown";
  placeholder?: string;
  default?: string | boolean;
  options?: { name: string; value: string }[];
}

export interface PluginPreference {
  name: string;
  type: "textfield" | "checkbox" | "dropdown" | "password";
  required?: boolean;
  title: string;
  description?: string;
  default?: string | boolean;
  placeholder?: string;
  data?: string[]; // For dropdown options
  icon?: string;
}

// Plugin Runtime Types
export interface PluginContext {
  manifest: PluginManifest;
  commandName: string;
  supportPath: string;
  assetsPath: string;
  isDevelopment: boolean;
  theme: "light" | "dark";
  arguments?: Record<string, any>;
  preferences?: Record<string, any>;
}

export interface PluginAPI {
  // UI Components
  List: typeof import("./ui/components/fc-list").FCList;
  Grid: typeof import("./ui/components/fc-grid").FCGrid;
  Detail: typeof import("./ui/components/fc-detail").FCDetail;
  Form: typeof import("./ui/components/fc-form").FCForm;
  Action: typeof import("./ui/components/fc-action").FCAction;
  ActionPanel: typeof import("./ui/components/fc-action").FCActionPanel;

  // Navigation
  pop: () => void;
  push: (view: HTMLElement) => void;
  open: (url: string) => Promise<void>;
  closeMainWindow: () => Promise<void>;

  // System APIs
  showToast: (options: ToastOptions) => Promise<void>;
  showHUD: (message: string) => Promise<void>;
  getApplications: () => Promise<Application[]>;
  openApplication: (path: string) => Promise<void>;

  // Data Storage
  LocalStorage: typeof import("./storage/local-storage").FCLocalStorage;
  Cache: typeof import("./storage/cache").FCCache;

  // Clipboard
  Clipboard: typeof import("./system/clipboard").FCClipboard;

  // File System
  FileSystem: typeof import("./system/filesystem").FCFileSystem;
}

export interface ToastOptions {
  title: string;
  message?: string;
  style?: "success" | "failure" | "info";
  primaryAction?: {
    title: string;
    onAction: () => void | Promise<void>;
  };
  secondaryAction?: {
    title: string;
    onAction: () => void | Promise<void>;
  };
}

export interface Application {
  name: string;
  path: string;
  bundleId?: string;
}

// Plugin Interface
export interface Plugin {
  manifest: PluginManifest;
  initialize?(context: PluginContext, api: PluginAPI): Promise<void>;
  destroy?(): Promise<void>;
}

export interface ViewPlugin extends Plugin {
  createView(context: PluginContext, api: PluginAPI): Promise<HTMLElement>;
}

export interface NoViewPlugin extends Plugin {
  execute(context: PluginContext, api: PluginAPI): Promise<void>;
}

// Plugin Loader Types
export interface PluginLoadResult {
  plugin: Plugin;
  errors: string[];
}

export interface PluginWorker {
  id: string;
  worker: Worker;
  plugin: Plugin | null;
  pluginId?: string;
  status: "idle" | "loading" | "running" | "terminated" | "initialized";
  context?: PluginContext;
}

// Plugin Manager Types
export interface PluginManagerConfig {
  maxWorkers?: number;
  workerTimeout?: number;
  enableHotReload?: boolean;
  pluginPaths?: string[];
  securityPolicy?: SecurityPolicy;
}

export interface SecurityPolicy {
  allowedDomains?: string[];
  allowFileSystem?: boolean;
  allowNetwork?: boolean;
  maxMemoryUsage?: number; // in MB
}

// Event Types
export interface PluginEvent {
  type: string;
  pluginId: string;
  data?: any;
  timestamp: number;
}

export interface PluginEventListener {
  (event: PluginEvent): void;
}

// Plugin State Types
export interface PluginState {
  id: string;
  manifest: PluginManifest;
  status: "unloaded" | "loading" | "loaded" | "error";
  loadTime?: number;
  errors?: string[];
  lastUsed?: number;
  usageCount?: number;
  sourcePath?: string;
}

// Registry Types
export interface PluginRegistry {
  plugins: Map<string, PluginState>;
  commands: Map<string, { pluginId: string; command: PluginCommand }>;
  listeners: Map<string, PluginEventListener[]>;
}

// Export utility types
export type PluginComponent = HTMLElement & {
  updateProps?(props: any): void;
  onDestroy?(): void;
};

export type PluginRenderer = (component: PluginComponent) => void;

// Compatibility Types (Raycast API)
export interface RaycastAPI {
  List: any;
  Grid: any;
  Detail: any;
  Form: any;
  Action: any;
  ActionPanel: any;
  showToast: (options: ToastOptions) => Promise<void>;
  showHUD: (message: string) => Promise<void>;
  open: (url: string) => Promise<void>;
  closeMainWindow: () => Promise<void>;
  pop: () => void;
  push: (view: HTMLElement) => void;
  LocalStorage: any;
  Cache: any;
  Clipboard: any;
  environment: {
    supportsArguments: boolean;
    theme: "light" | "dark";
  };
}
