/**
 * Extension Manager for Fleet Chat
 *
 * Manages plugin lifecycle, loading, and execution in isolated environments
 * Inspired by Vicinae's extension-manager architecture but adapted for Tauri
 */

import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { randomId } from "@fleet-chat/raycast-api-compat/utils.js";

// Message types for extension communication
export interface ExtensionMessage {
  id: string;
  type: "load" | "unload" | "execute" | "response" | "error";
  extensionId?: string;
  command?: string;
  data?: any;
  error?: string;
}

export interface ExtensionManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  icon?: string;
  commands: ExtensionCommand[];
  permissions: string[];
  dependencies?: string[];
}

export interface ExtensionCommand {
  name: string;
  title: string;
  description?: string;
  mode: "view" | "no-view";
  keywords?: string[];
  preferences?: ExtensionPreferences;
}

export interface ExtensionPreferences {
  [key: string]: {
    type: "textfield" | "passwordfield" | "checkbox" | "dropdown";
    title: string;
    description?: string;
    default?: any;
    required?: boolean;
    data?: any; // for dropdown options
  };
}

/**
 * Extension Manager Class
 */
export class ExtensionManager {
  private extensions = new Map<string, ExtensionInfo>();
  private workers = new Map<string, Worker>();
  private messageHandlers = new Map<string, (message: ExtensionMessage) => void>();
  private isInitialized = false;

  constructor() {
    this.setupEventListeners();
  }

  /**
   * Initialize extension manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load built-in extensions
      await this.loadBuiltinExtensions();

      // Load user extensions
      await this.loadUserExtensions();

      this.isInitialized = true;
      console.log("Extension Manager initialized");
    } catch (error) {
      console.error("Failed to initialize Extension Manager:", error);
      throw error;
    }
  }

  /**
   * Load built-in extensions
   */
  private async loadBuiltinExtensions(): Promise<void> {
    const builtinExtensions = [
      "hello-world",
      // Add more built-in extensions here
    ];

    for (const extId of builtinExtensions) {
      try {
        await this.loadExtension(`examples/${extId}`);
      } catch (error) {
        console.warn(`Failed to load built-in extension ${extId}:`, error);
      }
    }
  }

  /**
   * Load user extensions
   */
  private async loadUserExtensions(): Promise<void> {
    try {
      // Get user extensions directory
      const userExtensionsDir = await invoke<string>("get_user_extensions_dir");

      // Load extensions from user directory
      // This would scan for extension manifests and load them
      console.log("User extensions directory:", userExtensionsDir);
    } catch (error) {
      console.warn("Could not load user extensions:", error);
    }
  }

  /**
   * Load an extension
   */
  async loadExtension(extensionPath: string): Promise<void> {
    try {
      const manifest = await this.loadManifest(extensionPath);
      const extensionId = manifest.id;

      if (this.extensions.has(extensionId)) {
        throw new Error(`Extension ${extensionId} is already loaded`);
      }

      // Check permissions
      await this.checkPermissions(manifest);

      // Create worker for extension isolation
      const worker = await this.createWorker(extensionPath, manifest);

      const extensionInfo: ExtensionInfo = {
        manifest,
        worker,
        status: "loaded",
        lastUsed: new Date(),
      };

      this.extensions.set(extensionId, extensionInfo);
      this.workers.set(extensionId, worker);

      // Notify about extension loaded
      await emit("extension-loaded", { extensionId, manifest });

      console.log(`Extension loaded: ${extensionId}`);
    } catch (error) {
      console.error(`Failed to load extension ${extensionPath}:`, error);
      throw error;
    }
  }

  /**
   * Unload an extension
   */
  async unloadExtension(extensionId: string): Promise<void> {
    const extension = this.extensions.get(extensionId);
    if (!extension) {
      throw new Error(`Extension ${extensionId} is not loaded`);
    }

    try {
      // Terminate worker
      if (extension.worker) {
        extension.worker.terminate();
        this.workers.delete(extensionId);
      }

      // Remove from registry
      this.extensions.delete(extensionId);

      // Notify about extension unloaded
      await emit("extension-unloaded", { extensionId });

      console.log(`Extension unloaded: ${extensionId}`);
    } catch (error) {
      console.error(`Failed to unload extension ${extensionId}:`, error);
      throw error;
    }
  }

  /**
   * Execute an extension command
   */
  async executeCommand(extensionId: string, commandName: string, context: any = {}): Promise<any> {
    const extension = this.extensions.get(extensionId);
    if (!extension) {
      throw new Error(`Extension ${extensionId} is not loaded`);
    }

    const command = extension.manifest.commands.find((cmd) => cmd.name === commandName);
    if (!command) {
      throw new Error(`Command ${commandName} not found in extension ${extensionId}`);
    }

    extension.lastUsed = new Date();
    extension.status = "running";

    try {
      const messageId = randomId();
      const message: ExtensionMessage = {
        id: messageId,
        type: "execute",
        extensionId,
        command: commandName,
        data: { context, mode: command.mode },
      };

      // Send message to worker
      this.sendMessageToWorker(extension.worker, message);

      // Wait for response
      const response = await this.waitForResponse(messageId, 30000); // 30 second timeout

      extension.status = "loaded";
      return response.data;
    } catch (error) {
      extension.status = "error";
      console.error(`Failed to execute command ${commandName}:`, error);
      throw error;
    }
  }

  /**
   * Get all loaded extensions
   */
  getExtensions(): ExtensionInfo[] {
    return Array.from(this.extensions.values());
  }

  /**
   * Get extension by ID
   */
  getExtension(extensionId: string): ExtensionInfo | undefined {
    return this.extensions.get(extensionId);
  }

  /**
   * Get all available commands from all extensions
   */
  getAllCommands(): Array<{ extensionId: string; command: ExtensionCommand }> {
    const commands: Array<{ extensionId: string; command: ExtensionCommand }> = [];

    for (const [extensionId, extension] of this.extensions) {
      for (const command of extension.manifest.commands) {
        commands.push({ extensionId, command });
      }
    }

    return commands;
  }

  /**
   * Reload an extension
   */
  async reloadExtension(extensionId: string): Promise<void> {
    const extension = this.extensions.get(extensionId);
    if (!extension) {
      throw new Error(`Extension ${extensionId} is not loaded`);
    }

    const extensionPath = this.getExtensionPath(extensionId);
    await this.unloadExtension(extensionId);
    await this.loadExtension(extensionPath);
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for messages from workers
    listen("extension-message", (event: any) => {
      const message = event.payload as ExtensionMessage;
      this.handleWorkerMessage(message);
    });
  }

  /**
   * Handle messages from workers
   */
  private handleWorkerMessage(message: ExtensionMessage): void {
    const handler = this.messageHandlers.get(message.id);
    if (handler) {
      handler(message);
      this.messageHandlers.delete(message.id);
    }
  }

  /**
   * Send message to worker
   */
  private async sendMessageToWorker(worker: Worker, message: ExtensionMessage): Promise<void> {
    worker.postMessage(message);
  }

  /**
   * Wait for response from worker
   */
  private waitForResponse(messageId: string, timeout: number): Promise<ExtensionMessage> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.messageHandlers.delete(messageId);
        reject(new Error("Command execution timeout"));
      }, timeout);

      this.messageHandlers.set(messageId, (message) => {
        clearTimeout(timeoutId);
        if (message.type === "error") {
          reject(new Error(message.error));
        } else {
          resolve(message);
        }
      });
    });
  }

  /**
   * Load extension manifest
   */
  private async loadManifest(extensionPath: string): Promise<ExtensionManifest> {
    const manifestPath = `${extensionPath}/package.json`;
    const manifestContent = await invoke<string>("read_extension_manifest", { path: manifestPath });
    return JSON.parse(manifestContent);
  }

  /**
   * Check extension permissions
   */
  private async checkPermissions(manifest: ExtensionManifest): Promise<void> {
    // Implement permission checking logic
    // For now, allow all permissions
    console.log("Checking permissions for:", manifest.permissions);
  }

  /**
   * Create worker for extension
   */
  private async createWorker(extensionPath: string, manifest: ExtensionManifest): Promise<Worker> {
    const workerUrl = `/workers/extension-worker.js?path=${encodeURIComponent(extensionPath)}`;
    return new Worker(workerUrl);
  }

  /**
   * Get extension path from ID
   */
  private getExtensionPath(extensionId: string): string {
    const extension = this.extensions.get(extensionId);
    if (!extension) {
      throw new Error(`Extension ${extensionId} not found`);
    }

    // This would need to store the original path or reconstruct it
    return `examples/${extensionId}`;
  }

  /**
   * Cleanup all extensions
   */
  async cleanup(): Promise<void> {
    for (const [extensionId] of this.extensions) {
      try {
        await this.unloadExtension(extensionId);
      } catch (error) {
        console.error(`Failed to unload extension ${extensionId}:`, error);
      }
    }
  }
}

// Extension info interface
interface ExtensionInfo {
  manifest: ExtensionManifest;
  worker: Worker;
  status: "loading" | "loaded" | "running" | "error";
  lastUsed: Date;
  error?: string;
}

// Global extension manager instance
export const extensionManager = new ExtensionManager();

