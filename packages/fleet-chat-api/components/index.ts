/**
 * Fleet Chat UI Components
 *
 * Raycast-compatible UI components built with Lit
 */

export type { ActionPanelItemProps, ActionProps } from './Action.js'
export {
  Action,
  ActionPanel,
  ActionPanelItem,
  ActionPanelSeparator,
  FCAction,
  FCActionPanel,
  FCActionPanelItem,
  FCActionSeparator,
} from './Action.js'

// Export types
export type { ListAccessory, ListAction, ListItemProps } from './List.js'
// Export all UI components
export { FCList, List } from './List.js'

// Re-export from other component files
import { FCDetail } from './Detail.js'
import { FCForm, FCFormField } from './Form.js'
import { FCGrid } from './Grid.js'
import { FCMenuBarExtra, FCMenuBarExtraItem } from './MenuBarExtra.js'

// Raycast compatibility exports
export const Detail = FCDetail
export const Grid = FCGrid
export const MenuBarExtra = FCMenuBarExtra
export const Form = FCForm
export const FormField = FCFormField

// Export Form component variants
export {
  FCFormCheckbox,
  FCFormDate,
  FCFormDropdown,
  FCFormFile,
  FCFormRadio,
  FCFormSlider,
  FCFormTextarea,
} from './Form.js'
export const Textarea = FCFormTextarea
export const Checkbox = FCFormCheckbox
export const Dropdown = FCFormDropdown
export const DateField = FCFormDate
export const FileField = FCFormFile
export const Slider = FCFormSlider
export const Radio = FCFormRadio

// Export MenuBarExtra components
export const MenuBarExtraItem = FCMenuBarExtraItem

export { Color, ColorScheme, ColorUtils } from './Color.js'
export type { FormFieldProps, FormProps } from './Form.js'
export type { IconProps, IconType } from './Icon.js'
// Export utility components
export {
  FCIcon,
  FCIconImage,
  FCIconSymbol,
  FCIconText,
  Icon,
  IconImage,
  IconSymbol,
  IconText,
  IconUtils,
} from './Icon.js'
// Export types
export type { MenuBarExtraItemProps, MenuBarExtraProps } from './MenuBarExtra.js'
export type { ToastProps, ToastStyle } from './Toast.js'
export {
  alert,
  confirm,
  FCToast,
  FCToastContainer,
  showActionSheet,
  showToast,
  Toast,
  ToastContainer,
} from './Toast.js'
