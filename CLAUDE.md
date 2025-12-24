# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fleet Chat is an experimental Raycast-like desktop application built with Tauri v2 (Rust backend) and Lit (TypeScript frontend). It provides a multi-panel layout including explorer, terminal, chat, and plugin system with AI-powered capabilities.

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
- **Web Server**: Axum HTTP server on port 9527 providing RESTful APIs and A2UI backend services
- **HTTP Proxy Pattern**: `tauri_axum.ts` intercepts fetch() calls and proxies them via Tauri's `local_app_request` command
  - **Important**: SSE streaming is buffered by the proxy and returned when complete, not real-time
  - For true real-time streaming, use full URL `http://localhost:9527` to bypass proxy
- **AI Integration**:
  - Multi-provider AI agent system (Rig framework) supporting OpenAI, Anthropic, Gemini, DeepSeek, OpenRouter
  - A2UI (Agent-to-UI) backend service following Google ADK architecture (a2ui_agent.rs)
  - **AI Plugin Generator**: Generate Fleet Chat plugins from natural language descriptions
  - Provider abstraction layer with pluggable AI backends (provider.rs)
  - Streaming responses via Server-Sent Events (SSE) at `/ai/generate/stream`
  - JSON schema validation for UI responses
  - Session management and conversation state tracking
- **Plugins**: Multiple Tauri plugins (fs, clipboard, opener, shell, dialog, http, log, notification, positioner, process, oauth)

### Plugin System
- **Framework**: React-to-Lit compilation pipeline for Raycast plugin compatibility
- **AI Generation**: A2UI-powered plugin generation from natural language descriptions
- **Package Structure**: Core plugin functionality in `packages/fleet-chat-api/` (shared workspace package)
- **Isolation**: Web Worker-based plugin execution with sandboxed environments
- **API Compatibility**: Full Raycast API compatibility layer via `@raycast/api` re-exports
- **Plugin Formats**: Supports both source plugins and packaged (.fcp) plugins via drag-drop
- **Module Management**: pnpm workspace for plugin development and management
- **UI Components**: Complete set of Raycast-compatible components (List, Grid, Detail, Form, Action, Color, Icon, Toast, MenuBarExtra)
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
- `src-tauri/src/a2ui/schema.json` - JSON schema for A2UI message validation
- `src-tauri/src/templates/` - Pre-built A2UI UI templates (contact_list, contact_card, action_confirmation, etc.)
- `src-tauri/src/a2ui/plugin_generator.rs` - AI-powered plugin code generation
- `src/plugins/a2ui-plugin-bridge.ts` - Bridge between A2UI and plugin system
- `src/plugins/plugin-loader.ts` - Plugin loader for packaged (.fcp) plugins with drag-drop support
- `src/plugins/plugin-manager.ts` - Plugin lifecycle, execution, and worker management
- `src/plugins/plugin-integration.ts` - Integration with Fleet Chat UI and Tauri APIs
- `src/views/plugin-generator/` - Plugin generator UI component
- `packages/fleet-chat-api/` - Shared plugin API package (components, storage, system APIs)
- `pnpm-workspace.yaml` - pnpm workspace configuration for plugin management
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
- `axum` - Web framework for HTTP server (port 9527)
- `rig` - AI agent framework for multi-provider LLM integration (OpenAI, Anthropic, Gemini, DeepSeek, OpenRouter)
- `reqwest` - HTTP client for AI API calls
- `tokio` - Async runtime for Rust
- `jsonschema` - JSON schema validation
- `async-trait` - Async trait support for provider abstraction
- `uuid` - Session ID generation
- `chrono` - Timestamp handling for session management

## Backend Module Structure

### Core Rust Modules (`src-tauri/src/`)
- **lib.rs** - Main Tauri application entry point and plugin setup
- **axum_app.rs** - Axum web server with A2UI RESTful API endpoints
- **plugins.rs** - Tauri plugin system integration for plugin management
- **search.rs** - Application/file search with ICNS icon extraction and AI insights
- **rig_agent.rs** - Rig AI agent with streaming support (multi-provider: OpenAI, Anthropic, Gemini, DeepSeek, OpenRouter)
- **a2ui/agent.rs** - A2UI backend service implementing Google ADK patterns
- **a2ui/provider.rs** - AI provider abstraction layer (OpenAI, Gemini)
- **a2ui/schema.rs** - A2UI message schema definitions
- **a2ui/plugin_generator.rs** - AI-powered plugin code generation engine
- **a2ui/mod.rs** - A2UI module exports
- **gemini_agent.rs** - Legacy Gemini AI client (being phased out)
- **tauri_axum.rs** - Bridge between Tauri and Axum for local HTTP requests
- **window.rs** - macOS-specific window styling and customization
- **templates/** - Pre-built A2UI UI templates (contact_list, contact_card, action_confirmation, etc.)

### Plugin System Modules (`src/plugins/`)
- **plugin-system.ts** - Core plugin system type definitions and interfaces
- **plugin-manager.ts** - Plugin lifecycle, execution, and worker management
- **plugin-loader.ts** - Plugin loader for packaged (.fcp) plugins with drag-drop support
- **plugin-integration.ts** - Integration layer with Fleet Chat UI and Tauri APIs
- **a2ui-plugin-bridge.ts** - Bridge between A2UI generation and plugin installation

### Fleet Chat API Package (`packages/fleet-chat-api/`)
This is the shared plugin API package that provides the core functionality for Fleet Chat plugins:
- **api/** - Tauri command wrappers (storage, clipboard, filesystem, applications, etc.)
- **components/** - Raycast-compatible UI components (List, Grid, Detail, Form, Action, Color, Icon, Toast, MenuBarExtra)
- **plugins/core/** - Core plugin types and manager interfaces
- **plugins/loader/** - Plugin loader for packaged plugins
- **storage/** - LocalStorage and Cache implementations
- **system/** - System integrations (clipboard, filesystem)
- **renderer/** - React-to-Lit compilation system
- **utils/** - Utility functions (logger, react-to-lit transformer)
- **raycast-api/** - Raycast API compatibility layer
- **examples/** - Example plugins (hello-world, testplugin)

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
- `ANTHROPIC_API_KEY` - For Anthropic/Claude models (second priority)
- `GEMINI_API_KEY` - For Google Gemini models (third priority)
- `DEEPSEEK_API_KEY` - For DeepSeek models
- `OPENROUTER_API_KEY` - For OpenRouter models
- Provider selection is automatic based on available API keys
- Default models: GPT-4 for OpenAI, Claude for Anthropic, Gemini 2.5 Flash for Gemini

### AI Streaming Architecture
**Frontend fetch pattern**:
- Relative paths like `/ai/generate/stream` are proxied through `tauri_axum`
- The proxy uses `axum::body::to_bytes()` which buffers the entire SSE stream
- This means streaming responses arrive all at once when complete, not incrementally
- For true real-time streaming, use `fetch('http://localhost:9527/ai/generate/stream')` directly

**Axum endpoint**: `/ai/generate/stream` returns SSE with format:
```
event: chunk
data: {"text":"..."}

event: done
data: {}
```

## Testing

Currently, no test framework is configured. When adding tests:
- Consider adding Web Test Runner for Lit component testing
- For Rust backend, use built-in Rust testing framework (`cargo test`)
- Test Axum endpoints with tools like `curl` or Postman against `http://localhost:9527`

## Platform-Specific Notes

### macOS
- Custom title bar with traffic light buttons
- Build may show unsigned warning (fix with `xattr` command)
- Minimum system version: 11.0

### Build Targets
- Supports all platforms via Tauri
- Output directory: `.output/frontend`
- Icons located in `icons/` directory