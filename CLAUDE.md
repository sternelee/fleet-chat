# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fleet Chat is an experimental desktop application built with Tauri v2 (Rust backend) and Lit (TypeScript frontend). It provides a VS Code-like interface with a multi-panel layout including explorer, terminal, chat, and other development tools.

## Common Commands

### Development
```bash
pnpm dev          # Start Tauri development with frontend and backend
pnpm dev:ui       # Start frontend only on port 1420
```

### Building
```bash
pnpm build        # Build Tauri app for production (debug)
pnpm build:ui     # Build frontend only
```

### Code Quality
```bash
pnpm check        # Run Biome checks and auto-fix issues
pnpm lint         # Run Biome linter with auto-fix
pnpm format       # Format all code (JavaScript/TypeScript and Rust)
pnpm typecheck    # Run TypeScript type checking
```

### Maintenance
```bash
pnpm cleanup      # Clean all build artifacts
pnpm cleanup:deps  # Remove all lock files and node_modules
pnpm update-deps  # Update dependencies using npm-check-updates
```

### Tauri Specific
```bash
pnpm tauri <command>  # Run any Tauri CLI command
```

## Architecture Overview

### Frontend Architecture (TypeScript/Lit)
- **Framework**: Lit 3.3.1 web components with TypeScript
- **Routing**: Client-side routing using `@lit-labs/router`
- **State Management**: NanoStores with persistence via `@nanostores/persistent`
- **Styling**: CSS with OKLCH color space, compiled via Lightning CSS
- **Build Tool**: Vite with Lightning CSS optimization

### Backend Architecture (Rust/Tauri)
- **Framework**: Tauri v2 for cross-platform desktop capabilities
- **Language**: Rust for native performance and system integration
- **Plugins**: Multiple Tauri plugins (dialog, http, log, notification, etc.)

### Panel System
The application features a flexible, state-persistent panel system:
- **Left Panels**: Explorer (default), Search, Source Control, Settings
- **Bottom Panel**: Terminal with maximize support
- **Right Panel**: Chat
- All panels are resizable and their state persists to localStorage

### State Management Pattern
- UI state is managed through `uiStore` in `src/stores/ui.store.ts`
- Uses persistent NanoStores that automatically sync to localStorage
- StoreController pattern binds stores to Lit components reactively
- Panel dimensions, visibility, and active states are persisted

### Component Structure
- Components use Lit decorators (`@customElement`)
- Slot-based composition for flexible layouts
- Event-driven communication between components
- Styles encapsulated in CSS modules

## Key Configuration Files

- `tauri.conf.json` - Tauri app configuration (build commands, window settings, plugins)
- `vite.config.ts` - Frontend build configuration with Lightning CSS
- `biome.json` - Linter and formatter configuration (replaces ESLint/Prettier)
- `src/routes.ts` - Application routing configuration

## Development Notes

### Frontend Development
- UI runs on `http://localhost:1420` during development
- Hot module replacement (HMR) is enabled
- TypeScript strict mode is enforced
- All components must be imported in `src/main.ts`

### Code Style
- Uses Biome for consistent formatting (4 spaces for CSS, 2 for JS)
- Single quotes for JavaScript strings, double for CSS
- Semicolons as needed (ASAP style)
- Import organization is automated

### State Persistence
- Panel configurations automatically persist to localStorage
- Use `savePanelWidth()`, `savePanelHeight()`, and panel toggle functions
- State persists across app restarts

### Tauri Integration
- macOS Private API enabled for custom window controls
- Brownfield security pattern for flexible frontend development
- CSP disabled for development (can be enabled for production)

## Testing

Currently, no test framework is configured. When adding tests:
- Consider adding Web Test Runner for Lit component testing
- For Rust backend, use built-in Rust testing framework

## Platform-Specific Notes

### macOS
- Custom title bar with traffic light buttons
- Build may show unsigned warning (fix with `xattr` command)
- Minimum system version: 11.0

### Build Targets
- Supports all platforms via Tauri
- Output directory: `.output/frontend`
- Icons located in `icons/` directory