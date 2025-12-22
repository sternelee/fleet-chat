# test-plugin Plugin

test-plugin plugin for Fleet Chat

## Getting Started

1. Install dependencies: `pnpm install`
2. Pack the plugin: `node ../../tools/simple-packer.ts .`
3. Load the `test-plugin.fcp` file in Fleet Chat

## Development

Edit `src/index.ts` to add your plugin functionality.

## Building

```bash
# Pack the plugin for distribution
node ../../tools/simple-packer.ts .
```

## Resources

- [Fleet Chat Plugin Guide](../../docs/PLUGIN_SYSTEM_GUIDE.md)
- [API Reference](../../packages/fleet-chat-api/)
- [Example Plugins](../examples/)
