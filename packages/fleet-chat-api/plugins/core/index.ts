/**
 * Fleet Chat Plugin System Core
 *
 * Core plugin system functionality including types, manager, and utilities
 */

// Export plugin manager
export { PluginManager } from './manager.js'
// Re-export commonly used types for convenience
export type {
  Application,
  NoViewPlugin,
  Plugin,
  PluginAPI,
  PluginCommand,
  PluginContext,
  PluginManagerConfig,
  PluginManifest,
  PluginState,
  SecurityPolicy,
  ViewPlugin,
} from './types.js'
// Export all types
export * from './types.js'
