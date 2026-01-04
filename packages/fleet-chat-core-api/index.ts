/**
 * @fleet-chat/core-api
 *
 * Core Fleet Chat API with Tauri-native plugin system and Lit components
 */

// API Modules - Tauri plugin wrappers
export { Clipboard } from './api/clipboard.js';
export { FileSystem } from './api/filesystem.js';
export { Shell } from './api/shell.js';
export { HttpClient } from './api/http.js';
export { Dialog } from './api/dialog.js';
export { Notification } from './api/notification.js';
export { Opener } from './api/opener.js';
export { Environment } from './api/environment.js';
export {
  getFrontmostApplication,
  getRunningApplications,
  searchApplications,
  type Application,
} from './api/applications.js';

// Components - Lit web components
export * from './components/index'

// Hooks - React-compatible hooks
export { useNavigation } from './hooks/use-navigation.js';
export { usePromise } from './hooks/use-promise.js';
export { useToast } from './hooks/use-toast.js';

// Contexts - React contexts
export { navigationContext } from './context/navigation-context.js';
export type { NavigationContextType } from './context/navigation-context.js';

// Storage - Storage abstractions
export { LocalStorage } from './storage/local-storage.js';
export { Cache } from './storage/cache.js';

// Types - Shared types
export * from './types/components.js';
export * from './types/api.js';

// Utilities
export { createLogger } from './utils/logger.js';
