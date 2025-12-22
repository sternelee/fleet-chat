/**
 * Fleet Chat Raycast API Compatibility Package
 *
 * Provides @raycast/api compatibility through @lit/react
 * React components are wrapped to work seamlessly with Lit web components
 */

import { createComponent } from "lit";
import { html, TemplateResult } from "lit";

// Import our existing Lit components
import {
  FCList,
  FCActionPanel,
  FCAction,
  FCDetail,
  FCGrid,
  FCMenuBarExtra,
  FCForm,
} from "../components/index.js";

// Alias for easier use
const List = FCList;
const ActionPanel = FCActionPanel;
const Action = FCAction;
const Detail = FCDetail;
const Grid = FCGrid;
const MenuBarExtra = FCMenuBarExtra;
const Form = FCForm;

// Import React wrapper
import { createLitComponent as reactToLit } from "../utils/react-to-lit.js";

// Create React-wrapped versions of our components
export const ReactList = reactToLit(List);
export const ReactActionPanel = reactToLit(ActionPanel);
export const ReactAction = reactToLit(Action);
export const ReactDetail = reactToLit(Detail);
export const ReactGrid = reactToLit(Grid);
export const ReactMenuBarExtra = reactToLit(MenuBarExtra);
export const ReactForm = reactToLit(Form);

// Re-export all @raycast/api functionality
// This gives plugins access to utility functions, types, etc.
export * from "@raycast/api";

// Export our enhanced system APIs as extensions to @raycast/api
export {
  LocalStorage,
  Cache,
  preferences,
  getApplications,
  getFrontmostApplication,
  getRunningApplications,
  openApplication,
  showToast,
  showHUD,
  environment,
  Clipboard,
  FileSystem,
  FCClipboard,
  FCFileSystem,
} from "../index.js";

// Re-export React hooks compatibility
export * from "../hooks/index.js";

// Re-export Raycast utils compatibility
export * from "../utils/raycast-utils.js";

// Enhanced Raycast API with Fleet Chat extensions
export const RaycastAPI = {
  // Original @raycast/api components (React-compatible)
  List: ReactList,
  ActionPanel: ReactActionPanel,
  Action: ReactAction,
  Detail: ReactDetail,
  Grid: ReactGrid,
  MenuBarExtra: ReactMenuBarExtra,
  Form: ReactForm,

  // Enhanced Fleet Chat system APIs
  LocalStorage,
  Cache,
  preferences,
  getApplications,
  getFrontmostApplication,
  getRunningApplications,
  openApplication,
  showToast,
  showHUD,
  environment,
  Clipboard,
  FileSystem,

  // Navigation
  pop: async () => {
    // Implementation in integration layer
    console.log("Navigation.pop called");
  },
  push: async (view: HTMLElement, options?: any) => {
    console.log("Navigation.push called with view:", view, "options:", options);
  },
  replace: async (view: HTMLElement, options?: any) => {
    console.log("Navigation.replace called with view:", view, "options:", options);
  },
  popToRoot: async (type?: "immediate" | "animated") => {
    console.log("Navigation.popToRoot called with type:", type);
  },
  clear: async () => {
    console.log("Navigation.clear called");
  },
  open: async (url: string) => {
    console.log("Navigation.open called with url:", url);
  },
  closeMainWindow: async () => {
    console.log("Navigation.closeMainWindow called");
  },

  // Utility exports from @raycast/utils if available
  ...((typeof window !== "undefined" && (window as any).RaycastUtils) || {}),
};

