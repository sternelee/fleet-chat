/**
 * Raycast React Components for Fleet Chat
 *
 * React-compatible components that work with the React-to-Lit transformation
 * and Fleet Chat's plugin system
 */

import React from 'react';
import { LitElement, html, css } from 'lit';

// Basic React-compatible components
export const List: React.FC<{
  children: React.ReactNode;
  navigationTitle?: string;
  searchBarPlaceholder?: string;
  searchText?: string;
  onSearchTextChange?: (text: string) => void;
  actions?: React.ReactNode;
  filtering?: boolean;
  searchBarAccessory?: React.ReactNode;
}> = ({
  children,
  navigationTitle,
  searchBarPlaceholder,
  searchText,
  onSearchTextChange,
  actions,
  filtering,
  searchBarAccessory
}) => {
  // This will be converted to Lit component
  return React.createElement('fleet-list', {
    navigationTitle,
    searchBarPlaceholder,
    searchText,
    filtering,
    onSearchTextChange,
    actions,
    searchBarAccessory
  }, children);
};

export const ListItem: React.FC<{
  title: string;
  subtitle?: string;
  accessories?: React.ReactNode[];
  actions?: React.ReactNode;
  icon?: any;
  onAction?: () => void;
}> = ({ title, subtitle, accessories, actions, icon, onAction }) => {
  return React.createElement('fleet-list-item', {
    title,
    subtitle,
    accessories,
    actions,
    icon,
    onAction
  });
};

export const ActionPanel: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return React.createElement('fleet-action-panel', null, children);
};

export const Action: React.FC<{
  title: string;
  onAction?: () => void;
  shortcut?: any;
  icon?: any;
}> = ({ title, onAction, shortcut, icon }) => {
  return React.createElement('fleet-action', {
    title,
    onAction,
    shortcut,
    icon
  });
};

export const Detail: React.FC<{
  markdown?: string;
  metadata?: Array<{ label: string; text: string }>;
  actions?: React.ReactNode;
}> = ({ markdown, metadata, actions }) => {
  return React.createElement('fleet-detail', {
    markdown,
    metadata,
    actions
  });
};

export const Form: React.FC<{
  actions?: React.ReactNode;
  validation?: (values: any) => string | undefined;
  onSubmit?: (values: any) => void;
  children: React.ReactNode;
}> = ({ actions, validation, onSubmit, children }) => {
  return React.createElement('fleet-form', {
    actions,
    validation,
    onSubmit
  }, children);
};

export const FormTextField: React.FC<{
  id: string;
  title?: string;
  placeholder?: string;
  defaultValue?: string;
  info?: string;
  error?: string;
}> = ({ id, title, placeholder, defaultValue, info, error }) => {
  return React.createElement('fleet-form-text-field', {
    id,
    title,
    placeholder,
    defaultValue,
    info,
    error
  });
};

export const FormTextArea: React.FC<{
  id: string;
  title?: string;
  placeholder?: string;
  defaultValue?: string;
  info?: string;
  error?: string;
}> = ({ id, title, placeholder, defaultValue, info, error }) => {
  return React.createElement('fleet-form-textarea', {
    id,
    title,
    placeholder,
    defaultValue,
    info,
    error
  });
};

export const FormCheckbox: React.FC<{
  id: string;
  label?: string;
  defaultValue?: boolean;
  info?: string;
}> = ({ id, label, defaultValue, info }) => {
  return React.createElement('fleet-form-checkbox', {
    id,
    label,
    defaultValue,
    info
  });
};

export const FormDropdown: React.FC<{
  id: string;
  title?: string;
  defaultValue?: string;
  info?: string;
  data: Array<{ title: string; value: string }>;
}> = ({ id, title, defaultValue, info, data }) => {
  return React.createElement('fleet-form-dropdown', {
    id,
    title,
    defaultValue,
    info,
    data
  });
};

export const FormDateField: React.FC<{
  id: string;
  title?: string;
  defaultValue?: string;
  info?: string;
  error?: string;
}> = ({ id, title, defaultValue, info, error }) => {
  return React.createElement('fleet-form-date-field', {
    id,
    title,
    defaultValue,
    info,
    error
  });
};

export const FormSeparator: React.FC = () => {
  return React.createElement('fleet-form-separator');
};

// Icon component
export const Icon: React.FC<{
  source: string;
  tintColor?: string;
}> = ({ source, tintColor }) => {
  return React.createElement('fleet-icon', {
    source,
    tintColor
  });
};

// Image component
export const Image: React.FC<{
  source: string;
  fallback?: string;
  alt?: string;
}> = ({ source, fallback, alt }) => {
  return React.createElement('fleet-image', {
    source,
    fallback,
    alt
  });
};

// Keyboard shortcuts
export const Keyboard: React.FC<{
  shortcut: any;
}> = ({ shortcut }) => {
  return React.createElement('fleet-keyboard', {
    shortcut
  });
};

// Color utilities
export const Color = {
  Red: '#ff0000',
  Green: '#00ff00',
  Blue: '#0000ff',
  Yellow: '#ffff00',
  Orange: '#ff8800',
  Purple: '#8800ff',
  Pink: '#ff0088',
  PrimaryText: '#000000',
  SecondaryText: '#666666',
  Gray: '#888888',
  LightGray: '#cccccc',
  White: '#ffffff',
  Black: '#000000',
  Transparent: 'transparent',
  CreateColor: (red: number, green: number, blue: number, alpha?: number) =>
    `rgba(${red}, ${green}, ${blue}, ${alpha || 1})`,
};

// Toast utilities
export const Toast = {
  Style: {
    Success: 'success',
    Failure: 'failure',
    Animation: 'animation',
  },
};

export const showToast = async (options: {
  style?: string;
  title: string;
  message?: string;
  primaryAction?: {
    title: string;
    onAction?: () => void;
  };
}) => {
  // This will be converted to use Fleet Chat's toast system
  console.log('Toast:', options);

  // Dispatch event for Fleet Chat to handle
  window.dispatchEvent(new CustomEvent('show-toast', {
    detail: options
  }));
};

// Navigation utilities
export const useNavigation = () => {
  // Returns navigation utilities that will be converted to Lit
  return {
    push: (component: React.ReactNode) => {
      console.log('Navigation push:', component);
    },
    pop: () => {
      console.log('Navigation pop');
    },
    replace: (component: React.ReactNode) => {
      console.log('Navigation replace:', component);
    },
    popToRoot: () => {
      console.log('Navigation pop to root');
    },
  };
};

export const getPreferenceValues = <T = any>() => {
  // Returns preferences that will be converted to Fleet Chat's system
  return {} as T;
};

export const openCommandPreferences = async () => {
  console.log('Open command preferences');
};

export const openExtensionPreferences = async () => {
  console.log('Open extension preferences');
};

// Environment and system utilities
export const environment = {
  commandMode: 'view' as 'view' | 'no-view' | 'menu-bar',
  theme: 'light' as 'light' | 'dark',
  supportsVariables: true,
  launchContext: {
    version: '1.0.0',
  },
};

export const Clipboard = {
  read: async () => {
    // This will use Fleet Chat's clipboard system
    if (navigator.clipboard) {
      return await navigator.clipboard.readText();
    }
    return '';
  },
  write: async (text: string) => {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    }
  },
  readText: async () => Clipboard.read(),
  writeText: async (text: string) => Clipboard.write(text),
};

export const FileSystem = {
  exists: async (path: string) => {
    // Will use Fleet Chat's file system API
    return false;
  },
  read: async (path: string) => {
    // Will use Fleet Chat's file system API
    return '';
  },
  write: async (path: string, content: string) => {
    // Will use Fleet Chat's file system API
  },
  readTextFile: async (path: string) => FileSystem.read(path),
  writeTextFile: async (path: string, content: string) => FileSystem.write(path, content),
};

export const LocalStorage = {
  get: async (key: string) => {
    return localStorage.getItem(key);
  },
  set: async (key: string, value: string) => {
    localStorage.setItem(key, value);
  },
  remove: async (key: string) => {
    localStorage.removeItem(key);
  },
  clear: async () => {
    localStorage.clear();
  },
};

export const Cache = {
  get: async (key: string) => {
    return sessionStorage.getItem(key);
  },
  set: async (key: string, value: string, ttl?: number) => {
    sessionStorage.setItem(key, value);
  },
  remove: async (key: string) => {
    sessionStorage.removeItem(key);
  },
  clear: async () => {
    sessionStorage.clear();
  },
};

// System utilities
export const confirmAlert = async (options: {
  title: string;
  message?: string;
  primaryAction?: {
    title: string;
    onAction?: () => void;
  };
  dismissAction?: {
    title: string;
    onAction?: () => void;
  };
}) => {
  console.log('Alert:', options);
  return true; // Will be converted to use Fleet Chat's alert system
};

export const Alert = {
  ActionStyle: {
    Default: 'default',
    Regular: 'regular',
  },
};

export const getApplications = async () => {
  // Will use Fleet Chat's application list
  return [];
};

export const open = async (url: string) => {
  window.open(url, '_blank');
};

export const closeMainWindow = async () => {
  // Will use Fleet Chat's window management
  window.close();
};

export const showHUD = async (message: string) => {
  console.log('HUD:', message);

  // Dispatch event for Fleet Chat to handle
  window.dispatchEvent(new CustomEvent('show-hud', {
    detail: { message }
  }));
};

export const clearSearchBar = () => {
  // Will clear Fleet Chat's search bar
};

export const getSelectedText = () => {
  return window.getSelection()?.toString() || '';
};

export const popToRoot = () => {
  // Will use Fleet Chat's navigation system
};

export const updateCommandMetadata = (metadata: any) => {
  console.log('Update command metadata:', metadata);
};

// Utility functions
export const randomId = () => {
  return Math.random().toString(36).substr(2, 9);
};

export const formatTitle = (title: string) => {
  return title.charAt(0).toUpperCase() + title.slice(1);
};

// React Hooks equivalents for Fleet Chat
export const useState = <T>(initialValue: T): [T, (value: T) => void] => {
  // This will be converted to Lit's reactive properties
  const [value, setValue] = React.useState(initialValue);
  return [value, setValue];
};

export const useEffect = (effect: () => void | (() => void), deps?: React.DependencyList) => {
  // This will be converted to Lit's lifecycle methods
  return React.useEffect(effect, deps);
};

export const useCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T => {
  return React.useCallback(callback, deps);
};

export const useMemo = <T>(factory: () => T, deps: React.DependencyList): T => {
  return React.useMemo(factory, deps);
};

export const useRef = <T>(initialValue: T): React.RefObject<T> => {
  return React.useRef(initialValue);
};

export default {
  // Components
  List,
  ListItem,
  ActionPanel,
  Action,
  Detail,
  Form,
  FormTextField,
  FormTextArea,
  FormCheckbox,
  FormDropdown,
  FormDateField,
  FormSeparator,
  Icon,
  Image,
  Keyboard,

  // Utilities
  Color,
  Toast,
  showToast,
  useNavigation,
  getPreferenceValues,
  openCommandPreferences,
  openExtensionPreferences,
  environment,
  Clipboard,
  FileSystem,
  LocalStorage,
  Cache,
  confirmAlert,
  Alert,
  getApplications,
  open,
  closeMainWindow,
  showHUD,
  clearSearchBar,
  getSelectedText,
  popToRoot,
  updateCommandMetadata,
  randomId,
  formatTitle,

  // Hooks
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
};