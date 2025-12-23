/**
 * Plugin Worker - Isolated execution environment for plugins
 * Based on Vicinae's worker architecture but adapted for web environment
 */
/**
 * Main plugin worker class
 */
class PluginWorker {
  constructor() {
    this.context = null
    this.api = null
    this.currentPlugin = null
    this.setupMessageHandlers()
    this.setupGlobalAPI()
    // Notify main thread that worker is ready
    this.postMessage({ type: 'ready' })
  }
  /**
   * Setup message handlers for communication with main thread
   */
  setupMessageHandlers() {
    self.addEventListener('message', async (event) => {
      const message = event.data
      try {
        await this.handleMessage(message)
      } catch (error) {
        this.postMessage({
          type: 'error',
          data: {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          },
        })
      }
    })
  }
  /**
   * Handle incoming messages from main thread
   */
  async handleMessage(message) {
    const { type, data } = message
    switch (type) {
      case 'execute':
        await this.executeCommand(data)
        break
      case 'load':
        await this.loadPlugin(data)
        break
      case 'unload':
        await this.unloadPlugin()
        break
      default:
        throw new Error(`Unknown message type: ${type}`)
    }
  }
  /**
   * Execute a plugin command
   */
  async executeCommand(data) {
    const { pluginId, commandName, context, mode } = data
    // Set global context
    globalThis.__pluginContext = context
    this.context = context
    try {
      // Load plugin module
      const pluginModule = await this.loadPluginModule(pluginId)
      if (mode === 'view') {
        await this.executeViewCommand(pluginModule, commandName)
      } else {
        await this.executeNoViewCommand(pluginModule, commandName)
      }
    } catch (error) {
      throw error
    }
  }
  /**
   * Execute a view command (React/Lit component)
   */
  async executeViewCommand(pluginModule, commandName) {
    // Get the command function
    const command = pluginModule[commandName] || pluginModule.default?.[commandName]
    if (!command) {
      throw new Error(`Command ${commandName} not found`)
    }
    // Execute the command to get the component
    const Component = typeof command === 'function' ? await command() : command
    if (!Component) {
      throw new Error(`Command ${commandName} did not return a component`)
    }
    // Create the component
    let component
    if (this.isLitElement(Component)) {
      // Handle Lit components
      component = this.createLitComponent(Component)
    } else if (this.isReactComponent(Component)) {
      // Handle React components (would need React renderer)
      component = await this.createReactComponent(Component)
    } else {
      // Handle plain HTML elements
      component = this.createHTMLComponent(Component)
    }
    // Send the component back to main thread
    this.postMessage({
      type: 'viewCreated',
      data: {
        view: component,
        html: component.outerHTML,
        styles: this.extractStyles(component),
      },
    })
  }
  /**
   * Execute a no-view command (function)
   */
  async executeNoViewCommand(pluginModule, commandName) {
    // Get the command function
    const command = pluginModule[commandName] || pluginModule.default?.[commandName]
    if (!command) {
      throw new Error(`Command ${commandName} not found`)
    }
    if (typeof command !== 'function') {
      throw new Error(`Command ${commandName} is not a function`)
    }
    // Execute the function
    await command(this.context?.arguments || {})
    // Notify completion
    this.postMessage({
      type: 'commandCompleted',
      data: {},
    })
  }
  /**
   * Load plugin module dynamically
   */
  async loadPluginModule(pluginId) {
    // In a real implementation, this would load from plugin path
    // For now, return a mock module
    const mockModule = {
      default: {
        [pluginId]: async () => {
          // Return a mock component
          return document.createElement('div')
        },
      },
    }
    return mockModule
  }
  /**
   * Check if value is a Lit Element
   */
  isLitElement(value) {
    return (
      value &&
      typeof value === 'function' &&
      value.prototype &&
      typeof value.prototype.render === 'function'
    )
  }
  /**
   * Check if value is a React Component
   */
  isReactComponent(value) {
    return (
      value &&
      (typeof value === 'function' || typeof value === 'object') &&
      value.$$typeof &&
      value.$$typeof.toString() === 'Symbol(react.element)'
    )
  }
  /**
   * Create Lit component instance
   */
  createLitComponent(ComponentClass) {
    const component = new ComponentClass()
    // Set properties from context
    if (this.context?.arguments) {
      Object.assign(component, this.context.arguments)
    }
    // Request update
    component.requestUpdate()
    return component
  }
  /**
   * Create React component instance
   */
  async createReactComponent(Component) {
    // This would require setting up a React renderer
    // For now, return a simple div
    const container = document.createElement('div')
    container.innerHTML = 'React Component (placeholder)'
    return container
  }
  /**
   * Create HTML element
   */
  createHTMLComponent(element) {
    if (typeof element === 'string') {
      const div = document.createElement('div')
      div.innerHTML = element
      return div.firstElementChild || div
    }
    if (element instanceof HTMLElement) {
      return element
    }
    // Default to div with string content
    const div = document.createElement('div')
    div.textContent = String(element)
    return div
  }
  /**
   * Extract styles from component
   */
  extractStyles(component) {
    const styles = []
    // Get shadow DOM styles
    if (component.shadowRoot) {
      const styleSheets = component.shadowRoot.styleSheets
      for (let i = 0; i < styleSheets.length; i++) {
        try {
          styles.push(
            Array.from(styleSheets[i].cssRules)
              .map((rule) => rule.cssText)
              .join('\n'),
          )
        } catch (e) {
          // Skip inaccessible stylesheets
        }
      }
    }
    return styles
  }
  /**
   * Setup global API for plugins
   */
  setupGlobalAPI() {
    // Create Raycast-compatible API
    const raycastAPI = {
      // UI components would be proxied to main thread
      List: this.createComponentProxy('List'),
      Grid: this.createComponentProxy('Grid'),
      Detail: this.createComponentProxy('Detail'),
      Form: this.createComponentProxy('Form'),
      Action: this.createComponentProxy('Action'),
      ActionPanel: this.createComponentProxy('ActionPanel'),
      // Navigation
      pop: () => this.callMainAPI('pop'),
      push: (view) => this.callMainAPI('push', { view }),
      replace: (view, options) => this.callMainAPI('replace', { view, options }),
      popToRoot: (type) => this.callMainAPI('popToRoot', { type }),
      clear: () => this.callMainAPI('clear'),
      open: (url) => this.callMainAPI('open', { url }),
      closeMainWindow: () => this.callMainAPI('closeMainWindow'),
      // Navigation hooks
      useNavigation: () => ({}),
      useNavigationState: () => ({}),
      // System APIs
      showToast: (options) => this.callMainAPI('showToast', { options }),
      showHUD: (message) => this.callMainAPI('showHUD', { message }),
      getApplications: () => this.callMainAPI('getApplications'),
      openApplication: (path) => this.callMainAPI('openApplication', { path }),
      // Data Storage
      LocalStorage: this.createStorageProxy('LocalStorage'),
      Cache: this.createStorageProxy('Cache'),
      // Clipboard
      Clipboard: this.createClipboardProxy(),
      // Environment
      environment: {
        supportsArguments: true,
        theme: 'dark',
      },
    }
    globalThis.__pluginAPI = raycastAPI
    // Make it globally available as @raycast/api for compatibility
    globalThis.require = (moduleName) => {
      if (moduleName === '@raycast/api') {
        return raycastAPI
      }
      throw new Error(`Module ${moduleName} not available in plugin worker`)
    }
  }
  /**
   * Create component proxy for UI components
   */
  createComponentProxy(componentName) {
    return new Proxy(
      {},
      {
        get: (target, prop) => {
          if (prop === 'default') {
            return this.createComponentProxy(componentName)
          }
          return (...args) => {
            return this.callMainAPI('createComponent', {
              componentName,
              props: args[0] || {},
              children: args.slice(1),
            })
          }
        },
      },
    )
  }
  /**
   * Create storage proxy for data APIs
   */
  createStorageProxy(storageType) {
    return new Proxy(
      {},
      {
        get: (target, prop) => {
          if (typeof prop === 'string') {
            return (...args) => {
              return this.callMainAPI('storageOperation', {
                storageType,
                operation: prop,
                args,
              })
            }
          }
        },
      },
    )
  }
  /**
   * Create clipboard proxy
   */
  createClipboardProxy() {
    return new Proxy(
      {},
      {
        get: (target, prop) => {
          if (typeof prop === 'string') {
            return (...args) => {
              return this.callMainAPI('clipboardOperation', {
                operation: prop,
                args,
              })
            }
          }
        },
      },
    )
  }
  /**
   * Call main thread API
   */
  async callMainAPI(method, data) {
    return new Promise((resolve, reject) => {
      const messageId = `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const messageHandler = (event) => {
        const { type, data: responseData } = event.data
        if (type === 'apiResponse' && responseData.messageId === messageId) {
          self.removeEventListener('message', messageHandler)
          if (responseData.error) {
            reject(new Error(responseData.error))
          } else {
            resolve(responseData.result)
          }
        }
      }
      self.addEventListener('message', messageHandler)
      this.postMessage({
        type: 'apiCall',
        data: {
          messageId,
          method,
          data,
        },
      })
    })
  }
  /**
   * Send message to main thread
   */
  postMessage(message) {
    self.postMessage(message)
  }
  /**
   * Log message to main thread
   */
  log(message, level = 'log') {
    this.postMessage({
      type: 'log',
      data: { message, level },
    })
  }
  /**
   * Load plugin from data
   */
  async loadPlugin(data) {
    console.log('Loading plugin:', data)
    // Store plugin data for later use
    this.currentPlugin = data
  }
  /**
   * Unload current plugin
   */
  async unloadPlugin() {
    console.log('Unloading plugin')
    this.currentPlugin = null
  }
}
// Initialize the plugin worker
new PluginWorker()
export {}
