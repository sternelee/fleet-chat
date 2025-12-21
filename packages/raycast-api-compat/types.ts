/**
 * Type definitions for Raycast API compatibility
 */

// Launch context for plugins
export interface LaunchContext {
  command?: string;
  arguments?: Record<string, string>;
}

// Preference values
export interface PreferenceValues {
  [key: string]: any;
}

// Toast options
export interface ToastOptions {
  title: string;
  message?: string;
  style?: ToastStyle;
  duration?: number;
  primaryAction?: ToastAction;
  secondaryAction?: ToastAction;
}

export interface ToastAction {
  title: string;
  onAction: () => void | Promise<void>;
}

export type ToastStyle = 'success' | 'error' | 'warning' | 'info';

// Action Panel
export interface ActionPanelProps {
  children?: any;
  actions?: any[];
}

// List Component
export interface ListProps {
  children?: any;
  searchBarPlaceholder?: string;
  searchBarAccessory?: any;
  throttle?: boolean;
  navigationTitle?: string;
  actions?: any[];
  filtering?: boolean;
}

// Grid Component
export interface GridProps {
  children?: any;
  searchBarPlaceholder?: string;
  searchBarAccessory?: any;
  throttle?: boolean;
  navigationTitle?: string;
  actions?: any[];
  filtering?: boolean;
  itemSize?: ItemSize;
  aspectRatio?: number;
}

export interface ItemSize {
  width: number;
  height: number;
}

// Detail Component
export interface DetailProps {
  markdown?: string;
  html?: string;
  children?: any;
  isLoading?: boolean;
  actions?: any[];
  metadata?: MetadataItem[];
}

export interface MetadataItem {
  label: string;
  text: string;
}

// Form Component
export interface FormProps {
  children?: any;
  actions?: any[];
  navigationTitle?: string;
  validation?: boolean;
  id?: string;
  onSubmit?: (values: Record<string, any>) => void | Promise<void>;
}

// Environment
export interface Environment {
  supportsArguments: boolean;
  theme: 'light' | 'dark';
  launchContext: LaunchContext;
  source: 'cli' | 'hotkey' | 'menu';
}

// Application
export interface Application {
  name: string;
  path: string;
  bundleId?: string;
}

// Image
export interface ImageLike {
  source: string;
  fallback?: string;
  mask?: ImageMask;
}

export type ImageMask = 'circle' | 'roundRect' | 'squircle';

// Keyboard
export interface KeyboardShortcut {
  key: string;
  modifiers?: KeyModifier[];
}

export type KeyModifier = 'cmd' | 'ctrl' | 'alt' | 'shift' | 'meta';

// Color
export interface ColorLike {
  light: string;
  dark: string;
}

// Icon
export interface IconLike {
  source: string;
  fallback?: string;
  tintColor?: ColorLike;
}

// Navigation
export interface NavigationOptions {
  popToRoot?: boolean;
  showDetail?: boolean;
}

// Cache
export interface CacheOptions {
  namespace?: string;
  ttl?: number;
}

// Alert
export interface AlertOptions {
  title: string;
  message?: string;
  icon?: string;
  primaryAction?: AlertAction;
  secondaryAction?: AlertAction;
}

export interface AlertAction {
  title: string;
  style?: 'default' | 'cancel' | 'destructive';
  action?: () => void | Promise<void>;
}

// OAuth
export interface OAuthOptions {
  provider: string;
  clientId: string;
  clientSecret?: string;
  authorizationUrl: string;
  tokenUrl: string;
  redirectUri: string;
  scopes?: string[];
}

// AI
export interface AIOptions {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}