/**
 * Plugin Integration for Fleet Chat
 * Integrates the plugin system with the main Fleet Chat application
 */

import { PluginManager } from "./plugin-manager";
import type { PluginManifest, PluginAPI } from "./plugin-system";
import { uiStore } from "../stores/ui.store";

/**
 * Plugin Integration Service
 * Bridges the plugin system with the main Fleet Chat UI
 */
export class PluginIntegration {
  private pluginManager: PluginManager;
  private integrationApi!: PluginAPI;
  private initialized = false;

  constructor() {
    this.pluginManager = new PluginManager({
      maxWorkers: 3,
      enableHotReload: process.env.NODE_ENV === "development",
      pluginPaths: ["/plugins", "/Users/sternelee/www/github/fleet-chat/src/plugins/examples"],
      securityPolicy: {
        allowedDomains: [],
        allowFileSystem: true,
        allowNetwork: true,
        maxMemoryUsage: 100,
      },
    });

    this.setupIntegrationAPI();
    this.setupEventHandlers();
  }

  /**
   * Initialize the plugin integration
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize plugin manager
      await this.pluginManager.initialize();

      // Load built-in example plugin
      await this.loadExamplePlugin();

      this.initialized = true;
      console.log("Plugin Integration initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Plugin Integration:", error);
      throw error;
    }
  }

  /**
   * Setup the integration API that plugins will use
   */
  private setupIntegrationAPI(): void {
    this.integrationApi = {
      // UI Components - proxy to actual Lit components
      List: this.createComponentProxy("List"),
      Grid: this.createComponentProxy("Grid"),
      Detail: this.createComponentProxy("Detail"),
      Form: this.createComponentProxy("Form"),
      Action: this.createComponentProxy("Action"),
      ActionPanel: this.createComponentProxy("ActionPanel"),

      // Navigation - integrate with Fleet Chat navigation
      pop: () => {
        // Implement navigation back
        console.log("Plugin API: pop");
      },

      push: (view: HTMLElement) => {
        // Implement navigation forward
        console.log("Plugin API: push", view);
        this.renderPluginView(view);
      },

      open: async (url: string) => {
        // Use Tauri's opener to open URLs
        const opener = await import("@tauri-apps/plugin-opener");
        await opener.openUrl(url);
      },

      closeMainWindow: async () => {
        // Use Tauri to close main window
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const mainWindow = getCurrentWindow();
        await mainWindow.close();
      },

      // System APIs - integrate with Fleet Chat systems
      showToast: async (options) => {
        // Integrate with Fleet Chat toast system
        console.log("Plugin API: showToast", options);

        // Dispatch event to main app
        window.dispatchEvent(
          new CustomEvent("plugin:toast", {
            detail: options,
          }),
        );
      },

      showHUD: async (message: string) => {
        console.log("Plugin API: showHUD", message);

        window.dispatchEvent(
          new CustomEvent("plugin:hud", {
            detail: { message },
          }),
        );
      },

      getApplications: async () => {
        // Get system applications
        try {
          // This would use Tauri's system APIs
          return [];
        } catch (error) {
          console.error("Failed to get applications:", error);
          return [];
        }
      },

      openApplication: async (path: string) => {
        const opener = await import("@tauri-apps/plugin-opener");
        await opener.openPath(path);
      },

      // Data Storage - integrate with Fleet Chat storage
      LocalStorage: this.createStorageProxy("localStorage"),
      Cache: this.createStorageProxy("cache"),

      // Clipboard - integrate with system clipboard
      Clipboard: this.createClipboardProxy(),

      // File System - integrate with Tauri file system
      FileSystem: this.createFileSystemProxy(),
    };
  }

  /**
   * Setup event handlers for plugin events
   */
  private setupEventHandlers(): void {
    this.pluginManager.on("pluginLoaded", (event) => {
      console.log("Plugin loaded:", event);
    });

    this.pluginManager.on("pluginError", (event) => {
      console.error("Plugin error:", event);
    });

    this.pluginManager.on("workerError", (event) => {
      console.error("Worker error:", event);
    });
  }

  /**
   * Load the example plugin
   */
  private async loadExamplePlugin(): Promise<void> {
    try {
      const exampleManifest: PluginManifest = {
        name: "hello-world",
        title: "Hello World",
        description: "A simple hello world plugin for Fleet Chat",
        icon: "👋",
        license: "MIT",
        version: "1.0.0",
        categories: ["Productivity"],
        commands: [
          {
            name: "hello",
            title: "Hello World",
            description: "Shows a greeting message",
            mode: "view",
            keywords: ["greeting", "welcome"],
          },
          {
            name: "helloList",
            title: "Hello List",
            description: "Shows a list of greeting options",
            mode: "view",
          },
          {
            name: "helloDetail",
            title: "Hello Details",
            description: "Shows detailed information about greetings",
            mode: "view",
          },
          {
            name: "helloAction",
            title: "Hello Action",
            description: "Shows a toast notification",
            mode: "no-view",
          },
        ],
      };

      const pluginPath = "/Users/sternelee/www/github/fleet-chat/src/plugins/examples/hello-world";
      await this.pluginManager.loadPlugin(exampleManifest, pluginPath);
    } catch (error) {
      console.error("Failed to load example plugin:", error);
    }
  }

  /**
   * Execute a plugin command
   */
  async executeCommand(
    pluginId: string,
    commandName: string,
    args?: Record<string, any>,
  ): Promise<HTMLElement | void> {
    try {
      return await this.pluginManager.executeCommand(pluginId, commandName, args);
    } catch (error) {
      console.error("Failed to execute plugin command:", error);
      throw error;
    }
  }

  /**
   * Get available plugin commands
   */
  getAvailableCommands(): Array<{ key: string; pluginId: string; command: any }> {
    return this.pluginManager.getAvailableCommands();
  }

  /**
   * Render a plugin view in the Fleet Chat UI
   */
  private renderPluginView(view: HTMLElement): void {
    // Get the current active panel or create a new one
    const activePanel = document.querySelector(".active-panel") || document.body;

    // Clear existing content
    activePanel.innerHTML = "";

    // Add the plugin view
    activePanel.appendChild(view);

    // Update UI store if needed
    if (uiStore) {
      // Update relevant UI state
    }
  }

  /**
   * Create component proxy for UI components
   */
  private createComponentProxy(componentName: string): any {
    return new Proxy(
      {},
      {
        get: (target, prop) => {
          if (prop === "default") {
            return this.createComponentProxy(componentName);
          }

          return (...args: any[]) => {
            // This would create the actual Lit component
            console.log(`Creating ${componentName} component with args:`, args);

            // Return a mock element for now
            const element = document.createElement("div");
            element.textContent = `${componentName} Component`;
            return element;
          };
        },
      },
    );
  }

  /**
   * Create storage proxy for data APIs
   */
  private createStorageProxy(storageType: string): any {
    return new Proxy(
      {},
      {
        get: (target, prop) => {
          if (typeof prop === "string") {
            return (...args: any[]) => {
              const storage = storageType === "localStorage" ? localStorage : sessionStorage;

              switch (prop) {
                case "get":
                  return storage.getItem(args[0]);
                case "set":
                  storage.setItem(args[0], args[1]);
                  return Promise.resolve();
                case "remove":
                  storage.removeItem(args[0]);
                  return Promise.resolve();
                case "clear":
                  storage.clear();
                  return Promise.resolve();
                default:
                  console.warn(`Unknown storage operation: ${prop}`);
                  return Promise.resolve();
              }
            };
          }
        },
      },
    );
  }

  /**
   * Create clipboard proxy
   */
  private createClipboardProxy(): any {
    return new Proxy(
      {},
      {
        get: (target, prop) => {
          if (typeof prop === "string") {
            return async (...args: any[]) => {
              try {
                const { writeText, readText } = await import(
                  "@tauri-apps/plugin-clipboard-manager"
                );

                switch (prop) {
                  case "read":
                    return await readText();
                  case "write":
                    await writeText(args[0]);
                    return;
                  case "readText":
                    return await readText();
                  case "writeText":
                    await writeText(args[0]);
                    return;
                  default:
                    console.warn(`Unknown clipboard operation: ${prop}`);
                    return;
                }
              } catch (error) {
                console.error("Clipboard operation failed:", error);
                // Fallback to browser clipboard
                if (prop === "writeText") {
                  await navigator.clipboard.writeText(args[0]);
                } else if (prop === "readText") {
                  return await navigator.clipboard.readText();
                }
              }
            };
          }
        },
      },
    );
  }

  /**
   * Create file system proxy
   */
  private createFileSystemProxy(): any {
    return new Proxy(
      {},
      {
        get: (target, prop) => {
          if (typeof prop === "string") {
            return async (...args: any[]) => {
              try {
                const { readDir, readFile, writeFile, exists } = await import(
                  "@tauri-apps/plugin-fs"
                );

                switch (prop) {
                  case "readDir":
                    return await readDir(args[0]);
                  case "readFile":
                    return await readFile(args[0]);
                  case "writeFile":
                    await writeFile(args[0], args[1]);
                    return;
                  case "exists":
                    return await exists(args[0]);
                  default:
                    console.warn(`Unknown file system operation: ${prop}`);
                    return;
                }
              } catch (error) {
                console.error("File system operation failed:", error);
                throw error;
              }
            };
          }
        },
      },
    );
  }

  /**
   * Get plugin manager instance
   */
  getPluginManager(): PluginManager {
    return this.pluginManager;
  }

  /**
   * Get integration API
   */
  getIntegrationAPI(): PluginAPI {
    return this.integrationApi;
  }

  /**
   * Shutdown the plugin integration
   */
  async shutdown(): Promise<void> {
    try {
      await this.pluginManager.shutdown();
      this.initialized = false;
      console.log("Plugin Integration shutdown successfully");
    } catch (error) {
      console.error("Failed to shutdown Plugin Integration:", error);
      throw error;
    }
  }
}

// Create singleton instance
export const pluginIntegration = new PluginIntegration();

// Initialize on app startup
export async function initializePlugins(): Promise<void> {
  try {
    await pluginIntegration.initialize();
  } catch (error) {
    console.error("Failed to initialize plugins:", error);
  }
}

// Export convenience functions
export function executePluginCommand(
  pluginId: string,
  commandName: string,
  args?: Record<string, any>,
) {
  return pluginIntegration.executeCommand(pluginId, commandName, args);
}

export function getPluginCommands() {
  return pluginIntegration.getAvailableCommands();
}
