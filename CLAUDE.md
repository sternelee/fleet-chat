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
pnpm format:rs    # Format Rust code only
pnpm format:js    # Format JavaScript/TypeScript code only
pnpm typecheck    # Run TypeScript type checking
cd src-tauri && cargo check    # Check Rust compilation
cd src-tauri && cargo fmt      # Format Rust code
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

### Plugin Development
```bash
node tools/plugin-cli.js create <plugin-name>    # Create new plugin
node tools/plugin-cli.js build <plugin-name>     # Build plugin
node tools/plugin-cli.js list                    # List available plugins
```

## Architecture Overview

### Frontend Architecture (TypeScript/Lit)
- **Framework**: Lit 3.3.1 web components with TypeScript
- **Routing**: Client-side routing using `@lit-labs/router`
- **State Management**: NanoStores with persistence via `@nanostores/persistent`
- **Styling**: CSS with OKLCH color space, compiled via Lightning CSS
- **Build Tool**: Vite with Lightning CSS optimization

### Backend Architecture (Rust/Tauri)
- **Framework**: Tauri v2 for cross-platform desktop capabilities with integrated Axum web server
- **Language**: Rust for native performance and system integration
- **Web Server**: Axum HTTP server providing RESTful APIs and A2UI backend services
- **AI Integration**:
  - Multi-provider AI agent system supporting OpenAI and Google Gemini
  - A2UI (Agent-to-UI) backend service following Google ADK architecture (a2ui_agent.rs)
  - **AI Plugin Generator**: Generate Fleet Chat plugins from natural language descriptions
  - Provider abstraction layer with pluggable AI backends (provider.rs)
  - OpenAI provider: GPT-4, GPT-3.5-turbo support
  - Gemini provider: Gemini 2.5 Flash support
  - JSON schema validation for UI responses
  - Session management and conversation state tracking
- **Plugins**: Multiple Tauri plugins (fs, clipboard, opener, shell, dialog, http, log, notification)

### Plugin System (Vicinae-inspired Architecture)
- **Framework**: React-to-Lit compilation pipeline for Raycast plugin compatibility
- **AI Generation**: A2UI-powered plugin generation from descriptions
- **Isolation**: Web Worker-based plugin execution with sandboxed environments
- **API Compatibility**: Full Raycast API compatibility layer with Lit web components
- **Module Management**: pnpm workspace for plugin development and management
- **Storage**: FCLocalStorage and FCCache with TTL and memory caching
- **System Integration**: FCClipboard and FCFileSystem with Tauri integration
- **UI Components**: Complete set of Raycast-compatible components (List, Grid, Detail, Form, Action, ActionPanel)
- **Development Tools**: CLI tool for plugin creation and management (`tools/plugin-cli.js`)

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
- `src-tauri/Cargo.toml` - Rust dependencies and build configuration for Tauri backend
- `vite.config.ts` - Frontend build configuration with Lightning CSS
- `biome.json` - Linter and formatter configuration (replaces ESLint/Prettier)
- `src/routes.ts` - Application routing configuration
- `src-tauri/src/a2ui_schema.json` - JSON schema for A2UI message validation
- `src-tauri/src/templates/` - Pre-built A2UI UI templates (contact_list, contact_card, action_confirmation, etc.)
- `src-tauri/src/a2ui/plugin_generator.rs` - AI-powered plugin code generation
- `src/plugins/a2ui-plugin-bridge.ts` - Bridge between A2UI and plugin system
- `pnpm-workspace.yaml` - pnpm workspace configuration for plugin management
- `src/plugins/plugin-system.ts` - Core plugin system type definitions
- `src/plugins/plugin-manager.ts` - Plugin lifecycle and execution management
- `src/plugins/plugin-integration.ts` - Integration with Fleet Chat UI and Tauri APIs
- `src/views/plugin-generator/` - Plugin generator UI component
- `tools/plugin-cli.js` - CLI tool for plugin development and management

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

### A2UI Backend Development
- A2UI (Agent-to-UI) framework integrated in `src-tauri/src/a2ui/agent.rs`
- Follows Google ADK (Agent Development Kit) architecture patterns
- Multi-provider AI integration via abstraction layer in `src-tauri/src/a2ui/provider.rs`
- Supports OpenAI (GPT-4) and Google Gemini (2.5 Flash) providers
- RESTful API endpoints served via Axum in `axum_app.rs`
- JSON schema validation ensures A2UI message compliance
- Session management with conversation context tracking
- Built-in tool calling system for agent capabilities
- Pre-built UI templates for common response patterns

### Key Backend Dependencies
- `axum` - Web framework for HTTP server
- `reqwest` - HTTP client for AI API calls (OpenAI, Gemini)
- `jsonschema` - JSON schema validation
- `async-trait` - Async trait support for provider abstraction
- `uuid` - Session ID generation
- `chrono` - Timestamp handling for session management

## Backend Module Structure

### Core Rust Modules (`src-tauri/src/`)
- **lib.rs** - Main Tauri application entry point and plugin setup
- **axum_app.rs** - Axum web server with A2UI RESTful API endpoints
- **plugins.rs** - Tauri plugin system integration for plugin management
- **a2ui/agent.rs** - A2UI backend service implementing Google ADK patterns
- **a2ui/provider.rs** - AI provider abstraction layer (OpenAI, Gemini)
- **a2ui/schema.rs** - A2UI message schema definitions
- **a2ui/plugin_generator.rs** - AI-powered plugin code generation engine
- **gemini_agent.rs** - Legacy Gemini AI client (being phased out)
- **tauri_axum.rs** - Bridge between Tauri and Axum for local HTTP requests
- **window.rs** - macOS-specific window styling and customization

### Plugin System Modules (`src/plugins/`)
- **plugin-system.ts** - Core plugin system type definitions and interfaces
- **plugin-manager.ts** - Plugin lifecycle, execution, and worker management
- **plugin-integration.ts** - Integration layer with Fleet Chat UI and Tauri APIs
- **a2ui-plugin-bridge.ts** - Bridge between A2UI generation and plugin installation
- **storage/local-storage.ts** - FCLocalStorage for persistent data storage
- **storage/cache.ts** - FCCache with TTL and memory caching capabilities
- **system/clipboard.ts** - FCClipboard with Tauri and browser fallback support
- **system/filesystem.ts** - FCFileSystem with file operations and metadata
- **ui/components/** - Raycast-compatible UI components (List, Grid, Detail, Form, Action)
- **renderer/** - React-to-Lit compilation and rendering system
- **examples/** - Example plugins demonstrating the plugin system
- **public/workers/** - Web Workers for isolated plugin execution

### Key A2UI Components
- **A2UIAgent** - Core agent with session management and tool calling
- **AIProvider trait** - Abstract interface for AI providers
- **OpenAIProvider** - OpenAI/GPT integration implementation
- **GeminiProvider** - Google Gemini integration implementation
- **A2UIResponse** - Structured responses with JSON schema validation
- **Tool execution** - Built-in tools for contact search, data retrieval
- **Prompt engineering** - Context-aware UI generation with examples
- **Response validation** - Multi-pass validation with retry mechanisms

### AI Provider Configuration
The system supports multiple AI providers through environment variables:
- `OPENAI_API_KEY` - For OpenAI/GPT models (checked first)
- `GEMINI_API_KEY` - For Google Gemini models (fallback)
- Provider selection is automatic based on available API keys
- Default models: GPT-4 for OpenAI, Gemini 2.5 Flash for Gemini

## Testing

Currently, no test framework is configured. When adding tests:
- Consider adding Web Test Runner for Lit component testing
- For Rust backend, use built-in Rust testing framework (`cargo test`)
- Test A2UI endpoints with tools like `curl` or Postman against localhost:3000

## Platform-Specific Notes

### macOS
- Custom title bar with traffic light buttons
- Build may show unsigned warning (fix with `xattr` command)
- Minimum system version: 11.0

### Build Targets
- Supports all platforms via Tauri
- Output directory: `.output/frontend`
- Icons located in `icons/` directory