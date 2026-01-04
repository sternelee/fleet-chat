# Plugin Worker Implementation Handoff

## Context
Implementing example plugins for Fleet Chat's new plugin system. Currently fixing worker-to-main-thread communication for plugin execution.

## Current State

### Working
- Plugin loading from `.fcp` files
- Plugin code extraction (now includes `.tsx` files)
- Worker initialization (`initialize` message)
- Plugin manager-worker communication

### Current Issue
**Web Workers don't have DOM access** - `HTMLElement` is not available in worker context.

Error: `Can't find variable: HTMLElement` at `plugin-worker.ts:66:38` in `createHTMLComponent()`

### Plugin Code Being Loaded
```typescript
// hello-world.fcp contains:
{
  "src/index.tsx": "import { List, Action } from '@fleet-chat/core-api'\n..."
}
```

## Architecture

### Current Flow (Problematic)
1. Plugin manager loads `.fcp` file
2. Extracts plugin code (`.tsx` files)
3. Sends code to worker via `loadPlugin` message
4. Worker tries to create DOM elements → **FAILS** (no DOM in workers)

### Required Flow (Solution)
1. Plugin manager loads `.fcp` file
2. Extracts plugin code (`.tsx` files)
3. Sends code to worker via `loadPlugin` message
4. Worker evaluates code but **doesn't create DOM**
5. Worker sends component data back to main thread
6. Main thread creates DOM elements and renders

## Files Modified

### Recently Changed
- `src/workers/plugin-worker.ts` - Added `initialize`, `loadPlugin` cases, `pluginLoaded` response
- `src/plugins/plugin-loader.ts` - Added `.tsx` to code extraction filter
- `src/plugins/plugin-manager.ts` - Changed worker import to use Vite's URL syntax
- `src/views/search/search.component.ts` - Made plugin commands visible in default search

### Plugin Worker Message Types
- `initialize` → `initialized` ✅
- `loadPlugin` → `pluginLoaded` ✅
- `execute` → needs fix (DOM creation issue)
- `unload` → not implemented yet

## Example Plugins Created
Located in `src/plugins/examples/`:
1. `hello-world` - Basic state management, toast/HUD
2. `search-list` - Searchable lists with filtering
3. `form-input` - Form components and validation
4. `async-data` - Async data fetching, API integration

## Next Steps

### Immediate Fix Required
Modify `src/workers/plugin-worker.ts` to:
1. NOT create DOM elements in worker
2. Serialize component data for main thread
3. Send `viewCreated` message with component data

### Implementation Approach
```typescript
// In worker (plugin-worker.ts):
private async executeViewCommand(pluginModule: any, commandName: string): Promise<void> {
  // Get the command function
  const command = pluginModule[commandName] || pluginModule.default?.[commandName]

  // Execute command to get the component
  const Component = typeof command === 'function' ? await command() : command

  // DON'T create DOM here - send component data to main thread
  this.postMessage({
    type: 'viewCreated',
    data: {
      pluginId: this.currentPlugin?.pluginId,
      componentName: commandName,
      component: Component, // Component constructor/function
      componentType: this.identifyComponentType(Component)
    }
  })
}
```

### Main Thread Changes
Update `src/plugins/plugin-manager.ts` to handle `viewCreated`:
- Receive component data
- Perform React-to-Lit transformation
- Create actual DOM elements
- Render in modal/view

## Package Structure
- `packages/fleet-chat-core-api/` - Core API package
- `packages/fleet-chat-plugin-runtime/` - Plugin runtime (worker, loader, manager)
- `packages/fleet-chat-raycast-api/` - Raycast compatibility layer
- `src/plugins/` - Plugin integration layer
- `src/workers/` - Worker implementation
- `src/views/search/` - Search and command execution

## Commands
- Build: `pnpm build`
- Dev: `pnpm dev`
- Package plugin: `node tools/plugin-cli.js package <name>`

## Technical Notes
- Workers use `type: 'module'` for ESM support
- Vite compiles `.ts` workers on-the-fly via `new URL(..., import.meta.url)`
- React-to-Lit transformation needed for React components
- Plugin code in `.fcp` files is source TypeScript, not pre-compiled

## Session Notes
- User: sternelee
- Date: 2025-12-30
- Context: 99% - Created handoff before implementing worker DOM fix
