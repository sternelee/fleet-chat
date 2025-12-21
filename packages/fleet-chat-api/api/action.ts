/**
 * Action Component API Stub
 *
 * This is a placeholder for the Action component API
 * The actual implementation is in src/plugins/ui/components/fc-action.ts
 */

export interface ActionProps {
  title: string;
  onAction?: () => void | Promise<void>;
  shortcut?: string;
  icon?: string;
  style?: "default" | "destructive";
  dialog?: {
    title: string;
    message: string;
    primaryAction?: {
      title: string;
      action?: () => void | Promise<void>;
    };
    secondaryAction?: {
      title: string;
      action?: () => void | Promise<void>;
    };
  };
}

export interface ActionPanelProps {
  children?: any;
  actions?: ActionProps[];
}

// Stub Action component - actual implementation in UI components
export const Action = {
  // Placeholder for Action component
  create: (props: ActionProps) => {
    // This would create an Action component
    return null;
  },
};

// Stub ActionPanel component - actual implementation in UI components
export const ActionPanel = {
  // Placeholder for ActionPanel component
  create: (props: ActionPanelProps) => {
    // This would create an ActionPanel component
    return null;
  },
};
export default Action;

