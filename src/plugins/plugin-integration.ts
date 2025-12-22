/**
 * Plugin Integration for Fleet Chat
 * Integrates the plugin system with the main Fleet Chat application
 */

import { PluginManager } from "../../packages/fleet-chat-api/plugins/core/manager.js";
import type { PluginManifest, PluginAPI } from "../../packages/fleet-chat-api/plugins/core/types.js";
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
      pluginPaths: ["/plugins", "/Users/sternelee/www/github/fleet-chat/packages/fleet-chat-api/examples"],
      securityPolicy: {
        allowedDomains: [],
        allowFileSystem: true,
        allowNetwork: true,
        maxMemoryUsage: 100,
      },
    });
  }

  /**
   * Initialize the plugin integration
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize plugin manager
      await this.pluginManager.initialize();

      // Set up integration API
      await this.setupIntegrationAPI();

      // Set up event listeners
      this.setupEventListeners();

      this.initialized = true;
      console.log("Plugin integration initialized successfully");
    } catch (error) {
      console.error("Failed to initialize plugin integration:", error);
      throw error;
    }
  }

  /**
   * Execute a plugin command
   */
  async executeCommand(
    pluginId: string,
    commandName: string,
    args?: Record<string, any>
  ): Promise<HTMLElement | void> {
    if (!this.initialized) {
      await this.initialize();
    }

    return await this.pluginManager.executeCommand(pluginId, commandName, args);
  }

  /**
   * Get the plugin manager instance
   */
  getPluginManager(): PluginManager {
    return this.pluginManager;
  }

  /**
   * Get the integration API
   */
  getIntegrationAPI(): PluginAPI {
    if (!this.integrationApi) {
      throw new Error("Integration API not initialized. Call initialize() first.");
    }
    return this.integrationApi;
  }

  /**
   * Get available plugin commands
   */
  getAvailableCommands(): Array<{ key: string; pluginId: string; command: any }> {
    if (!this.initialized) {
      return [];
    }

    return this.pluginManager.getAvailableCommands();
  }

  /**
   * Set up the integration API
   */
  private async setupIntegrationAPI(): Promise<void> {
    // Create integration API that bridges Fleet Chat and plugins
    this.integrationApi = {
      // UI Components - direct access to Fleet Chat components
      List: {} as any,
      Grid: {} as any,
      Detail: {} as any,
      Form: {} as any,
      Action: {} as any,
      ActionPanel: {} as any,
      MenuBar: {} as any,
      Dropdown: {} as any,

      // Navigation - use Fleet Chat navigation
      pop: async () => {
        // Integrate with Fleet Chat navigation
        console.log("Navigation.pop called by plugin");
      },
      push: async (view: HTMLElement, options?: any) => {
        // Integrate with Fleet Chat navigation
        console.log("Navigation.push called by plugin");
      },
      replace: async (view: HTMLElement, options?: any) => {
        // Integrate with Fleet Chat navigation
        console.log("Navigation.replace called by plugin");
      },
      popToRoot: async (type?: "immediate" | "animated") => {
        // Integrate with Fleet Chat navigation
        console.log("Navigation.popToRoot called by plugin");
      },
      clear: async () => {
        // Integrate with Fleet Chat navigation
        console.log("Navigation.clear called by plugin");
      },

      // System APIs - use Fleet Chat enhanced APIs
      showToast: async (options: any) => {
        // Integrate with Fleet Chat toast system
        console.log("showToast called by plugin:", options);
      },
      showHUD: async (message: string) => {
        // Integrate with Fleet Chat HUD system
        console.log("showHUD called by plugin:", message);
      },
      getApplications: async () => {
        // Use Fleet Chat application management
        console.log("getApplications called by plugin");
        return [];
      },
      openApplication: async (path: string) => {
        // Use Fleet Chat application launching
        console.log("openApplication called by plugin:", path);
      },

      // Data Storage - use Fleet Chat storage
      LocalStorage: {} as any,
      Cache: {} as any,

      // Environment - use Fleet Chat environment
      environment: {
        supports: true,
        theme: uiStore.get("theme") || "dark",
        launchContext: null,
      } as any,

      // Clipboard - use Fleet Chat clipboard
      Clipboard: {} as any,

      // File System - use Fleet Chat filesystem
      FileSystem: {} as any,
    };
  }

  /**
   * Set up event listeners for plugin events
   */
  private setupEventListeners(): void {
    // Listen to plugin manager events
    this.pluginManager.on("pluginLoaded", (event: any) => {
      console.log("Plugin loaded:", event.pluginId);
      // Update Fleet Chat state to reflect new plugin
    });

    this.pluginManager.on("pluginError", (event: any) => {
      console.error("Plugin error:", event);
      // Show error to user in Fleet Chat
    });

    this.pluginManager.on("commandExecuted", (event: any) => {
      console.log("Command executed:", event);
      // Handle command results
    });
  }

  /**
   * Shutdown the plugin integration
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) return;

    try {
      await this.pluginManager.shutdown();
      this.initialized = false;
      console.log("Plugin integration shut down successfully");
    } catch (error) {
      console.error("Failed to shutdown plugin integration:", error);
    }
  }
}

// Create singleton instance
let pluginIntegrationInstance: PluginIntegration | null = null;

/**
 * Get the plugin integration instance
 */
export function getPluginIntegration(): PluginIntegration {
  if (!pluginIntegrationInstance) {
    pluginIntegrationInstance = new PluginIntegration();
  }
  return pluginIntegrationInstance;
}

/**
 * Initialize plugin integration (convenience function)
 */
export async function initializePluginIntegration(): Promise<PluginIntegration> {
  const integration = getPluginIntegration();
  await integration.initialize();
  return integration;
}

/**
 * Execute plugin command (convenience function)
 */
export async function executePluginCommand(
  pluginId: string,
  commandName: string,
  args?: Record<string, any>
): Promise<HTMLElement | void> {
  const integration = getPluginIntegration();
  return await integration.executeCommand(pluginId, commandName, args);
}

/**
 * Get available plugin commands (convenience function)
 */
export function getPluginCommands(): Array<{ key: string; pluginId: string; command: any }> {
  const integration = getPluginIntegration();
  return integration.getAvailableCommands();
}

/**
 * Export the singleton plugin integration instance for direct use
 */
export const pluginIntegration = getPluginIntegration();
