/**
 * Type definitions for Fleet Chat API
 */

// Basic type definitions for Fleet Chat API
export interface LaunchContext {
  command: string;
  arguments?: Record<string, any>;
}

export interface PreferenceValues {
  [key: string]: any;
}

export interface ToastOptions {
  title: string;
  message?: string;
  style?: "success" | "error" | "warning" | "info";
  duration?: number;
}

export interface ActionPanelProps {
  children?: any;
}

export interface ListProps {
  children?: any;
}

export interface GridProps {
  children?: any;
}

export interface DetailProps {
  markdown?: string;
  children?: any;
}

export interface FormProps {
  children?: any;
}

export interface Application {
  name: string;
  bundleId?: string;
  path?: string;
  icon?: string;
}

export interface ImageLike {
  source: string;
}

export interface IconLike {
  source: string;
}

export interface ColorLike {
  light: string;
  dark?: string;
}

export interface KeyboardShortcut {
  key: string;
  modifiers?: KeyModifier[];
}

export interface NavigationOptions {
  keepHistory?: boolean;
}

export interface CacheOptions {
  ttl?: number;
}

export interface AlertOptions {
  title: string;
  message?: string;
  primaryAction?: string;
  secondaryAction?: string;
}

export interface OAuthOptions {
  clientId: string;
  scopes?: string[];
  redirectUri?: string;
}

export interface AIOptions {
  provider?: string;
  model?: string;
  apiKey?: string;
}

export type KeyModifier = "cmd" | "ctrl" | "alt" | "shift" | "meta";

// Additional types for Fleet Chat specific features
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  icon?: string;
  commands: PluginCommand[];
  permissions: string[];
  dependencies?: string[];
  categories?: string[];
  keywords?: string[];
}

export interface PluginCommand {
  name: string;
  title: string;
  description?: string;
  mode: "view" | "no-view";
  keywords?: string[];
  preferences?: PluginPreferences;
  arguments?: PluginArgument[];
}

export interface PluginArgument {
  name: string;
  type: "text" | "number" | "boolean" | "file" | "directory";
  required?: boolean;
  description?: string;
  default?: any;
}

export interface PluginPreferences {
  [key: string]: {
    type: "textfield" | "passwordfield" | "checkbox" | "dropdown";
    title: string;
    description?: string;
    default?: any;
    required?: boolean;
    data?: any;
  };
}

export interface ExtensionInfo {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  status: "loading" | "loaded" | "running" | "error";
  commands: PluginCommand[];
  lastUsed: Date;
  error?: string;
}

export interface FileSystemEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  modified?: Date;
  created?: Date;
}

export interface ClipboardContent {
  text?: string;
  file?: string;
  html?: string;
}

export interface ToastAction {
  title: string;
  onAction: () => void | Promise<void>;
}

export interface WindowManagementOptions {
  title?: string;
  width?: number;
  height?: number;
  resizable?: boolean;
  alwaysOnTop?: boolean;
  skipTaskbar?: boolean;
}

export interface SystemInfo {
  platform: string;
  arch: string;
  version: string;
  memory: {
    total: number;
    available: number;
    used: number;
  };
  cpu: {
    usage: number;
    cores: number;
  };
}

export interface NetworkInfo {
  connected: boolean;
  ssid?: string;
  signalStrength?: number;
  interface?: string;
}

export interface SearchOptions {
  query: string;
  limit?: number;
  offset?: number;
  type?: "all" | "files" | "apps" | "plugins";
  sortBy?: "relevance" | "date" | "name";
  order?: "asc" | "desc";
}

export interface SearchResult {
  id: string;
  type: "file" | "application" | "plugin" | "command";
  title: string;
  subtitle?: string;
  path?: string;
  icon?: string;
  score: number;
  metadata?: Record<string, any>;
}

export interface CommandPaletteOptions {
  placeholder?: string;
  history?: boolean;
  fuzzy?: boolean;
  maxResults?: number;
  providers?: string[];
}

export interface Theme {
  name: string;
  colors: {
    background: string;
    foreground: string;
    accent: string;
    border: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  fonts: {
    primary: string;
    monospace: string;
  };
  sizes: {
    small: number;
    medium: number;
    large: number;
  };
}

export interface KeyboardShortcut {
  key: string;
  modifiers?: KeyModifier[];
  action: string;
  description?: string;
}

export interface MenuItem {
  title: string;
  icon?: string;
  shortcut?: string;
  action?: () => void;
  submenu?: MenuItem[];
}

export interface ContextMenuOptions {
  items: MenuItem[];
  x?: number;
  y?: number;
}

export interface NotificationOptions {
  title: string;
  body?: string;
  icon?: string;
  sound?: boolean;
  timeout?: number;
  actions?: Array<{
    title: string;
    action: () => void;
  }>;
}

export interface EventSubscription {
  id: string;
  event: string;
  handler: (...args: any[]) => void;
  once?: boolean;
}

export interface PerformanceMetrics {
  memoryUsage: number;
  cpuUsage: number;
  renderTime: number;
  pluginLoadTime: number;
  searchTime: number;
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Event types
export interface PluginEvent {
  type: "loaded" | "unloaded" | "error" | "command-executed";
  pluginId: string;
  data?: any;
}

export interface UIEvent {
  type: "theme-changed" | "resize" | "focus" | "blur";
  data?: any;
}

// Error types
export interface FleetError {
  code: string;
  message: string;
  details?: any;
  stack?: string;
}

export interface PluginError extends FleetError {
  pluginId: string;
  command?: string;
}

// Configuration types
export interface AppConfig {
  plugins: {
    directory: string;
    autoLoad: boolean;
    permissions: Record<string, string[]>;
  };
  ui: {
    theme: "light" | "dark" | "auto";
    fontSize: "small" | "medium" | "large";
    language: string;
  };
  privacy: {
    analytics: boolean;
    crashReporting: boolean;
    usageData: boolean;
  };
  advanced: {
    developerMode: boolean;
    debugMode: boolean;
    experimentalFeatures: boolean;
  };
}

