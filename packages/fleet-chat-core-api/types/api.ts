/**
 * API Type Definitions
 *
 * Shared types for API modules
 */

// Clipboard types
export interface ClipboardContent {
  text?: string;
  image?: Uint8Array;
  html?: string;
}

// Filesystem types
export interface FileEntry {
  name: string;
  path: string;
  isDir: boolean;
  isFile: boolean;
  size?: number;
  modified?: Date;
}

// HTTP types
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export interface HttpRequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: string | FormData | unknown;
  timeout?: number;
}

export interface HttpResponse<T = unknown> {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: T;
}

// Environment types
export interface EnvironmentInfo {
  os: string;
  osVersion: string;
  arch: string;
  platform: string;
  tempDir: string;
}

// Application types
export interface Application {
  name: string;
  path: string;
  icon?: string;
}

// Plugin types
export interface PluginManifest {
  name: string;
  version: string;
  description?: string;
  author?: string;
  commands: PluginCommand[];
  permissions?: string[];
}

export interface PluginCommand {
  name: string;
  title: string;
  description?: string;
  mode: 'view' | 'no-view';
  keywords?: string[];
  preferences?: PluginPreference[];
}

export interface PluginPreference {
  name: string;
  type: 'textfield' | 'checkbox' | 'dropdown' | 'password';
  title?: string;
  description?: string;
  default?: unknown;
  required?: boolean;
  data?: string[];
}
