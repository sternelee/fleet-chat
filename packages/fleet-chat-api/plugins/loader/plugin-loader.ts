/**
 * Plugin Loader - Placeholder implementation
 *
 * This is a placeholder implementation to fix import errors
 * The full implementation will be added later
 */

import type { PluginManager } from '../core/manager.js';

export class PluginLoader {
  constructor(private pluginManager: PluginManager) { }

  async loadAllPlugins(): Promise<void> {
    // Placeholder implementation
    console.log('PluginLoader.loadAllPlugins called - placeholder implementation');
  }

  async loadPlugin(path: string): Promise<any> {
    // Placeholder implementation
    console.log('PluginLoader.loadPlugin called - placeholder implementation');
    return null;
  }
}
