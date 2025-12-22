/**
 * Raycast React Components for Fleet Chat
 *
 * React-compatible components that work with the React-to-Lit transformation
 * and Fleet Chat's plugin system
 */

import React from 'react';

// Create basic React-compatible components that map to our Lit elements
// These will be converted to actual Lit components by our React-to-Lit converter

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

// Attach ListItem and Section as properties
(List as any).Item = React.forwardRef<any, {
  title: string;
  subtitle?: string;
  accessories?: React.ReactNode[];
  actions?: React.ReactNode;
  icon?: any;
  onAction?: () => void;
}>(({ title, subtitle, accessories, icon, onAction }, _ref) => {
  return React.createElement('fleet-list-item', {
    title,
    subtitle,
    icon,
    onAction
  }, accessories);
});

(List as any).Section = ({ title, children }: { title?: string; children: React.ReactNode }) => {
  return React.createElement('fleet-list-section', {
    title
  }, children);
};

export const Grid: React.FC<{
  children: React.ReactNode;
  columns?: number;
  aspectRatio?: string;
  itemSize?: number;
}> = ({ children, columns, aspectRatio, itemSize }) => {
  return React.createElement('fleet-grid', {
    columns,
    aspectRatio,
    itemSize
  }, children);
};

(Grid as any).Item = React.forwardRef<any, {
  title: string;
  subtitle?: string;
  content?: React.ReactNode;
  icon?: any;
  actions?: React.ReactNode;
}>(({ title, subtitle, content, icon, actions }, _ref) => {
  return React.createElement('fleet-grid-item', {
    title,
    subtitle,
    icon
  }, content || actions);
});

export const Detail: React.FC<{
  markdown?: string;
  metadata?: any;
  children?: React.ReactNode;
}> = ({ markdown, metadata, children }) => {
  return React.createElement('fleet-detail', {
    markdown,
    metadata
  }, children);
};

export const Form: React.FC<{
  children: React.ReactNode;
  actions?: React.ReactNode;
  onSubmit?: (values: any) => void;
}> = ({ children, actions, onSubmit }) => {
  return React.createElement('fleet-form', {
    onSubmit
  }, children, actions);
};

export const FormTextField: React.FC<{
  id: string;
  title?: string;
  placeholder?: string;
  defaultValue?: string;
  info?: string;
  error?: string;
  required?: boolean;
}> = ({ id, title, placeholder, defaultValue, info, error, required }) => {
  return React.createElement('fleet-form-text-field', {
    id,
    title,
    placeholder,
    defaultValue,
    info,
    error,
    required
  });
};

export const FormTextArea: React.FC<{
  id: string;
  title?: string;
  placeholder?: string;
  defaultValue?: string;
  info?: string;
  error?: string;
  required?: boolean;
}> = ({ id, title, placeholder, defaultValue, info, error, required }) => {
  return React.createElement('fleet-form-text-area', {
    id,
    title,
    placeholder,
    defaultValue,
    info,
    error,
    required
  });
};

export const FormCheckbox: React.FC<{
  id: string;
  label?: string;
  defaultValue?: boolean;
  info?: string;
  required?: boolean;
}> = ({ id, label, defaultValue, info, required }) => {
  return React.createElement('fleet-form-checkbox', {
    id,
    label,
    defaultValue,
    info,
    required
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

// Action component
export const Action: React.FC<{
  title: string;
  subtitle?: string;
  icon?: any;
  shortcut?: string;
  onAction?: () => void | Promise<void>;
  style?: string;
}> = ({ title, subtitle, icon, shortcut, onAction, style }) => {
  return React.createElement('fleet-action', {
    title,
    subtitle,
    icon,
    shortcut,
    onAction,
    style
  });
};

// Image and Icon utilities
export const Image = ({ source, alt, ...props }: any) => {
  if (typeof source === 'string') {
    return React.createElement('img', { src: source, alt: alt || '', ...props });
  }
  return React.createElement('fleet-image', { source, alt: alt || '', ...props });
};

export const Icon = ({ source, ...props }: any) => {
  if (typeof source === 'string' && source.length === 1) {
    // Simple emoji icon
    return React.createElement('span', { className: 'icon', ...props }, source);
  }
  return React.createElement('fleet-icon', { source, ...props });
};

// Color constants
export const Color = {
  PrimaryText: '#000000',
  SecondaryText: '#666666',
  Red: '#ff0000',
  Green: '#00ff00',
  Blue: '#0000ff',
  Yellow: '#ffff00',
  Purple: '#800080',
  Orange: '#ffa500',
  Pink: '#ffc0cb',
  Brown: '#964b00',
  Cyan: '#00ffff',
  Magenta: '#ff00ff',
  Lime: '#00ff00',
  Indigo: '#4b0082',
  Teal: '#008080',
  Gray: '#808080'
};

// Keyboard shortcuts
export const Keyboard = {
  Shortcuts: {
    Enter: 'Enter',
    Escape: 'Escape',
    Space: 'Space',
    Tab: 'Tab',
    ArrowUp: 'ArrowUp',
    ArrowDown: 'ArrowDown',
    ArrowLeft: 'ArrowLeft',
    ArrowRight: 'ArrowRight',
    Cmd: 'Cmd',
    Ctrl: 'Ctrl',
    Alt: 'Alt',
    Shift: 'Shift'
  }
};

// Toast system
export const Toast = {
  show: async (options: { title: string; message?: string; style?: string }) => {
    // Simple implementation - in real Fleet Chat this would use the Tauri API
    console.log('Toast:', options);
    return Promise.resolve();
  },
  Style: {
    Success: 'success',
    Failure: 'failure',
    Warning: 'warning',
    Info: 'info'
  },
  Animation: {
    Dots: 'dots',
    Pulsing: 'pulsing',
    Bounce: 'bounce'
  }
};

// Alert system
export const Alert = {
  show: async (options: { title: string; message?: string; primaryAction?: any; secondaryAction?: any }) => {
    console.log('Alert:', options);
    return Promise.resolve(true);
  },
  Action: {
    OK: 'ok',
    Cancel: 'cancel',
    Yes: 'yes',
    No: 'no'
  }
};

export const confirmAlert = Alert.show;

// Navigation hook (simplified)
export const useNavigation = () => {
  return {
    pop: () => {},
    push: (_view: any) => {},
    replace: (_view: any) => {}
  };
};

// Other utilities (simplified implementations)
export const showToast = Toast.show;
export const showHUD = (message: string) => console.log('HUD:', message);
export const clearSearchBar = () => {};
export const getSelectedText = () => '';
export const popToRoot = () => {};
export const updateCommandMetadata = () => {};

export const environment = {
  supportsArguments: true,
  theme: 'dark',
  launchType: 'direct'
};

export const LocalStorage = {
  get: (key: string) => localStorage.getItem(key),
  set: (key: string, value: string) => localStorage.setItem(key, value),
  remove: (key: string) => localStorage.removeItem(key),
  clear: () => localStorage.clear()
};

export const Cache = LocalStorage;

export const getPreferenceValues = () => ({});
export const openCommandPreferences = () => {};
export const openExtensionPreferences = () => {};

export const getApplications = () => [];
export const open = (url: string) => window.open(url);
export const closeMainWindow = () => {};
export const pop = () => {};
export const push = () => {};

// React hooks (simplified)
export function useState<T>(initialValue: T): [T, (value: T) => void] {
  // In real React this would use React's useState
  // For now, return a simple implementation
  let value = initialValue;
  return [value, (newValue: T) => { value = newValue; }];
}

export function useEffect(_effect: () => void | (() => void), _deps?: any[]): void {
  // Simple effect implementation - no-op for now
}

export function useCallback<T extends (...args: any[]) => any>(callback: T, _deps?: any[]): T {
  return callback;
}

export function useMemo<T>(factory: () => T, _deps?: any[]): T {
  return factory();
}

export function useRef<T>(initialValue: T): { current: T } {
  return { current: initialValue };
}

// Raycast-specific components not in the core API
export const ActionPanel: React.FC<{
  children: React.ReactNode;
  title?: string;
  message?: string;
  icon?: any;
}> = ({ children, title, message, icon }) => {
  return React.createElement('fleet-action-panel', {
    title,
    message,
    icon
  }, children);
};

// Fix ActionPanel.Item and Section attachments
(ActionPanel as any).Item = Action;
(ActionPanel as any).Section = ({ children, title }: { children: React.ReactNode; title?: string }) => {
  return React.createElement('fleet-action-panel-section', {
    title
  }, children);
};

// MenuBarExtra - Raycast specific
export const MenuBarExtra: React.FC<{
  icon?: any;
  title?: string;
  tooltip?: string;
  children?: React.ReactNode;
}> = ({ icon, title, tooltip, children }) => {
  return React.createElement('fleet-menu-bar-extra', {
    icon,
    title,
    tooltip
  }, children);
};

// Fix MenuBarExtra attachments
(MenuBarExtra as any).Item = ({
  title,
  icon,
  onAction,
  shortcut
}: {
  title: string;
  icon?: any;
  onAction?: () => void;
  shortcut?: string;
}) => {
  return React.createElement('fleet-menu-bar-item', {
    title,
    icon,
    shortcut,
    onClick: onAction
  });
};

(MenuBarExtra as any).Submenu = ({
  title,
  icon,
  children
}: {
  title: string;
  icon?: any;
  children: React.ReactNode;
}) => {
  return React.createElement('fleet-menu-bar-submenu', {
    title,
    icon
  }, children);
};

(MenuBarExtra as any).Separator = () => {
  return React.createElement('fleet-menu-bar-separator');
};

// Export everything for convenience
export default {
  List,
  Grid,
  Detail,
  Form,
  Action,
  ActionPanel,
  MenuBarExtra,
  Image,
  Icon,
  Color,
  Keyboard,
  Toast,
  Alert,
  useNavigation,
  showToast,
  showHUD,
  clearSearchBar,
  getSelectedText,
  popToRoot,
  updateCommandMetadata,
  environment,
  LocalStorage,
  Cache,
  getPreferenceValues,
  openCommandPreferences,
  openExtensionPreferences,
  getApplications,
  open,
  closeMainWindow,
  pop,
  push,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef
};