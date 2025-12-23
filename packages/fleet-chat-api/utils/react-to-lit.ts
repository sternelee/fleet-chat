/**
 * React-to-Lit Adapter
 *
 * Provides React wrappers for Lit components using @lit/react
 * This enables direct React support in Fleet Chat plugins
 */

import { createComponent } from '@lit/react'
import { html, TemplateResult } from 'lit'
import React from 'react'

/**
 * Create a React component wrapper for a Lit component
 *
 * @param {any} LitComponent - The Lit component class to wrap
 * @returns {React.ForwardRefExoticComponent} - React-wrapped component
 */
export function createLitComponent(LitComponent: any) {
  return React.forwardRef((props: any, ref: any) => {
    // Convert React props to Lit properties
    const litProps = { ...props }

    // Handle children specially for React
    const { children, ...otherProps } = litProps

    return createComponent({
      tagName: LitComponent.tagName || LitComponent.name.toLowerCase(),
      elementClass: LitComponent,
      events: {},
      constructorProps: otherProps,
      ref,
    })
  })
}

/**
 * Enhanced adapter that supports more complex React patterns
 *
 * @param {any} LitComponent - The Lit component class to wrap
 * @param {Object} options - Configuration options
 * @returns {React.ForwardRefExoticComponent} - React-wrapped component
 */
export function createEnhancedLitComponent(
  LitComponent: any,
  options: {
    events?: Record<string, string>
    mappings?: Record<string, string>
  } = {},
) {
  return React.forwardRef((props: any, ref: any) => {
    const { events = {}, mappings = {} } = options

    // Map React prop names to Lit property names
    const litProps: any = {}
    for (const [reactProp, litProp] of Object.entries(mappings)) {
      if (props[reactProp] !== undefined) {
        litProps[litProp] = props[reactProp]
      }
    }

    // Copy remaining props
    for (const [key, value] of Object.entries(props)) {
      if (!mappings[key]) {
        litProps[key] = value
      }
    }

    return createComponent({
      tagName: LitComponent.tagName || LitComponent.name.toLowerCase(),
      elementClass: LitComponent,
      events,
      constructorProps: litProps,
      ref,
    })
  })
}

/**
 * Default export for backwards compatibility
 */
export { createLitComponent as createLitReactComponent }

/**
 * Common event mappings for Raycast components
 */
export const RAYCAST_EVENTS = {
  onAction: 'action',
  onSelect: 'select',
  onChange: 'change',
  onSubmit: 'submit',
  onCancel: 'cancel',
}

/**
 * Common prop mappings for Raycast components
 */
export const RAYCAST_MAPPINGS = {
  // List component mappings
  items: 'items',
  searchBarPlaceholder: 'searchBarPlaceholder',
  actions: 'actions',

  // Action mappings
  title: 'title',
  subtitle: 'subtitle',
  onAction: 'onAction',

  // Detail component mappings
  markdown: 'markdown',
  isLoading: 'isLoading',

  // Form component mappings
  actions: 'actions',
  isLoading: 'isLoading',
  onSubmit: 'onSubmit',
}
