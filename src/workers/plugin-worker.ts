/**
 * Plugin Worker - Isolated execution environment for plugins
 * Based on Vicinae's worker architecture but adapted for web environment
 */

import type {
  PluginContext,
  PluginManifestData,
} from '../plugins/plugin-system.js'

// Define RaycastAPI interface locally since it's not in the central API
interface RaycastAPI {
  List: any
  Grid: any
  Detail: any
  Form: any
  Action: any
  ActionPanel: any
  showToast: (options: any) => Promise<void>
  showHUD: (message: string) => Promise<void>
  open: (url: string) => Promise<void>
  closeMainWindow: () => Promise<void>
  getApplications: () => Promise<any[]>
  openApplication: (path: string) => Promise<void>
  pop: () => Promise<void>
  push: (view: HTMLElement, options?: any) => Promise<void>
  replace: (view: HTMLElement, options?: any) => Promise<void>
  popToRoot: (type?: 'immediate' | 'animated') => Promise<void>
  clear: () => Promise<void>
  useNavigation: () => any
  useNavigationState: () => any
  LocalStorage: any
  Cache: any
  Clipboard: any
  environment: {
    supportsArguments: boolean
    theme: 'light' | 'dark'
  }
}

// Global plugin context and API
declare global {
  var __pluginContext: PluginContext | undefined
  var __pluginAPI: RaycastAPI | undefined
  var __pluginManifest: PluginManifestData | undefined
}

interface WorkerMessage {
  type: string
  data?: any
}

/**
 * Main plugin worker class
 */
class PluginWorker {
  private context: PluginContext | null = null
  private currentPlugin: any = null

  constructor() {
    this.setupMessageHandlers()
    this.setupGlobalAPI()

    // Notify main thread that worker is ready
    this.postMessage({ type: 'ready' })
  }

  /**
   * Setup message handlers for communication with main thread
   */
  private setupMessageHandlers(): void {
    self.addEventListener('message', async (event) => {
      const message: WorkerMessage = event.data

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
  private async handleMessage(message: WorkerMessage): Promise<void> {
    const { type, data } = message

    switch (type) {
      case 'initialize':
        // Respond to initialization message
        this.postMessage({ type: 'initialized', data: { timestamp: Date.now() } })
        break

      case 'execute':
        await this.executeCommand(data)
        break

      case 'load':
        await this.loadPlugin(data)
        break

      case 'loadPlugin':
        // Alias for load - plugin manager sends this
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
  private async executeCommand(data: any): Promise<void> {
    const { pluginId, commandName, context, mode, executionId } = data

    // Set global context
    globalThis.__pluginContext = context
    this.context = context

    try {
      // Load plugin module
      const pluginModule = await this.loadPluginModule(pluginId)

      if (mode === 'view') {
        await this.executeViewCommand(pluginModule, commandName, executionId)
      } else {
        await this.executeNoViewCommand(pluginModule, commandName)
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * Execute a view command (React/Lit component)
   *
   * IMPORTANT: Web Workers don't have DOM access, so we can't create
   * HTMLElements or execute plugin code here. Instead, we send the
   * plugin code back to the main thread for evaluation.
   */
  private async executeViewCommand(
    _pluginModule: any,
    commandName: string,
    executionId?: string,
  ): Promise<void> {
    // Send the plugin code back to main thread for evaluation
    // The main thread will create a Blob URL and dynamically import the module
    this.postMessage({
      type: 'viewCreated',
      data: {
        executionId,
        component: {
          type: 'react',
          name: commandName,
        },
        // Include plugin code for main thread evaluation
        pluginCode: this.currentPlugin?.code,
        commandName,
      },
    })
  }

  /**
   * Execute a no-view command (function)
   */
  private async executeNoViewCommand(pluginModule: any, commandName: string): Promise<void> {
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
  private async loadPluginModule(pluginId: string): Promise<any> {
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
   * Setup global API for plugins
   */
  private setupGlobalAPI(): void {
    // Create Raycast-compatible API
    const raycastAPI: RaycastAPI = {
      // UI components would be proxied to main thread
      List: this.createComponentProxy('List'),
      Grid: this.createComponentProxy('Grid'),
      Detail: this.createComponentProxy('Detail'),
      Form: this.createComponentProxy('Form'),
      Action: this.createComponentProxy('Action'),
      ActionPanel: this.createComponentProxy('ActionPanel'),

      // Navigation
      pop: () => this.callMainAPI('pop'),
      push: (view: HTMLElement) => this.callMainAPI('push', { view }),
      replace: (view: HTMLElement, options?: any) => this.callMainAPI('replace', { view, options }),
      popToRoot: (type?: 'immediate' | 'animated') => this.callMainAPI('popToRoot', { type }),
      clear: () => this.callMainAPI('clear'),
      open: (url: string) => this.callMainAPI('open', { url }),
      closeMainWindow: () => this.callMainAPI('closeMainWindow'),

      // Navigation hooks
      useNavigation: () => ({}) as any,
      useNavigationState: () => ({}) as any,

      // System APIs
      showToast: (options: any) => this.callMainAPI('showToast', { options }),
      showHUD: (message: string) => this.callMainAPI('showHUD', { message }),
      getApplications: () => this.callMainAPI('getApplications'),
      openApplication: (path: string) => this.callMainAPI('openApplication', { path }),

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
    ;(globalThis as any).require = (moduleName: string) => {
      if (moduleName === '@raycast/api') {
        return raycastAPI
      }
      throw new Error(`Module ${moduleName} not available in plugin worker`)
    }
  }

  /**
   * Create component proxy for UI components
   */
  private createComponentProxy(componentName: string): any {
    return new Proxy(
      {},
      {
        get: (_target, prop) => {
          if (prop === 'default') {
            return this.createComponentProxy(componentName)
          }
          return (...args: any[]) => {
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
  private createStorageProxy(storageType: string): any {
    return new Proxy(
      {},
      {
        get: (_target, prop) => {
          if (typeof prop === 'string') {
            return (...args: any[]) => {
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
  private createClipboardProxy(): any {
    return new Proxy(
      {},
      {
        get: (_target, prop) => {
          if (typeof prop === 'string') {
            return (...args: any[]) => {
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
  private async callMainAPI(method: string, data?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const messageId = `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      const messageHandler = (event: MessageEvent) => {
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
  private postMessage(message: WorkerMessage): void {
    self.postMessage(message)
  }

  /**
   * Load plugin from data
   */
  private async loadPlugin(data: any): Promise<void> {
    console.log('Loading plugin:', data)
    // Store plugin data for later use
    this.currentPlugin = data

    // Send pluginLoaded response to main thread
    this.postMessage({
      type: 'pluginLoaded',
      data: {
        pluginId: data.pluginId,
        timestamp: Date.now(),
      },
    })
  }

  /**
   * Unload current plugin
   */
  private async unloadPlugin(): Promise<void> {
    console.log('Unloading plugin')
    this.currentPlugin = null
  }
}

// Initialize the plugin worker
new PluginWorker()

// Export types for plugin developers
export type { PluginContext, RaycastAPI }
