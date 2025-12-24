# 🦀 Fleet Chat

[![GitHub Release](https://img.shields.io/github/v/release/sternelee/fleet-chat?logo=rust)](https://github.com/sternelee/fleet-chat/releases)
[![MSRV](https://img.shields.io/badge/rust-v1.80-orange.svg?logo=rust&label=Rust)](https://www.rust-lang.org)
[![Tauri Version](https://img.shields.io/badge/tauri-v2.9-orange.svg?logo=tauri&label=Tauri)](https://tauri.app)
[![Dependencies](https://deps.rs/repo/github/sternelee/fleet-chat/status.svg)](https://deps.rs/repo/github/sternelee/fleet-chat)

> [!WARNING]
> This project is experimental and may not be stable.

Fleet Chat is an experimental VS Code-like desktop application built with Tauri and Lit web components, featuring a multi-panel layout with advanced development tools.

<img src="./assets/images/screenshot.png" alt="banner" width="100%" />

## ✨ Features

- [x] **Tauri v2 + Lit + TypeScript** - Modern desktop app framework with web technologies
- [x] **VS Code-like Interface** - Multi-panel layout with explorer, terminal, chat, and search
- [x] **Built-in Router** - Client-side routing for multi-page applications
- [x] **Optimized CSS** - Lightning CSS with OKLCH color space
- [x] **Themeable Components** - Customizable component system
- [x] **Lucide Icons** - Web component integration: `<lucide-icon>`
- [x] **Persisted UI State** - Nano Stores with automatic localStorage sync
- [x] **Custom Window Controls** - macOS-style window decorations
- [x] **Application Search** - macOS app discovery with ICNS icon extraction
- [x] **File Search** - Fast file content and name search
- [x] **AI Search Insights** - Intelligent search result summaries powered by Rig agent
- [x] **A2UI Framework** - Agent-to-UI system with multi-provider AI support
- [x] **Plugin System** - Vicinae-inspired architecture with Raycast plugin compatibility
- [x] **React-to-Lit Compilation** - Seamlessly run existing Raycast plugins
- [x] **Web Worker Isolation** - Secure sandboxed plugin execution
- [x] **pnpm Workspace Management** - Modern plugin development and dependency management
- [x] **Hot Module Replacement** - Fast development with live reload
- [x] **Modern Tooling** - Biome for linting/formatting, TypeScript strict mode

## AI Provider Configuration

The application supports multiple AI providers for the A2UI agent service and AI-powered search insights. Configure one of the following providers by setting the appropriate environment variable:

### OpenAI (GPT-4, GPT-3.5-turbo, etc.)

```sh
export OPENAI_API_KEY=your-openai-api-key-here
```

### Anthropic (Claude models)

```sh
export ANTHROPIC_API_KEY=your-anthropic-api-key-here
```

### Google Gemini (Gemini 2.5 Flash, etc.)

```sh
export GEMINI_API_KEY=your-gemini-api-key-here
```

**Provider Selection Priority:**

1. OpenAI (if `OPENAI_API_KEY` is set)
2. Anthropic (if `ANTHROPIC_API_KEY` is set and OpenAI key not available)
3. Gemini (if `GEMINI_API_KEY` is set and other keys not available)

You can also add these variables to a `.env` file in the root directory. See `.env.example` for reference.

### AI Search Insights

When an AI provider is configured, search results will automatically include intelligent summaries and suggestions. The AI analyzes your search results to provide:
- Brief summaries of found applications and files
- Contextual suggestions for next actions
- Pattern recognition in search results

See [docs/AI_SEARCH_INTEGRATION.md](./docs/AI_SEARCH_INTEGRATION.md) for detailed documentation.

## 🔌 Plugin Development

Fleet Chat features a comprehensive plugin system inspired by Vicinae architecture that supports Raycast plugin compatibility:

### Creating a New Plugin

```bash
# Create a new plugin using the CLI tool
node tools/plugin-cli.js create my-plugin

# This creates a new plugin in src/plugins/examples/my-plugin/
cd src/plugins/examples/my-plugin

# Install plugin dependencies
pnpm install
```

### Plugin Structure

```
src/plugins/examples/my-plugin/
├── package.json          # Plugin manifest and dependencies
├── tsconfig.json         # TypeScript configuration
├── src/
│   ├── index.ts          # Main plugin entry point
│   └── commands/         # Plugin commands
├── README.md             # Plugin documentation
└── assets/               # Plugin icons and assets
```

### Example Plugin

```typescript
import { List, ActionPanel, Action } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item
        title="Hello World"
        subtitle="Welcome to Fleet Chat plugins!"
        actions={
          <ActionPanel>
            <Action title="Say Hello" onAction={() => console.log("Hello!")} />
          </ActionPanel>
        }
      />
    </List>
  );
}
```

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/sternelee/fleet-chat.git
cd fleet-chat

# Install dependencies (including workspace packages)
pnpm install

# Start development server with plugin system
pnpm dev

# Build for production
pnpm build
```

## 📁 Project Structure

```
fleet-chat/
├── src/                    # Frontend (TypeScript/Lit)
│   ├── main.ts            # Application entry point
│   ├── routes.ts          # Route configuration
│   ├── stores/            # NanoStores state management
│   ├── views/             # Lit components (search, explorer, etc.)
│   ├── plugins/           # Plugin system
│   │   ├── plugin-system.ts      # Core type definitions
│   │   ├── plugin-manager.ts     # Plugin lifecycle management
│   │   ├── plugin-integration.ts # UI integration layer
│   │   ├── storage/             # Storage components (LocalStorage, Cache)
│   │   ├── system/              # System components (Clipboard, FileSystem)
│   │   ├── ui/components/       # UI components (List, Grid, Detail, Form, Action)
│   │   ├── examples/            # Example plugins (hello-world, testplugin)
│   │   └── renderer/            # React-to-Lit compilation system
│   └── styles/            # CSS stylesheets
├── src-tauri/             # Backend (Rust/Tauri)
│   ├── src/               # Rust source code
│   │   ├── a2ui/          # A2UI backend service
│   │   ├── plugins.rs     # Plugin system integration
│   │   ├── search.rs      # Application/file search with ICNS extraction
│   │   ├── axum_app.rs    # Axum web server
│   │   └── ...
│   ├── Cargo.toml         # Rust dependencies
│   └── tauri.conf.json    # Tauri configuration
├── packages/              # Shared packages (fleet-chat-api, raycast-api-compat)
├── tools/                 # Development tools (plugin-cli.js)
├── pnpm-workspace.yaml    # Workspace configuration
├── icons/                 # Application icons
└── assets/                # Static assets
```

## 🛠️ Development Commands

```bash
# Development
pnpm dev          # Start Tauri development with frontend and backend
pnpm dev:ui       # Start frontend only on port 1420

# Building
pnpm build        # Build Tauri app for production (debug)
pnpm build:ui     # Build frontend only

# Code Quality
pnpm check        # Run Biome checks and auto-fix issues
pnpm lint         # Run Biome linter with auto-fix
pnpm format       # Format all code (JavaScript/TypeScript and Rust)
pnpm typecheck    # Run TypeScript type checking

# Maintenance
pnpm cleanup      # Clean all build artifacts
pnpm update-deps  # Update dependencies

# Plugin Development
node tools/plugin-cli.js create <plugin-name>    # Create new plugin
node tools/plugin-cli.js build <plugin-name>     # Build plugin
node tools/plugin-cli.js test <plugin-name>      # Test plugin
node tools/plugin-cli.js list                    # List available plugins
```

## 🏗️ Architecture

### Frontend
- **Framework**: Lit 3.3.1 with TypeScript
- **Routing**: Client-side routing using `@lit-labs/router`
- **State**: NanoStores with persistence via `@nanostores/persistent`
- **Styling**: CSS with OKLCH color space via Lightning CSS
- **Build**: Vite with Lightning CSS optimization

### Backend
- **Framework**: Tauri v2 with Rust
- **Web Server**: Axum HTTP server providing RESTful APIs
- **AI Integration**: Multi-provider support (OpenAI GPT-4, Anthropic Claude, Google Gemini)
- **Search**: macOS application discovery, file search, and AI-powered insights
- **Plugin Integration**: Rust plugin system for management and execution

### Plugin System
- **Architecture**: Vicinae-inspired design with React-to-Lit compilation
- **Isolation**: Web Worker sandboxed execution environment
- **Compatibility**: Full Raycast API compatibility layer
- **UI Components**: Complete set of Raycast-compatible components (List, Grid, Detail, Form, Action)
- **Storage**: LocalStorage and Cache with TTL support
- **System APIs**: Clipboard and FileSystem with Tauri integration
- **Development**: pnpm workspace management and CLI tools

### Panel System
- **Left Panels**: Explorer (default), Search, Source Control, Settings
- **Bottom Panel**: Terminal with maximize support
- **Right Panel**: Chat with AI integration
- All panels are resizable with persistent state

## Recommended IDE Setup

[Visual Studio Code](https://code.visualstudio.com/) + [Recomended extensions](./.vscode/extensions.json)

### Fix Unsigned Warning (macOS)

> Warning: "Fleet Chat" is damaged and can't be opened.

This warning is shown because the build is not signed. Run the following command
to suppress this warning:

```sh
xattr -r -d com.apple.quarantine "/Applications/Fleet Chat.app"
```

## License

Licensed under either of [Apache License 2.0][license-apache] or [MIT license][license-mit] at your option.

> Unless you explicitly state otherwise, any contribution intentionally submitted
> for inclusion in this project by you, as defined in the Apache-2.0 license, shall
> be dual licensed as above, without any additional terms or conditions.

Copyrights in this project are retained by their contributors.

See the [LICENSE-APACHE](./LICENSE-APACHE) and [LICENSE-MIT](./LICENSE-MIT) files
for more information.

[rust]: https://www.rust-lang.org/tools/install
[lit]: https://lit.dev
[biome]: https://biomejs.dev
[nodejs]: https://nodejs.org/en/download
[pnpm]: https://pnpm.io/installation
[license-mit]: https://choosealicense.com/licenses/mit/
[license-apache]: https://choosealicense.com/licenses/apache-2.0/

---

<sub>🤫 Psst! If you like my work you can support me via [GitHub sponsors](https://github.com/sponsors/sternelee).</sub>
