import { initialize } from './tauri_axum'

initialize('')

// Import the components
import './components/button'
import './components/lucide-icon'
import './components/a2ui'
import './components/plugin-manager-ui'
import './components/global-drop-handler'

// Import the pages
import './views/errors/not-found'
import './views/errors/not-in-browser'
import './views/search/search.component'

// Import application routes and new launcher layout
import './layouts/launcher-layout'
import './routes'

// Initialize plugin system
import { initializePluginIntegration, pluginIntegration } from './plugins/plugin-integration'
import { PluginLoader } from './plugins/plugin-loader'

// Initialize plugins and create global plugin loader
async function initializePluginSystem() {
  try {
    console.log('🔌 Initializing plugin system...')

    // Initialize plugin integration
    await initializePluginIntegration()
    console.log('✅ Plugin integration initialized')

    // Get plugin manager
    const pluginManager = pluginIntegration.getPluginManager()
    console.log('✅ Plugin manager obtained')

    // Create global plugin loader for drag-drop functionality
    const globalLoader = new PluginLoader(pluginManager)
    console.log('✅ Global plugin loader created')

    // Make available globally for the drop handler
    ;(window as any).pluginManager = pluginManager
    ;(window as any).pluginLoader = globalLoader

    console.log('🎯 Plugin system ready for drag-drop functionality')

    // Dispatch event to notify that plugin system is ready
    window.dispatchEvent(
      new CustomEvent('plugin-system-ready', {
        detail: { pluginManager, globalLoader },
      }),
    )
  } catch (error) {
    console.error('❌ Failed to initialize plugin system:', error)
  }
}

// Initialize plugin system
initializePluginSystem()
