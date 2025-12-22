/**
 * Enhanced Plugin Worker
 *
 * Advanced plugin worker with React-to-Lit compilation,
 * event handling, and serialization support
 * Based on Vicinae's worker architecture
 */
import { createElement } from "../../packages/fleet-chat-api/renderer/index.js";
// Placeholder implementations until these are moved to the API package
const componentSerializer = {
    serialize: (element) => ({
        type: "html-element",
        tagName: element.tagName || "div",
        html: element.outerHTML || element.toString(),
        styles: []
    })
};
const pluginEventSystem = {
    emit: (event) => { },
    on: (eventType, handler) => { },
    off: (eventType, handler) => { }
};
const React = {
    createElement,
    Fragment: 'Fragment'
};
const pluginRenderer = {
    render: (element) => element.toString(),
    mount: (element, container) => {
        container.appendChild(element);
    }
};
/**
 * Enhanced Plugin Worker Class
 */
class EnhancedPluginWorker {
    constructor() {
        this.context = null;
        this._api = null;
        this.loadedPluginCodes = new Map(); // Store plugin code
        this.commands = new Map();
        this.currentComponent = null;
        this.messageIdCounter = 0;
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
    setupGlobalAPI() {
        // Set up global React API
        globalThis.__React = React;
        globalThis.__pluginRenderer = this.renderer;
        // Mock require for Raycast compatibility
        globalThis.require = (moduleName) => {
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
    createRaycastAPI() {
        const raycastAPI = {
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
            push: (view) => this.callMainAPI("push", { view }),
            open: (url) => this.callMainAPI("open", { url }),
            closeMainWindow: () => this.callMainAPI("closeMainWindow"),
            // System APIs
            showToast: (options) => this.callMainAPI("showToast", { options }),
            showHUD: (message) => this.callMainAPI("showHUD", { message }),
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
    setupMessageHandlers() {
        self.addEventListener("message", async (event) => {
            const message = event.data;
            try {
                await this.handleMessage(message);
            }
            catch (error) {
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
    setupEventForwarding() {
        // Forward events from plugin event system to main thread
        pluginEventSystem.addEventListener("root", PluginEventTypes.ACTION, (event) => {
            this.sendEventToMainThread(event);
        });
        pluginEventSystem.addEventListener("root", PluginEventTypes.NAVIGATE, (event) => {
            this.sendEventToMainThread(event);
        });
    }
    /**
     * Handle incoming messages from main thread
     */
    async handleMessage(message) {
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
    async executeCommand(data) {
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
            }
            else {
                await this.executeNoViewCommand(command);
            }
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * Execute a view command (React component)
     */
    async executeViewCommand(command) {
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
    async executeNoViewCommand(command) {
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
    async loadPluginModule(pluginId) {
        try {
            const pluginData = this.loadedPluginCodes.get(pluginId);
            if (!pluginData) {
                throw new Error(`No plugin data found for ${pluginId}`);
            }
            // Try to load the actual plugin code
            let pluginModule;
            try {
                // Look for main plugin entry point
                const mainCode = pluginData.code['plugin.js'] ||
                    pluginData.code['index.js'] ||
                    pluginData.code['src/index.js'];
                if (mainCode) {
                    // Execute the plugin code in the worker context
                    const moduleFunction = new Function('React', 'createElement', 'showToast', mainCode);
                    pluginModule = moduleFunction(React, createElement, this.createMockToast());
                }
                else {
                    console.warn(`No main entry point found for plugin ${pluginId}`);
                    // Fall back to mock module
                    pluginModule = this.createMockModule(pluginId);
                }
            }
            catch (error) {
                console.error(`Failed to load plugin ${pluginId}, falling back to mock:`, error);
                pluginModule = this.createMockModule(pluginId);
            }
            // Store the loaded module
            this.plugins.set(pluginId, pluginModule);
            // Load plugin commands
            await this.loadPluginCommands(pluginId);
        }
        catch (error) {
            console.error(`Failed to load plugin module ${pluginId}:`, error);
            throw error;
        }
    }
    createMockModule(pluginId) {
        return {
            default: async (_props) => {
                const { createElement } = React;
                return createElement("div", {
                    style: { padding: "20px", fontFamily: "system-ui" },
                }, [
                    createElement("h2", {}, `Hello from ${pluginId}!`),
                    createElement("p", {}, "This is a rendered React component."),
                    createElement("button", {
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
                    }, "Click me!"),
                ]);
            },
        };
        // Check if we have stored plugin data
        const pluginData = this.loadedPluginCodes.get(pluginId);
        if (pluginData && pluginData.manifest && pluginData.manifest.commands) {
            // Register commands from manifest
            pluginData.manifest.commands.forEach((cmd) => {
                this.commands.set(cmd.name, {
                    name: cmd.name,
                    module: mockModule,
                    type: cmd.mode === "no-view" ? "no-view" : "view",
                });
            });
        }
        else if (pluginId === "hello-world") {
            // Load actual plugin commands for hello-world
            await this.loadPluginCommands(pluginId);
        }
        else {
            // Default command for other plugins
            this.commands.set("default", {
                name: "default",
                module: mockModule,
                type: "view",
            });
        }
    }
    catch(error) {
        console.error("Failed to load plugin module:", error);
        throw error;
    }
}
async;
loadPluginCommands(pluginId, string);
Promise < void  > {
    // This would scan for and register actual plugin commands
    // For now, register the hello-world commands
    const: helloWorldCommands = {
        hello: {
            _name: "hello",
            module: await this.createHelloWorldCommand("hello"),
            type: "view",
        },
        helloList: {
            _name: "helloList",
            module: await this.createHelloListCommand("helloList"),
            type: "view",
        },
        helloDetail: {
            _name: "helloDetail",
            module: await this.createHelloDetailCommand("helloDetail"),
            type: "view",
        },
        helloAction: {
            _name: "helloAction",
            module: await this.createHelloActionCommand("helloAction"),
            type: "no-view",
        },
    },
    Object, : .assign(Object.fromEntries(this.commands), helloWorldCommands)
};
async;
createHelloWorldCommand(name, string);
{
    return {
        default: (props) => {
            const { createElement } = React;
            return createElement("div", {
                style: {
                    padding: "24px",
                    fontFamily: "system-ui, -apple-system, sans-serif",
                    color: "#333",
                },
            }, [
                createElement("h1", {
                    style: { fontSize: "24px", marginBottom: "16px" },
                }, "Hello, World! 👋"),
                createElement("p", {
                    style: { fontSize: "16px", lineHeight: "1.5" },
                }, "This is a React component rendered through the Enhanced Plugin Worker."),
                createElement("button", {
                    onClick: () => this.callMainAPI("showToast", {
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
                }, "Show Toast"),
            ]);
        },
    };
}
async;
createHelloListCommand(name, string);
{
    return {
        default: (props) => {
            const { createElement } = React;
            const items = [
                { title: "Hello World", subtitle: "A classic greeting" },
                { title: "Hello Fleet Chat", subtitle: "Our app greeting" },
                { title: "Hello Developer", subtitle: "For plugin creators" },
            ];
            return createElement("div", {
                style: { padding: "24px", fontFamily: "system-ui" },
            }, [
                createElement("h2", { style: { marginBottom: "16px" } }, "Hello List"),
                createElement("div", { style: { display: "flex", flexDirection: "column", gap: "8px" } }, items.map((item) => createElement("div", {
                    key: item.title,
                    style: {
                        padding: "12px",
                        border: "1px solid #ddd",
                        borderRadius: "6px",
                        cursor: "pointer",
                        background: "#f9f9f9",
                    },
                    onClick: () => this.callMainAPI("showToast", {
                        options: { title: item.title, message: item.subtitle },
                    }),
                }, [
                    createElement("div", { style: { fontWeight: "bold" } }, item.title),
                    createElement("div", { style: { fontSize: "14px", color: "#666" } }, item.subtitle),
                ]))),
            ]);
        },
    };
}
async;
createHelloDetailCommand(name, string);
{
    return {
        default: (props) => {
            const { createElement } = React;
            return createElement("div", {
                style: {
                    padding: "24px",
                    fontFamily: "system-ui",
                    maxWidth: "800px",
                    margin: "0 auto",
                },
            }, [
                createElement("h1", { style: { marginBottom: "16px" } }, "Hello Details 🎉"),
                createElement("p", { style: { lineHeight: "1.6" } }, "This demonstrates the Detail component with comprehensive content support."),
                createElement("h2", { style: { marginTop: "24px", marginBottom: "12px" } }, "Typography"),
                createElement("p", {}, "This is regular text with **bold** and *italic* formatting."),
                createElement("h3", { style: { marginTop: "16px", marginBottom: "8px" } }, "Code Example"),
                createElement("pre", {
                    style: {
                        background: "#f5f5f5",
                        padding: "12px",
                        borderRadius: "6px",
                        fontSize: "14px",
                        overflow: "auto",
                    },
                }, "function hello(name) {\n  return `Hello, ${name}!`;\n}"),
            ]);
        },
    };
}
async;
createHelloActionCommand(name, string);
{
    return {
        default: async (_props) => {
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
serializeRenderedComponent(container, HTMLElement);
SerializedComponent;
{
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
serializeElementChildren(element, HTMLElement);
SerializedComponent[];
{
    const children = [];
    for (const child of element.children) {
        const serialized = {
            id: `child_${children.length}`,
            type: child.tagName.toLowerCase(),
            textContent: child.textContent || undefined,
            className: child.className,
            attributes: this.extractAttributes(child),
            styles: this.extractComputedStyle(child),
            children: this.serializeElementChildren(child),
        };
        children.push(serialized);
    }
    return children;
}
extractAttributes(element, HTMLElement);
Record < string, string > {
    const: attributes
};
{ }
;
for (const attr of element.attributes) {
    attributes[attr.name] = attr.value;
}
return attributes;
extractComputedStyle(element, HTMLElement);
Record < string, string > {
    const: styles
};
{ }
;
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
extractStyles(container, HTMLElement);
string[];
{
    const styles = [];
    // Get styles from shadow DOM if present
    if (container.shadowRoot) {
        const styleSheets = container.shadowRoot.styleSheets;
        for (let i = 0; i < styleSheets.length; i++) {
            try {
                styles.push(Array.from(styleSheets[i].cssRules)
                    .map((rule) => rule.cssText)
                    .join("\n"));
            }
            catch (e) {
                // Skip inaccessible stylesheets
            }
        }
    }
    // Extract inline styles
    const elementsWithStyles = container.querySelectorAll("[style]");
    elementsWithStyles.forEach((el) => {
        const style = el.getAttribute("style");
        if (style) {
            styles.push(`.inline-style { ${style} }`);
        }
    });
    return styles;
}
async;
handleMainThreadEvent(eventData, PluginEventData);
Promise < void  > {
    // Forward to plugin event system
    await, pluginEventSystem, : .dispatchEvent(eventData)
};
sendEventToMainThread(eventData, PluginEventData);
void {
    this: .postMessage({
        type: "event",
        data: eventData,
    })
};
createComponentProxy(componentName, string);
any;
{
    return new Proxy({}, {
        get: (_target, prop) => {
            if (prop === "default") {
                return this.createComponentProxy(componentName);
            }
            return (...args) => {
                // Create React element using our createElement
                return createElement(componentName, args[0] || {}, args.slice(1));
            };
        },
    });
}
createStorageProxy(storageType, string);
any;
{
    return new Proxy({}, {
        get: (_target, prop) => {
            if (typeof prop === "string") {
                return (...args) => {
                    return this.callMainAPI("storageOperation", {
                        storageType,
                        operation: prop,
                        args,
                    });
                };
            }
        },
    });
}
createClipboardProxy();
any;
{
    return new Proxy({}, {
        get: (_target, prop) => {
            if (typeof prop === "string") {
                return (...args) => {
                    return this.callMainAPI("clipboardOperation", {
                        operation: prop,
                        args,
                    });
                };
            }
        },
    });
}
async;
callMainAPI(method, string, data ?  : any);
Promise < any > {
    return: new Promise((resolve, reject) => {
        const messageId = this.generateMessageId();
        const messageHandler = (event) => {
            const { type, data: responseData } = event.data;
            if (type === "apiResponse" && responseData.messageId === messageId) {
                self.removeEventListener("message", messageHandler);
                if (responseData.error) {
                    reject(new Error(responseData.error));
                }
                else {
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
    })
};
handleAPIResponse(data, any);
void {
    // This would be handled by the Promise in callMainAPI
    console, : .log("API Response:", data)
};
generateMessageId();
string;
{
    return `msg_${++this.messageIdCounter}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
postMessage(message, WorkerMessage);
void {
    self, : .postMessage(message)
};
log(_message, string, level, "log" | "warn" | "error", "log");
void {
    this: .postMessage({
        type: "log",
        data: { message, level },
    })
};
createMockToast();
{
    return async (options) => {
        console.log(`Plugin Toast: ${options.title}`, options.message || '');
        // In a real implementation, this would call back to the main thread
        this.postMessage({
            type: 'apiCall',
            data: {
                method: 'showToast',
                data: { options }
            }
        });
    };
}
/**
 * Cleanup resources
 */
cleanup();
void {
    : .currentComponent
};
{
    this.renderer.unmount(this.currentComponent);
    this.currentComponent = null;
}
// Cleanup event system
pluginEventSystem.cleanupComponent("root");
// Clear commands
this.commands.clear();
async;
loadPlugin(data, any);
Promise < void  > {
    // Store plugin code if provided
    if(data) { }, : .code
};
{
    console.log(`Storing plugin code for ${data.pluginId}`);
    this.loadedPluginCodes.set(data.pluginId, {
        code: data.code,
        manifest: data.manifest
    });
}
await this.loadPluginModule(data.pluginId);
async;
unloadPlugin();
Promise < void  > {
    this: .cleanup()
};
// Initialize the enhanced plugin worker
new EnhancedPluginWorker();
