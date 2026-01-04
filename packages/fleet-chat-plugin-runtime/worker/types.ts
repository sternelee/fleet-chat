/**
 * Worker Communication Types
 */

export type WorkerMessageType =
  | 'init'
  | 'execute'
  | 'render'
  | 'dispose'
  | 'ping'
  | 'setState'
  | 'getState'
  | 'console';

export interface WorkerMessage {
  id: number;
  type: WorkerMessageType;
  data: unknown;
}

export interface WorkerResponse {
  id: number;
  result?: unknown;
  error?: string;
  stack?: string;
}

export interface InitData {
  manifest: PluginManifestData;
  api: Record<string, unknown>;
  code?: string | Record<string, string>;
  workerId?: string;
}

export interface ExecuteData {
  command: string;
  args?: unknown[];
  props?: Record<string, unknown>;
}

export interface RenderData {
  component: string;
  props?: Record<string, unknown>;
}

export interface SetStateData {
  key: string;
  value: unknown;
}

export interface GetStateData {
  key: string;
}

export interface ConsoleData {
  type: 'log' | 'warn' | 'error' | 'info' | 'debug';
  args: string[];
}

export interface PluginManifestData {
  name: string;
  version: string;
  description?: string;
  author?: string;
  commands: PluginCommandData[];
  permissions?: string[];
  preferences?: PreferenceData[];
  icon?: string;
  license?: string;
  categories?: string[];
}

export interface PluginCommandData {
  name: string;
  title: string;
  description?: string;
  mode: 'view' | 'no-view';
  keywords?: string[];
  preferences?: PreferenceData[];
}

export interface PreferenceData {
  name: string;
  type: 'textfield' | 'password' | 'checkbox' | 'dropdown' | 'textarea';
  title: string;
  description?: string;
  required?: boolean;
  default?: string | boolean | number;
  placeholder?: string;
  options?: Array<{ title: string; value: string }>;
}

/**
 * Worker configuration
 */
export interface WorkerConfig {
  maxMemory?: number; // MB
  timeout?: number; // ms
  debug?: boolean;
  sandbox?: {
    allowedDomains?: string[];
    allowNetwork?: boolean;
    allowFileSystem?: boolean;
  };
}

/**
 * Worker state
 */
export interface WorkerState {
  id: string;
  status: 'initializing' | 'ready' | 'busy' | 'disposed' | 'error';
  manifest?: PluginManifestData;
  lastActivity: number;
  memoryUsage?: number;
}

/**
 * Plugin execution result
 */
export interface ExecutionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  component?: string; // Serialized component
  duration?: number;
}
