/**
 * Fleet Chat Plugin System Core
 *
 * Core plugin system functionality including types, manager, and utilities
 */

// Export all types
export * from './types.js'

// Export plugin manager
export { PluginManager } from './manager.js'

// Re-export commonly used types for convenience
export type {
  PluginManifest,
  PluginCommand,
  PluginContext,
  PluginAPI,
  Plugin,
  ViewPlugin,
  NoViewPlugin,
  PluginState,
  PluginManagerConfig,
  SecurityPolicy,
  Application,
} from './types.js'
