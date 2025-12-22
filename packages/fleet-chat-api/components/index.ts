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

// Re-export from other component files (when they exist)
import { FCDetail } from './Detail.js';
import { FCGrid } from './Grid.js';

// Raycast compatibility exports
export const Detail = FCDetail;
export const Grid = FCGrid;

// Future components to be added:
// export { FCForm, Form } from './Form.js';
// export { FCDropdown, Dropdown } from './Dropdown.js';
// export { FCMenuBar, MenuBar } from './MenuBar.js';
// export { FCMenuBarExtra, MenuBarExtra } from './MenuBarExtra.js';
