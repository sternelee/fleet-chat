/**
 * Plugin Manager - Core plugin system management
 * Handles plugin loading, lifecycle, and execution
 */

import { EventEmitter } from "events";
import type {
  Plugin,
  PluginManifest,
  PluginManagerConfig,
  PluginState,
  PluginRegistry,
  PluginContext,
  PluginWorker,
  PluginAPI,
} from "../../packages/fleet-chat-api/plugins/core/types.js";

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
      const { PluginLoader } = await import('./plugin-loader');
      const pluginLoader = new PluginLoader(this);
      await pluginLoader.loadAllPlugins();

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

    // Acquire worker
    const worker = await this.acquireWorker();

    try {
      // Initialize worker if needed
      await this.initializeWorker(worker);

      // Load plugin in worker if not already loaded
      await this.loadPluginInWorker(worker, pluginId, pluginState);

      const context = this.createPluginContext(
        pluginId,
        pluginState.manifest,
        commandName,
        commandArgs,
      );

      // Set worker context
      worker.context = context;
      worker.status = "running";
      worker.pluginId = pluginId; // Track which plugin is loaded

      // Execute command
      if (command.mode === "view") {
        return this.executeViewCommand(worker, pluginId, commandName, context);
      } else {
        return this.executeNoViewCommand(worker, pluginId, commandName, context);
      }
    } finally {
      // Return worker to pool
      this.returnWorker(worker);
    }
  }

  /**
   * Execute a view command (returns HTMLElement)
   */
  private async executeViewCommand(
    worker: PluginWorker,
    pluginId: string,
    commandName: string,
    context: PluginContext,
  ): Promise<HTMLElement> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Command execution timeout: ${pluginId}/${commandName}`));
      }, this.config.workerTimeout);

      // Create a unique flag for this execution
      const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Listen for view creation
      const messageHandler = (event: MessageEvent) => {
        const { type, data } = event.data;

        console.log(`[PluginManager] Execution ${executionId} - Worker message: ${type}`, data);

        if (type === "viewCreated" && data.executionId === executionId) {
          clearTimeout(timeout);
          worker.worker.removeEventListener("message", messageHandler);

          // Handle serialized HTMLElement from worker
          let element = data.view;
          if (element && element.type === "html-element") {
            // Reconstruct HTMLElement in main thread
            const container = document.createElement(element.tagName);
            container.innerHTML = element.html;
            if (element.style) {
              container.style.cssText = element.style;
            }
            element = container.firstChild || container;
          }

          resolve(element);
        } else if (type === "error" && data.executionId === executionId) {
          clearTimeout(timeout);
          worker.worker.removeEventListener("message", messageHandler);
          reject(new Error(data.error));
        }
      };

      worker.worker.addEventListener("message", messageHandler);

      // Send execution request
      worker.worker.postMessage({
        type: "execute",
        data: {
          pluginId,
          commandName,
          context,
          mode: "view",
          executionId,
        },
      });
    });
  }

  /**
   * Execute a no-view command
   */
  private async executeNoViewCommand(
    worker: PluginWorker,
    pluginId: string,
    commandName: string,
    context: PluginContext,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Command execution timeout: ${pluginId}/${commandName}`));
      }, this.config.workerTimeout);

      const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const messageHandler = (event: MessageEvent) => {
        const { type, data } = event.data;

        if (type === "noViewCompleted" && data.executionId === executionId) {
          clearTimeout(timeout);
          worker.worker.removeEventListener("message", messageHandler);
          resolve();
        } else if (type === "error" && data.executionId === executionId) {
          clearTimeout(timeout);
          worker.worker.removeEventListener("message", messageHandler);
          reject(new Error(data.error));
        }
      };

      worker.worker.addEventListener("message", messageHandler);

      // Send execution request
      worker.worker.postMessage({
        type: "execute",
        data: {
          pluginId,
          commandName,
          context,
          mode: "no-view",
          executionId,
        },
      });
    });
  }

  /**
   * Acquire a worker from pool or create new one
   */
  private async acquireWorker(): Promise<PluginWorker> {
    const available = this.workerPool.pop();
    if (available) {
      return available;
    }

    // Create new worker if under limit
    if (this.workers.size < this.config.maxWorkers) {
      return this.createWorker();
    }

    // Wait for available worker
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const available = this.workerPool.pop();
        if (available) {
          clearInterval(checkInterval);
          resolve(available);
        }
      }, 100);
    });
  }

  /**
   * Return worker to pool
   */
  private returnWorker(worker: PluginWorker): void {
    // Reset worker state but don't terminate it for better performance
    worker.status = "idle";
    worker.plugin = null;
    worker.context = undefined;

    // Add back to pool
    this.workerPool.push(worker);
  }

  /**
   * Create a new plugin worker
   */
  private createWorker(): PluginWorker {
    const workerId = `worker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`[PluginManager] Creating worker: ${workerId}`);

    try {
      const worker = new Worker("/workers/plugin-worker.js", { type: "module" });
      console.log(`[PluginManager] Worker created successfully: ${workerId}`);

      const pluginWorker: PluginWorker = {
        id: workerId,
        worker,
        plugin: null,
        status: "idle",
      };

      this.workers.set(workerId, pluginWorker);

      // Set up enhanced worker message handling
      worker.addEventListener("message", (event) => {
        console.log(`[PluginManager] Worker ${workerId} received message:`, event.data);
        this.handleEnhancedWorkerMessage(pluginWorker, event);
      });

      worker.addEventListener("error", (error) => {
        console.error(`[PluginManager] Worker ${workerId} error:`, error);
      });

      return pluginWorker;
    } catch (error) {
      console.error(`[PluginManager] Failed to create worker:`, error);
      throw error;
    }
  }

  /**
   * Handle messages from plugin workers
   */
  private handleWorkerMessage(worker: PluginWorker, event: MessageEvent): void {
    const { type, data } = event.data;

    switch (type) {
      case "ready":
        // Worker is ready to receive commands
        break;

      case "log":
        // Forward worker logs
        console.log(`[Plugin Worker ${worker.id}]`, data.message);
        break;

      case "error":
        // Handle worker errors
        console.error(`[Plugin Worker ${worker.id}] Error:`, data.error);
        this.emit("workerError", { workerId: worker.id, error: data.error });
        break;
    }
  }

  /**
   * Handle messages from enhanced plugin workers
   */
  private handleEnhancedWorkerMessage(worker: PluginWorker, event: MessageEvent): void {
    const { type, data } = event.data;

    switch (type) {
      case "ready":
        // Enhanced worker is ready to receive commands
        console.log(`[Enhanced Worker ${worker.id}] Ready`);
        break;

      case "viewCreated":
        // Handle React component rendering
        this.handleViewCreated(worker, data);
        break;

      case "commandCompleted":
        // Handle no-view command completion
        this.handleCommandCompleted(worker, data);
        break;

      case "event":
        // Handle events from worker
        this.handleWorkerEvent(worker, data);
        break;

      case "apiCall":
        // Handle API calls from worker
        this.handleWorkerAPICall(worker, data);
        break;

      case "log":
        // Forward worker logs
        console.log(`[Enhanced Worker ${worker.id}]`, data.message);
        break;

      case "error":
        // Handle worker errors
        console.error(`[Enhanced Worker ${worker.id}] Error:`, data.error);
        this.emit("workerError", { workerId: worker.id, error: data.error });
        break;

      default:
        // Handle other messages
        this.handleWorkerMessage(worker, event);
        break;
    }
  }

  /**
   * Handle view creation from enhanced worker
   */
  private handleViewCreated(worker: PluginWorker, data: any): void {
    console.log(`View created in worker ${worker.id}:`, data.component);

    // Create HTML element from serialized component
    const viewElement = this.createViewElement(data.component, data.html, data.styles);

    // Resolve any pending promises waiting for this view
    const pendingPromises = (worker as any).pendingPromises || new Map();
    const resolve = pendingPromises.get("view");
    if (resolve) {
      resolve(viewElement);
      pendingPromises.delete("view");
    }
  }

  /**
   * Handle command completion
   */
  private handleCommandCompleted(worker: PluginWorker, data: any): void {
    console.log(`Command completed in worker ${worker.id}:`, data);

    // Resolve any pending promises
    const pendingPromises = (worker as any).pendingPromises || new Map();
    const resolve = pendingPromises.get("command");
    if (resolve) {
      resolve();
      pendingPromises.delete("command");
    }
  }

  /**
   * Handle events from worker
   */
  private handleWorkerEvent(worker: PluginWorker, eventData: any): void {
    console.log(`Event from worker ${worker.id}:`, eventData);

    // Emit event for application to handle
    this.emit("workerEvent", { workerId: worker.id, eventData });
  }

  /**
   * Handle API calls from worker
   */
  private async handleWorkerAPICall(worker: PluginWorker, data: any): Promise<void> {
    try {
      const { messageId, method, data: callData } = data;
      let result;

      switch (method) {
        case "pop":
          result = this.api.pop();
          break;

        case "push":
          result = this.api.push(callData.view);
          break;

        case "open":
          result = await this.api.open(callData.url);
          break;

        case "closeMainWindow":
          result = await this.api.closeMainWindow();
          break;

        case "showToast":
          result = await this.api.showToast(callData.options);
          break;

        case "showHUD":
          result = await this.api.showHUD(callData.message);
          break;

        case "getApplications":
          result = await this.api.getApplications();
          break;

        case "openApplication":
          result = await this.api.openApplication(callData.path);
          break;

        case "storageOperation":
          result = await this.handleStorageOperation(callData);
          break;

        case "clipboardOperation":
          result = await this.handleClipboardOperation(callData);
          break;

        default:
          throw new Error(`Unknown API method: ${method}`);
      }

      // Send response back to worker
      worker.worker.postMessage({
        type: "apiResponse",
        data: {
          messageId,
          result,
          error: null,
        },
      });
    } catch (error) {
      console.error("API call error:", error);

      // Send error response
      worker.worker.postMessage({
        type: "apiResponse",
        data: {
          messageId: data.messageId,
          result: null,
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  /**
   * Create view element from serialized component
   */
  private createViewElement(serializedComponent: any, html: string, styles: string[]): HTMLElement {
    // Create container element
    const container = document.createElement("div");
    container.className = "plugin-view-container";

    // Add styles
    if (styles && styles.length > 0) {
      const styleElement = document.createElement("style");
      styleElement.textContent = styles.join("\n");
      container.appendChild(styleElement);
    }

    // Add HTML content
    const contentElement = document.createElement("div");
    contentElement.innerHTML = html;
    container.appendChild(contentElement);

    // Set up event listeners
    this.setupViewElementEventListeners(container, serializedComponent);

    return container;
  }

  /**
   * Initialize worker with API context
   */
  private async initializeWorker(worker: PluginWorker): Promise<void> {
    if (worker.status === "initialized") {
      console.log(`[PluginManager] Worker ${worker.id} already initialized`);
      return;
    }

    console.log(`[PluginManager] Initializing worker: ${worker.id}`);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        worker.worker.removeEventListener("message", messageHandler);
        reject(new Error(`Worker initialization timeout: ${worker.id}`));
      }, 5000);

      const messageHandler = (event: MessageEvent) => {
        const { type, data } = event.data;

        console.log(`[PluginManager] Initialization response from ${worker.id}: ${type}`);

        if (type === "initialized") {
          clearTimeout(timeout);
          worker.worker.removeEventListener("message", messageHandler);
          worker.status = "initialized";
          console.log(`[PluginManager] Worker ${worker.id} initialized successfully`);
          resolve();
        } else if (type === "error") {
          clearTimeout(timeout);
          worker.worker.removeEventListener("message", messageHandler);
          reject(new Error(data.error));
        }
      };

      worker.worker.addEventListener("message", messageHandler);

      // Send initialization message (don't pass complex API objects)
      const initMessage = {
        type: "initialize",
        data: {
          initialized: true,
          timestamp: Date.now(),
        },
      };

      console.log(`[PluginManager] Sending initialization message to ${worker.id}:`, initMessage);
      worker.worker.postMessage(initMessage);
    });
  }

  /**
   * Load plugin in worker
   */
  private async loadPluginInWorker(
    worker: PluginWorker,
    pluginId: string,
    pluginState: PluginState,
  ): Promise<void> {
    // Skip if plugin is already loaded in this worker
    if (worker.pluginId === pluginId) {
      return;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        worker.worker.removeEventListener("message", messageHandler);
        reject(new Error(`Plugin loading timeout: ${pluginId}`));
      }, 10000);

      const messageHandler = (event: MessageEvent) => {
        const { type, data } = event.data;

        if (type === "pluginLoaded") {
          clearTimeout(timeout);
          worker.worker.removeEventListener("message", messageHandler);
          resolve();
        } else if (type === "error") {
          clearTimeout(timeout);
          worker.worker.removeEventListener("message", messageHandler);
          reject(new Error(data.error));
        }
      };

      worker.worker.addEventListener("message", messageHandler);

      // Send plugin loading message with plugin code
      const pluginCode = (pluginState as any).code;
      worker.worker.postMessage({
        type: "loadPlugin",
        data: {
          pluginId,
          sourcePath: pluginState.sourcePath || "",
          manifest: pluginState.manifest,
          code: pluginCode,
        },
      });
    });
  }

  /**
   * Set up event listeners for view element
   */
  private setupViewElementEventListeners(element: HTMLElement, component: any): void {
    // Add click event listeners to buttons and interactive elements
    const interactiveElements = element.querySelectorAll("button, [onclick], [data-action]");

    interactiveElements.forEach((el, index) => {
      const domElement = el as HTMLElement;

      domElement.addEventListener("click", (event) => {
        console.log("Plugin view element clicked:", domElement);

        // Check if element has data-action attribute
        const action = domElement.getAttribute("data-action");
        if (action) {
          this.emit("pluginAction", { action, element: domElement });
        }
      });
    });
  }

  /**
   * Handle storage operations
   */
  private async handleStorageOperation(data: any): Promise<any> {
    const { storageType, operation, args } = data;

    // Use the integration API's storage implementation
    if (this.api && this.api[storageType as keyof PluginAPI]) {
      const storage = this.api[storageType as keyof PluginAPI] as any;
      return storage[operation](...args);
    }

    throw new Error(`Storage ${storageType} not available`);
  }

  /**
   * Handle clipboard operations
   */
  private async handleClipboardOperation(data: any): Promise<any> {
    const { operation, args } = data;

    // Use the integration API's clipboard implementation
    if (this.api && this.api.Clipboard) {
      const clipboard = this.api.Clipboard as any;
      return clipboard[operation](...args);
    }

    throw new Error(`Clipboard not available`);
  }

  /**
   * Load plugin module from source
   */
  private async loadPluginModule(sourcePath: string, manifest: PluginManifest): Promise<Plugin> {
    // Create a basic plugin object
    // The actual plugin execution will be handled by the worker
    const plugin: Plugin = {
      manifest,
      async initialize(context: PluginContext, api: PluginAPI) {
        console.log(`Plugin ${manifest.name} initialized`);
      },
    };

    return plugin;
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
      isDevelopment: process.env.NODE_ENV === "development",
      theme: "dark", // Could be dynamic based on app theme
      arguments: commandArgs || {},
      preferences: {}, // Would load from storage
    };
  }

  /**
   * Initialize the API object
   */
  private initializeAPI(): void {
    // This would be replaced with actual implementations
    this.api = {
      // UI Components - these would be actual Lit component constructors
      List: {} as any,
      Grid: {} as any,
      Detail: {} as any,
      Form: {} as any,
      Action: {} as any,
      ActionPanel: {} as any,

      // Navigation
      pop: () => {
        /* implementation */
      },
      push: (view: HTMLElement) => {
        /* implementation */
      },
      open: async (url: string) => {
        /* implementation */
      },
      closeMainWindow: async () => {
        /* implementation */
      },

      // System APIs
      showToast: async (options: any) => {
        /* implementation */
      },
      showHUD: async (message: string) => {
        /* implementation */
      },
      getApplications: async () => [], // implementation
      openApplication: async (path: string) => {
        /* implementation */
      },

      // Data Storage
      LocalStorage: {} as any,
      Cache: {} as any,

      // Clipboard
      Clipboard: {} as any,

      // File System
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
    const pluginId = plugin.id || plugin.manifest.name;

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
      sourcePath: (plugin as any).sourcePath || "",
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
   * Unload a plugin
   */
  async unloadPlugin(pluginId: string): Promise<void> {
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

    // Update state
    this.registry.plugins.delete(pluginId);

    this.emit("pluginUnloaded", { pluginId });
  }

  /**
   * Shutdown the plugin manager
   */
  async shutdown(): Promise<void> {
    // Terminate all workers
    for (const worker of this.workers.values()) {
      worker.worker.terminate();
    }

    this.workers.clear();
    this.workerPool.length = 0;

    this.emit("shutdown");
  }
}
