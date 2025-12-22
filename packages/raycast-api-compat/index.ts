/**
 * Raycast compatible entrypoint for Fleet Chat plugins
 *
 * This provides a Raycast-compatible API while using Fleet Chat's backend implementation.
 * Plugin developers can use familiar Raycast APIs with Fleet Chat's enhanced features.
 */

// Core UI Components - Re-export from fleet-chat-api React components
export {
  List,
  Grid,
  Detail,
  Form,
  Action
} from "./react-components";

// Raycast-specific components
export { ActionPanel } from "./react-components";
export { MenuBarExtra } from "./react-components";

// Window Management and System APIs - Re-export from fleet-chat-api
export {
  showToast,
  showHUD,
  getApplications,
  open,
  closeMainWindow,
  useNavigation,
  pop,
  push,
  clearSearchBar,
  getSelectedText,
  popToRoot,
  updateCommandMetadata
} from "@fleet-chat/api";

// Data Storage - Re-export from fleet-chat-api
export { LocalStorage, Cache, getPreferenceValues } from "@fleet-chat/api";
export { openCommandPreferences, openExtensionPreferences } from "@fleet-chat/api";

// Environment - Re-export from fleet-chat-api
export { environment } from "@fleet-chat/api";
export type { Environment } from "@fleet-chat/api";

// UI Utilities - Re-export from fleet-chat-api
export {
  Image,
  Icon,
  Color,
  Keyboard,
  Toast,
  confirmAlert,
  Alert
} from "@fleet-chat/api";

// Hooks - Use the implementations from react-components
export { useState, useEffect, useCallback, useMemo, useRef } from "./react-components";

// Advanced Features - Re-export from fleet-chat-api
export { AI } from "@fleet-chat/api";
export { OAuth } from "@fleet-chat/api";

// Types - Define basic types for compatibility
export type LaunchContext = {
  command?: string;
  arguments?: Record<string, any>;
};

export type ToastOptions = {
  title: string;
  message?: string;
  style?: "success" | "error" | "warning" | "info";
  duration?: number;
};

export type ActionPanelProps = {
  children: any;
  title?: string;
  message?: string;
  icon?: any;
};

export type ListProps = {
  children: any;
  navigationTitle?: string;
  searchBarPlaceholder?: string;
  searchText?: string;
  onSearchTextChange?: (text: string) => void;
  actions?: any;
  filtering?: boolean;
  searchBarAccessory?: any;
};

export type GridProps = {
  children: any;
  columns?: number;
  aspectRatio?: "16/9" | "4/3" | "1/1";
  itemSize?: number;
};

export type DetailProps = {
  children: any;
  markdown?: string;
  metadata?: any;
};

export type Application = {
  name: string;
  path: string;
  bundleId?: string;
};

export type ImageLike = string | { source: string };

export type IconLike = string | { source: string };

export type ColorLike = string | {
  r: number;
  g: number;
  b: number;
  a?: number;
};

export type KeyboardShortcut = {
  key: string;
  modifiers?: string[];
};

export type NavigationOptions = {
  pop?: boolean;
  showDetail?: boolean;
};

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

