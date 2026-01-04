# @fleet-chat/plugin-runtime

Fleet Chat's plugin execution runtime with Web Worker isolation and plugin lifecycle management.

## Overview

This package handles:
- **Web Worker Isolation**: Sandboxed plugin execution
- **Plugin Loader**: Load and parse plugin manifests
- **Plugin Manager**: Plugin lifecycle (load/unload/execute)
- **Security Sandbox**: Permission-based access control

## Architecture

```
@fleet-chat/plugin-runtime/
├── worker/          # Web Worker implementation
├── loader/          # Plugin loader for .fcp files
├── manager/         # Plugin lifecycle management
└── sandbox/         # Security sandbox implementation
```

## Design Goals

1. **True Worker Isolation**: Each plugin runs in its own Web Worker
2. **Message-Based Communication**: Main thread communication via postMessage
3. **Resource Limits**: Memory and CPU limits per plugin
4. **Security**: Permission-based access to system APIs

## Usage

```typescript
import { PluginManager } from '@fleet-chat/plugin-runtime';

const manager = new PluginManager();
await manager.load('/path/to/plugin.fcp');
await manager.execute('plugin-id', 'command-name', args);
```
