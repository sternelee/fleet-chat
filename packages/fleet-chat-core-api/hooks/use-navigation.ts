/**
 * useNavigation Hook
 *
 * React hook for navigation in plugin views
 * Following vicinae's pattern for compatibility
 */

import { useContext } from 'react';
import { navigationContext } from '../context/navigation-context.js';

/**
 * Hook that lets you access methods to push and pop views on the navigation stack
 */
export function useNavigation() {
  const { push, pop, popToRoot } = useContext(navigationContext);
  return { push, pop, popToRoot };
}
