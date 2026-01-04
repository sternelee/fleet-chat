/**
 * React-Compatible Component Wrappers
 *
 * These components provide React compatibility for the Lit-based components.
 * They follow vicinae's pattern of wrapping custom elements with React components.
 */

import { createElement, forwardRef } from 'react';
import type {
  ListProps,
  ListItemProps,
  ListSectionProps,
  DetailProps,
  FormProps,
} from '@fleet-chat/core-api/types';

/**
 * List Component - React wrapper
 *
 * Usage:
 * <List>
 *   <List.Item title="Item 1" />
 *   <List.Section title="Section">
 *     <List.Item title="Item 2" />
 *   </List.Section>
 * </List>
 */
export const List = Object.assign(
  forwardRef<HTMLDivElement, ListProps>((props, ref) => {
    return createElement('fc-list', { ...props, ref });
  }),
  {
    Item: forwardRef<HTMLDivElement, ListItemProps>((props, ref) => {
      return createElement('fc-list-item', { ...props, ref });
    }),
    Section: forwardRef<HTMLDivElement, ListSectionProps>((props, ref) => {
      return createElement('fc-list-section', { ...props, ref });
    }),
  },
);

/**
 * Grid Component - React wrapper
 */
export const Grid = forwardRef<HTMLDivElement, { columns?: number; gap?: number; children: React.ReactNode }>(
  (props, ref) => {
    return createElement('fc-grid', { ...props, ref });
  },
);

/**
 * Detail Component - React wrapper
 */
export const Detail = forwardRef<HTMLDivElement, DetailProps>((props, ref) => {
  return createElement('fc-detail', { ...props, ref });
});

/**
 * Form Component - React wrapper
 */
export const Form = forwardRef<HTMLDivElement, FormProps>((props, ref) => {
  return createElement('fc-form', { ...props, ref });
});

/**
 * Action Components - React wrappers
 */
export const Action = forwardRef<HTMLDivElement, { title: string; icon?: string; shortcut?: string }>(
  (props, ref) => {
    return createElement('fc-action', { ...props, ref });
  },
);

export const ActionPanel = forwardRef<HTMLDivElement, { children: React.ReactNode }>((props, ref) => {
  return createElement('fc-action-panel', { ...props, ref });
});
