---
date: 2025-12-31T19:58:10+0800
session_name: general
researcher: Claude
git_commit: 1e15dda
branch: main
repository: fleet-chat
topic: "Plugin Worker Implementation - Main Thread Code Evaluation"
tags: [implementation, plugin-system, babel, typescript, jsx]
status: partial
last_updated: 2025-12-31
last_updated_by: Claude
type: implementation_strategy
root_span_id: ""
turn_span_id: ""
---

# Handoff: Plugin Worker Implementation - Main Thread Code Evaluation

## Task(s)
**Primary Task**: Evaluate plugin code in the main thread (using new Function() or similar) to work around Web Worker's lack of DOM access.

**Status**: Partial - Core flow implemented but Babel transpilation needs debugging.

### Completed:
- Worker now sends `executionId` in `viewCreated` response (fixed timeout issue)
- Worker simplified to just send plugin code back to main thread (no DOM access in worker)
- Added `@babel/standalone` package for runtime TypeScript/JSX transpilation
- Implemented `transformCodeForEvaluation()` with Babel integration
- Added `/* @vite-ignore */` comment for dynamic import Vite warning
- Fixed all TypeScript TS6133 unused variable warnings

### In Progress:
- **Babel transpilation**: `Babel.transform` is undefined - need to fix import/usage
- Plugin code loads but fails with "Unexpected token '<" (JSX not being transpiled)
- Need to verify correct Babel standalone API usage

### Next Steps:
1. Fix Babel import/usage (try `Babel.default.transform` or check actual exports)
2. Test hello-world plugin execution after transpilation fix
3. Implement React-to-Lit component transformation for rendering
4. Handle component lifecycle and events properly

## Critical References
- `src/plugins/plugin-manager.ts:266-390` - Main thread code evaluation with Babel transpilation
- `src/workers/plugin-worker.ts:147-174` - Worker's simplified executeViewCommand that sends plugin code
- `src/plugins/examples/hello-world/src/index.tsx` - Test plugin with TypeScript/JSX

## Recent Changes

### Plugin Worker (src/workers/plugin-worker.ts)
- Line 126-144: `executeCommand` now extracts `executionId` from data and passes to `executeViewCommand`
- Line 154-174: `executeViewCommand` simplified to just send `pluginCode` + `executionId` back to main thread
- Removed unused methods: `_createLitComponent`, `_createReactComponent`, `_createHTMLComponent`, `_extractStyles`, `_log`

### Plugin Manager (src/plugins/plugin-manager.ts)
- Line 6: Added `import * as Babel from '@babel/standalone'`
- Line 344-390: Implemented `transformCodeForEvaluation()` with:
  - Import path transformation (`@fleet-chat/core-api` → `/packages/fleet-chat-core-api/index.js`)
  - Babel transpilation with `@babel/preset-typescript` and `@babel/preset-react`
  - Debug logging and fallback handling
- Line 316: Added `/* @vite-ignore */` to dynamic import

### Package Dependencies
- Added to root devDependencies:
  - `@babel/standalone@^7.28.5`
  - `@babel/preset-react@^7.28.5`
  - `@babel/preset-typescript@^7.28.5`
  - `@types/babel__standalone@^7.1.9`

## Learnings

### Web Worker DOM Limitation
Web Workers don't have DOM access (HTMLElement, document, etc.). Solution: Serialize plugin code and evaluate in main thread where DOM exists.

### Execution ID Flow
The main thread sends `executionId` to worker, worker must include it in response for proper message matching. Fixed timeout by adding executionId to worker's response data.

### Babel Standalone Import Pattern
`import * as Babel from '@babel/standalone'` may not expose `transform` directly. Need to check if it's:
- `Babel.transform`
- `Babel.default.transform`
- Or different export structure

Added debug logging: `console.log('[PluginManager] Babel exports:', Object.keys(Babel))`

### TypeScript/JSX Runtime Transpilation
Plugins contain TypeScript (`interface`, type annotations) and JSX (`<Component>`) that browsers can't execute natively. Need runtime transpilation via Babel.

## Post-Mortem

### What Worked
- Worker → Main thread communication: Sending `pluginCode` object with file paths as keys works
- Import path transformation: Replacing `@fleet-chat/*` with actual file paths via regex
- Dynamic import with Blob URL: `URL.createObjectURL(blob)` + `import(blobUrl)` works for module loading
- Vite HMR: Hot reloading worked consistently during development

### What Failed
- **Babel.transform undefined**: `Babel.transform` is undefined when imported as `import * as Babel`
  - Error: `TypeError: undefined is not an object (evaluating 'Babel.transform')`
  - Attempted fix: Changed from `import Babel` to `import * as Babel`
  - Still fails - need to check actual export structure
- **JSX syntax error**: Without transpilation, JSX causes "Unexpected token '<'" error
  - Error: `SyntaxError: Unexpected use of reserved word 'interface' in strict mode`
  - This confirms Babel transpilation is not working

### Key Decisions
- **Decision**: Use Babel standalone for runtime transpilation
  - Alternatives considered: Pre-build plugins, use esbuild-wasm, simple regex stripping
  - Reason: Babel standalone provides proper TypeScript+JSX support without build step
- **Decision**: Worker sends raw plugin code instead of executing
  - Alternatives considered: Load module in worker, use eval in worker
  - Reason: Workers can't access DOM, so main thread must evaluate
- **Decision**: Use `/* @vite-ignore */` for dynamic import
  - Reason: Vite can't statically analyze blob URLs, but the pattern is intentional

## Artifacts
- `src/plugins/plugin-manager.ts:344-390` - Babel transpilation implementation (needs fix)
- `src/workers/plugin-worker.ts:147-174` - Worker's executeViewCommand
- `src/plugins/examples/hello-world/src/index.tsx` - Test plugin with TSX

## Action Items & Next Steps
1. **Fix Babel transpilation** (HIGH PRIORITY):
   - Check actual Babel exports using debug log
   - Try `Babel.default.transform` or check if module exports differently
   - May need to use `import Babel from '@babel/standalone'` with `esModuleInterop`

2. **Test plugin execution** after Babel fix:
   - Run hello-world plugin
   - Verify TypeScript/JSX is properly transpiled
   - Check component rendering

3. **React-to-Lit transformation** (FUTURE):
   - Current code transpiles JSX to `React.createElement()` calls
   - Need to transform React components to Lit for rendering
   - Or implement React runtime in Fleet Chat

4. **Component rendering** (FUTURE):
   - Implement `renderComponent()` properly (currently placeholder)
   - Handle component lifecycle (mount, update, unmount)
   - Handle events and user interactions

## Other Notes
- Dev server command: `pnpm dev` (runs on port 1420)
- Plugin examples location: `src/plugins/examples/`
- .fcp plugin format stores source code as `{ [filePath]: sourceCode }`
- Worker message types: `execute`, `viewCreated`, `error`, `pluginLoaded`
- Execution ID format: `exec_${timestamp}_${random}` for request matching
