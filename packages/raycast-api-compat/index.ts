/**
 * Raycast compatible entrypoint for Fleet Chat plugins
 *
 * This provides a Raycast-compatible API while using Fleet Chat's backend implementation.
 * Plugin developers can use familiar Raycast APIs with Fleet Chat's enhanced features.
 */

// Core UI Components - Raycast compatible
export { List, Grid, Detail } from "@fleet-chat/api";

// Advanced UI Components  
export { Form } from "@fleet-chat/api";
export { Action } from "@fleet-chat/api";

// Window Management and System APIs
export { WindowManagement } from "@fleet-chat/api";

// Enhanced Navigation and Window Management
export {
  useNavigation,
  useNavigationState,
  useCurrentComponent,
  useCanGoBack,
  useCanGoForward,
  useNavigationListener,
  useBackAction,
  useNavigationDepth,
  pop,
  push,
  replace,
  clear,
  open,
  closeMainWindow,
  showHUD,
  clearSearchBar,
  getSelectedText,
  popToRoot,
  updateCommandMetadata,
  navigationManager,
  attachKeyboardNavigation,
} from "@fleet-chat/api";

// Data Storage
export {
  LocalStorage,
  Cache,
  getPreferenceValues,
  openCommandPreferences,
  openExtensionPreferences,
} from "@fleet-chat/api";

// System Integration
export {
  environment,
} from "@fleet-chat/api";

export { getApplications } from "@fleet-chat/api";

// UI Utilities
export {
  showToast,
  Toast,
  Image,
  ImageLike,
  Icon,
  Color,
  ColorLike,
  Keyboard,
} from "@fleet-chat/api";

// User Interaction
export { confirmAlert, Alert } from "@fleet-chat/api";

// Advanced Features
export { AI, OAuth } from "@fleet-chat/api";

// System-specific APIs with Tauri integration
export { Clipboard } from "./clipboard.js";
export { FileSystem } from "./filesystem.js";
export { OAuth as FleetOAuth } from "./oauth.js";

// Utilities
export { randomId, formatTitle } from "./utils.js";

// Type definitions
export type {
  LaunchContext,
  PreferenceValues,
  ToastOptions,
  ActionPanelProps,
  ListProps,
  GridProps,
  DetailProps,
  FormProps,
  KeyModifier,
  NavigationOptions,
  NavigationState,
  NavigationItem,
  NavigationContext,
} from "./types.js";

