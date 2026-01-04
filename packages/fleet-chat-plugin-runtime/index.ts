/**
 * @fleet-chat/plugin-runtime
 *
 * Fleet Chat Plugin Runtime - Web Worker isolation and plugin lifecycle management
 *
 * Complete plugin execution system with:
 * - Web Worker-based isolation
 * - React-to-Lit code transformation
 * - Security sandbox with permission control
 * - Memory and timeout management
 * - Plugin lifecycle management
 * - Hot reload support
 */

// ============================================================================
// Plugin Manager
// ============================================================================
export { PluginManager } from './manager/manager.js';
export type {
  PluginInfo,
  PluginLoadOptions,
  PluginExecutionContext,
  PluginManagerConfig,
} from './manager/manager.js';

// ============================================================================
// Plugin Loader
// ============================================================================
export { PluginLoader } from './loader/loader.js';
export type {
  LoadResult,
  PluginSource,
} from './loader/loader.js';

export {
  parseManifest,
  loadManifest,
  extractManifestFromCode,
} from './loader/manifest.js';
export type {
  PluginManifest,
  PluginArgumentData,
} from './loader/manifest.js';

// ============================================================================
// Worker Implementation
// ============================================================================
export { PluginWorker } from './worker/worker.js';
export type {
  WorkerMessage,
  WorkerResponse,
  WorkerMessageType,
  InitData,
  ExecuteData,
  RenderData,
  SetStateData,
  GetStateData,
  ConsoleData,
  WorkerConfig,
  WorkerState,
  ExecutionResult,
} from './worker/types.js';

// ============================================================================
// Sandbox Security
// ============================================================================
export {
  createSandbox,
  createSecureConsole,
  createSecureFetch,
  validateCode,
  wrapPluginCode,
  createExecutionContext,
} from './sandbox/sandbox.js';
export {
  MemoryTracker,
} from './sandbox/sandbox.js';
export type {
  SandboxCapabilities,
  SandboxConfig,
} from './sandbox/sandbox.js';

// ============================================================================
// Re-exports from worker types (convenience)
// ============================================================================
export type {
  PluginManifestData,
  PluginCommandData,
  PreferenceData,
} from './worker/types.js';
