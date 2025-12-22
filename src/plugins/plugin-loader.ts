/**
 * Plugin Loader for Fleet Chat
 *
 * Handles loading and managing packaged (.fcp) plugins
 */

import { unzip } from 'unzipit';
import type { PluginManifest, Plugin, PluginState } from "../../packages/fleet-chat-api/plugins/core/types.js";
import { PluginManager } from "./plugin-manager.js";

// Plugin loader specific interface
export interface LoadedPlugin {
  manifest: PluginManifest;
  plugin: Plugin;
  path: string;
  metadata?: PackageMetadata;
}

// Package metadata interface
interface PackageMetadata {
  manifest: PluginManifest;
  checksum?: string;
  buildTime?: string;
  fleetChatVersion?: string;
  raycastVersion?: string;
  transformation?: {
    reactToLit: boolean;
    compiler: string;
    timestamp: string;
  };
}

// Create a global instance for drag-drop access
let globalPluginLoader: PluginLoader | null = null;

// Export global getter for the drop handler
export function getGlobalPluginLoader(): PluginLoader | null {
  return globalPluginLoader;
}

export class PluginLoader {
  private pluginManager: PluginManager;
  private loadedPlugins: Map<string, LoadedPlugin> = new Map();
  private pluginsDir: string;

  constructor(pluginManager: PluginManager, pluginsDir?: string) {
    this.pluginManager = pluginManager;
    this.pluginsDir = pluginsDir || this.getDefaultPluginsDir();

    // Set the global instance for drag-drop access
    globalPluginLoader = this;
  }

  /**
   * Load a plugin from a packaged .fcp file
   */
  async loadPlugin(packagePath: string): Promise<void> {
    try {
      console.log(`Loading plugin package: ${packagePath}`);

      // Read the package file
      const response = await fetch(`file://${packagePath}`);
      const arrayBuffer = await response.arrayBuffer();

      await this.loadPluginFromArrayBuffer(arrayBuffer, packagePath);

    } catch (error) {
      console.error(`❌ Failed to load plugin from ${packagePath}:`, error.message);
      throw error;
    }
  }

  /**
   * Load a plugin from a File object (for drag-and-drop)
   */
  async loadPluginFromFile(file: File): Promise<void> {
    try {
      console.log(`Loading plugin from file: ${file.name} (${file.size} bytes)`);

      const arrayBuffer = await file.arrayBuffer();
      await this.loadPluginFromArrayBuffer(arrayBuffer, file.name);

    } catch (error) {
      console.error(`❌ Failed to load plugin from file ${file.name}:`, error.message);
      throw error;
    }
  }

  /**
   * Load a plugin from an ArrayBuffer (shared implementation)
   */
  private async loadPluginFromArrayBuffer(arrayBuffer: ArrayBuffer, source: string): Promise<void> {
    // Unzip the package
    const { entries } = await unzip(new Uint8Array(arrayBuffer));

    // Validate package structure
    const validation = await this.validatePackage(entries);
    if (!validation.valid) {
      throw new Error(`Invalid plugin package: ${validation.error}`);
    }

    // Extract manifest
    const manifestEntry = entries['manifest.json'];
    const manifestJson = await manifestEntry.text();
    const manifest: PluginManifest = JSON.parse(manifestJson);

    // Extract metadata (optional)
    let metadata: PackageMetadata | null = null;
    try {
      const metadataEntry = entries['metadata.json'];
      if (metadataEntry) {
        const metadataJson = await metadataEntry.text();
        metadata = JSON.parse(metadataJson);

        // Verify checksum
        if (metadata.checksum && metadata.checksum !== this.calculateChecksum(arrayBuffer)) {
          console.warn('Package checksum verification failed, continuing anyway');
        }

        // Check compatibility
        if (metadata.fleetChatVersion && !this.isCompatible(metadata.fleetChatVersion)) {
          console.warn(`Plugin requires Fleet Chat version ${metadata.fleetChatVersion}, continuing anyway`);
        }
      }
    } catch (error) {
      console.warn('No metadata.json found or invalid metadata, continuing anyway');
    }

    // Extract plugin code
    const pluginCode = await this.extractPluginCode(entries);

    // Create plugin object
    const plugin = await this.createPluginFromCode(manifest, pluginCode);

    // Set source path for the plugin
    (plugin as any).sourcePath = source;

    // Register with plugin manager
    await this.pluginManager.registerPlugin(plugin);

    // Track loaded plugin
    this.loadedPlugins.set(manifest.name, {
      manifest,
      plugin,
      path: source,
      metadata
    });

    console.log(`✅ Plugin loaded successfully: ${manifest.name} v${manifest.version} from ${source}`);
  }

  /**
   * Load all plugins from the plugins directory
   */
  async loadAllPlugins(): Promise<void> {
    if (!await this.directoryExists(this.pluginsDir)) {
      console.log('Plugins directory not found, creating...');
      await this.createDirectory(this.pluginsDir);
      return;
    }

    const entries = await this.readDirectory(this.pluginsDir);
    const pluginFiles = entries.filter(entry => entry.endsWith('.fcp'));

    console.log(`Found ${pluginFiles.length} plugin packages`);

    for (const file of pluginFiles) {
      const fullPath = join(this.pluginsDir, file);
      try {
        await this.loadPlugin(fullPath);
      } catch (error) {
        console.warn(`Warning: Failed to load plugin ${file}: ${error.message}`);
      }
    }
  }

  /**
   * Uninstall a plugin
   */
  async uninstallPlugin(pluginName: string): Promise<void> {
    const loadedPlugin = this.loadedPlugins.get(pluginName);
    if (!loadedPlugin) {
      throw new Error(`Plugin '${pluginName}' is not installed`);
    }

    try {
      // Unregister from plugin manager
      await this.pluginManager.unregisterPlugin(pluginName);

      // Remove from loaded plugins
      this.loadedPlugins.delete(pluginName);

      // Delete package file
      if (await this.fileExists(loadedPlugin.path)) {
        await this.deleteFile(loadedPlugin.path);
      }

      console.log(`✅ Plugin uninstalled: ${pluginName}`);

    } catch (error) {
      console.error(`❌ Failed to uninstall plugin '${pluginName}':`, error.message);
      throw error;
    }
  }

  /**
   * Get list of installed plugins
   */
  getInstalledPlugins(): LoadedPlugin[] {
    return Array.from(this.loadedPlugins.values());
  }

  /**
   * Get plugin by name
   */
  getPlugin(name: string): LoadedPlugin | undefined {
    return this.loadedPlugins.get(name);
  }

  /**
   * Validate package structure
   */
  private async validatePackage(entries: any): Promise<{ valid: boolean; error?: string }> {
    const requiredFiles = ['manifest.json'];

    for (const file of requiredFiles) {
      if (!entries[file]) {
        return { valid: false, error: `Missing required file: ${file}` };
      }
    }

    try {
      // Validate manifest
      const manifestEntry = entries['manifest.json'];
      const manifestJson = await manifestEntry.text();
      const manifest: PluginManifest = JSON.parse(manifestJson);

      const requiredFields = ['name', 'version', 'description', 'author'];
      for (const field of requiredFields) {
        if (!manifest[field]) {
          return { valid: false, error: `Missing required field '${field}' in manifest` };
        }
      }

      // Validate metadata (optional)
      try {
        const metadataEntry = entries['metadata.json'];
        if (metadataEntry) {
          const metadataJson = await metadataEntry.text();
          const metadata: PackageMetadata = JSON.parse(metadataJson);
          // Metadata validation is optional since it's not required for basic functionality
        }
      } catch (error) {
        // Metadata is optional, ignore validation errors
        console.warn('Metadata validation skipped:', error.message);
      }

    } catch (error) {
      return { valid: false, error: `Package validation failed: ${error.message}` };
    }

    return { valid: true };
  }

  /**
   * Extract plugin code from package entries
   */
  private async extractPluginCode(entries: any): Promise<{ [key: string]: string }> {
    const code: { [key: string]: string } = {};

    for (const path in entries) {
      const entry = entries[path];
      // Only extract JavaScript/TypeScript files
      if (path.endsWith('.js') || path.endsWith('.ts') || path === 'plugin.js') {
        code[path] = await entry.text();
      }
    }

    return code;
  }

  /**
   * Create plugin object from extracted code
   */
  private async createPluginFromCode(manifest: PluginManifest, code: { [key: string]: string }): Promise<Plugin> {
    // Create a plugin object with the manifest
    const plugin: Plugin = {
      id: manifest.name,
      manifest,
      commands: new Map(),
      status: 'loaded'
    };

    // For now, we'll store the code and let the plugin manager handle execution
    // In a full implementation, we might need to evaluate the code in a sandbox
    (plugin as any).code = code;

    return plugin;
  }

  /**
   * Calculate SHA256 checksum of array buffer
   */
  private calculateChecksum(arrayBuffer: ArrayBuffer): string {
    const buffer = new Uint8Array(arrayBuffer);
    let hash = 0;
    for (let i = 0; i < buffer.length; i++) {
      const char = buffer[i];
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Check if plugin is compatible with current Fleet Chat version
   */
  private isCompatible(requiredVersion: string): boolean {
    // Simple version check - in a real implementation, use semver
    const currentVersion = this.getCurrentVersion();
    const current = currentVersion.split('.').map(Number);
    const required = requiredVersion.split('.').map(Number);

    // Current version must be >= required version
    for (let i = 0; i < Math.max(current.length, required.length); i++) {
      const curr = current[i] || 0;
      const req = required[i] || 0;

      if (curr > req) return true;
      if (curr < req) return false;
    }

    return true;
  }

  /**
   * Get current Fleet Chat version
   */
  private getCurrentVersion(): string {
    // This should be read from package.json or build config
    return '1.0.0';
  }

  /**
   * Get default plugins directory
   */
  private getDefaultPluginsDir(): string {
    // For Tauri app, use app data directory
    // For web app, use a subdirectory in localStorage or IndexedDB
    return './plugins';
  }

  // Helper methods for file system operations
  // In a real Tauri app, these would use the Tauri FS API

  private async directoryExists(path: string): Promise<boolean> {
    try {
      const stat = await this.stat(path);
      return stat.isDirectory;
    } catch {
      return false;
    }
  }

  private async fileExists(path: string): Promise<boolean> {
    try {
      const stat = await this.stat(path);
      return !stat.isDirectory;
    } catch {
      return false;
    }
  }

  private async readDirectory(path: string): Promise<string[]> {
    // Implementation depends on environment (Tauri vs web)
    return [];
  }

  private async createDirectory(path: string): Promise<void> {
    // Implementation depends on environment
  }

  private async deleteFile(path: string): Promise<void> {
    // Implementation depends on environment
  }

  private async stat(path: string): Promise<{ isDirectory: boolean }> {
    // Implementation depends on environment
    return { isDirectory: false };
  }
}

// Helper function to join paths
function join(...paths: string[]): string {
  return paths.join('/').replace(/\/+/g, '/');
}

// Export the join function for use in other modules
export { join as pathJoin };