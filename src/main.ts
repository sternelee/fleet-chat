import { initialize } from "./tauri_axum";

initialize("");

// Import the components
import "./components/button";
import "./components/lucide-icon";
import "./components/a2ui";
import "./components/plugin-manager-ui";
import "./components/global-drop-handler";

// Import the pages
import "./views/errors/not-found";
import "./views/errors/not-in-browser";
import "./views/home/home.component";
import "./views/search/search.component";

// Import application routes
import "./layouts/root-layout";
import "./routes";

// Initialize plugin system
import { initializePlugins, pluginIntegration } from "./plugins/plugin-integration";
import { PluginLoader } from "./plugins/plugin-loader";

// Initialize plugins and create global plugin loader
initializePlugins().then(() => {
  console.log("🔌 Plugin system initialized");

  // Create global plugin loader for drag-drop functionality
  const pluginManager = pluginIntegration.getPluginManager();
  const globalLoader = new PluginLoader(pluginManager);

  // Make available globally for the drop handler
  (window as any).pluginManager = pluginManager;
  (window as any).pluginLoader = globalLoader;

  console.log("🎯 Global plugin loader created for drag-drop");
}).catch(error => {
  console.error("❌ Failed to initialize plugin system:", error);
});
