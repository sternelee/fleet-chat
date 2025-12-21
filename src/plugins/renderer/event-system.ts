/**
 * Plugin Event System
 *
 * Handles event delegation, bubbling, and cross-process communication
 * for plugin components, inspired by React's synthetic event system
 */

import type { SerializedEventHandler, SerializedComponent } from './serialization';

/**
 * Event data for cross-process communication
 */
export interface PluginEventData {
  type: string;
  componentId: string;
  targetId: string;
  bubbles: boolean;
  cancelable: boolean;
  timestamp: number;
  nativeEvent?: {
    type: string;
    key?: string;
    ctrlKey?: boolean;
    metaKey?: boolean;
    shiftKey?: boolean;
    preventDefault?: boolean;
    stopPropagation?: boolean;
  };
  customData?: any;
}

/**
 * Event listener configuration
 */
export interface EventListenerConfig {
  componentId: string;
  eventType: string;
  handler: Function;
  capture?: boolean;
  passive?: boolean;
  once?: boolean;
}

/**
 * Event Target interface for plugin components
 */
export interface PluginEventTarget {
  componentId: string;
  parentComponentId?: string;
  childComponentIds: string[];
  eventListeners: Map<string, EventListenerConfig[]>;
}

/**
 * Plugin Event System
 * Manages event handling across plugin workers and main thread
 */
export class PluginEventSystem {
  private eventTargets = new Map<string, PluginEventTarget>();
  private globalListeners = new Map<string, EventListenerConfig[]>();
  private eventQueue: PluginEventData[] = [];
  private isProcessing = false;

  /**
   * Register event target (component)
   */
  registerEventTarget(
    componentId: string,
    parentComponentId?: string
  ): void {
    const target: PluginEventTarget = {
      componentId,
      parentComponentId,
      childComponentIds: [],
      eventListeners: new Map()
    };

    this.eventTargets.set(componentId, target);

    // Update parent's child references
    if (parentComponentId) {
      const parent = this.eventTargets.get(parentComponentId);
      if (parent) {
        parent.childComponentIds.push(componentId);
      }
    }
  }

  /**
   * Unregister event target
   */
  unregisterEventTarget(componentId: string): void {
    const target = this.eventTargets.get(componentId);
    if (!target) return;

    // Remove from parent's child references
    if (target.parentComponentId) {
      const parent = this.eventTargets.get(target.parentComponentId);
      if (parent) {
        parent.childComponentIds = parent.childComponentIds.filter(id => id !== componentId);
      }
    }

    // Remove child targets
    for (const childId of target.childComponentIds) {
      this.eventTargets.delete(childId);
    }

    // Clear event listeners
    target.eventListeners.clear();
    this.eventTargets.delete(componentId);
  }

  /**
   * Add event listener
   */
  addEventListener(
    componentId: string,
    eventType: string,
    handler: Function,
    options?: { capture?: boolean; passive?: boolean; once?: boolean }
  ): void {
    const target = this.eventTargets.get(componentId);
    if (!target) {
      console.warn(`Event target not found: ${componentId}`);
      return;
    }

    const listenerConfig: EventListenerConfig = {
      componentId,
      eventType,
      handler,
      capture: options?.capture ?? false,
      passive: options?.passive ?? false,
      once: options?.once ?? false
    };

    if (!target.eventListeners.has(eventType)) {
      target.eventListeners.set(eventType, []);
    }

    target.eventListeners.get(eventType)!.push(listenerConfig);
  }

  /**
   * Remove event listener
   */
  removeEventListener(
    componentId: string,
    eventType: string,
    handler?: Function
  ): void {
    const target = this.eventTargets.get(componentId);
    if (!target) return;

    const listeners = target.eventListeners.get(eventType);
    if (!listeners) return;

    if (handler) {
      // Remove specific handler
      const index = listeners.findIndex(l => l.handler === handler);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    } else {
      // Remove all handlers for this event type
      listeners.length = 0;
    }

    if (listeners.length === 0) {
      target.eventListeners.delete(eventType);
    }
  }

  /**
   * Dispatch event
   */
  async dispatchEvent(eventData: PluginEventData): Promise<boolean> {
    this.eventQueue.push(eventData);

    if (!this.isProcessing) {
      return this.processEventQueue();
    }

    return true;
  }

  /**
   * Process event queue
   */
  private async processEventQueue(): Promise<boolean> {
    this.isProcessing = true;

    while (this.eventQueue.length > 0) {
      const eventData = this.eventQueue.shift()!;
      await this.processEvent(eventData);
    }

    this.isProcessing = false;
    return true;
  }

  /**
   * Process single event
   */
  private async processEvent(eventData: PluginEventData): Promise<void> {
    const target = this.eventTargets.get(eventData.componentId);
    if (!target) return;

    let prevented = false;
    let stopped = false;

    // Create event object for handlers
    const syntheticEvent = {
      type: eventData.type,
      target: eventData.componentId,
      currentTarget: eventData.componentId,
      bubbles: eventData.bubbles,
      cancelable: eventData.cancelable,
      timeStamp: eventData.timestamp,
      defaultPrevented: false,
      propagationStopped: false,
      preventDefault: () => {
        syntheticEvent.defaultPrevented = true;
        prevented = true;
      },
      stopPropagation: () => {
        syntheticEvent.propagationStopped = true;
        stopped = true;
      },
      nativeEvent: eventData.nativeEvent,
      data: eventData.customData
    };

    // Execute listeners in capture phase (parent to child)
    await this.executeCapturePhase(eventData, syntheticEvent);

    // Execute target listeners
    if (!stopped) {
      await this.executeTargetPhase(target, eventData.type, syntheticEvent);
    }

    // Execute listeners in bubble phase (child to parent)
    if (!stopped && eventData.bubbles) {
      await this.executeBubblePhase(target, eventData.type, syntheticEvent);
    }
  }

  /**
   * Execute capture phase listeners
   */
  private async executeCapturePhase(
    eventData: PluginEventData,
    syntheticEvent: any
  ): Promise<void> {
    const capturePath = this.getCapturePath(eventData.componentId);

    for (const targetId of capturePath) {
      const target = this.eventTargets.get(targetId);
      if (!target) continue;

      const listeners = target.eventListeners.get(eventData.type);
      if (!listeners) continue;

      const captureListeners = listeners.filter(l => l.capture);
      for (const listener of captureListeners) {
        try {
          await listener.handler(syntheticEvent);

          if (listener.once) {
            this.removeEventListener(targetId, eventData.type, listener.handler);
          }

          if (syntheticEvent.propagationStopped) {
            break;
          }
        } catch (error) {
          console.error('Error in capture phase event handler:', error);
        }
      }
    }
  }

  /**
   * Execute target phase listeners
   */
  private async executeTargetPhase(
    target: PluginEventTarget,
    eventType: string,
    syntheticEvent: any
  ): Promise<void> {
    const listeners = target.eventListeners.get(eventType);
    if (!listeners) return;

    const targetListeners = listeners.filter(l => !l.capture);
    for (const listener of targetListeners) {
      try {
        await listener.handler(syntheticEvent);

        if (listener.once) {
          this.removeEventListener(target.componentId, eventType, listener.handler);
        }

        if (syntheticEvent.propagationStopped) {
          break;
        }
      } catch (error) {
        console.error('Error in target phase event handler:', error);
      }
    }
  }

  /**
   * Execute bubble phase listeners
   */
  private async executeBubblePhase(
    target: PluginEventTarget,
    eventType: string,
    syntheticEvent: any
  ): Promise<void> {
    let currentTarget: PluginEventTarget | undefined = target;

    while (currentTarget) {
      const parentId = currentTarget.parentComponentId;
      if (!parentId) break;

      const parent = this.eventTargets.get(parentId);
      if (!parent) break;

      const listeners = parent.eventListeners.get(eventType);
      if (listeners) {
        const bubbleListeners = listeners.filter(l => !l.capture);

        for (const listener of bubbleListeners) {
          try {
            syntheticEvent.currentTarget = parentId;
            await listener.handler(syntheticEvent);

            if (listener.once) {
              this.removeEventListener(parentId, eventType, listener.handler);
            }

            if (syntheticEvent.propagationStopped) {
              break;
            }
          } catch (error) {
            console.error('Error in bubble phase event handler:', error);
          }
        }
      }

      currentTarget = parent;
    }
  }

  /**
   * Get capture path for event
   */
  private getCapturePath(targetId: string): string[] {
    const path: string[] = [];
    let currentId: string | undefined = targetId;

    while (currentId) {
      const target = this.eventTargets.get(currentId);
      if (!target) break;

      path.unshift(currentId);
      currentId = target.parentComponentId;
    }

    return path;
  }

  /**
   * Create event data from DOM event
   */
  createEventDataFromDOM(
    domEvent: Event,
    componentId: string,
    targetId: string,
    customData?: any
  ): PluginEventData {
    const keyboardEvent = domEvent as KeyboardEvent;

    return {
      type: domEvent.type,
      componentId,
      targetId,
      bubbles: domEvent.bubbles,
      cancelable: domEvent.cancelable,
      timestamp: Date.now(),
      nativeEvent: {
        type: domEvent.type,
        key: keyboardEvent.key,
        ctrlKey: keyboardEvent.ctrlKey,
        metaKey: keyboardEvent.metaKey,
        shiftKey: keyboardEvent.shiftKey
      },
      customData
    };
  }

  /**
   * Send event to worker
   */
  sendEventToWorker(worker: Worker, eventData: PluginEventData): void {
    worker.postMessage({
      type: 'event',
      data: eventData
    });
  }

  /**
   * Send event from worker to main thread
   */
  sendEventFromWorker(eventData: PluginEventData): void {
    // In worker context, post to main thread
    if (typeof self !== 'undefined' && self.postMessage) {
      self.postMessage({
        type: 'event',
        data: eventData
      });
    }
  }

  /**
   * Cleanup events for component
   */
  cleanupComponent(componentId: string): void {
    // Remove all event listeners
    const target = this.eventTargets.get(componentId);
    if (target) {
      target.eventListeners.clear();
    }

    // Remove event target
    this.unregisterEventTarget(componentId);
  }

  /**
   * Get event statistics
   */
  getStats(): {
    totalTargets: number;
    totalListeners: number;
    queuedEvents: number;
  } {
    let totalListeners = 0;

    for (const target of this.eventTargets.values()) {
      for (const listeners of target.eventListeners.values()) {
        totalListeners += listeners.length;
      }
    }

    return {
      totalTargets: this.eventTargets.size,
      totalListeners,
      queuedEvents: this.eventQueue.length
    };
  }
}

/**
 * Global event system instance
 */
export const pluginEventSystem = new PluginEventSystem();

/**
 * Event types for plugin components
 */
export const PluginEventTypes = {
  // Mouse events
  CLICK: 'click',
  DOUBLE_CLICK: 'dblclick',
  MOUSE_DOWN: 'mousedown',
  MOUSE_UP: 'mouseup',
  MOUSE_OVER: 'mouseover',
  MOUSE_OUT: 'mouseout',
  MOUSE_MOVE: 'mousemove',

  // Keyboard events
  KEY_DOWN: 'keydown',
  KEY_UP: 'keyup',
  KEY_PRESS: 'keypress',

  // Touch events
  TOUCH_START: 'touchstart',
  TOUCH_MOVE: 'touchmove',
  TOUCH_END: 'touchend',
  TOUCH_CANCEL: 'touchcancel',

  // Form events
  SUBMIT: 'submit',
  CHANGE: 'change',
  INPUT: 'input',
  FOCUS: 'focus',
  BLUR: 'blur',

  // Component events
  COMPONENT_MOUNT: 'componentMount',
  COMPONENT_UNMOUNT: 'componentUnmount',
  COMPONENT_UPDATE: 'componentUpdate',

  // Custom events
  ACTION: 'action',
  NAVIGATE: 'navigate',
  SELECT: 'select'
} as const;
