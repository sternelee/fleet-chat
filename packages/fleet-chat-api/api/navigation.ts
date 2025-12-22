/**
 * Navigation Context and Hooks for Fleet Chat Plugins
 *
 * Provides React-compatible navigation context and hooks for plugin navigation
 * Inspired by Vicinae's navigation system but adapted for Lit components
 */

import { atom } from "nanostores";

// Navigation state types
export interface NavigationState {
  stack: NavigationItem[];
  currentIndex: number;
  isTransitioning: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
}

export interface NavigationItem {
  id: string;
  component: HTMLElement | null;
  title?: string;
  props?: Record<string, any>;
  timestamp: number;
}

export interface NavigationContext {
  state: NavigationState;
  push: (component: HTMLElement, options?: NavigationOptions) => Promise<void>;
  pop: () => Promise<void>;
  popToRoot: (type?: "immediate" | "animated") => Promise<void>;
  replace: (component: HTMLElement, options?: NavigationOptions) => Promise<void>;
  clear: () => Promise<void>;
  canGoBack: () => boolean;
  canGoForward: () => boolean;
  getCurrentComponent: () => HTMLElement | null;
  getCurrentTitle: () => string;
}

export interface NavigationOptions {
  title?: string;
  props?: Record<string, any>;
  animated?: boolean;
  replace?: boolean;
}

// Global navigation state store
export const navigationStore = atom<NavigationState>({
  stack: [],
  currentIndex: -1,
  isTransitioning: false,
  canGoBack: false,
  canGoForward: false,
});

// Navigation context implementation
class NavigationManager implements NavigationContext {
  private listeners: Set<(state: NavigationState) => void> = new Set();
  private componentIdCounter = 0;

  get state(): NavigationState {
    return navigationStore.get();
  }

  private updateState(updates: Partial<NavigationState>): void {
    const currentState = navigationStore.get();
    const newState = { ...currentState, ...updates };
    navigationStore.set(newState);
    this.notifyListeners(newState);
  }

  private notifyListeners(state: NavigationState): void {
    this.listeners.forEach((listener) => listener(state));
  }

  private generateComponentId(): string {
    return `nav-component-${++this.componentIdCounter}`;
  }

  async push(component: HTMLElement, options: NavigationOptions = {}): Promise<void> {
    if (this.state.isTransitioning) return;

    this.updateState({ isTransitioning: true });

    try {
      const navigationItem: NavigationItem = {
        id: this.generateComponentId(),
        component,
        title: options.title,
        props: options.props,
        timestamp: Date.now(),
      };

      const currentStack = [...this.state.stack];

      // If we're not at the top of the stack, truncate everything after current index
      if (this.state.currentIndex < currentStack.length - 1) {
        currentStack.splice(this.state.currentIndex + 1);
      }

      // Add new item to stack
      currentStack.push(navigationItem);

      this.updateState({
        stack: currentStack,
        currentIndex: currentStack.length - 1,
        canGoBack: currentStack.length > 1,
        canGoForward: false,
        isTransitioning: false,
      });

      // Emit navigation event for UI components
      this.emitNavigationEvent("push", navigationItem);
    } catch (error) {
      console.error("Navigation push failed:", error);
      this.updateState({ isTransitioning: false });
      throw error;
    }
  }

  async pop(): Promise<void> {
    if (this.state.isTransitioning || !this.canGoBack()) return;

    this.updateState({ isTransitioning: true });

    try {
      const currentStack = [...this.state.stack];
      const newIndex = this.state.currentIndex - 1;

      // Remove current item from stack
      const poppedItem = currentStack.pop();

      this.updateState({
        stack: currentStack,
        currentIndex: newIndex,
        canGoBack: newIndex > 0,
        canGoForward: false,
        isTransitioning: false,
      });

      // Emit navigation event
      if (poppedItem) {
        this.emitNavigationEvent("pop", poppedItem);
      }
    } catch (error) {
      console.error("Navigation pop failed:", error);
      this.updateState({ isTransitioning: false });
      throw error;
    }
  }

  async popToRoot(type: "immediate" | "animated" = "immediate"): Promise<void> {
    if (this.state.isTransitioning || this.state.stack.length === 0) return;

    this.updateState({ isTransitioning: true });

    try {
      const currentStack = [...this.state.stack];
      const rootItems = currentStack.slice(0, 1);

      this.updateState({
        stack: rootItems,
        currentIndex: 0,
        canGoBack: false,
        canGoForward: false,
        isTransitioning: false,
      });

      // Emit navigation event
      this.emitNavigationEvent("popToRoot", { type });
    } catch (error) {
      console.error("Navigation popToRoot failed:", error);
      this.updateState({ isTransitioning: false });
      throw error;
    }
  }

  async replace(component: HTMLElement, options: NavigationOptions = {}): Promise<void> {
    if (this.state.isTransitioning || this.state.currentIndex < 0) {
      // If no current item, push instead
      return this.push(component, options);
    }

    this.updateState({ isTransitioning: true });

    try {
      const navigationItem: NavigationItem = {
        id: this.generateComponentId(),
        component,
        title: options.title,
        props: options.props,
        timestamp: Date.now(),
      };

      const currentStack = [...this.state.stack];
      currentStack[this.state.currentIndex] = navigationItem;

      this.updateState({
        stack: currentStack,
        isTransitioning: false,
      });

      // Emit navigation event
      this.emitNavigationEvent("replace", navigationItem);
    } catch (error) {
      console.error("Navigation replace failed:", error);
      this.updateState({ isTransitioning: false });
      throw error;
    }
  }

  async clear(): Promise<void> {
    if (this.state.isTransitioning) return;

    this.updateState({
      stack: [],
      currentIndex: -1,
      canGoBack: false,
      canGoForward: false,
      isTransitioning: false,
    });

    this.emitNavigationEvent("clear", null);
  }

  canGoBack(): boolean {
    return this.state.canGoBack && this.state.currentIndex > 0;
  }

  canGoForward(): boolean {
    return this.state.canGoForward && this.state.currentIndex < this.state.stack.length - 1;
  }

  getCurrentComponent(): HTMLElement | null {
    const currentItem = this.state.stack[this.state.currentIndex];
    return currentItem?.component || null;
  }

  getCurrentTitle(): string {
    const currentItem = this.state.stack[this.state.currentIndex];
    return currentItem?.title || "";
  }

  // Event listener management
  subscribe(listener: (state: NavigationState) => void): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emitNavigationEvent(type: string, data: any): void {
    if (typeof window !== "undefined") {
      const event = new CustomEvent("navigation", {
        detail: { type, data, state: this.state },
      });
      window.dispatchEvent(event);
    }
  }

  // Utility methods for plugins
  getDepth(): number {
    return this.state.stack.length;
  }

  getNavigationPath(): string[] {
    return this.state.stack.map((item) => item.title || item.id);
  }

  findComponentById(id: string): HTMLElement | null {
    const item = this.state.stack.find((item) => item.id === id);
    return item?.component || null;
  }

  findComponentByTitle(title: string): HTMLElement | null {
    const item = this.state.stack.find((item) => item.title === title);
    return item?.component || null;
  }
}

// Global navigation manager instance
export const navigationManager = new NavigationManager();

// React-compatible hooks
export function useNavigation(): NavigationContext {
  return navigationManager;
}

export function useNavigationState(): NavigationState {
  return navigationStore.get();
}

export function useCurrentComponent(): HTMLElement | null {
  return navigationManager.getCurrentComponent();
}

export function useCanGoBack(): boolean {
  return navigationManager.canGoBack();
}

export function useCanGoForward(): boolean {
  return navigationManager.canGoForward();
}

// Enhanced hooks for React-like experience
export function useNavigationListener(listener: (state: NavigationState) => void): void {
  // Subscribe to navigation changes
  navigationManager.subscribe(listener);
}

export function useBackAction(): () => Promise<void> {
  return () => navigationManager.pop();
}

export function useNavigationDepth(): number {
  return navigationManager.getDepth();
}

// Utility functions for external navigation control
export async function push(component: HTMLElement, options?: NavigationOptions): Promise<void> {
  return navigationManager.push(component, options);
}

export async function pop(): Promise<void> {
  return navigationManager.pop();
}

export async function popToRoot(type?: "immediate" | "animated"): Promise<void> {
  return navigationManager.popToRoot(type);
}

export async function replace(component: HTMLElement, options?: NavigationOptions): Promise<void> {
  return navigationManager.replace(component, options);
}

export async function clear(): Promise<void> {
  return navigationManager.clear();
}

// Keyboard navigation support
export function attachKeyboardNavigation(): (() => void) | void {
  if (typeof window === "undefined") return;

  const handleKeyDown = (event: KeyboardEvent) => {
    // Check for modifier keys to avoid interfering with app shortcuts
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    switch (event.key) {
      case "Escape":
        if (navigationManager.canGoBack()) {
          event.preventDefault();
          navigationManager.pop();
        }
        break;
      case "Backspace":
        // Allow backspace navigation only when not focused on input elements
        const activeElement = document.activeElement;
        if (
          !activeElement ||
          (activeElement.tagName !== "INPUT" &&
            activeElement.tagName !== "TEXTAREA" &&
            (activeElement as HTMLElement).contentEditable !== "true")
        ) {
          if (navigationManager.canGoBack()) {
            event.preventDefault();
            navigationManager.pop();
          }
        }
        break;
    }
  };

  window.addEventListener("keydown", handleKeyDown);

  // Return cleanup function (not used here but useful for React-like cleanup)
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  return (): void => {
    window.removeEventListener("keydown", handleKeyDown);
  };
}

// Initialize keyboard navigation
if (typeof window !== "undefined") {
  attachKeyboardNavigation();
}
