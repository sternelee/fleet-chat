/**
 * Worker Entry Point
 *
 * This file is the entry point for plugin Web Workers.
 * It sets up the plugin environment and handles messages from the main thread.
 *
 * @ts-ignore - This file is loaded as a module worker
 */

import type { WorkerMessage, WorkerResponse, InitData, ExecuteData, RenderData } from './types.js';

/**
 * Plugin execution context
 */
interface PluginContext {
  manifest: PluginManifestData;
  api: Record<string, unknown>;
  module: any;
  state: Map<string, unknown>;
}

/**
 * Plugin manifest interface
 */
interface PluginManifestData {
  name: string;
  version: string;
  description?: string;
  author?: string;
  commands: PluginCommandData[];
  permissions?: string[];
  preferences?: PreferenceData[];
}

interface PluginCommandData {
  name: string;
  title: string;
  description?: string;
  mode: 'view' | 'no-view';
  keywords?: string[];
}

interface PreferenceData {
  name: string;
  type: 'textfield' | 'password' | 'checkbox' | 'dropdown';
  title: string;
  description?: string;
  required?: boolean;
  default?: string | boolean | number;
}

/**
 * Worker state
 */
let context: PluginContext | null = null;
let workerId: string | null = null;

/**
 * Console proxy that forwards console messages to main thread
 */
const createConsoleProxy = (type: 'log' | 'warn' | 'error' | 'info' | 'debug') => {
  return (...args: unknown[]) => {
    self.postMessage({
      type: 'console',
      data: { type, args: args.map(String) },
    } as any);
    // Also log in worker console for debugging
    console[type](...args);
  };
};

/**
 * Override console in worker scope
 */
self.console = {
  ...console,
  log: createConsoleProxy('log'),
  warn: createConsoleProxy('warn'),
  error: createConsoleProxy('error'),
  info: createConsoleProxy('info'),
  debug: createConsoleProxy('debug'),
};

/**
 * Handle messages from main thread
 */
self.onmessage = async (event: MessageEvent<WorkerMessage>): Promise<void> => {
  const { id, type, data } = event.data;

  try {
    let result: unknown;

    switch (type) {
      case 'init':
        result = await handleInit(data as InitData);
        break;

      case 'execute':
        result = await handleExecute(data as ExecuteData);
        break;

      case 'render':
        result = await handleRender(data as RenderData);
        break;

      case 'dispose':
        result = await handleDispose();
        break;

      case 'ping':
        result = 'pong';
        break;

      case 'setState':
        result = await handleSetState(data as { key: string; value: unknown });
        break;

      case 'getState':
        result = await handleGetState(data as { key: string });
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }

    self.postMessage({ id, result } satisfies WorkerResponse);
  } catch (error) {
    self.postMessage({
      id,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    } satisfies WorkerResponse);
  }
};

/**
 * Initialize the worker with plugin manifest and API
 */
async function handleInit(data: InitData): Promise<string> {
  const { manifest, api, code } = data as any;

  workerId = `worker-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  // Create plugin context
  context = {
    manifest,
    api: api || {},
    module: null,
    state: new Map(),
  };

  // Load plugin code if provided
  if (code) {
    await loadPluginCode(code);
  }

  console.log(`[Worker ${workerId}] Initialized plugin: ${manifest.name}`);

  return `initialized:${workerId}`;
}

/**
 * Load plugin code from string
 */
async function loadPluginCode(code: string | Record<string, string>): Promise<void> {
  if (!context) {
    throw new Error('Worker not initialized');
  }

  try {
    let codeToEvaluate: string;

    if (typeof code === 'string') {
      codeToEvaluate = code;
    } else {
      // Multiple files - find main entry point
      const mainFile = code['index.ts'] || code['index.js'] || code['plugin.js'] || code['plugin.ts'];
      if (!mainFile) {
        throw new Error('No main entry point found in plugin code');
      }
      codeToEvaluate = mainFile;
    }

    // Create a sandbox for plugin execution
    const sandbox = createSandbox(context.api);

    // Transform React/JSX to Lit if needed
    const transformedCode = await transformCode(codeToEvaluate);

    // Evaluate the plugin code in sandbox
    const module = evaluateInSandbox(transformedCode, sandbox);
    context.module = module;

    console.log('[Worker] Plugin code loaded successfully');
  } catch (error) {
    console.error('[Worker] Failed to load plugin code:', error);
    throw error;
  }
}

/**
 * Create a sandbox for plugin execution
 */
function createSandbox(api: Record<string, unknown>): Record<string, unknown> {
  // Core Fleet Chat API
  const sandbox: Record<string, unknown> = {
    // Components from @fleet-chat/core-api
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

    // System APIs
    Clipboard: api.Clipboard,
    FileSystem: api.FileSystem,
    Shell: api.Shell,
    HttpClient: api.HttpClient,
    Dialog: api.Dialog,
    Notification: api.Notification,
    Opener: api.Opener,
    Environment: api.Environment,

    // Applications
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
    console,
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
    fetch,
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

    // Export helper
    exports: {},
    module: { exports: {} },
  };

  return sandbox;
}

/**
 * Transform plugin code (React to Lit)
 */
async function transformCode(code: string): Promise<string> {
  // Check if code uses React JSX
  const hasReactImport = code.includes('from \'react\'') || code.includes('from "react"');
  const hasJSX = code.includes('<') && code.includes('>');

  if (hasReactImport || hasJSX) {
    // Simple React JSX to Lit transformation
    // In production, use a proper Babel/SWC transformation
    code = code
      // Convert React imports to Fleet Chat API
      .replace(/from ['"]@raycast\/api['"]/g, 'from \'@fleet-chat/core-api\'')
      .replace(/from ['"]react['"]/g, 'from \'@fleet-chat/core-api\'')

      // Convert JSX to html template literals (simplified)
      .replace(/<List>/g, 'html`<fc-list>')
      .replace(/<\/List>/g, '</fc-list>`')
      .replace(/<List\.Item/g, 'html`<fc-list-item')
      .replace(/<\/List\.Item>/g, '</fc-list-item>`')
      .replace(/<List\.Section/g, 'html`<fc-list-section')
      .replace(/<\/List\.Section>/g, '</fc-list-section>`')
      .replace(/<Grid>/g, 'html`<fc-grid>')
      .replace(/<\/Grid>/g, '</fc-grid>`')
      .replace(/<Grid\.Item/g, 'html`<fc-grid-item')
      .replace(/<\/Grid\.Item>/g, '</fc-grid-item>`')
      .replace(/<Detail/g, 'html`<fc-detail')
      .replace(/<\/Detail>/g, '</fc-detail>`')
      .replace(/<ActionPanel>/g, 'html`<fc-action-panel>')
      .replace(/<\/ActionPanel>/g, '</fc-action-panel>`')
      .replace(/<Action/g, 'html`<fc-action')
      .replace(/<\/Action>/g, '</fc-action>`')
      .replace(/<Form>/g, 'html`<fc-form>')
      .replace(/<\/Form>/g, '</fc-form>`')
      .replace(/<Form\.Field/g, 'html`<fc-form-field')
      .replace(/<\/Form\.Field>/g, '</fc-form-field>`')

      // Convert props format (simplified)
      .replace(/(\w+)=(\{[^}]*\})/g, '$1=$$2')

      // Add html import if using templates
      .replace(/^import/, "import { html } from 'lit';\nimport");
  }

  return code;
}

/**
 * Evaluate code in sandbox
 */
function evaluateInSandbox(code: string, sandbox: Record<string, unknown>): any {
  // Create function from code with sandbox as context
  const sandboxKeys = Object.keys(sandbox);
  const sandboxValues = Object.values(sandbox);

  try {
    // Wrap code in async function to support top-level await
    const wrappedCode = `
      (async function() {
        ${code}

        // Return default export or exports
        return typeof module !== 'undefined' ? module.exports : exports;
      })()
    `;

    // Create function with sandbox context
    const fn = new Function(...sandboxKeys, wrappedCode);
    const result = await fn(...sandboxValues);

    return result;
  } catch (error) {
    console.error('[Worker] Code evaluation failed:', error);
    throw error;
  }
}

/**
 * Execute a command
 */
async function handleExecute(data: ExecuteData): Promise<unknown> {
  if (!context) {
    throw new Error('Worker not initialized');
  }

  const { command, args = [] } = data;

  console.log(`[Worker ${workerId}] Executing command: ${command}`, args);

  // Try to execute command from plugin module
  if (context.module) {
    // Check if default export has the command
    const defaultExport = context.module.default || context.module;

    if (typeof defaultExport === 'function') {
      // Default export is the command function
      return await defaultExport(...args);
    }

    if (defaultExport && typeof defaultExport[command] === 'function') {
      // Command is a method on default export
      return await defaultExport[command](...args);
    }

    if (typeof context.module[command] === 'function') {
      // Command is a named export
      return await context.module[command](...args);
    }
  }

  // Try to execute from API
  if (command in context.api && typeof context.api[command] === 'function') {
    const fn = context.api[command] as (...args: unknown[]) => unknown;
    return await fn(...args);
  }

  throw new Error(`Command not found: ${command}`);
}

/**
 * Render a component
 */
async function handleRender(data: RenderData): Promise<unknown> {
  if (!context) {
    throw new Error('Worker not initialized');
  }

  const { component, props = {} } = data;

  console.log(`[Worker ${workerId}] Rendering component: ${component}`, props);

  // Get component from API or module
  let componentFn: any;

  if (context.module && context.module[component]) {
    componentFn = context.module[component];
  } else if (context.api[component]) {
    componentFn = context.api[component];
  } else {
    throw new Error(`Component not found: ${component}`);
  }

  // Render component
  if (typeof componentFn === 'function') {
    return await componentFn(props);
  }

  return componentFn;
}

/**
 * Set state value
 */
async function handleSetState(data: { key: string; value: unknown }): Promise<void> {
  if (!context) {
    throw new Error('Worker not initialized');
  }

  context.state.set(data.key, data.value);
  console.log(`[Worker ${workerId}] State updated: ${data.key}`);
}

/**
 * Get state value
 */
async function handleGetState(data: { key: string }): Promise<unknown> {
  if (!context) {
    throw new Error('Worker not initialized');
  }

  return context.state.get(data.key);
}

/**
 * Dispose the worker
 */
async function handleDispose(): Promise<string> {
  console.log(`[Worker ${workerId}] Disposing worker`);

  // Cleanup
  if (context) {
    // Call dispose on module if available
    if (context.module && typeof context.module.dispose === 'function') {
      try {
        await context.module.dispose();
      } catch (error) {
        console.error('[Worker] Module dispose error:', error);
      }
    }

    context.state.clear();
  }

  context = null;
  workerId = null;

  return 'disposed';
}

/**
 * Export worker types for external use
 */
export type { PluginContext, PluginManifestData, PluginCommandData, PreferenceData };
