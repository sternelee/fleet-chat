/**
 * React Compatibility Layer
 *
 * Provides React-compatible API for Raycast plugins
 * while using Lit components under the hood
 */

import {
  createElement,
  Fragment,
  ReactElement,
  ReactNode,
  reactToLitCompiler
} from './react-to-lit-compiler';
import { pluginEventSystem, PluginEventTypes } from './event-system';
import { componentSerializer, SerializedComponent } from './serialization';

/**
 * React Component interface
 */
export interface Component<P = {}> {
  (props: P): ReactElement;
  displayName?: string;
}

/**
 * React Function Component interface
 */
export interface FunctionComponent<P = {}> {
  (props: P): ReactElement;
  displayName?: string;
}

/**
 * React Context interface
 */
export interface Context<T> {
  Provider: Component<{ value?: T; children?: ReactNode }>;
  Consumer: Component<{ children: (value: T) => ReactNode }>;
}

/**
 * React Hook interface
 */
export type EffectCallback = () => void | (() => void);

/**
 * React-compatible Component Base Class
 */
export abstract class ReactComponent<P = {}, S = {}> {
  props: P;
  state: S;
  context: any;
  refs: any;

  constructor(props: P) {
    this.props = props;
    this.state = {} as S;
  }

  setState(partialState: Partial<S> | ((prevState: S, props: P) => Partial<S>), callback?: () => void): void {
    if (typeof partialState === 'function') {
      const newState = partialState(this.state, this.props);
      Object.assign(this.state, newState);
    } else {
      Object.assign(this.state, partialState);
    }

    // Trigger re-render
    this.forceUpdate(callback);
  }

  forceUpdate(callback?: () => void): void {
    // This would trigger a re-render in the actual React implementation
    // For our compatibility layer, we'll notify the renderer
    if (callback) {
      callback();
    }
  }

  abstract render(): ReactElement;

  componentDidMount(): void { }
  componentDidUpdate(prevProps: P, prevState: S): void { }
  componentWillUnmount(): void { }
}

/**
 * Context Registry
 */
const contextRegistry = new Map<string, any>();

/**
 * Create React context
 */
export function createContext<T>(defaultValue: T): Context<T> {
  const contextId = `context_${contextRegistry.size}_${Date.now()}`;

  const Provider: Component<{ value?: T; children?: ReactNode }> = ({ value = defaultValue, children }) => {
    contextRegistry.set(contextId, value);
    return createElement(Fragment, {}, children);
  };

  const Consumer: Component<{ children: (value: T) => ReactNode }> = ({ children }) => {
    const value = contextRegistry.get(contextId) || defaultValue;
    return (children as (value: T) => ReactElement)(value);
  };

  return { Provider, Consumer };
}

/**
 * Get context value
 */
export function useContext<T>(context: Context<T>): T {
  // In a real implementation, this would traverse the component tree
  // For our compatibility layer, we'll use the registry
  return contextRegistry.get('default') || null;
}

/**
 * Hook implementations
 */
const hookRegistry = new Map<string, any>();
const effectRegistry: Map<string, EffectCallback[]> = new Map();

let hookCounter = 0;

/**
 * useState hook
 */
export function useState<S>(initialState: S | (() => S)): [S, (newState: S | ((prevState: S) => S)) => void] {
  const hookId = `useState_${++hookCounter}`;

  if (!hookRegistry.has(hookId)) {
    hookRegistry.set(hookId,
      typeof initialState === 'function' ? (initialState as () => S)() : initialState
    );
  }

  const currentValue = hookRegistry.get(hookId);

  const setter = (newState: S | ((prevState: S) => S)) => {
    const value = typeof newState === 'function' ?
      (newState as (prevState: S) => S)(currentValue) : newState;
    hookRegistry.set(hookId, value);
  };

  return [currentValue, setter];
}

/**
 * useEffect hook
 */
export function useEffect(effect: EffectCallback, deps?: any[]): void {
  const hookId = `useEffect_${++hookCounter}`;

  if (!effectRegistry.has(hookId)) {
    effectRegistry.set(hookId, []);
  }

  const effects = effectRegistry.get(hookId);

  // Check if dependencies have changed
  // Simplified dependency checking
  if (!deps || deps.length === 0) {
    effects.push(effect);
  } else {
    effects.push(effect);
  }
}

/**
 * useCallback hook
 */
export function useCallback<T extends Function>(callback: T, deps: any[]): T {
  const hookId = `useCallback_${++hookCounter}`;

  if (!hookRegistry.has(hookId)) {
    hookRegistry.set(hookId, callback);
  }

  return callback;
}

/**
 * useMemo hook
 */
export function useMemo<T>(factory: () => T, deps: any[]): T {
  const hookId = `useMemo_${++hookCounter}`;

  if (!hookRegistry.has(hookId)) {
    hookRegistry.set(hookId, factory());
  }

  return hookRegistry.get(hookId);
}

/**
 * useRef hook
 */
export function useRef<T>(initialValue: T): { current: T } {
  const hookId = `useRef_${++hookCounter}`;

  if (!hookRegistry.has(hookId)) {
    hookRegistry.set(hookId, { current: initialValue });
  }

  return hookRegistry.get(hookId);
}

/**
 * React-compatible API exports
 */
export const React = {
  createElement,
  Fragment,
  Component: ReactComponent,
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef
};

/**
 * Plugin Renderer
 * Handles rendering of React components in the plugin environment
 */
export class PluginRenderer {
  private componentIdCounter = 0;
  private componentRegistry = new Map<string, any>();
  private rootElement: HTMLElement | null = null;

  constructor(rootElement?: HTMLElement) {
    this.rootElement = rootElement || null;
  }

  /**
   * Render React component to DOM
   */
  render(element: ReactElement, container: HTMLElement): void {
    this.rootElement = container;

    // Compile React element to Lit template
    const template = reactToLitCompiler.jsxToTemplate(element);

    // Clear container and render template
    container.innerHTML = '';

    // Create a temporary div to hold the template
    const tempDiv = document.createElement('div');
    this.renderTemplateToElement(template, tempDiv);

    // Move contents to container
    while (tempDiv.firstChild) {
      container.appendChild(tempDiv.firstChild);
    }

    // Register event listeners
    this.registerEventListeners(element, container);
  }

  /**
   * Render template to element
   */
  private renderTemplateToElement(template: any, element: HTMLElement): void {
    // This is a simplified implementation
    // In a full implementation, you'd use Lit's rendering system

    if (template.strings) {
      // Handle Lit template result
      const templateElement = document.createElement('template');
      templateElement.innerHTML = template.strings.join('');
      element.appendChild(templateElement.content.cloneNode(true));
    } else if (typeof template === 'string') {
      element.innerHTML = template;
    }
  }

  /**
   * Register event listeners for rendered component
   */
  private registerEventListeners(element: ReactElement, container: HTMLElement): void {
    // Register event listeners with the event system
    pluginEventSystem.registerEventTarget('root');

    // Add global event listeners
    this.addEventListeners(container, element);
  }

  /**
   * Recursively add event listeners
   */
  private addEventListeners(element: HTMLElement, reactElement: ReactElement): void {
    if (!reactElement || typeof reactElement !== 'object') {
      return;
    }

    const { props } = reactElement;
    if (!props) return;

    // Find all DOM elements and add event listeners
    const domElements = element.querySelectorAll('*');
    domElements.forEach(domElement => {
      const componentId = this.generateComponentId();
      pluginEventSystem.registerEventTarget(componentId, 'root');

      // Add event listeners for each prop that starts with 'on'
      Object.keys(props).forEach(propKey => {
        if (propKey.startsWith('on') && typeof props[propKey] === 'function') {
          const eventType = propKey.slice(2).toLowerCase();

          domElement.addEventListener(eventType, (event) => {
            const eventData = pluginEventSystem.createEventDataFromDOM(
              event,
              componentId,
              componentId
            );

            try {
              props[propKey](eventData);
            } catch (error) {
              console.error('Error in event handler:', error);
            }
          });
        }
      });
    });

    // Recursively handle children
    if (reactElement.children) {
      reactElement.children.forEach((child, index) => {
        if (element.children[index]) {
          this.addEventListeners(element.children[index] as HTMLElement, child as ReactElement);
        }
      });
    }
  }

  /**
   * Generate component ID
   */
  private generateComponentId(): string {
    return `comp_${++this.componentIdCounter}_${Date.now()}`;
  }

  /**
   * Unmount component
   */
  unmount(container?: HTMLElement): void {
    const targetContainer = container || this.rootElement;
    if (targetContainer) {
      targetContainer.innerHTML = '';
      pluginEventSystem.cleanupComponent('root');
    }
  }

  /**
   * Update component
   */
  update(element: ReactElement, container?: HTMLElement): void {
    const targetContainer = container || this.rootElement;
    if (targetContainer) {
      this.render(element, targetContainer);
    }
  }

  /**
   * Create portal for rendering outside root
   */
  createPortal(children: ReactNode, container: HTMLElement): ReactElement {
    return createElement('portal', { container }, children);
  }
}

/**
 * Global renderer instance
 */
export const pluginRenderer = new PluginRenderer();

/**
 * Default export for Raycast compatibility
 */
export default {
  ...React,
  render: pluginRenderer.render.bind(pluginRenderer),
  createRoot: (container: HTMLElement) => ({
    render: (element: ReactElement) => pluginRenderer.render(element, container),
    unmount: () => pluginRenderer.unmount(container)
  })
};
