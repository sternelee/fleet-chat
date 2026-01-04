/**
 * Component Type Definitions
 *
 * Shared types for UI components
 */

// Icon types
export interface IconProps {
  source: string;
  tintColor?: string;
  tooltip?: string;
}

export type IconLike = string | IconProps;

// Color types
export type ColorLike =
  | string
  | {
      red: string;
      green: string;
      blue: string;
      alpha?: string;
    };

// Image types
export interface ImageProps {
  source: string;
  mask?: ImageMask;
}

export type ImageLike = string | ImageProps;

export type ImageMask =
  | 'circle'
  | 'square'
  | 'rounded'
  | { top: number; right: number; bottom: number; left: number };

// List component types
export interface ListProps {
  filtering?: boolean;
  children: ListChildren | ListChildren[];
  searchBarPlaceholder?: string;
  selectedItemId?: string;
  isLoading?: boolean;
  throttle?: boolean;
  navigationTitle?: string;
}

export type ListChildren = ListItemElement | ListSectionElement;

export interface ListItemProps {
  id: string;
  icon?: IconLike;
  title: string | TitleProps;
  subtitle?: string | TextProps;
  detail?: ListDetailProps;
  accessories?: ListAccessory[];
  actions?: ListAction[];
  keywords?: string[];
  alwaysShowTitle?: boolean;
}

export interface TitleProps {
  value: string;
  color?: ColorLike;
}

export interface TextProps {
  value: string;
  color?: ColorLike;
}

export interface ListDetailProps {
  label?: string;
  metadata?: string;
  size?: ListDetailSize;
}

export type ListDetailSize = 'small' | 'medium' | 'large';

export interface ListAccessory {
  icon?: IconLike;
  text?: string;
  tooltip?: string;
  tag?: AccessoryTag;
  date?: Date;
  progress?: number;
  link?: AccessoryLink;
}

export interface AccessoryTag {
  value: string;
  color?: ColorLike;
}

export interface AccessoryLink {
  title?: string;
  target: string;
  text?: string;
}

export interface ListAction {
  title: string;
  icon?: IconLike;
  shortcut?: KeyboardShortcut;
  onAction?: () => void | Promise<void>;
}

export interface ListSectionProps {
  title?: string;
  subtitle?: string;
  children: ListItemElement | ListItemElement[];
}

// Detail component types
export interface DetailProps {
  markdown: string;
  metadata?: DetailMetadata;
  actions?: DetailAction[];
  isLoading?: boolean;
}

export interface DetailMetadata {
  label?: string;
  value: string;
  tooltip?: string;
}

export interface DetailAction {
  title: string;
  icon?: IconLike;
  onAction?: () => void | Promise<void>;
}

// Form component types
export interface FormProps {
  actions?: FormAction[];
  children: FormFieldElement | FormFieldElement[];
  isLoading?: boolean;
  navigationTitle?: string;
}

export interface FormAction {
  title: string;
  onAction?: () => void | Promise<void>;
}

export interface FormFieldProps {
  id: string;
}

export interface TextFieldProps extends FormFieldProps {
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  info?: string;
  error?: string;
  onChange?: (value: string) => void;
}

export interface CheckboxProps extends FormFieldProps {
  label?: string;
  defaultValue?: boolean;
  info?: string;
}

export interface DropdownProps extends FormFieldProps {
  label?: string;
  defaultValue?: string;
  info?: string;
  options: DropdownOption[];
}

export interface DropdownOption {
  value: string;
  title: string;
}

// Keyboard shortcut types
export type KeyboardShortcut = string | readonly [string, ...string[]];

// Action panel types
export interface ActionPanelProps {
  children: ActionPanelItem[];
}

export interface ActionPanelItem {
  title: string;
  icon?: IconLike;
  shortcut?: KeyboardShortcut;
  onAction?: () => void | Promise<void>;
}
