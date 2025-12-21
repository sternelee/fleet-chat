/**
 * Plugin Component Serialization System
 *
 * Handles serialization and deserialization of React components
 * across the Web Worker boundary, inspired by Vicinae's approach
 */

import type { ReactElement } from './react-to-lit-compiler';

/**
 * Serialized component data that can be sent across worker boundary
 */
export interface SerializedComponent {
  id: string;
  type: string;
  props?: any;
  children?: SerializedComponent[];
  eventHandlers?: SerializedEventHandler[];
  textContent?: string;
  className?: string;
  styles?: Record<string, string>;
  attributes?: Record<string, string>;
}

/**
 * Serialized event handler reference
 */
export interface SerializedEventHandler {
  id: string;
  eventType: string;
  handlerId: string;
}

/**
 * Component update message
 */
export interface ComponentUpdate {
  componentId: string;
  type: 'create' | 'update' | 'destroy';
  component?: SerializedComponent;
  props?: any;
  children?: SerializedComponent[];
}

/**
 * Event message from worker to main thread
 */
export interface EventMessage {
  type: 'event';
  componentId: string;
  eventType: string;
  handlerId: string;
  data?: any;
}

/**
 * Component renderer message
 */
export interface RenderMessage {
  type: 'render';
  componentId: string;
  component: SerializedComponent;
}

/**
 * Component Serializer
 */
export class ComponentSerializer {
  private componentIdCounter = 0;
  private handlerIdCounter = 0;
  private eventHandlerRegistry = new Map<string, Function>();

  /**
   * Generate unique component ID
   */
  private generateComponentId(): string {
    return `comp_${++this.componentIdCounter}_${Date.now()}`;
  }

  /**
   * Generate unique event handler ID
   */
  private generateHandlerId(): string {
    return `handler_${++this.handlerIdCounter}_${Date.now()}`;
  }

  /**
   * Serialize a React element for transport
   */
  serialize(element: ReactElement, parentComponentId?: string): SerializedComponent {
    const componentId = this.generateComponentId();

    // Handle primitive values
    if (typeof element === 'string' || typeof element === 'number') {
      return {
        id: componentId,
        type: 'text',
        textContent: String(element)
      };
    }

    if (element == null) {
      return {
        id: componentId,
        type: 'empty'
      };
    }

    // Handle arrays
    if (Array.isArray(element)) {
      return {
        id: componentId,
        type: 'fragment',
        children: element.map(child => this.serialize(child, componentId)).filter(Boolean)
      };
    }

    const { type, props, children } = element;

    // Extract event handlers
    const eventHandlers: SerializedEventHandler[] = [];
    const cleanProps: any = {};

    if (props) {
      for (const [key, value] of Object.entries(props)) {
        if (typeof value === 'function' && key.startsWith('on')) {
          const handlerId = this.generateHandlerId();
          const eventType = key.slice(2).toLowerCase();

          this.eventHandlerRegistry.set(handlerId, value);
          eventHandlers.push({
            id: this.generateComponentId(),
            eventType,
            handlerId
          });
        } else {
          cleanProps[key] = value;
        }
      }
    }

    // Handle component serialization
    let serializedComponent: SerializedComponent = {
      id: componentId,
      type: typeof type === 'string' ? type : (type as Function).name || 'component',
      props: cleanProps,
      children: [],
      eventHandlers,
      className: cleanProps.className,
      attributes: {}
    };

    // Extract HTML attributes from props
    if (cleanProps && typeof cleanProps === 'object') {
      for (const [key, value] of Object.entries(cleanProps)) {
        if (key !== 'className' && key !== 'children' && key !== 'style') {
          if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            serializedComponent.attributes![key] = String(value);
          }
        }
      }

      // Handle styles
      if (cleanProps.style && typeof cleanProps.style === 'object') {
        serializedComponent.styles = cleanProps.style;
      }
    }

    // Serialize children
    if (children && children.length > 0) {
      serializedComponent.children = children.map(child =>
        this.serialize(child as ReactElement, componentId)
      ).filter(Boolean);
    }

    return serializedComponent;
  }

  /**
   * Deserialize a component back to React-like structure
   */
  deserialize(serialized: SerializedComponent): ReactElement {
    if (serialized.type === 'text') {
      return serialized.textContent || '';
    }

    if (serialized.type === 'empty') {
      return null as any;
    }

    // Reconstruct event handlers
    const props: any = { ...serialized.props };

    if (serialized.eventHandlers) {
      for (const eventHandler of serialized.eventHandlers) {
        const eventType = `on${eventHandler.eventType.charAt(0).toUpperCase()}${eventHandler.eventType.slice(1)}`;
        const handler = this.eventHandlerRegistry.get(eventHandler.handlerId);
        if (handler) {
          props[eventType] = handler;
        }
      }
    }

    // Restore attributes and styles
    if (serialized.attributes) {
      Object.assign(props, serialized.attributes);
    }

    if (serialized.styles) {
      props.style = serialized.styles;
    }

    if (serialized.className) {
      props.className = serialized.className;
    }

    // Deserialize children
    const children = serialized.children?.map(child => this.deserialize(child)) || [];

    return {
      type: serialized.type,
      props,
      children
    };
  }

  /**
   * Get registered event handler
   */
  getEventHandler(handlerId: string): Function | undefined {
    return this.eventHandlerRegistry.get(handlerId);
  }

  /**
   * Remove event handler
   */
  removeEventHandler(handlerId: string): void {
    this.eventHandlerRegistry.delete(handlerId);
  }

  /**
   * Clear all event handlers
   */
  clearEventHandlers(): void {
    this.eventHandlerRegistry.clear();
  }

  /**
   * Create render message
   */
  createRenderMessage(component: ReactElement): RenderMessage {
    const serialized = this.serialize(component);
    return {
      type: 'render',
      componentId: serialized.id,
      component: serialized
    };
  }

  /**
   * Create event message
   */
  createEventMessage(
    componentId: string,
    eventType: string,
    handlerId: string,
    data?: any
  ): EventMessage {
    return {
      type: 'event',
      componentId,
      eventType,
      handlerId,
      data
    };
  }

  /**
   * Serialize complex objects safely
   */
  serializeObject(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
      return obj;
    }

    if (obj instanceof Date) {
      return { __type: 'Date', value: obj.toISOString() };
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.serializeObject(item));
    }

    if (typeof obj === 'object') {
      const serialized: any = { __type: 'Object' };
      for (const [key, value] of Object.entries(obj)) {
        serialized[key] = this.serializeObject(value);
      }
      return serialized;
    }

    // Handle functions by converting to placeholder
    if (typeof obj === 'function') {
      return { __type: 'Function', name: obj.name };
    }

    return String(obj);
  }

  /**
   * Deserialize complex objects
   */
  deserializeObject(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
      return obj;
    }

    if (obj && typeof obj === 'object') {
      if (obj.__type === 'Date') {
        return new Date(obj.value);
      }

      if (obj.__type === 'Function') {
        return () => {
          console.warn(`Function ${obj.name} cannot be deserialized`);
        };
      }

      if (obj.__type === 'Object' || Array.isArray(obj)) {
        if (Array.isArray(obj)) {
          return obj.map(item => this.deserializeObject(item));
        } else {
          const deserialized: any = {};
          for (const [key, value] of Object.entries(obj)) {
            if (key !== '__type') {
              deserialized[key] = this.deserializeObject(value);
            }
          }
          return deserialized;
        }
      }
    }

    return obj;
  }
}

/**
 * Global serializer instance
 */
export const componentSerializer = new ComponentSerializer();

/**
 * Serialize component for transport
 */
export function serializeComponent(element: ReactElement): SerializedComponent {
  return componentSerializer.serialize(element);
}

/**
 * Deserialize component from transport
 */
export function deserializeComponent(serialized: SerializedComponent): ReactElement {
  return componentSerializer.deserialize(serialized);
}

/**
 * Create render message
 */
export function createRenderMessage(element: ReactElement): RenderMessage {
  return componentSerializer.createRenderMessage(element);
}
