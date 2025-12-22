# Fleet Chat Plugin System

Complete plugin system for Fleet Chat providing 100% Raycast API compatibility with enhanced Tauri integration.

## 🚀 Features

### ✅ Complete Raycast Compatibility
- **Full API Compatibility**: All `@raycast/api` exports available
- **Component Compatibility**: Raycast components available as Lit web components
- **Hook Compatibility**: React-style hooks for state management
- **TypeScript Support**: Full type safety and IntelliSense

### 🎯 Enhanced Plugin System
- **Plugin Manager**: Complete lifecycle management with Web Worker isolation
- **React-to-Lit Compiler**: Write plugins using React JSX, compiled to Lit components
- **Storage System**: Persistent storage with Tauri and browser fallbacks
- **System Integration**: Enhanced clipboard, filesystem, and application management

## 📦 Installation

```bash
npm install @fleet-chat/api
```

## 🛠️ Quick Start

### Basic Plugin Example

```typescript
import { List, ActionPanel, Action, showToast } from '@fleet-chat/api';

export default function Command() {
  return (
    <List>
      <List.Item
        title="Hello World"
        subtitle="Fleet Chat Plugin"
        icon="👋"
        actions={
          <ActionPanel>
            <Action
              title="Show Toast"
              onAction={() => showToast('Hello from Fleet Chat!')}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
```

### Using Plugin Manager

```typescript
import { PluginManager } from '@fleet-chat/api';

const pluginManager = new PluginManager({
  maxWorkers: 5,
  workerTimeout: 10000,
  enableHotReload: true,
  securityPolicy: {
    allowedDomains: ['example.com'],
    allowFileSystem: true,
    allowNetwork: true,
    maxMemoryUsage: 100
  }
});

// Initialize plugin system
await pluginManager.initialize();

// Execute plugin command
const result = await pluginManager.executeCommand('hello-world', 'hello');
```

## 🏗️ Architecture

### Plugin Structure
```
my-plugin/
├── package.json          # Plugin manifest
├── src/
│   └── index.ts          # Plugin entry point
└── assets/               # Plugin assets
```

### Plugin Manifest

```json
{
  "name": "my-plugin",
  "title": "My Plugin",
  "description": "A Fleet Chat plugin",
  "icon": "📦",
  "version": "1.0.0",
  "author": "Your Name",
  "license": "MIT",
  "categories": ["Productivity"],
  "commands": [
    {
      "name": "command-name",
      "title": "Command Title",
      "description": "Command description",
      "mode": "view"
    }
  ]
}
```

### Available APIs

#### UI Components
- **List**: Display searchable lists with actions
- **Grid**: Grid layout for content display
- **Detail**: Rich text and markdown display
- **ActionPanel**: Context menu components
- **Action**: Button-like components with shortcuts
- **Form**: Form components with validation

#### System APIs
- **showToast / showHUD**: User notifications
- **getApplications**: System application management
- **Clipboard**: Clipboard operations
- **LocalStorage / Cache**: Data persistence
- **Environment**: Runtime environment detection

#### React Hooks
- **useState**: State management
- **useEffect**: Side effects
- **useCallback**: Callback memoization
- **useMemo**: Value memoization
- **useRef**: Ref management

## 🔧 Advanced Features

### React-to-Lit Compilation

Write plugins using familiar React JSX syntax:

```typescript
import { createElement } from '@fleet-chat/api/renderer';

export default function MyCommand() {
  return createElement(List, null,
    createElement(List.Item, {
      title: "Dynamic Item",
      subtitle: "Generated from JSX"
    })
  );
}
```

### Plugin Isolation

- **Web Workers**: Plugins run in isolated workers
- **Security Policy**: Configurable sandbox restrictions
- **Resource Management**: Memory and timeout limits
- **Error Handling**: Isolated error recovery

### Storage Options

```typescript
// Tauri-based persistent storage
const storage = new LocalStorage('my-plugin');
await storage.set('key', 'value');

// TTL-based caching
const cache = new Cache('my-cache', 60 * 1000); // 1 minute TTL
await cache.set('expensive-data', data);

// User preferences
await preferences.set({ theme: 'dark' });
```

## 📚 Examples

See the `examples/` directory for complete plugin examples:

- **hello-world**: Basic plugin with multiple commands
- **testplugin**: Advanced plugin demonstrating all features

## 🔄 Migration from Raycast

Migrating from `@raycast/api` to `@fleet-chat/api` is seamless:

```typescript
// Before
import { List, Action } from '@raycast/api';

// After (fully compatible)
import { List, Action } from '@fleet-chat/api';
```

### Adding Fleet Chat Enhancements

```typescript
// Add Tauri-specific imports while keeping Raycast compatibility
import {
  List, Action,           // From Raycast
  getApplications,       // Tauri enhanced
  LocalStorage,           // Tauri store-based
  showToast             // Tauri enhanced
} from '@fleet-chat/api';
```

## 🎨 Development Tools

### CLI Plugin Creation

```bash
# Create new plugin
npm run plugin:create my-awesome-plugin

# Build plugin
npm run plugin:build

# Development mode
npm run plugin:dev
```

### Testing

```typescript
// Test plugin loading
const pluginManager = new PluginManager();
await pluginManager.initialize();

// Test command execution
const result = await pluginManager.executeCommand('plugin-name', 'command');
expect(result).toBeDefined();
```

## 🔒 Security Considerations

### Default Security Policy
```typescript
const securityPolicy = {
  allowedDomains: ['trusted-domain.com'],
  allowFileSystem: true,
  allowNetwork: true,
  maxMemoryUsage: 100 // MB
};
```

### Best Practices
1. **Validate Input**: Always validate user input in plugins
2. **Resource Limits**: Set appropriate memory and timeout limits
3. **Error Boundaries**: Implement proper error handling
4. **Permissions**: Only request necessary system access

## 🐛 Troubleshooting

### Common Issues

1. **Import Errors**: Ensure all imports use `.js` extensions for ES modules
2. **Type Errors**: Run `npm run typecheck` to identify issues
3. **Plugin Loading**: Check plugin manifest syntax and dependencies
4. **Worker Isolation**: Verify security policies allow required operations

### Debug Mode

```typescript
const pluginManager = new PluginManager({
  debug: true,
  logLevel: 'verbose'
});
```

## 📖 Documentation

- **API Reference**: Complete API documentation
- **Component Guide**: UI component usage examples
- **Plugin Tutorial**: Step-by-step plugin development
- **Migration Guide**: Detailed Raycast migration instructions

## 🤝 Contributing

We welcome contributions to the Fleet Chat plugin system! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

---

**Built with ❤️ for the Fleet Chat community**