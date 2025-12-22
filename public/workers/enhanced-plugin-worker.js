/**
 * Enhanced Plugin Worker
 * Handles isolated plugin execution with React-to-Lit compilation
 */

// Plugin context type definition (JSDoc for better IDE support)
/**
 * @typedef {Object} PluginContext
 * @property {any} plugin
 * @property {any} manifest
 * @property {any} api
 * @property {any} preferences
 * @property {any} environment
 * @property {Record<string, any>} args
 */

/**
 * @typedef {Object} WorkerMessage
 * @property {string} type
 * @property {any} data
 */

// Store loaded plugin modules
const loadedPlugins = new Map();
const loadedPluginData = new Map(); // Store plugin code and manifest
let currentApi = null;

/**
 * Create mock React component that can be converted to HTML
 */
function createMockReactElement(type, props = {}, ...children) {
  return {
    type,
    props: { ...props, children: children.flat() },
    $$typeof: Symbol.for("react.element"),
  };
}

/**
 * Convert React-like element to HTML string
 */
function reactToHtml(element) {
  if (!element) {
    return "";
  }

  // Handle primitives
  if (typeof element === "string" || typeof element === "number") {
    return String(element);
  }

  // Handle arrays
  if (Array.isArray(element)) {
    return element.map(reactToHtml).join("");
  }

  // Handle React elements
  if (element.$$typeof && element.$$typeof === Symbol.for("react.element")) {
    const { type, props } = element;

    if (type === "div" || type === "span") {
      const attributes = Object.entries(props)
        .filter(([key]) => key !== "children" && !key.startsWith("on"))
        .map(([key, value]) => `${key}="${value}"`)
        .join(" ");

      const childrenHtml = props.children ? reactToHtml(props.children) : "";
      return `<${type} ${attributes}>${childrenHtml}</${type}>`;
    }

    // Handle custom components by converting to div
    if (typeof type === "string") {
      const childrenHtml = props.children ? reactToHtml(props.children) : "";
      return `<div data-component="${type}">${childrenHtml}</div>`;
    }
  }

  // Fallback: convert to string
  return String(element);
}

/**
 * Convert React-like element to HTMLElement
 */
async function reactToLit(element) {
  try {
    const html = reactToHtml(element);

    // In Web Worker, we can't use document directly
    // Return a serialized version that can be reconstructed in the main thread
    return {
      type: "html-element",
      html: html,
      tagName: "div",
    };
  } catch (error) {
    console.error("Failed to convert React to Lit:", error);
    return {
      type: "html-element",
      html: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      tagName: "div",
      style: "color: red;",
    };
  }
}

/**
 * Execute plugin command
 */
async function executePluginCommand(pluginId, commandName, context, mode) {
  try {
    console.log(`[executePluginCommand] Starting execution for ${pluginId}/${commandName}`);

    const plugin = loadedPlugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    const command = plugin[commandName];
    if (!command || typeof command !== "function") {
      throw new Error(`Command not found: ${pluginId}/${commandName}`);
    }

    console.log(`[executePluginCommand] Executing command with args:`, context.args);

    // Execute command
    const result = await command(context.args);

    console.log(`[executePluginCommand] Command executed, result type:`, typeof result);
    console.log(`[executePluginCommand] Mode: ${mode}`);

    if (mode === "no-view") {
      console.log(`[executePluginCommand] No-view mode, returning`);
      return; // No view commands return nothing
    }

    // Convert result to HTMLElement
    let element;
    // In Web Worker, HTMLElement is not available, so we always use reactToLit
    if (result && result.type === "html-element") {
      console.log(`[executePluginCommand] Result is already serialized`);
      element = result;
    } else {
      console.log(`[executePluginCommand] Converting result to HTMLElement`);
      element = await reactToLit(result);
    }

    console.log(`[executePluginCommand] Returning element:`, element);
    return element;
  } catch (error) {
    console.error(`[executePluginCommand] Plugin command execution failed:`, error);
    throw error;
  }
}

/**
 * Load plugin module
 */
async function loadPluginModule(pluginId, sourcePath) {
  try {
    // For now, use the hello-world plugin directly
    if (pluginId === "hello-world") {
      // Create mock hello-world plugin functions
      return {
        hello: async function () {
          return createMockReactElement(
            "div",
            {},
            createMockReactElement("h1", {}, "Hello, World! 👋"),
            createMockReactElement("p", {}, "Welcome to Fleet Chat plugin system!"),
          );
        },

        helloList: async function () {
          const greetings = [
            { title: "Hello World", subtitle: "A classic greeting" },
            { title: "Hello Fleet Chat", subtitle: "Greeting for our application" },
            { title: "Hello Developer", subtitle: "A greeting for plugin developers" },
          ];

          const listItems = greetings.map((greeting) =>
            createMockReactElement(
              "div",
              {
                style: "padding: 8px; border: 1px solid #ccc; margin: 4px 0; border-radius: 4px;",
              },
              createMockReactElement("h3", { style: "margin: 0 0 4px 0;" }, greeting.title),
              createMockReactElement("p", { style: "margin: 0; color: #666;" }, greeting.subtitle),
            ),
          );

          return createMockReactElement("div", {}, ...listItems);
        },

        helloDetail: async function () {
          return createMockReactElement(
            "div",
            {},
            createMockReactElement("h1", {}, "Greeting Details 🎉"),
            createMockReactElement("p", {}, "This example demonstrates the Detail component."),
            createMockReactElement("h2", {}, "Features"),
            createMockReactElement(
              "ul",
              {},
              createMockReactElement("li", {}, "Raycast-compatible API"),
              createMockReactElement("li", {}, "Lit web components"),
              createMockReactElement("li", {}, "TypeScript support"),
            ),
          );
        },

        helloAction: async function () {
          // This would show a toast - handled by the main thread
          return {
            action: "showToast",
            data: { title: "Hello from Plugin!", message: "No-view command executed" },
          };
        },
      };
    }

    // Check if we have stored plugin data
    const pluginData = loadedPluginData.get(pluginId);
    if (pluginData && pluginData.manifest && pluginData.manifest.commands) {
      console.log(`[Worker] Loading plugin ${pluginId} from stored data`);

      // Create a simple mock module for the plugin
      const mockModule = {
        default: async (_props) => {
          return createMockReactElement(
            "div",
            {
              style: "padding: 20px; font-family: system-ui;",
            },
            createMockReactElement("h2", {}, `Plugin ${pluginId} Loaded!`),
            createMockReactElement("p", {}, `Plugin has ${Object.keys(pluginData.code || {}).length} source files`),
            createMockReactElement("p", {}, "This is a placeholder UI. Full plugin execution coming soon!"),
            createMockReactElement("pre", {
              style: "background: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 12px; overflow: auto;",
              children: JSON.stringify(pluginData.manifest, null, 2)
            }, "Manifest: " + JSON.stringify(pluginData.manifest, null, 2))
          );
        },
      };

      // Register commands from manifest
      pluginData.manifest.commands.forEach((cmd) => {
        mockModule[cmd.name] = async () => {
          return createMockReactElement(
            "div",
            {
              style: "padding: 20px; font-family: system-ui;",
            },
            createMockReactElement("h3", {}, `Command: ${cmd.title}`),
            createMockReactElement("p", {}, cmd.description || "No description"),
            createMockReactElement("p", { style: "color: #666; font-size: 14px;" }, `Mode: ${cmd.mode}`)
          );
        };
      });

      return mockModule;
    }

    throw new Error(`Unknown plugin: ${pluginId}`);
  } catch (error) {
    console.error(`Failed to load plugin module: ${pluginId}`, error);
    throw error;
  }
}

/**
 * Handle worker messages
 */
self.onmessage = async (event) => {
  const { type, data } = event.data;

  try {
    switch (type) {
      case "initialize":
        console.log("[Worker] Received initialize message:", data);
        // API object is not passed directly, will use message-based communication
        currentApi = null;

        const response = {
          type: "initialized",
          data: { success: true },
        };

        console.log("[Worker] Sending initialization response:", response);
        self.postMessage(response);
        break;

      case "loadPlugin":
        // Store plugin data if provided
        if (data.code || data.manifest) {
          console.log(`[Worker] Loading plugin ${data.pluginId} with code and manifest`);
          loadedPluginData.set(data.pluginId, {
            code: data.code,
            manifest: data.manifest
          });
        }

        const plugin = await loadPluginModule(data.pluginId, data.sourcePath);
        loadedPlugins.set(data.pluginId, plugin);

        self.postMessage({
          type: "pluginLoaded",
          data: { pluginId: data.pluginId },
        });
        break;

      case "execute":
        console.log(
          `[Worker] Executing command: ${data.pluginId}/${data.commandName}, mode: ${data.mode}, executionId: ${data.executionId}`,
        );

        const context = {
          plugin: loadedPlugins.get(data.pluginId),
          manifest: {}, // Would be provided by main thread
          api: currentApi,
          preferences: {},
          environment: "production",
          args: data.context?.args || {},
        };

        console.log(`[Worker] Context created, plugin loaded: ${!!context.plugin}`);

        try {
          const result = await executePluginCommand(
            data.pluginId,
            data.commandName,
            context,
            data.mode,
          );

          console.log(`[Worker] Command executed successfully, mode: ${data.mode}`);

          if (data.mode === "view") {
            console.log(
              `[Worker] Sending viewCreated message with executionId: ${data.executionId}`,
            );
            self.postMessage({
              type: "viewCreated",
              data: { view: result, executionId: data.executionId },
            });
          } else {
            // Handle no-view commands like toast notifications
            if (result && result.action === "showToast") {
              // Request main thread to show toast via message
              self.postMessage({
                type: "apiCall",
                data: {
                  method: "showToast",
                  args: [result.data],
                },
              });
            }
            self.postMessage({
              type: "noViewCompleted",
              data: { success: true, result, executionId: data.executionId },
            });
          }
        } catch (error) {
          console.error(`[Worker] Command execution error:`, error);
          self.postMessage({
            type: "error",
            data: {
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
              executionId: data.executionId,
            },
          });
        }
        break;

      case "cleanup":
        loadedPlugins.clear();
        self.postMessage({
          type: "cleanedUp",
          data: { success: true },
        });
        break;

      default:
        throw new Error(`Unknown worker message type: ${type}`);
    }
  } catch (error) {
    console.error("Worker error:", error);
    self.postMessage({
      type: "error",
      data: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
    });
  }
};

// Worker script - no exports needed
