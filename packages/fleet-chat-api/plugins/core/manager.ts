/**
 * Fleet Chat Plugin Manager
 *
 * Core plugin system management adapted for fleet-chat-api package
 * Handles plugin loading, lifecycle, and execution with Web Worker isolation
 */

import type {
  Plugin,
  PluginManifest,
  PluginManagerConfig,
  PluginState,
  PluginRegistry,
  PluginContext,
  PluginWorker,
  PluginAPI,
} from './types.js';

// Event emitter implementation for non-Node environments
class EventEmitter {
  private events: Map<string, Array<(data?: any) => void>> = new Map();

  on(event: string, listener: (data?: any) => void): this {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(listener);
    return this;
  }

  emit(event: string, data?: any): boolean {
    const listeners = this.events.get(event);
    if (!listeners) return false;

    listeners.forEach(listener => listener(data));
    return true;
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
    return this;
  }
}

export class PluginManager extends EventEmitter {
  private config: Required<PluginManagerConfig>;
  private registry: PluginRegistry;
  private workers: Map<string, PluginWorker>;
  private workerPool: PluginWorker[] = [];
  private api!: PluginAPI;
  private initialized = false;

  constructor(config: PluginManagerConfig = {}) {
    super();

    this.config = {
      maxWorkers: config.maxWorkers ?? 5,
      workerTimeout: config.workerTimeout ?? 10000,
      enableHotReload: config.enableHotReload ?? false,
      pluginPaths: config.pluginPaths ?? [],
      securityPolicy: config.securityPolicy ?? {
        allowedDomains: [],
        allowFileSystem: true,
        allowNetwork: true,
        maxMemoryUsage: 100,
      },
    };

    this.registry = {
      plugins: new Map(),
      commands: new Map(),
      listeners: new Map(),
    };

    this.workers = new Map();
    this.initializeAPI();
  }

  /**
   * Initialize the plugin manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load built-in plugins
      await this.loadBuiltinPlugins();

      // Load packaged plugins using PluginLoader
      try {
        const { PluginLoader } = await import('../loader/plugin-loader.js');
        const pluginLoader = new PluginLoader(this);
        await pluginLoader.loadAllPlugins();
      } catch (error) {
        console.warn("PluginLoader not available, skipping packaged plugins:", error);
      }

      // Scan and load external plugins
      if (this.config.pluginPaths.length > 0) {
        await this.scanPlugins();
      }

      this.initialized = true;
      this.emit("initialized");
    } catch (error) {
      console.error("Failed to initialize PluginManager:", error);
      throw error;
    }
  }

  /**
   * Load a plugin from a manifest
   */
  async loadPlugin(manifest: PluginManifest, sourcePath: string): Promise<void> {
    const pluginId = manifest.name;

    // Check if plugin already exists
    if (this.registry.plugins.has(pluginId)) {
      throw new Error(`Plugin ${pluginId} already loaded`);
    }

    // Validate manifest
    this.validateManifest(manifest);

    // Create plugin state
    const state: PluginState = {
      id: pluginId,
      manifest,
      status: "loading",
      sourcePath,
    };

    this.registry.plugins.set(pluginId, state);

    try {
      // Load plugin module
      const plugin = await this.loadPluginModule(sourcePath, manifest);

      // Register commands
      this.registerCommands(pluginId, manifest.commands);

      // Update state
      state.status = "loaded";
      state.loadTime = Date.now();

      // Initialize plugin if needed
      if (plugin.initialize) {
        const context = this.createPluginContext(pluginId, manifest);
        await plugin.initialize(context, this.api);
      }

      this.emit("pluginLoaded", { pluginId, manifest });
    } catch (error) {
      state.status = "error";
      state.errors = [error instanceof Error ? error.message : String(error)];

      this.emit("pluginError", { pluginId, error });
      throw error;
    }
  }

  /**
   * Execute a plugin command
   */
  async executeCommand(
    pluginId: string,
    commandName: string,
    commandArgs?: Record<string, any>,
  ): Promise<HTMLElement | void> {
    const pluginState = this.registry.plugins.get(pluginId);
    if (!pluginState) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (pluginState.status !== "loaded") {
      throw new Error(`Plugin ${pluginId} is not loaded`);
    }

    const command = pluginState.manifest.commands.find((cmd) => cmd.name === commandName);
    if (!command) {
      throw new Error(`Command ${commandName} not found in plugin ${pluginId}`);
    }

    // Update usage stats
    pluginState.lastUsed = Date.now();
    pluginState.usageCount = (pluginState.usageCount || 0) + 1;

    // For now, execute in main thread (Web Worker integration to be added)
    const context = this.createPluginContext(
      pluginId,
      pluginState.manifest,
      commandName,
      commandArgs,
    );

    try {
      // Load and execute plugin code
      const plugin = await this.loadPluginModule(pluginState.sourcePath!, pluginState.manifest);

      if (command.mode === "view") {
        if ('createView' in plugin) {
          return await (plugin as any).createView(context, this.api);
        }
        // Fallback for simple function exports
        const commandFunction = await this.loadCommandFunction(pluginState.sourcePath!, commandName);
        return await commandFunction(context);
      } else {
        if ('execute' in plugin) {
          await (plugin as any).execute(context, this.api);
        } else {
          // Fallback for simple function exports
          const commandFunction = await this.loadCommandFunction(pluginState.sourcePath!, commandName);
          await commandFunction(context);
        }
      }
    } catch (error) {
      console.error(`Failed to execute command ${commandName}:`, error);
      throw error;
    }
  }

  /**
   * Load command function from plugin module
   */
  private async loadCommandFunction(sourcePath: string, commandName: string): Promise<Function> {
    try {
      // Dynamic import of plugin module
      const module = await import(sourcePath);
      const commandFunction = module[commandName];

      if (!commandFunction || typeof commandFunction !== 'function') {
        throw new Error(`Command function ${commandName} not found or not a function`);
      }

      return commandFunction;
    } catch (error) {
      console.error(`Failed to load command function ${commandName}:`, error);
      throw error;
    }
  }

  
  /**
   * Load plugin module from source
   */
  private async loadPluginModule(sourcePath: string, manifest: PluginManifest): Promise<Plugin> {
    try {
      // Dynamic import of plugin module
      const module = await import(sourcePath);

      // Check if module exports a default plugin
      if (module.default && typeof module.default === 'object') {
        return module.default as Plugin;
      }

      // Create a plugin wrapper for function-based plugins
      const plugin: Plugin = {
        manifest,
        async initialize(context: PluginContext, api: PluginAPI) {
          console.log(`Plugin ${manifest.name} initialized`);
        },
      };

      return plugin;
    } catch (error) {
      console.error(`Failed to load plugin module from ${sourcePath}:`, error);

      // Return a fallback plugin
      const fallbackPlugin: Plugin = {
        manifest,
        async initialize(context: PluginContext, api: PluginAPI) {
          console.log(`Fallback plugin ${manifest.name} initialized`);
        },
      };

      return fallbackPlugin;
    }
  }

  /**
   * Validate plugin manifest
   */
  private validateManifest(manifest: PluginManifest): void {
    if (!manifest.name || !manifest.title || !manifest.description) {
      throw new Error("Plugin manifest missing required fields");
    }

    if (!manifest.commands || manifest.commands.length === 0) {
      throw new Error("Plugin must have at least one command");
    }

    if (manifest.commands.length > 100) {
      throw new Error("Plugin cannot have more than 100 commands");
    }

    // Validate each command
    manifest.commands.forEach((command, index) => {
      if (!command.name || !command.title) {
        throw new Error(`Command ${index} missing required fields`);
      }

      if (!["view", "no-view"].includes(command.mode)) {
        throw new Error(`Command ${command.name} has invalid mode`);
      }
    });
  }

  /**
   * Register plugin commands
   */
  private registerCommands(pluginId: string, commands: any[]): void {
    commands.forEach((command) => {
      const key = `${pluginId}/${command.name}`;
      this.registry.commands.set(key, { pluginId, command });
    });
  }

  /**
   * Create plugin context
   */
  private createPluginContext(
    pluginId: string,
    manifest: PluginManifest,
    commandName?: string,
    commandArgs?: Record<string, any>,
  ): PluginContext {
    return {
      manifest,
      commandName: commandName || "",
      supportPath: `/plugins/${pluginId}/support`,
      assetsPath: `/plugins/${pluginId}/assets`,
      isDevelopment: typeof process !== 'undefined' && process.env?.NODE_ENV === "development",
      theme: "dark", // Could be dynamic based on app theme
      arguments: commandArgs || {},
      preferences: {}, // Would load from storage
    };
  }

  /**
   * Initialize the API object with fleet-chat-api implementations
   */
  private initializeAPI(): void {
    // Create API object with simplified implementations for now
    this.api = {
      // UI Components - simplified implementations
      List: {} as any,
      Grid: {} as any,
      Detail: {} as any,
      Form: {} as any,
      Action: {} as any,
      ActionPanel: {} as any,
      MenuBar: {} as any,
      Dropdown: {} as any,

      // Navigation - placeholder implementations
      pop: async () => console.log('Navigation.pop called'),
      push: async (view: HTMLElement, options?: any) => console.log('Navigation.push called'),
      replace: async (view: HTMLElement, options?: any) => console.log('Navigation.replace called'),
      popToRoot: async (type?: "immediate" | "animated") => console.log('Navigation.popToRoot called'),
      clear: async () => console.log('Navigation.clear called'),

      // System APIs - placeholder implementations
      showToast: async (options: any) => console.log('showToast called with:', options),
      showHUD: async (message: string) => console.log('showHUD called with:', message),
      getApplications: async () => [],
      openApplication: async (path: string) => console.log('openApplication called with:', path),

      // Data Storage - placeholder implementations
      LocalStorage: {} as any,
      Cache: {} as any,

      // Environment - placeholder implementation
      environment: { supports: true, theme: "dark" as const },

      // Clipboard - placeholder
      Clipboard: {} as any,

      // File System - placeholder
      FileSystem: {} as any,
    };
  }

  /**
   * Load built-in plugins
   */
  private async loadBuiltinPlugins(): Promise<void> {
    // Load built-in plugins from a predefined list
    const builtinPlugins: Array<{ manifest: PluginManifest; path: string }> = [
      // Add built-in plugins here
    ];

    for (const plugin of builtinPlugins) {
      try {
        await this.loadPlugin(plugin.manifest, plugin.path);
      } catch (error) {
        console.error("Failed to load built-in plugin:", error);
      }
    }
  }

  /**
   * Scan for plugins in configured paths
   */
  private async scanPlugins(): Promise<void> {
    // Scan for plugins in configured paths
    for (const path of this.config.pluginPaths) {
      try {
        // In a real implementation, this would scan the directory for plugins
        console.log(`Scanning for plugins in: ${path}`);
      } catch (error) {
        console.error(`Failed to scan plugins in ${path}:`, error);
      }
    }
  }

  /**
   * Get list of available commands
   */
  getAvailableCommands(): Array<{ key: string; pluginId: string; command: any }> {
    const commands: Array<{ key: string; pluginId: string; command: any }> = [];

    this.registry.commands.forEach((value, key) => {
      commands.push({ key, ...value });
    });

    return commands;
  }

  /**
   * Get plugin state
   */
  getPluginState(pluginId: string): PluginState | undefined {
    return this.registry.plugins.get(pluginId);
  }

  /**
   * Register a plugin from a package
   */
  async registerPlugin(plugin: Plugin): Promise<void> {
    const pluginId = (plugin as any).id || plugin.manifest.name;

    // Check if plugin already exists
    if (this.registry.plugins.has(pluginId)) {
      console.warn(`Plugin ${pluginId} is already registered`);
      return;
    }

    // Create plugin state
    const state: PluginState = {
      id: pluginId,
      manifest: plugin.manifest,
      status: "loaded",
      loadTime: Date.now(),
      usageCount: 0,
    };

    // Store plugin code if available
    if ((plugin as any).code) {
      (state as any).code = (plugin as any).code;
    }

    this.registry.plugins.set(pluginId, state);

    // Register commands
    if (plugin.manifest.commands) {
      this.registerCommands(pluginId, plugin.manifest.commands);
    }

    // Initialize plugin if it has an initialize method
    if (plugin.initialize) {
      const context = this.createPluginContext(pluginId, plugin.manifest);
      try {
        await plugin.initialize(context, this.api);
      } catch (error) {
        console.error(`Failed to initialize plugin ${pluginId}:`, error);
        state.status = "error";
        state.errors = [error instanceof Error ? error.message : String(error)];
        throw error;
      }
    }

    this.emit("pluginRegistered", { pluginId, plugin });
  }

  /**
   * Unregister a plugin
   */
  async unregisterPlugin(pluginId: string): Promise<void> {
    const state = this.registry.plugins.get(pluginId);
    if (!state) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    // Remove commands
    const commandsToRemove: string[] = [];
    this.registry.commands.forEach((value, key) => {
      if (value.pluginId === pluginId) {
        commandsToRemove.push(key);
      }
    });

    commandsToRemove.forEach((key) => {
      this.registry.commands.delete(key);
    });

    // Remove from registry
    this.registry.plugins.delete(pluginId);

    this.emit("pluginUnregistered", { pluginId });
  }

  /**
   * Get the registry
   */
  getRegistry(): PluginRegistry {
    return this.registry;
  }

  /**
   * Shutdown the plugin manager
   */
  async shutdown(): Promise<void> {
    // Terminate all workers
    for (const worker of this.workers.values()) {
      if (worker.worker && typeof worker.worker.terminate === 'function') {
        worker.worker.terminate();
      }
    }

    this.workers.clear();
    this.workerPool.length = 0;

    this.emit("shutdown");
  }
}
