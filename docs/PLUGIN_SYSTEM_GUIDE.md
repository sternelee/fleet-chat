# Fleet Chat Plugin System Guide

## Overview

The Fleet Chat plugin system provides a simple, powerful way to extend the application with custom functionality. It's designed for maximum compatibility with Raycast plugins while leveraging modern web technologies.

## Architecture

The plugin system is built on three key technologies:

1. **@lit/react**: Direct React component support without compilation
2. **Lit Web Components**: High-performance UI primitives
3. **Web Workers**: Isolated, secure plugin execution

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Plugin   │───▶│  @fleet-chat/   │───▶│  Fleet Chat UI   │
│   (Raycast API)  │    │  raycast-api    │    │  (Lit Components)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Quick Start

### 1. Create a New Plugin

```bash
# Using our CLI tool (recommended)
npx @fleet-chat/cli create my-plugin

# Or manually
mkdir my-plugin && cd my-plugin
npm init -y
```

### 2. Install Dependencies

```json
{
  "dependencies": {
    "@fleet-chat/raycast-api": "^1.0.0",
    "@raycast/api": "^1.48.0"
  }
}
```

### 3. Write Your Plugin

```typescript
// src/index.ts
import { List, ActionPanel, Action } from '@fleet-chat/raycast-api';

export default function Command() {
  return (
    <List>
      <List.Item
        title="Hello World"
        subtitle="Welcome to Fleet Chat!"
        actions={
          <ActionPanel>
            <Action
              title="Say Hello"
              onAction={() => console.log("Hello!")}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
```

### 4. Configure Plugin

```json
// package.json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "My first Fleet Chat plugin",
  "author": "Your Name",
  "commands": [
    {
      "name": "default",
      "title": "Hello World",
      "description": "Shows a hello message"
    }
  ],
  "icon": "🌍"
}
```

### 5. Pack Plugin

```bash
# Pack into .fcp file
npx @fleet-chat/simple-packer ./my-plugin

# Creates: my-plugin.fcp
```

### 6. Install Plugin

Drag and drop the `.fcp` file into Fleet Chat, or use:

```typescript
// Programmatic installation
import { pluginManager } from '@fleet-chat/plugin-manager';

await pluginManager.installPlugin('./my-plugin.fcp');
```

## API Compatibility

### Full Raycast API Support

The `@fleet-chat/raycast-api` package provides 100% compatibility with `@raycast/api`:

```typescript
// All these work exactly like in Raycast
import {
  List,
  Grid,
  Detail,
  Form,
  ActionPanel,
  Action,
  Toast,
  showToast,
  Clipboard,
  LocalStorage,
  Cache,
  useNavigation,
  useNavigationState
} from '@fleet-chat/raycast-api';
```

### Enhanced System APIs

Fleet Chat provides additional system capabilities:

```typescript
import {
  FCClipboard,      // Enhanced clipboard
  FCFileSystem,     // File system access
  preferences,      // User preferences
  environment,      // Environment info
  getApplications,  // Running apps
  openApplication,  // Launch apps
} from '@fleet-chat/raycast-api';
```

## Plugin Structure

```
my-plugin.fcp (gzip compressed)
├── plugin.json          # Plugin manifest
├── src/
│   ├── index.ts         # Main plugin code
│   ├── components/      # Custom components
│   └── utils/          # Helper functions
├── assets/              # Static resources
│   └── icon.png
└── package.json         # Dependencies
```

## Advanced Usage

### Custom Components

```typescript
// src/components/CustomList.tsx
import { List } from '@fleet-chat/raycast-api';

interface CustomListProps {
  items: Array<{
    title: string;
    subtitle?: string;
  }>;
}

export function CustomList({ items }: CustomListProps) {
  return (
    <List>
      {items.map((item, index) => (
        <List.Item
          key={index}
          title={item.title}
          subtitle={item.subtitle}
        />
      ))}
    </List>
  );
}
```

### Background Commands

```typescript
// src/background-task.ts
import { showToast, Clipboard } from '@fleet-chat/raycast-api';

export default async function BackgroundTask() {
  // Runs without UI
  await Clipboard.copy("Background task completed");
  await showToast({
    title: "Task Complete",
    message: "Data copied to clipboard"
  });
}
```

### Multiple Commands

```json
// package.json
{
  "commands": [
    {
      "name": "default",
      "title": "Show List",
      "mode": "view"
    },
    {
      "name": "background-task",
      "title": "Background Task",
      "mode": "no-view"
    }
  ]
}
```

```typescript
// src/index.ts
export { default } from './list-command';
export { default as backgroundTask } from './background-task';
```

## Best Practices

### 1. Performance

- Use React.memo for expensive components
- Implement proper key props for lists
- Leverage Web Workers for heavy computations

### 2. User Experience

- Provide loading states for async operations
- Use ActionPanel for contextual actions
- Implement proper error handling

### 3. Security

- Never expose sensitive data in plugins
- Validate all user inputs
- Use secure storage for credentials

### 4. Compatibility

- Test with different data sizes
- Handle network failures gracefully
- Provide fallback UIs

## Development Tools

### CLI Tool

```bash
# Create new plugin
@fleet-chat/cli create my-plugin

# Validate plugin structure
@fleet-chat/cli validate ./my-plugin

# Test plugin locally
@fleet-chat/cli test ./my-plugin

# Pack for distribution
@fleet-chat/cli pack ./my-plugin
```

### Debugging

```typescript
// Enable debug mode
localStorage.setItem('fleet-chat-debug', 'true');

// Check plugin logs
console.log('Plugin debug info:', data);
```

## Publishing Plugins

### 1. Prepare for Distribution

```bash
# Validate plugin
@fleet-chat/cli validate ./my-plugin

# Pack plugin
@fleet-chat/cli pack ./my-plugin --optimize
```

### 2. Share Plugin

- Upload `.fcp` file to any file sharing service
- Share download link with users
- Users can install by dragging file into Fleet Chat

### 3. Version Management

```json
// package.json
{
  "version": "1.2.0",
  "engines": {
    "@fleet-chat/raycast-api": ">=1.0.0"
  }
}
```

## Migration from Raycast

Migrating existing Raycast plugins is straightforward:

### 1. Update Dependencies

```json
{
  "dependencies": {
    "@raycast/api": "^1.48.0",           // Keep for type compatibility
    "@fleet-chat/raycast-api": "^1.0.0"  // Add Fleet Chat compatibility
  }
}
```

### 2. Update Imports

```typescript
// Before
import { List, ActionPanel } from '@raycast/api';

// After - works with existing code!
import { List, ActionPanel } from '@fleet-chat/raycast-api';
```

### 3. Pack and Deploy

```bash
# Convert to Fleet Chat plugin format
@fleet-chat/cli migrate ./raycast-plugin

# Creates fleet-chat-plugin.fcp
```

## Troubleshooting

### Common Issues

1. **"Failed to load plugin module"**
   - Check that `src/index.ts` exists
   - Verify TypeScript compilation
   - Ensure proper exports

2. **"Component not found"**
   - Import from `@fleet-chat/raycast-api`
   - Check component spelling
   - Verify React syntax

3. **"Permission denied"**
   - Check plugin permissions
   - Review security policies
   - Use proper APIs

### Getting Help

- Check console logs for detailed errors
- Use `@fleet-chat/cli doctor` for system diagnosis
- Review plugin examples in the repository

## Examples

See the `plugins/examples/` directory for complete working examples of:

- Basic List plugin
- Form handling
- Background tasks
- Custom components
- File system operations
- Network requests

## Resources

- [API Reference](./API_REFERENCE.md)
- [Component Gallery](./COMPONENT_GALLERY.md)
- [Example Plugins](../plugins/examples/)
- [Community Forum](https://github.com/sternelee/fleet-chat/discussions)