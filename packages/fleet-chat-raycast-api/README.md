# @fleet-chat/raycast-api

Fleet Chat's Raycast API compatibility layer - providing full `@raycast/api` compatibility for existing Raycast plugins.

## Overview

This package re-exports the core Fleet Chat API with Raycast-compatible naming and interfaces. It follows the same pattern as vicinae's compatibility layer approach.

## Architecture

```
@fleet-chat/raycast-api/
├── components/       # React-compatible component wrappers
└── system/          # Raycast-compatible system APIs
```

## Usage

For new Fleet Chat plugins, use `@fleet-chat/core-api`. For existing Raycast plugins being migrated:

```typescript
// Raycast-style imports
import { List, Detail, Action } from '@fleet-chat/raycast-api';
import { useNavigation } from '@fleet-chat/raycast-api';
import { Clipboard } from '@fleet-chat/raycast-api';
```

## Compatibility

This package aims for 100% API compatibility with `@raycast/api`. All components and hooks are re-exported from `@fleet-chat/core-api` with matching interfaces.

## Migration from Raycast

1. Replace `import { List } from '@raycast/api'` with `import { List } from '@fleet-chat/raycast-api'`
2. Native APIs (clipboard, filesystem, etc.) are mapped to Tauri plugins under the hood
3. Most Raycast plugins should work with minimal to no changes
