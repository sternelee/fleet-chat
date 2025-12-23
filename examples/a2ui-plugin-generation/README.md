# A2UI Plugin Generation Examples

This directory contains examples demonstrating how to use the A2UI Plugin Generation system.

## Quick Example

```typescript
import { a2uiPluginGenerator } from '../../services/a2ui-plugin-generator';

// Example 1: Generate a simple plugin
async function example1() {
  const plugin = await a2uiPluginGenerator.quickGenerate(
    "Create a plugin that shows a list of popular JavaScript frameworks"
  );
  
  console.log('Generated plugin:', plugin.manifest.name);
}

// Example 2: Generate with custom name
async function example2() {
  const plugin = await a2uiPluginGenerator.quickGenerate(
    "A plugin for quick calculations",
    "calculator-plugin"
  );
  
  await a2uiPluginGenerator.savePluginToFile(plugin, './');
}
```

## Resources

- [A2UI Plugin Generation Guide](../../docs/A2UI_PLUGIN_GENERATION.md)
- [Plugin System Documentation](../../PLUGIN_SYSTEM.md)
