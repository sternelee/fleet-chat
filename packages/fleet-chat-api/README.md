# Fleet Chat API

A comprehensive API layer that provides **100% Raycast API compatibility** while leveraging Tauri's native system capabilities.

## Features

### 🔥 Complete Raycast Compatibility
- **Full API Compatibility**: All `@raycast/api` exports are available
- **Component Compatibility**: Raycast components available as Lit web components
- **Hook Compatibility**: React-style hooks for state management
- **TypeScript Support**: Full type safety and IntelliSense

### 🚀 Tauri Enhancements
- **Native Application Access**: Enhanced `getApplications()`, `getFrontmostApplication()`, `getRunningApplications()`
- **Persistent Storage**: Uses `@tauri-apps/plugin-store` for reliable data persistence
- **System Integration**: Clipboard, filesystem, shell, and opener plugin integration
- **Cross-Platform**: Works on macOS, Windows, and Linux

### 🎨 UI Components
- **List**: Raycast-compatible list component with actions and accessories
- **Grid**: Grid layout component for data display
- **Detail**: Detailed view component
- **ActionPanel**: Context menu component
- **Action**: Button-like components with keyboard shortcuts
- **Form**: Form components with validation
- **Menu Bar**: Menu bar components
- **Dropdown**: Dropdown selection components

## Installation

```bash
npm install @fleet-chat/api
```

## Usage

### Basic Raycast Plugin

```typescript
import { List, ActionPanel, Action, showToast } from '@fleet-chat/api';

export default function Command() {
  return (
    <List>
      <List.Item
        title="Hello World"
        subtitle="Fleet Chat"
        actions={
          <ActionPanel>
            <Action title="Show Toast" onAction={() => showToast('Hello from Fleet Chat!')} />
            <Action.OpenInBrowser url="https://github.com/sternelee/fleet-chat" />
          </ActionPanel>
        }
      />
    </List>
  );
}
```

### Using Tauri-Specific Features

```typescript
import {
  getFrontmostApplication,
  getRunningApplications,
  showToast,
  isTauriEnvironment
} from '@fleet-chat/api';

// Check if running in Tauri
if (isTauriEnvironment()) {
  const frontmost = await getFrontmostApplication();
  const running = await getRunningApplications();

  console.log('Frontmost app:', frontmost?.name);
  console.log('Running apps:', running.map(app => app.name));
}
```

### State Management with Hooks

```typescript
import { useState, useEffect } from '@fleet-chat/api';

export default function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log('Count changed to:', count);
  }, [count]);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
```

### Storage Management

```typescript
import { LocalStorage, Cache, preferences } from '@fleet-chat/api';

// Local storage with persistence
const storage = new LocalStorage('my-plugin');
await storage.set('key', 'value');
const value = await storage.get('key');

// TTL-based cache
const cache = new Cache('my-cache', 60 * 1000); // 1 minute TTL
await cache.set('expensive-data', data);
const cached = await cache.get('expensive-data');

// User preferences
await preferences.set({ theme: 'dark', language: 'en' });
const prefs = await preferences.get();
```

### Environment Detection

```typescript
import { environment, Environment } from '@fleet-chat/api';

if (environment === Environment.development) {
  console.log('Running in development mode');
}

if (environment.supports.markdown) {
  // Use markdown features
}
```

## API Reference

### Available Exports

#### From @raycast/api
- All Raycast components: `Action`, `ActionPanel`, `List`, `Grid`, `Detail`, etc.
- All Raycast functions: `showToast`, `showHUD`, `open`, `closeMainWindow`, etc.
- All Raycast types: `ActionProps`, `ListProps`, `Color`, `Icon`, `KeyboardShortcut`, etc.

#### Fleet Chat Extensions
- **Applications**: Enhanced application management with icon extraction
- **Storage**: Persistent storage using Tauri store plugin
- **Window Management**: Tauri-specific window controls
- **Hooks**: React-style hooks for state management

#### Enhanced Types
- `TauriApplication`: Extended Application interface with `icon_base64` and `icon_path`
- Enhanced storage and preference types

## Component Differences

The Fleet Chat components are Lit-based implementations that match Raycast's API:

```typescript
// Both work the same way
import { List } from '@raycast/api';
import { List } from '@fleet-chat/api';

// Usage is identical
<List>
  <List.Item title="Item" />
</List>
```

### Tauri-Specific Components

Some components have Tauri-specific enhancements:

```typescript
import { TauriApplication } from '@fleet-chat/api';

const app: TauriApplication = {
  name: "Safari",
  path: "/Applications/Safari.app",
  icon_base64: "data:image/png;base64,..." // Base64 encoded icon
};
```

## Development

### Building

```bash
npm run build
```

### Type Checking

```bash
npm run typecheck
```

### Development Mode

```bash
npm run dev
```

## Migration from Raycast

Migrating from `@raycast/api` to `@fleet-chat/api` is seamless:

```typescript
// Before
import { List, Action } from '@raycast/api';

// After (fully compatible)
import { List, Action } from '@fleet-chat/api';
```

### Adding Tauri Features

```typescript
// Add Tauri-specific imports while keeping Raycast compatibility
import {
  List, Action,           // From Raycast
  getApplications,       // Tauri enhanced
  LocalStorage,           // Tauri store-based
  showToast             // Tauri enhanced
} from '@fleet-chat/api';
```

## Examples

See the Fleet Chat repository for complete plugin examples using this API.

## License

MIT License - see LICENSE file for details.