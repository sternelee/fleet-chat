/**
 * Fleet Chat UI Components
 *
 * Raycast-compatible UI components built with Lit
 */

// Export all UI components
export { FCList, List } from './List.js';
export {
  FCAction,
  FCActionPanel,
  FCActionSeparator,
  FCActionPanelItem,
  Action,
  ActionPanel,
  ActionPanelItem,
  ActionPanelSeparator
} from './Action.js';

// Export types
export type {
  ListItemProps,
  ListAccessory,
  ListAction
} from './List.js';

export type {
  ActionProps,
  ActionPanelItemProps
} from './Action.js';

// Re-export from other component files
import { FCDetail } from './Detail.js';
import { FCGrid } from './Grid.js';
import { FCMenuBarExtra, FCMenuBarExtraItem } from './MenuBarExtra.js';
import { FCForm, FCFormField } from './Form.js';

// Raycast compatibility exports
export const Detail = FCDetail;
export const Grid = FCGrid;
export const MenuBarExtra = FCMenuBarExtra;
export const Form = FCForm;
export const FormField = FCFormField;

// Export Form component variants
export { FCFormTextarea, FCFormCheckbox, FCFormDropdown } from './Form.js';
export const Textarea = FCFormTextarea;
export const Checkbox = FCFormCheckbox;
export const Dropdown = FCFormDropdown;

// Export MenuBarExtra components
export const MenuBarExtraItem = FCMenuBarExtraItem;

// Export types
export type {
  MenuBarExtraProps,
  MenuBarExtraItemProps
} from './MenuBarExtra.js';

export type {
  FormProps,
  FormFieldProps
} from './Form.js';
