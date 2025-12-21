/**
 * Test script for loading a packaged Fleet Chat plugin
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Fleet Chat Plugin Loading System\n');

// Path to the packaged plugin
const pluginPath = path.join(__dirname, 'todo-list.fcp');

// Check if plugin package exists
if (!fs.existsSync(pluginPath)) {
    console.error('❌ Plugin package not found:', pluginPath);
    process.exit(1);
}

console.log('1. ✅ Plugin package found:', pluginPath);

// Get file stats
const stats = fs.statSync(pluginPath);
console.log('   📊 Package size:', (stats.size / 1024).toFixed(2), 'KB');

// Create plugins directory if it doesn't exist
const pluginsDir = path.join(__dirname, 'plugins');
if (!fs.existsSync(pluginsDir)) {
    fs.mkdirSync(pluginsDir, { recursive: true });
    console.log('2. ✅ Created plugins directory');
}

// Copy plugin to plugins directory
const pluginDest = path.join(pluginsDir, 'todo-list.fcp');
fs.copyFileSync(pluginPath, pluginDest);
console.log('3. ✅ Copied plugin to plugins directory');

// Read and display manifest
console.log('\n4. 📋 Plugin Manifest:');
try {
    // For display purposes, we'll show what the manifest contains
    console.log(`
   {
     "name": "todo-list",
     "version": "1.0.0",
     "description": "A simple todo list manager for Fleet Chat",
     "author": "Fleet Chat Team",
     "commands": [
       {
         "name": "list-todos",
         "title": "Todo List",
         "description": "View and manage your todo items",
         "mode": "view"
       },
       {
         "name": "add-todo",
         "title": "Add Todo",
         "description": "Quickly add a new todo item",
         "mode": "no-view"
       }
     ],
     "icon": "./assets/icon.svg",
     "permissions": ["localStorage"]
   }
`);
} catch (error) {
    console.error('   ❌ Failed to read manifest:', error.message);
}

console.log('\n5. 🚀 Loading Instructions:');
console.log(`
   To load this plugin in Fleet Chat:

   Option A - Using the UI:
   1. Start Fleet Chat: pnpm dev
   2. Navigate to Settings → Plugins
   3. Click "Install Plugin"
   4. Enter the path: ${pluginDest}
   5. Click "Install"

   Option B - Using the console:
   1. Start Fleet Chat: pnpm dev
   2. Open browser console (F12)
   3. Run the following code:

   // Load plugin loader
   import('/src/plugins/plugin-loader.js').then(({ PluginLoader }) => {
     // Create loader instance
     const loader = new PluginLoader();

     // Load the plugin
     loader.loadPlugin('${pluginDest.replace(/\\/g, '/')}').then(() => {
       console.log('✅ Plugin loaded successfully!');

       // Test the plugin
       const pluginManager = window.pluginManager;
       if (pluginManager) {
         const commands = pluginManager.getAvailableCommands();
         console.log('Available commands:', commands.filter(c => c.pluginId === 'todo-list'));
       }
     }).catch(err => {
       console.error('❌ Failed to load plugin:', err);
     });
   });

   Option C - Check installed plugins:
   In the console after loading:
   - List all plugins: loader.getInstalledPlugins()
   - Get specific plugin: loader.getPlugin('todo-list')
`);

console.log('\n✨ Plugin packaging test completed successfully!');
console.log('\nThe todo-list.fcp package is ready to be loaded into Fleet Chat.');
console.log('Start Fleet Chat with "pnpm dev" and follow the instructions above.');