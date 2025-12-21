# Fleet Chat Plugin Packaging System

Fleet Chat supports a plugin packaging system that allows you to distribute Raycast-compatible plugins as compressed `.fcp` files that can be easily installed and loaded by the application.

## Overview

The plugin packaging system consists of:

1. **Plugin Packer CLI** (`fleet-pack`) - A command-line tool to package plugins
2. **Plugin Loader** - A runtime component that loads and manages packaged plugins
3. **Plugin Manager UI** - A web interface for installing and managing plugins

## Package Structure

A Fleet Chat plugin package (`.fcp`) is a ZIP archive containing:

```
my-plugin.fcp/
├── manifest.json          # Plugin manifest with essential metadata
├── metadata.json          # Build metadata and checksum
├── plugin.js              # Main plugin entry point
├── dist/                  # Compiled JavaScript output
│   └── *.js              # Compiled TypeScript files
├── assets/                # Static assets
│   └── icon.png          # Plugin icon
└── src/                  # Source files (optional)
    └── *.js              # Additional source files
```

## Creating a Plugin Package

### 1. Prepare Your Plugin

Your plugin should have a `package.json` with the following structure:

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "My awesome Fleet Chat plugin",
  "author": "Your Name",
  "commands": [
    {
      "name": "my-command",
      "title": "My Command",
      "description": "Description of the command",
      "mode": "view"
    }
  ],
  "icon": "./assets/icon.png",
  "permissions": ["clipboard", "show-notification"]
}
```

### 2. Build Your Plugin

```bash
# If your plugin has a build script
npm run build

# Or compile with TypeScript
npx tsc
```

### 3. Package the Plugin

```bash
# Navigate to Fleet Chat tools directory
cd tools/

# Install dependencies
npm install

# Package your plugin
npx ts-node plugin-packer.ts package /path/to/your/plugin my-plugin.fcp
```

Or use the CLI directly:

```bash
# From the Fleet Chat root
./tools/plugin-packer.ts package ./src/plugins/examples/test-plugin test-plugin.fcp
```

## Installing Plugins

### Using the UI

1. Open Fleet Chat
2. Navigate to Settings → Plugins
3. Click "Install Plugin"
4. Either:
   - Enter a URL to a `.fcp` file
   - Drag and drop a `.fcp` file into the dialog

### Using the CLI

```bash
# Install from local file
./tools/plugin-packer.ts install ./my-plugin.fcp

# Install from URL
./tools/plugin-packer.ts install https://example.com/my-plugin.fcp
```

## Managing Installed Plugins

### List Installed Plugins

```bash
./tools/plugin-packer.ts list
```

### Uninstall a Plugin

```bash
./tools/plugin-packer.ts remove my-plugin
```

## Plugin Development

### Creating a New Plugin

Use the Fleet Chat plugin CLI:

```bash
# Create a new plugin
./tools/plugin-cli.js create my-new-plugin

# Navigate to plugin directory
cd src/plugins/examples/my-new-plugin

# Install dependencies
npm install

# Start development
npm run dev
```

### Plugin Structure

```
my-plugin/
├── package.json           # Plugin metadata and dependencies
├── tsconfig.json          # TypeScript configuration
├── src/
│   └── index.ts          # Main plugin code
├── assets/
│   └── icon.png          # Plugin icon (optional)
└── dist/                 # Compiled output (generated)
```

### Raycast API Compatibility

Fleet Chat provides a compatibility layer for the Raycast API. You can use:

- **UI Components**: `List`, `Detail`, `Grid`, `Form`, `Action`, `ActionPanel`
- **Navigation**: `push`, `pop`, `open`, `closeMainWindow`
- **System APIs**: `showToast`, `showHUD`, `getApplications`, `openApplication`
- **Storage**: `LocalStorage`, `Cache`
- **Clipboard**: `Clipboard.read`, `Clipboard.write`
- **File System**: `FileSystem.read`, `FileSystem.write`

Example plugin code:

```typescript
import { List, showToast, Toast } from '@raycast/api';

export default function Command() {
  return (
    <List>
      <List.Item
        title="Hello Fleet Chat"
        subtitle="This is a Raycast-compatible plugin"
        actions={
          <List.Item.ActionPanel>
            <List.Item.Action
              title="Show Toast"
              onAction={() => {
                showToast({
                  style: Toast.Style.Success,
                  title: "Hello from Fleet Chat!",
                });
              }}
            />
          </List.Item.ActionPanel>
        }
      />
    </List>
  );
}
```

## Security Considerations

- Plugins are executed in isolated Web Workers
- All plugin packages are validated before installation
- Checksums are verified to ensure package integrity
- Plugins have limited permissions based on their manifest

## Troubleshooting

### Plugin Won't Install

1. Check that the `.fcp` file is valid
2. Ensure the manifest.json is properly formatted
3. Verify all required fields are present in package.json

### Plugin Errors

1. Check the browser console for error messages
2. Verify the plugin code compiles without errors
3. Ensure all dependencies are properly installed

### Performance Issues

1. Limit the number of installed plugins
2. Optimize plugin code for performance
3. Use lazy loading for heavy operations

## API Reference

### Plugin Manifest

The plugin manifest (`manifest.json`) includes:

```typescript
interface PluginManifest {
  name: string;           // Plugin identifier
  version: string;        // Semantic version
  description: string;    // Short description
  author: string;         // Author name
  icon?: string;          // Path to icon file
  commands: Array<{       // Plugin commands
    name: string;         // Command identifier
    title: string;        // Display title
    description: string;  // Command description
    mode: 'view' | 'no-view';  // Command mode
  }>;
  permissions?: string[];  // Required permissions
}
```

### Plugin Loader API

```typescript
class PluginLoader {
  async loadPlugin(packagePath: string): Promise<void>;
  async uninstallPlugin(pluginName: string): Promise<void>;
  getInstalledPlugins(): LoadedPlugin[];
  getPlugin(name: string): LoadedPlugin | undefined;
}
```

## Contributing

To contribute to the plugin system:

1. Fork the Fleet Chat repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For help with plugin development:

- Check the [examples](../src/plugins/examples/)
- Review the [API documentation](../src/plugins/plugin-system.ts)
- Open an issue on GitHub