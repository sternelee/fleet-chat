/**
 * Navigation Context
 *
 * React context for navigation in plugin views
 * Following vicinae's pattern for compatibility
 */

import { createContext, ReactNode } from 'react';

export interface NavigationContextType {
  push: (node: ReactNode) => void;
  pop: () => void;
  popToRoot: () => void;
}

const defaultContext: NavigationContextType = {
  push: () => {
    throw new Error('Navigation not initialized. Wrap your component with NavigationProvider.');
  },
  pop: () => {
    throw new Error('Navigation not initialized. Wrap your component with NavigationProvider.');
  },
  popToRoot: () => {
    throw new Error('Navigation not initialized. Wrap your component with NavigationProvider.');
  },
};

export const navigationContext = createContext<NavigationContextType>(defaultContext);
