# Fleet Chat Plugin Workspace

This monorepo uses pnpm workspaces to manage the Fleet Chat plugin system.

## Workspace Structure

```
fleet-chat/
├── packages/                          # Core packages
│   ├── fleet-chat-api/               # Main API package
│   ├── raycast-api-compat/            # Raycast compatibility
│   └── fleet-chat-extension-manager/ # Extension manager
├── src/plugins/examples/              # Plugin examples
│   ├── hello-world/
│   └── ...
└── pnpm-workspace.yaml               # Workspace configuration
```

## Available Packages

### Core Packages

- `@fleet-chat/api` - Main Fleet Chat plugin API
- `@fleet-chat/raycast-api-compat` - Raycast compatibility layer
- `@fleet-chat/extension-manager` - Plugin extension management

### Plugin Examples

- `@fleet-chat/plugin-hello-world` - Basic example plugin

## Development Scripts

### Building All Packages
```bash
pnpm plugin:build
```

### Development Mode (All Packages)
```bash
pnpm plugin:dev
```

### Type Checking (All Packages)
```bash
pnpm plugin:typecheck
```

### Clean All Packages
```bash
pnpm plugin:clean
```

### Working with Specific Plugins

#### Hello World Plugin
```bash
pnpm plugin:hello-world     # Development mode
```

#### List All Fleet Chat Packages
```bash
pnpm plugins:list
```

## Package Development

Each package follows this structure:
- `package.json` - Package configuration
- `tsconfig.json` - TypeScript configuration
- `src/` - Source code (for plugins)
- `README.md` - Package documentation

## Adding New Packages

1. Create package in appropriate directory (`packages/` or `src/plugins/examples/`)
2. Add package.json with workspace references
3. Add tsconfig.json extending the base configuration
4. Update pnpm-workspace.yaml if needed

## Dependencies

### Workspace Dependencies
Packages can reference other workspace packages using:
```json
{
  "dependencies": {
    "@fleet-chat/api": "workspace:*"
  }
}
```

### External Dependencies
External dependencies should be added to the appropriate package where they're needed, not to the root package.

## Publishing

Packages are configured as private and not published to npm, but workspace scripts can be used for:
- Building
- Testing
- Local development
- Distribution as part of Fleet Chat