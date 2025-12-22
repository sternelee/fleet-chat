# {{PLUGIN_NAME}}

{{PLUGIN_DESCRIPTION}}

## Quick Start

1. **Customize the template**
   - Edit `src/index.ts` to implement your plugin functionality
   - Update `package.json` with your plugin details

2. **Install dependencies**
   ```bash
   # No additional dependencies needed for basic plugins
   ```

3. **Pack your plugin**
   ```bash
   node tools/simple-packer.ts .
   ```

4. **Load in Fleet Chat**
   - Drag and drop the `.fcp` file into Fleet Chat

## Available APIs

The new Fleet Chat plugin system provides these APIs:

### UI Components
- `List` - Display searchable lists
- `Detail` - Show markdown content
- `Grid` - Display item grids
- `ActionPanel` - Action menus
- `Action` - Individual actions

### System APIs
- `showToast` - Show notifications
- `Clipboard` - Copy/paste functionality
- `LocalStorage` - Persistent data storage
- `Cache` - Temporary data caching

### React Support
- Full React component support
- Hooks and state management
- TypeScript support

## Example Usage

```typescript
import React from 'react';
import { List, ActionPanel, Action, showToast } from '@fleet-chat/raycast-api';

export default function Command() {
  return (
    <List>
      <List.Item
        title="Hello World"
        subtitle="Your first Fleet Chat plugin"
        actions={
          <ActionPanel>
            <Action
              title="Say Hello"
              onAction={() => {
                showToast({ title: "Hello!" });
              }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
```

## Development Tips

1. **Use React hooks** for state management
2. **Handle async operations** properly with try/catch
3. **Provide user feedback** with toast notifications
4. **Persist important data** with LocalStorage
5. **Test thoroughly** before packing

## Packaging

Package your plugin with the simple packer:

```bash
# From your plugin directory
node tools/simple-packer.ts .
```

This creates a `.fcp` file that can be loaded in Fleet Chat.

## Resources

- [Fleet Chat Plugin Guide](../../docs/PLUGIN_SYSTEM_GUIDE.md)
- [API Reference](../../packages/fleet-chat-api/)
- [Example Plugins](../../examples/)
- [CLI Tool](../../tools/simple-cli.ts)

## Next Steps

1. Replace placeholder content with your plugin logic
2. Add custom functionality using the available APIs
3. Test your plugin thoroughly
4. Package and distribute your `.fcp` file

Happy coding! 🚀