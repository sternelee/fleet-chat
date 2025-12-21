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
- [x] **A2UI Framework** - Agent-to-UI system with multi-provider AI support
- [x] **Hot Module Replacement** - Fast development with live reload
- [x] **Modern Tooling** - Biome for linting/formatting, TypeScript strict mode

## AI Provider Configuration

The application supports multiple AI providers for the A2UI agent service. Configure one of the following providers by setting the appropriate environment variable:

### OpenAI (GPT-4, GPT-3.5-turbo, etc.)

```sh
export OPENAI_API_KEY=your-openai-api-key-here
```

### Google Gemini (Gemini 2.5 Flash, etc.)

```sh
export GEMINI_API_KEY=your-gemini-api-key-here
```

**Provider Selection Priority:**

1. OpenAI (if `OPENAI_API_KEY` is set)
2. Gemini (if `GEMINI_API_KEY` is set and OpenAI key not available)

You can also add these variables to a `.env` file in the root directory. See `.env.example` for reference.

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/sternelee/fleet-chat.git
cd fleet-chat

# Install dependencies
pnpm install

# Start development server
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
│   └── styles/            # CSS stylesheets
├── src-tauri/             # Backend (Rust/Tauri)
│   ├── src/               # Rust source code
│   │   ├── a2ui/          # A2UI backend service
│   │   ├── search.rs      # Application/file search with ICNS extraction
│   │   ├── axum_app.rs    # Axum web server
│   │   └── ...
│   ├── Cargo.toml         # Rust dependencies
│   └── tauri.conf.json    # Tauri configuration
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
- **AI Integration**: Multi-provider support (OpenAI GPT-4, Google Gemini 2.5 Flash)
- **Search**: macOS application discovery and file search capabilities

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
