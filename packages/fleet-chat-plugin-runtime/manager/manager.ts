/**
 * Plugin Manager
 *
 * Manages plugin lifecycle: load, unload, execute, reload, and worker pool management
 */

import { PluginWorker } from '../worker/worker.js';
import { PluginLoader, type PluginSource } from '../loader/loader.js';
import { validateCode, type SandboxConfig } from '../sandbox/sandbox.js';
import type { PluginManifestData, WorkerConfig, ExecutionResult } from '../worker/types.js';

export interface PluginInfo {
  id: string;
  manifest: PluginManifestData;
  path: string;
  status: 'loading' | 'loaded' | 'starting' | 'running' | 'stopped' | 'unloaded' | 'error';
  worker?: PluginWorker;
  error?: string;
  loadedAt?: number;
  lastActivity?: number;
  code?: string | Record<string, string>;
}

export interface PluginLoadOptions {
  autoStart?: boolean;
  permissions?: string[];
  api?: Record<string, unknown>;
  sandbox?: Partial<SandboxConfig>;
  worker?: Partial<WorkerConfig>;
}

export interface PluginExecutionContext {
  manifest: PluginManifestData;
  api: Record<string, unknown>;
}

export interface PluginManagerConfig {
  maxPlugins?: number;
  maxWorkers?: number;
  defaultTimeout?: number;
  defaultMemory?: number;
  autoCleanup?: boolean;
  cleanupInterval?: number;
  debug?: boolean;
}

export class PluginManager {
  private plugins = new Map<string, PluginInfo>();
  private defaultApi: Record<string, unknown> = {};
  private config: Required<PluginManagerConfig>;
  private cleanupTimer?: ReturnType<typeof setInterval>;

  constructor(
    api?: Record<string, unknown>,
    config?: Partial<PluginManagerConfig>
  ) {
    this.defaultApi = api ?? {};
    this.config = {
      maxPlugins: config?.maxPlugins ?? 50,
      maxWorkers: config?.maxWorkers ?? 10,
      defaultTimeout: config?.defaultTimeout ?? 30000,
      defaultMemory: config?.defaultMemory ?? 100,
      autoCleanup: config?.autoCleanup ?? true,
      cleanupInterval: config?.cleanupInterval ?? 60000,
      debug: config?.debug ?? false,
    };

    // Start auto cleanup if enabled
    if (this.config.autoCleanup) {
      this.startCleanup();
    }
  }

  /**
   * Load a plugin from path
   */
  async load(pluginPath: string, options?: PluginLoadOptions): Promise<string> {
    return this.loadPlugin(pluginPath, 'directory', options);
  }

  /**
   * Load plugin from source
   */
  async loadFrom(source: string | PluginSource, options?: PluginLoadOptions): Promise<string> {
    let sourceType: 'directory' | 'package' | 'url' | 'code';
    let sourcePath: string;

    if (typeof source === 'string') {
      if (source.startsWith('http://') || source.startsWith('https://')) {
        sourceType = 'url';
      } else if (source.endsWith('.fcp')) {
        sourceType = 'package';
      } else {
        sourceType = 'directory';
      }
      sourcePath = source;
    } else {
      sourceType = source.type;
      sourcePath = source.path ?? source.url ?? '';
    }

    return this.loadPlugin(sourcePath, sourceType, options);
  }

  /**
   * Internal plugin loading
   */
  private async loadPlugin(
    sourcePath: string,
    sourceType: 'directory' | 'package' | 'url' | 'code',
    options?: PluginLoadOptions
  ): Promise<string> {
    // Check max plugins limit
    if (this.plugins.size >= this.config.maxPlugins) {
      throw new Error(`Maximum plugins limit reached: ${this.config.maxPlugins}`);
    }

    // Load plugin based on source type
    let result;
    switch (sourceType) {
      case 'directory':
        result = await PluginLoader.loadFromDirectory(sourcePath);
        break;
      case 'package':
        result = await PluginLoader.loadFromPackage(sourcePath);
        break;
      case 'url':
        result = await PluginLoader.loadFromUrl(sourcePath);
        break;
      case 'code':
        result = await PluginLoader.loadFromCode(sourcePath, options?.api ?? {});
        break;
      default:
        throw new Error(`Unknown source type: ${sourceType}`);
    }

    if (!result.success) {
      throw new Error(`Failed to load plugin: ${result.error}`);
    }

    const pluginId = `${result.manifest.data.name}@${result.manifest.data.version}`;

    // Check if plugin already loaded
    if (this.plugins.has(pluginId)) {
      if (this.config.debug) {
        console.log(`[PluginManager] Plugin already loaded: ${pluginId}`);
      }
      return pluginId;
    }

    const pluginInfo: PluginInfo = {
      id: pluginId,
      manifest: result.manifest.data,
      path: sourcePath,
      status: 'loading',
      code: result.code,
      loadedAt: Date.now(),
      lastActivity: Date.now(),
    };

    this.plugins.set(pluginId, pluginInfo);

    // Initialize worker if autoStart is enabled
    if (options?.autoStart ?? true) {
      await this.start(pluginId, options);
    } else {
      pluginInfo.status = 'loaded';
    }

    if (this.config.debug) {
      console.log(`[PluginManager] Plugin loaded: ${pluginId}`);
    }

    return pluginId;
  }

  /**
   * Start a plugin worker
   */
  async start(pluginId: string, options?: PluginLoadOptions): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    // Check max workers limit
    const activeWorkers = Array.from(this.plugins.values()).filter(
      p => p.worker && p.status !== 'stopped'
    ).length;

    if (activeWorkers >= this.config.maxWorkers) {
      throw new Error(`Maximum workers limit reached: ${this.config.maxWorkers}`);
    }

    plugin.status = 'starting';

    try {
      // Create worker config
      const workerConfig: WorkerConfig = {
        timeout: options?.worker?.timeout ?? this.config.defaultTimeout,
        maxMemory: options?.worker?.maxMemory ?? this.config.defaultMemory,
        debug: this.config.debug,
        sandbox: {
          allowedDomains: options?.sandbox?.allowedDomains,
          allowNetwork: options?.sandbox?.capabilities?.network ?? true,
          allowFileSystem: options?.sandbox?.capabilities?.filesystem ?? false,
        },
      };

      // Create worker
      const worker = new PluginWorker('', workerConfig);
      plugin.worker = worker;

      // Set up console listener
      worker.onConsole((type, args) => {
        if (this.config.debug) {
          console.log(`[Plugin ${pluginId}] ${type}:`, ...args);
        }
      });

      // Initialize worker with manifest, API, and code
      const api = options?.api ?? this.defaultApi;
      await worker.init(plugin.manifest, api, plugin.code);

      plugin.status = 'running';
      plugin.lastActivity = Date.now();

      if (this.config.debug) {
        console.log(`[PluginManager] Plugin started: ${pluginId}`);
      }
    } catch (error) {
      plugin.status = 'error';
      plugin.error = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  /**
   * Stop a plugin worker
   */
  async stop(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    if (plugin.worker) {
      await plugin.worker.dispose();
      plugin.worker = undefined;
    }

    plugin.status = 'stopped';
    plugin.lastActivity = Date.now();

    if (this.config.debug) {
      console.log(`[PluginManager] Plugin stopped: ${pluginId}`);
    }
  }

  /**
   * Unload a plugin
   */
  async unload(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    // Stop worker first
    if (plugin.worker) {
      await plugin.worker.dispose();
    }

    plugin.status = 'unloaded';
    this.plugins.delete(pluginId);

    if (this.config.debug) {
      console.log(`[PluginManager] Plugin unloaded: ${pluginId}`);
    }
  }

  /**
   * Execute a plugin command
   */
  async execute(pluginId: string, command: string, args: unknown[] = []): Promise<ExecutionResult> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return {
        success: false,
        error: `Plugin not found: ${pluginId}`,
      };
    }

    if (plugin.status !== 'running') {
      return {
        success: false,
        error: `Plugin not running: ${pluginId} (status: ${plugin.status})`,
      };
    }

    if (!plugin.worker) {
      return {
        success: false,
        error: `Plugin worker not available: ${pluginId}`,
      };
    }

    plugin.lastActivity = Date.now();

    try {
      const result = await plugin.worker.execute(command, args);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Render a plugin component
   */
  async render(pluginId: string, component: string, props: Record<string, unknown> = {}): Promise<ExecutionResult> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return {
        success: false,
        error: `Plugin not found: ${pluginId}`,
      };
    }

    if (plugin.status !== 'running') {
      return {
        success: false,
        error: `Plugin not running: ${pluginId} (status: ${plugin.status})`,
      };
    }

    if (!plugin.worker) {
      return {
        success: false,
        error: `Plugin worker not available: ${pluginId}`,
      };
    }

    plugin.lastActivity = Date.now();

    try {
      return await plugin.worker.render(component, props);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Reload a plugin
   */
  async reload(pluginId: string, options?: PluginLoadOptions): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    const path = plugin.path;
    const code = plugin.code;

    // Unload first
    await this.unload(pluginId);

    // Reload with same options
    if (code) {
      await this.loadFromCode(code, plugin.manifest, options);
    } else {
      await this.load(path, options);
    }
  }

  /**
   * Load plugin from code
   */
  async loadFromCode(
    code: string,
    manifest: PluginManifestData,
    options?: PluginLoadOptions
  ): Promise<string> {
    // Validate code
    const validation = validateCode(code);
    if (!validation.valid) {
      throw new Error(`Code validation failed: ${validation.errors.join(', ')}`);
    }

    // Check max plugins limit
    if (this.plugins.size >= this.config.maxPlugins) {
      throw new Error(`Maximum plugins limit reached: ${this.config.maxPlugins}`);
    }

    const pluginId = `${manifest.name}@${manifest.version}`;

    // Check if plugin already loaded
    if (this.plugins.has(pluginId)) {
      if (this.config.debug) {
        console.log(`[PluginManager] Plugin already loaded: ${pluginId}`);
      }
      return pluginId;
    }

    const pluginInfo: PluginInfo = {
      id: pluginId,
      manifest,
      path: `code:${pluginId}`,
      status: 'loading',
      code,
      loadedAt: Date.now(),
      lastActivity: Date.now(),
    };

    this.plugins.set(pluginId, pluginInfo);

    // Initialize worker if autoStart is enabled
    if (options?.autoStart ?? true) {
      await this.start(pluginId, options);
    } else {
      pluginInfo.status = 'loaded';
    }

    if (this.config.debug) {
      console.log(`[PluginManager] Plugin loaded from code: ${pluginId}`);
    }

    return pluginId;
  }

  /**
   * Get plugin info
   */
  getPlugin(pluginId: string): PluginInfo | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Get all plugins
   */
  getAllPlugins(): PluginInfo[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugins by status
   */
  getPluginsByStatus(status: PluginInfo['status']): PluginInfo[] {
    return this.getAllPlugins().filter((p) => p.status === status);
  }

  /**
   * Find plugin by name
   */
  findByName(name: string, version?: string): PluginInfo | undefined {
    return Array.from(this.plugins.values()).find(p => {
      if (p.manifest.name === name) {
        if (version && p.manifest.version !== version) {
          return false;
        }
        return true;
      }
      return false;
    });
  }

  /**
   * Unload all plugins
   */
  async unloadAll(): Promise<void> {
    const pluginIds = Array.from(this.plugins.keys());
    await Promise.all(pluginIds.map(id => this.unload(id)));
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    running: number;
    stopped: number;
    error: number;
    loading: number;
    loaded: number;
  } {
    const plugins = Array.from(this.plugins.values());
    return {
      total: plugins.length,
      running: plugins.filter(p => p.status === 'running').length,
      stopped: plugins.filter(p => p.status === 'stopped').length,
      error: plugins.filter(p => p.status === 'error').length,
      loading: plugins.filter(p => p.status === 'loading' || p.status === 'starting').length,
      loaded: plugins.filter(p => p.status === 'loaded').length,
    };
  }

  /**
   * Start automatic cleanup of stale plugins
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupStalePlugins();
    }, this.config.cleanupInterval);
  }

  /**
   * Stop automatic cleanup
   */
  private stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Clean up stale plugins (no activity for 2x cleanup interval)
   */
  private cleanupStalePlugins(): void {
    const now = Date.now();
    const staleThreshold = this.config.cleanupInterval * 2;

    for (const [pluginId, plugin] of this.plugins.entries()) {
      if (
        plugin.lastActivity &&
        (now - plugin.lastActivity) > staleThreshold &&
        plugin.status === 'running'
      ) {
        if (this.config.debug) {
          console.log(`[PluginManager] Cleaning up stale plugin: ${pluginId}`);
        }
        this.stop(pluginId).catch(err => {
          console.error(`[PluginManager] Error stopping stale plugin:`, err);
        });
      }
    }
  }

  /**
   * Dispose the plugin manager
   */
  async dispose(): Promise<void> {
    this.stopCleanup();
    await this.unloadAll();
  }

  /**
   * Set default API for plugins
   */
  setDefaultApi(api: Record<string, unknown>): void {
    this.defaultApi = api;
  }

  /**
   * Get default API
   */
  getDefaultApi(): Record<string, unknown> {
    return { ...this.defaultApi };
  }
}
