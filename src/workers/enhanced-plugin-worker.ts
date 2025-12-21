/**
 * Enhanced Plugin Worker
 *
 * Advanced plugin worker with React-to-Lit compilation,
 * event handling, and serialization support
 * Based on Vicinae's worker architecture
 */

import type { PluginContext, RaycastAPI, PluginManifest } from "../plugins/plugin-system";
import { React, pluginRenderer, PluginRenderer } from "../plugins/renderer/react-compat";
import { reactToLitCompiler, createElement } from "../plugins/renderer/react-to-lit-compiler";
import {
  componentSerializer,
  SerializedComponent,
  RenderMessage,
} from "../plugins/renderer/serialization";
import {
  pluginEventSystem,
  PluginEventData,
  PluginEventTypes,
} from "../plugins/renderer/event-system";

// Global plugin context and API
declare global {
  var __pluginContext: PluginContext | undefined;
  var __pluginAPI: RaycastAPI | undefined;
  var __pluginManifest: PluginManifest | undefined;
  var __pluginRenderer: PluginRenderer;
  var __React: typeof React;
}

interface WorkerMessage {
  type: string;
  data: any;
  messageId?: string;
}

interface PluginCommand {
  name: string;
  module: any;
  type: "view" | "no-view";
}

/**
 * Enhanced Plugin Worker Class
 */
class EnhancedPluginWorker {
  private context: PluginContext | null = null;
  private _api: RaycastAPI | null = null;
  private renderer: PluginRenderer;
  private commands: Map<string, PluginCommand> = new Map();
  private currentComponent: HTMLElement | null = null;
  private messageIdCounter = 0;

  constructor() {
    this.renderer = new PluginRenderer();
    this.setupGlobalAPI();
    this.setupMessageHandlers();
    this.setupEventForwarding();

    // Notify main thread that worker is ready
    this.postMessage({ type: "ready", data: {} });
  }

  /**
   * Setup React-compatible global API
   */
  private setupGlobalAPI(): void {
    // Set up global React API
    globalThis.__React = React;
    globalThis.__pluginRenderer = this.renderer;

    // Mock require for Raycast compatibility
    (globalThis as any).require = (moduleName: string) => {
      if (moduleName === "@raycast/api") {
        return this.createRaycastAPI();
      }

      if (moduleName === "react") {
        return React;
      }

      throw new Error(`Module ${moduleName} not available in plugin worker`);
    };

    // Set up import maps for modern ES modules
    if (typeof importScripts !== "undefined") {
      // Import any additional scripts needed
      // importScripts('/libs/react-compatible.js');
    }
  }

  /**
   * Create Raycast-compatible API
   */
  private createRaycastAPI(): RaycastAPI {
    const raycastAPI: RaycastAPI = {
      // UI Components - create proxies that return React elements
      List: {
        ...this.createComponentProxy("List"),
        Item: this.createComponentProxy("List.Item"),
      },
      Grid: {
        ...this.createComponentProxy("Grid"),
        Item: this.createComponentProxy("Grid.Item"),
      },
      Detail: this.createComponentProxy("Detail"),
      Form: this.createComponentProxy("Form"),
      Action: this.createComponentProxy("Action"),
      ActionPanel: this.createComponentProxy("ActionPanel"),

      // Navigation methods
      pop: () => this.callMainAPI("pop"),
      push: (view: HTMLElement) => this.callMainAPI("push", { view }),
      open: (url: string) => this.callMainAPI("open", { url }),
      closeMainWindow: () => this.callMainAPI("closeMainWindow"),

      // System APIs
      showToast: (options) => this.callMainAPI("showToast", { options }),
      showHUD: (message: string) => this.callMainAPI("showHUD", { message }),

      // Data Storage
      LocalStorage: this.createStorageProxy("localStorage"),
      Cache: this.createStorageProxy("cache"),

      // Clipboard
      Clipboard: this.createClipboardProxy(),

      // Environment
      environment: {
        supportsArguments: true,
        theme: "dark",
      },
    };

    return raycastAPI;
  }

  /**
   * Setup message handlers for communication with main thread
   */
  private setupMessageHandlers(): void {
    self.addEventListener("message", async (event) => {
      const message: WorkerMessage = event.data;

      try {
        await this.handleMessage(message);
      } catch (error) {
        console.error("Worker error:", error);
        this.postMessage({
          type: "error",
          data: {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          },
          messageId: message.messageId,
        });
      }
    });
  }

  /**
   * Setup event forwarding to main thread
   */
  private setupEventForwarding(): void {
    // Forward events from plugin event system to main thread
    pluginEventSystem.addEventListener("root", PluginEventTypes.ACTION, (event: any) => {
      this.sendEventToMainThread(event);
    });

    pluginEventSystem.addEventListener("root", PluginEventTypes.NAVIGATE, (event: any) => {
      this.sendEventToMainThread(event);
    });
  }

  /**
   * Handle incoming messages from main thread
   */
  private async handleMessage(message: WorkerMessage): Promise<void> {
    const { type, data } = message;

    switch (type) {
      case "execute":
        await this.executeCommand(data);
        break;

      case "load":
        await this.loadPlugin(data);
        break;

      case "unload":
        await this.unloadPlugin();
        break;

      case "event":
        await this.handleMainThreadEvent(data);
        break;

      case "apiResponse":
        this.handleAPIResponse(data);
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  }

  /**
   * Execute a plugin command
   */
  private async executeCommand(data: any): Promise<void> {
    const { pluginId, commandName, context, mode } = data;

    // Set global context
    globalThis.__pluginContext = context;
    this.context = context;

    try {
      // Load plugin module if not already loaded
      if (!this.commands.has(commandName)) {
        await this.loadPluginModule(pluginId);
      }

      const command = this.commands.get(commandName);
      if (!command) {
        throw new Error(`Command ${commandName} not found`);
      }

      if (mode === "view") {
        await this.executeViewCommand(command);
      } else {
        await this.executeNoViewCommand(command);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Execute a view command (React component)
   */
  private async executeViewCommand(command: PluginCommand): Promise<void> {
    // Execute the command to get the React component
    const ReactComponent = command.module.default || command.module;

    if (typeof ReactComponent !== "function") {
      throw new Error(`Command must export a function or component`);
    }

    // Execute with React-compatible context
    const element = await ReactComponent(this.context?.arguments || {});

    if (!element) {
      throw new Error(`Command did not return a component`);
    }

    // Create a container for the component
    const container = document.createElement("div");
    container.id = "plugin-root";

    // Render the React component
    this.renderer.render(element, container);
    this.currentComponent = container;

    // Serialize the rendered component
    const serializedComponent = this.serializeRenderedComponent(container);

    // Send the component back to main thread
    this.postMessage({
      type: "viewCreated",
      data: {
        component: serializedComponent,
        html: container.outerHTML,
        styles: this.extractStyles(container),
      },
    });
  }

  /**
   * Execute a no-view command (function)
   */
  private async executeNoViewCommand(command: PluginCommand): Promise<void> {
    const ReactComponent = command.module.default || command.module;

    if (typeof ReactComponent !== "function") {
      throw new Error(`Command must export a function`);
    }

    // Execute the function
    await ReactComponent(this.context?.arguments || {});

    // Notify completion
    this.postMessage({
      type: "commandCompleted",
      data: {},
    });
  }

  /**
   * Load plugin module dynamically
   */
  private async loadPluginModule(pluginId: string): Promise<void> {
    try {
      // In a real implementation, this would load the actual plugin module
      // For now, we'll create a mock module

      const mockModule = {
        default: async (_props: any) => {
          const { createElement } = React;

          return createElement(
            "div",
            {
              style: { padding: "20px", fontFamily: "system-ui" },
            },
            [
              createElement("h2", {}, `Hello from ${pluginId}!`),
              createElement("p", {}, "This is a rendered React component."),
              createElement(
                "button",
                {
                  onClick: () => {
                    this.sendEventToMainThread({
                      type: "action",
                      componentId: "root",
                      targetId: "root",
                      bubbles: false,
                      cancelable: false,
                      timestamp: Date.now(),
                      customData: { action: "button-click" },
                    });
                  },
                },
                "Click me!",
              ),
            ],
          );
        },
      };

      this.commands.set("default", {
        name: "default",
        module: mockModule,
        type: "view",
      });

      // Load actual plugin commands
      await this.loadPluginCommands(pluginId);
    } catch (error) {
      console.error("Failed to load plugin module:", error);
      throw error;
    }
  }

  /**
   * Load actual plugin commands
   */
  private async loadPluginCommands(pluginId: string): Promise<void> {
    // This would scan for and register actual plugin commands
    // For now, register the hello-world commands
    const helloWorldCommands = {
      hello: {
        _name: "hello",
        module: await this.createHelloWorldCommand("hello"),
        type: "view" as const,
      },
      helloList: {
        _name: "helloList",
        module: await this.createHelloListCommand("helloList"),
        type: "view" as const,
      },
      helloDetail: {
        _name: "helloDetail",
        module: await this.createHelloDetailCommand("helloDetail"),
        type: "view" as const,
      },
      helloAction: {
        _name: "helloAction",
        module: await this.createHelloActionCommand("helloAction"),
        type: "no-view" as const,
      },
    };

    Object.assign(Object.fromEntries(this.commands), helloWorldCommands);
  }

  /**
   * Create Hello World command
   */
  private async createHelloWorldCommand(name: string) {
    return {
      default: (props: any) => {
        const { createElement } = React;

        return createElement(
          "div",
          {
            style: {
              padding: "24px",
              fontFamily: "system-ui, -apple-system, sans-serif",
              color: "#333",
            },
          },
          [
            createElement(
              "h1",
              {
                style: { fontSize: "24px", marginBottom: "16px" },
              },
              "Hello, World! 👋",
            ),
            createElement(
              "p",
              {
                style: { fontSize: "16px", lineHeight: "1.5" },
              },
              "This is a React component rendered through the Enhanced Plugin Worker.",
            ),
            createElement(
              "button",
              {
                onClick: () =>
                  this.callMainAPI("showToast", {
                    options: { title: "Hello!", message: "From plugin worker" },
                  }),
                style: {
                  padding: "8px 16px",
                  background: "#007AFF",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px",
                },
              },
              "Show Toast",
            ),
          ],
        );
      },
    };
  }

  /**
   * Create Hello List command
   */
  private async createHelloListCommand(name: string) {
    return {
      default: (props: any) => {
        const { createElement } = React;
        const items = [
          { title: "Hello World", subtitle: "A classic greeting" },
          { title: "Hello Fleet Chat", subtitle: "Our app greeting" },
          { title: "Hello Developer", subtitle: "For plugin creators" },
        ];

        return createElement(
          "div",
          {
            style: { padding: "24px", fontFamily: "system-ui" },
          },
          [
            createElement("h2", { style: { marginBottom: "16px" } }, "Hello List"),
            createElement(
              "div",
              { style: { display: "flex", flexDirection: "column", gap: "8px" } },
              items.map((item) =>
                createElement(
                  "div",
                  {
                    key: item.title,
                    style: {
                      padding: "12px",
                      border: "1px solid #ddd",
                      borderRadius: "6px",
                      cursor: "pointer",
                      background: "#f9f9f9",
                    },
                    onClick: () =>
                      this.callMainAPI("showToast", {
                        options: { title: item.title, message: item.subtitle },
                      }),
                  },
                  [
                    createElement("div", { style: { fontWeight: "bold" } }, item.title),
                    createElement(
                      "div",
                      { style: { fontSize: "14px", color: "#666" } },
                      item.subtitle,
                    ),
                  ],
                ),
              ),
            ),
          ],
        );
      },
    };
  }

  /**
   * Create Hello Detail command
   */
  private async createHelloDetailCommand(name: string) {
    return {
      default: (props: any) => {
        const { createElement } = React;

        return createElement(
          "div",
          {
            style: {
              padding: "24px",
              fontFamily: "system-ui",
              maxWidth: "800px",
              margin: "0 auto",
            },
          },
          [
            createElement("h1", { style: { marginBottom: "16px" } }, "Hello Details 🎉"),
            createElement(
              "p",
              { style: { lineHeight: "1.6" } },
              "This demonstrates the Detail component with comprehensive content support.",
            ),
            createElement(
              "h2",
              { style: { marginTop: "24px", marginBottom: "12px" } },
              "Typography",
            ),
            createElement("p", {}, "This is regular text with **bold** and *italic* formatting."),
            createElement(
              "h3",
              { style: { marginTop: "16px", marginBottom: "8px" } },
              "Code Example",
            ),
            createElement(
              "pre",
              {
                style: {
                  background: "#f5f5f5",
                  padding: "12px",
                  borderRadius: "6px",
                  fontSize: "14px",
                  overflow: "auto",
                },
              },
              "function hello(name) {\n  return `Hello, ${name}!`;\n}",
            ),
          ],
        );
      },
    };
  }

  /**
   * Create Hello Action command
   */
  private async createHelloActionCommand(name: string) {
    return {
      default: async (_props: any) => {
        await this.callMainAPI("showToast", {
          options: {
            title: "Hello from Plugin! 🎉",
            message: "This is a no-view command that shows a notification",
            style: "success",
          },
        });
      },
    };
  }

  /**
   * Serialize rendered component
   */
  private serializeRenderedComponent(container: HTMLElement): SerializedComponent {
    return {
      id: "plugin-root",
      type: "div",
      props: {},
      children: this.serializeElementChildren(container),
      className: container.className,
      attributes: this.extractAttributes(container),
      styles: this.extractComputedStyle(container),
    };
  }

  /**
   * Serialize element children
   */
  private serializeElementChildren(element: HTMLElement): SerializedComponent[] {
    const children: SerializedComponent[] = [];

    for (const child of element.children) {
      const serialized: SerializedComponent = {
        id: `child_${children.length}`,
        type: child.tagName.toLowerCase(),
        textContent: child.textContent || undefined,
        className: child.className,
        attributes: this.extractAttributes(child),
        styles: this.extractComputedStyle(child),
        children: this.serializeElementChildren(child as HTMLElement),
      };

      children.push(serialized);
    }

    return children;
  }

  /**
   * Extract attributes from element
   */
  private extractAttributes(element: HTMLElement): Record<string, string> {
    const attributes: Record<string, string> = {};

    for (const attr of element.attributes) {
      attributes[attr.name] = attr.value;
    }

    return attributes;
  }

  /**
   * Extract computed styles
   */
  private extractComputedStyle(element: HTMLElement): Record<string, string> {
    const styles: Record<string, string> = {};
    const computedStyle = window.getComputedStyle(element);

    // Extract only relevant styles
    const relevantStyles = [
      "display",
      "position",
      "width",
      "height",
      "margin",
      "padding",
      "background",
      "color",
      "font-family",
      "font-size",
      "font-weight",
      "border",
      "border-radius",
      "box-shadow",
      "opacity",
    ];

    for (const style of relevantStyles) {
      const value = computedStyle.getPropertyValue(style);
      if (value && value !== "initial" && value !== "normal") {
        styles[style] = value;
      }
    }

    return styles;
  }

  /**
   * Extract styles from component
   */
  private extractStyles(container: HTMLElement): string[] {
    const styles: string[] = [];

    // Get styles from shadow DOM if present
    if (container.shadowRoot) {
      const styleSheets = container.shadowRoot.styleSheets;
      for (let i = 0; i < styleSheets.length; i++) {
        try {
          styles.push(
            Array.from(styleSheets[i].cssRules)
              .map((rule) => rule.cssText)
              .join("\n"),
          );
        } catch (e) {
          // Skip inaccessible stylesheets
        }
      }
    }

    // Extract inline styles
    const elementsWithStyles = container.querySelectorAll("[style]");
    elementsWithStyles.forEach((el) => {
      const style = (el as HTMLElement).getAttribute("style");
      if (style) {
        styles.push(`.inline-style { ${style} }`);
      }
    });

    return styles;
  }

  /**
   * Handle events from main thread
   */
  private async handleMainThreadEvent(eventData: PluginEventData): Promise<void> {
    // Forward to plugin event system
    await pluginEventSystem.dispatchEvent(eventData);
  }

  /**
   * Send event to main thread
   */
  private sendEventToMainThread(eventData: PluginEventData): void {
    this.postMessage({
      type: "event",
      data: eventData,
    });
  }

  /**
   * Create component proxy for UI components
   */
  private createComponentProxy(componentName: string): any {
    return new Proxy(
      {},
      {
        get: (_target, prop) => {
          if (prop === "default") {
            return this.createComponentProxy(componentName);
          }

          return (...args: any[]) => {
            // Create React element using our createElement
            return createElement(componentName, args[0] || {}, args.slice(1));
          };
        },
      },
    );
  }

  /**
   * Create storage proxy for data APIs
   */
  private createStorageProxy(storageType: string): any {
    return new Proxy(
      {},
      {
        get: (_target, prop) => {
          if (typeof prop === "string") {
            return (...args: any[]) => {
              return this.callMainAPI("storageOperation", {
                storageType,
                operation: prop,
                args,
              });
            };
          }
        },
      },
    );
  }

  /**
   * Create clipboard proxy
   */
  private createClipboardProxy(): any {
    return new Proxy(
      {},
      {
        get: (_target, prop) => {
          if (typeof prop === "string") {
            return (...args: any[]) => {
              return this.callMainAPI("clipboardOperation", {
                operation: prop,
                args,
              });
            };
          }
        },
      },
    );
  }

  /**
   * Call main thread API
   */
  private async callMainAPI(method: string, data?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const messageId = this.generateMessageId();

      const messageHandler = (event: MessageEvent) => {
        const { type, data: responseData } = event.data;

        if (type === "apiResponse" && responseData.messageId === messageId) {
          self.removeEventListener("message", messageHandler);

          if (responseData.error) {
            reject(new Error(responseData.error));
          } else {
            resolve(responseData.result);
          }
        }
      };

      self.addEventListener("message", messageHandler);

      this.postMessage({
        type: "apiCall",
        data: {
          messageId,
          method,
          data,
        },
      });
    });
  }

  /**
   * Handle API response from main thread
   */
  private handleAPIResponse(data: any): void {
    // This would be handled by the Promise in callMainAPI
    console.log("API Response:", data);
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${++this.messageIdCounter}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Send message to main thread
   */
  private postMessage(message: WorkerMessage): void {
    self.postMessage(message);
  }

  /**
   * Log message to main thread
   */
  private log(_message: string, level: "log" | "warn" | "error" = "log"): void {
    this.postMessage({
      type: "log",
      data: { message, level },
    });
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Unmount current component
    if (this.currentComponent) {
      this.renderer.unmount(this.currentComponent);
      this.currentComponent = null;
    }

    // Cleanup event system
    pluginEventSystem.cleanupComponent("root");

    // Clear commands
    this.commands.clear();
  }

  /**
   * Load plugin
   */
  private async loadPlugin(data: any): Promise<void> {
    await this.loadPluginModule(data.pluginId);
  }

  /**
   * Unload plugin
   */
  private async unloadPlugin(): Promise<void> {
    this.cleanup();
  }
}

// Initialize the enhanced plugin worker
new EnhancedPluginWorker();

// Export types for plugin developers
export type { PluginContext, RaycastAPI };
