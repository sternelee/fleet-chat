/**
 * Security Sandbox
 *
 * Creates a sandboxed execution environment for plugins with security controls,
 * memory tracking, and API access management.
 */

import type { PluginManifestData } from '../worker/types.js';

export interface SandboxCapabilities {
  clipboard: boolean;
  filesystem: boolean;
  network: boolean;
  shell: boolean;
  notifications: boolean;
}

export interface SandboxConfig {
  capabilities: Partial<SandboxCapabilities>;
  allowedDomains?: string[];
  allowedPaths?: string[];
  maxMemory?: number; // MB
  timeout?: number; // ms
}

const defaultCapabilities: SandboxCapabilities = {
  clipboard: true,
  filesystem: false,
  network: true,
  shell: false,
  notifications: true,
};

/**
 * Memory tracker for monitoring plugin memory usage
 */
export class MemoryTracker {
  private allocations = new Map<string, number>();
  private total = 0;
  private maxMemory: number;

  constructor(maxMemory: number = 100) {
    // Convert MB to bytes
    this.maxMemory = maxMemory * 1024 * 1024;
  }

  /**
   * Track a memory allocation
   */
  track(key: string, size: number): void {
    const existing = this.allocations.get(key) ?? 0;
    this.allocations.set(key, size);
    this.total += size - existing;
  }

  /**
   * Release tracked memory
   */
  release(key: string): void {
    const size = this.allocations.get(key);
    if (size !== undefined) {
      this.total -= size;
      this.allocations.delete(key);
    }
  }

  /**
   * Get current memory usage in bytes
   */
  getUsage(): number {
    return this.total;
  }

  /**
   * Get current memory usage in MB
   */
  getUsageMB(): number {
    return this.total / (1024 * 1024);
  }

  /**
   * Check if memory limit is exceeded
   */
  isExceeded(): boolean {
    return this.total > this.maxMemory;
  }

  /**
   * Reset tracker
   */
  reset(): void {
    this.allocations.clear();
    this.total = 0;
  }
}

/**
 * Validate plugin code for security issues
 */
export function validateCode(code: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Dangerous patterns to detect
  const dangerousPatterns = [
    { pattern: /eval\s*\(/, name: 'eval() function' },
    { pattern: /Function\s*\(\s*['"]/, name: 'Function constructor' },
    { pattern: /document\.(write|writeln)/, name: 'document.write' },
    { pattern: /window\.location\s*=/, name: 'window.location assignment' },
    { pattern: /\.__proto__/, name: '__proto__ manipulation' },
    { pattern: /import\s*\(/, name: 'dynamic import()' },
  ];

  for (const { pattern, name } of dangerousPatterns) {
    if (pattern.test(code)) {
      errors.push(`Dangerous pattern detected: ${name}`);
    }
  }

  // Check for potential infinite loops
  const loopPatterns = [
    /while\s*\(\s*true\s*\)/,
    /for\s*\(\s*;\s*;\s*\)/,
    /do\s*\{[^}]*\}\s*while\s*\(\s*true\s*\)/,
  ];

  for (const pattern of loopPatterns) {
    if (pattern.test(code)) {
      errors.push(`Potential infinite loop detected`);
      break;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create secure console proxy
 */
export function createSecureConsole(onMessage: (type: string, args: string[]) => void): Console {
  const proxy = (...args: unknown[]) => args.map(arg => {
    if (typeof arg === 'object' && arg !== null) {
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  });

  return {
    log: (...args: unknown[]) => {
      onMessage('log', proxy(...args));
    },
    warn: (...args: unknown[]) => {
      onMessage('warn', proxy(...args));
    },
    error: (...args: unknown[]) => {
      onMessage('error', proxy(...args));
    },
    info: (...args: unknown[]) => {
      onMessage('info', proxy(...args));
    },
    debug: (...args: unknown[]) => {
      onMessage('debug', proxy(...args));
    },
  };
}

/**
 * Create secure fetch with domain restrictions
 */
export function createSecureFetch(
  allowedDomains: string[] = []
): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
  const isAllowed = (url: string): boolean => {
    if (allowedDomains.length === 0) return true; // No restrictions
    if (allowedDomains.includes('*')) return true;

    try {
      const hostname = new URL(url).hostname;
      return allowedDomains.some(domain => {
        // Support wildcard subdomains
        if (domain.startsWith('*.')) {
          const baseDomain = domain.slice(2);
          return hostname === baseDomain || hostname.endsWith('.' + baseDomain);
        }
        return hostname === domain;
      });
    } catch {
      return false;
    }
  };

  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    if (!isAllowed(url)) {
      throw new Error(`Domain not allowed: ${new URL(url).hostname}`);
    }

    return fetch(input, init);
  };
}

/**
 * Create a comprehensive sandbox for plugin execution
 */
export function createSandbox(
  manifest: PluginManifestData,
  api: Record<string, unknown>,
  config?: Partial<SandboxConfig>
): Record<string, unknown> {
  const capabilities = { ...defaultCapabilities, ...config?.capabilities };
  const permissions = manifest.permissions ?? [];
  const allowedDomains = config?.allowedDomains ?? [];
  const memoryTracker = new MemoryTracker(config?.maxMemory);

  // Core Fleet Chat API - always available
  const sandbox: Record<string, unknown> = {
    // UI Components
    List: api.List,
    ListItem: api.ListItem,
    ListSection: api.ListSection,
    ListAction: api.ListAction,
    Grid: api.Grid,
    GridItem: api.GridItem,
    Detail: api.Detail,
    Form: api.Form,
    FormField: api.FormField,
    Action: api.Action,
    ActionPanel: api.ActionPanel,
    ActionSeparator: api.ActionSeparator,
    Toast: api.Toast,
    ToastContainer: api.ToastContainer,
    Icon: api.Icon,
    IconSymbol: api.IconSymbol,
    IconImage: api.IconImage,
    IconText: api.IconText,
    Color: api.Color,
    MenuBarExtra: api.MenuBarExtra,
    MenuBarExtraItem: api.MenuBarExtraItem,

    // Functions
    showToast: api.showToast,
    showHUD: api.showHUD,
    alert: api.alert,
    confirm: api.confirm,
    showActionSheet: api.showActionSheet,

    // Hooks
    useState: api.useState,
    useEffect: api.useEffect,
    useCallback: api.useCallback,
    useMemo: api.useMemo,
    useRef: api.useRef,
    useNavigation: api.useNavigation,
    usePromise: api.usePromise,

    // Storage
    LocalStorage: api.LocalStorage,
    Cache: api.Cache,

    // Applications (always available)
    getFrontmostApplication: api.getFrontmostApplication,
    getRunningApplications: api.getRunningApplications,
    searchApplications: api.searchApplications,
    openApplication: api.openApplication,

    // Navigation
    push: api.push,
    pop: api.pop,

    // React (for JSX transformation)
    React: api.React || {},
    createElement: api.createElement,

    // Common globals
    Math,
    JSON,
    Date,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Map,
    Set,
    Promise,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    URL,
    URLSearchParams,
    atob,
    btoa,
    encodeURIComponent,
    decodeURIComponent,
    isNaN,
    isFinite,
    parseInt,
    parseFloat,

    // Export helpers
    exports: {},
    module: { exports: {} },

    // Memory tracker (internal)
    __memoryTracker__: memoryTracker,
  };

  // System APIs based on permissions

  // Clipboard
  if (capabilities.clipboard && hasPermission(permissions, 'clipboard')) {
    sandbox.Clipboard = api.Clipboard;
  }

  // Filesystem
  if (capabilities.filesystem && hasPermission(permissions, 'filesystem')) {
    sandbox.FileSystem = api.FileSystem;
  }

  // Network (fetch)
  if (capabilities.network && hasPermission(permissions, 'network')) {
    sandbox.fetch = createSecureFetch(allowedDomains);
    sandbox.HttpClient = api.HttpClient;
  }

  // Shell
  if (capabilities.shell && hasPermission(permissions, 'shell')) {
    sandbox.Shell = api.Shell;
  }

  // Notifications
  if (capabilities.notifications && hasPermission(permissions, 'notifications')) {
    sandbox.Notification = api.Notification;
  }

  // Dialog
  if (hasPermission(permissions, 'dialog')) {
    sandbox.Dialog = api.Dialog;
  }

  // Opener
  if (hasPermission(permissions, 'opener')) {
    sandbox.Opener = api.Opener;
  }

  // Environment
  sandbox.Environment = api.Environment;

  return sandbox;
}

/**
 * Wrap plugin code for execution in sandbox
 */
export function wrapPluginCode(code: string): string {
  return `
    (async function() {
      'use strict';

      // Plugin code
      ${code}

      // Return default export or exports
      return typeof module !== 'undefined' ? module.exports : exports;
    })()
  `;
}

/**
 * Create execution context from sandbox
 */
export function createExecutionContext(sandbox: Record<string, unknown>): {
  keys: string[];
  values: unknown[];
} {
  return {
    keys: Object.keys(sandbox),
    values: Object.values(sandbox),
  };
}

/**
 * Check if plugin has a specific permission
 */
function hasPermission(permissions: string[], permission: string): boolean {
  return permissions.includes(permission) || permissions.includes('*');
}

/**
 * Create clipboard sandbox (legacy, for backwards compatibility)
 */
function createClipboardSandbox() {
  return {
    readText: async () => {
      return '';
    },
    writeText: async (_text: string) => {
      // No-op in sandbox mode
    },
  };
}

/**
 * Create filesystem sandbox with path restrictions (legacy)
 */
function createFilesystemSandbox(allowedPaths?: string[]) {
  const allowed = new Set(allowedPaths ?? []);

  return {
    readText: async (path: string) => {
      if (allowed.size > 0 && !isPathAllowed(path, allowed)) {
        throw new Error(`Path not allowed: ${path}`);
      }
      return '';
    },
    writeText: async (_path: string, _content: string) => {
      // No-op in sandbox mode
    },
  };
}

/**
 * Create HTTP sandbox with domain restrictions (legacy)
 */
function createHttpSandbox(allowedDomains?: string[]) {
  const allowed = new Set(allowedDomains ?? ['*']);

  return {
    fetch: async (url: string) => {
      if (!isDomainAllowed(url, allowed)) {
        throw new Error(`Domain not allowed: ${new URL(url).hostname}`);
      }
      return {};
    },
  };
}

/**
 * Create shell sandbox (legacy)
 */
function createShellSandbox() {
  return {
    exec: async (_command: string) => {
      return '';
    },
  };
}

/**
 * Create notification sandbox (legacy)
 */
function createNotificationSandbox() {
  return {
    show: async (_options: { title: string; body: string }) => {
      // No-op in sandbox mode
    },
  };
}

/**
 * Check if path is in allowed list
 */
function isPathAllowed(path: string, allowed: Set<string>): boolean {
  if (allowed.has('*')) return true;
  for (const allowedPath of allowed) {
    if (path.startsWith(allowedPath)) return true;
  }
  return false;
}

/**
 * Check if domain is in allowed list
 */
function isDomainAllowed(url: string, allowed: Set<string>): boolean {
  if (allowed.has('*')) return true;
  try {
    const hostname = new URL(url).hostname;
    return allowed.has(hostname);
  } catch {
    return false;
  }
}
