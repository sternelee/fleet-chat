# @fleet-chat/core-api

The core Fleet Chat API package providing Tauri-native plugin system with Lit web components.

## Overview

This package contains:
- **API Modules**: Direct Tauri plugin wrappers (clipboard, filesystem, shell, etc.)
- **Lit Components**: Web Components built with Lit for UI
- **React Hooks**: React-compatible hooks for state management
- **Contexts**: React contexts for navigation and state
- **Storage**: LocalStorage and Cache abstractions
- **Types**: Shared TypeScript types

## Architecture

```
@fleet-chat/core-api/
├── api/              # Tauri plugin wrappers
├── components/       # Lit web components
├── hooks/           # React-compatible hooks
├── context/         # React contexts
├── storage/         # Storage abstractions
├── types/           # Shared types
└── utils/           # Utility functions
```

## Usage

```typescript
import { Clipboard, FileSystem } from '@fleet-chat/core-api';
import { List, Detail } from '@fleet-chat/core-api/components';
import { useNavigation } from '@fleet-chat/core-api/hooks';
```

## Design Principles

1. **Tauri-Native**: Direct integration with Tauri plugins, no abstraction layers
2. **Lit-Based**: Web Components for performance and interoperability
3. **TypeScript-First**: Full type safety with strict TypeScript
4. **React-Compatible**: Hooks and contexts for React integration
