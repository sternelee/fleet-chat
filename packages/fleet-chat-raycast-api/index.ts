/**
 * @fleet-chat/raycast-api
 *
 * Full @raycast/api compatibility layer for Fleet Chat plugins
 *
 * This package re-exports the core Fleet Chat API with Raycast-compatible
 * interfaces, following vicinae's compatibility pattern.
 */

// Re-export core components with Raycast-compatible names
export {
  // List components
  List,
  ListItem as List.Item,
  ListSection as List.Section,
  // Grid components
  Grid,
  // Detail component
  Detail,
  // Form component
  Form,
  // Action components
  Action,
  ActionPanel,
  // Toast component
  Toast,
} from '@fleet-chat/core-api/components';

// Re-export hooks
export {
  useNavigation,
  usePromise,
  useToast,
} from '@fleet-chat/core-api/hooks';

// Re-export types
export type {
  // Component types
  ListProps,
  ListItemProps,
  ListSectionProps,
  ListAction,
  ListAccessory,
  DetailProps,
  FormProps,
  // API types
  Application,
  EnvironmentInfo,
  PluginManifest,
  PluginCommand,
} from '@fleet-chat/core-api/types';

// Re-export system APIs with Raycast-compatible names
export {
  // Applications
  getFrontmostApplication,
  getRunningApplications,
  searchApplications,
  getAllApplications,
  openApplication,
  type Application,
} from '@fleet-chat/core-api/api/applications.js';

// Re-export clipboard API
export {
  Clipboard,
  type ClipboardContent,
} from '@fleet-chat/core-api/api/clipboard.js';

// Re-export environment API
export {
  Environment,
  type EnvironmentInfo,
} from '@fleet-chat/core-api/api/environment.js';

// Re-export storage APIs
export {
  LocalStorage,
  Cache,
} from '@fleet-chat/core-api/storage';

// Re-export from @raycast/api for full compatibility
export * from '@raycast/api';
