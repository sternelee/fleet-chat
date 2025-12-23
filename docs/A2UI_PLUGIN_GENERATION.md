# A2UI Plugin Generation System

## Overview

The A2UI Plugin Generation system enables Fleet Chat to automatically generate plugins using AI. Users can describe what they want in natural language, and the A2UI backend will generate a complete, working Fleet Chat plugin with manifest, source code, and optionally A2UI components.

## Architecture

### Components

```
┌─────────────────────────────────────────────────────┐
│           Frontend (TypeScript/Lit)                 │
│  ┌──────────────────────────────────────────────┐   │
│  │  plugin-generator-view (UI Component)        │   │
│  │  - Form for user input                       │   │
│  │  - Generated plugin display                  │   │
│  │  - Download functionality                    │   │
│  └──────────────────────────────────────────────┘   │
│                      ▼                               │
│  ┌──────────────────────────────────────────────┐   │
│  │  A2UIPluginGeneratorClient (Service)         │   │
│  │  - API communication                         │   │
│  │  - Plugin file management                    │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
                      ▼ HTTP
┌─────────────────────────────────────────────────────┐
│           Backend (Rust/Axum)                       │
│  ┌──────────────────────────────────────────────┐   │
│  │  API Endpoints                               │   │
│  │  - POST /a2ui/plugin/generate                │   │
│  │  - POST /a2ui/plugin/generate/preview        │   │
│  └──────────────────────────────────────────────┘   │
│                      ▼                               │
│  ┌──────────────────────────────────────────────┐   │
│  │  A2UIPluginGenerator                         │   │
│  │  - Prompt engineering                        │   │
│  │  - Code extraction                           │   │
│  │  - Manifest generation                       │   │
│  └──────────────────────────────────────────────┘   │
│                      ▼                               │
│  ┌──────────────────────────────────────────────┐   │
│  │  A2UIAgent                                   │   │
│  │  - AI provider abstraction                   │   │
│  │  - Session management                        │   │
│  │  - Response parsing                          │   │
│  └──────────────────────────────────────────────┘   │
│                      ▼                               │
│  ┌──────────────────────────────────────────────┐   │
│  │  AI Providers (OpenAI/Gemini)                │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## Usage

### Basic Usage

1. Navigate to `/plugin-generator` in Fleet Chat
2. Enter a description of the desired plugin
3. Optionally provide a plugin name
4. Click "Generate Plugin"
5. Review the generated code
6. Download the files

### API Usage

#### Generate a Plugin

```typescript
import { a2uiPluginGenerator } from './services/a2ui-plugin-generator';

// Quick generation
const plugin = await a2uiPluginGenerator.quickGenerate(
  "Create a plugin that shows a list of bookmarks"
);

// With custom name
const plugin = await a2uiPluginGenerator.quickGenerate(
  "A calculator plugin",
  "my-calculator"
);

// With multiple commands
const plugin = await a2uiPluginGenerator.generateMultiCommandPlugin(
  "A productivity plugin with todo and notes",
  "productivity-tools",
  [
    { name: "todo", title: "Todo List", description: "Manage todos", mode: "view" },
    { name: "notes", title: "Quick Notes", description: "Take notes", mode: "view" }
  ]
);
```

#### REST API

```bash
# Generate a plugin
curl -X POST http://localhost:3000/a2ui/plugin/generate \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test-session",
    "description": "Create a plugin that displays weather information",
    "plugin_name": "weather-widget"
  }'

# Get preview only
curl -X POST http://localhost:3000/a2ui/plugin/generate/preview \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test-session",
    "description": "Create a plugin for managing tasks"
  }'
```

## Request/Response Format

### PluginGenerationRequest

```typescript
interface PluginGenerationRequest {
  session_id: string;        // Unique session identifier
  description: string;       // Natural language description
  plugin_name?: string;      // Optional plugin name
  commands?: CommandSpec[];  // Optional command specifications
}

interface CommandSpec {
  name: string;
  title: string;
  description: string;
  mode: "view" | "no-view";
}
```

### GeneratedPlugin Response

```typescript
interface GeneratedPlugin {
  manifest: PluginManifest;
  source_code: string;
  a2ui_components: any[];
}

interface PluginManifest {
  name: string;
  version: string;
  title: string;
  description: string;
  author: string;
  icon: string;
  commands: PluginCommand[];
}
```

## Examples

### Example 1: Simple List Plugin

**Input:**
```
Description: "Create a plugin that shows a list of programming languages 
with their popularity ratings"
```

**Generated Output:**
```typescript
import React from 'react';
import { List, ActionPanel, Action, showToast } from '@fleet-chat/raycast-api';

const languages = [
  { name: "JavaScript", rating: "95%" },
  { name: "Python", rating: "92%" },
  { name: "TypeScript", rating: "88%" },
  { name: "Rust", rating: "85%" }
];

export default function Command() {
  return (
    <List>
      {languages.map((lang, index) => (
        <List.Item
          key={index}
          title={lang.name}
          subtitle={`Popularity: ${lang.rating}`}
          actions={
            <ActionPanel>
              <Action
                title="Learn More"
                onAction={() => {
                  showToast({
                    title: lang.name,
                    message: `${lang.rating} popularity rating`
                  });
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
```

### Example 2: Multi-Command Plugin

**Input:**
```
Description: "Create a plugin for time management with both a timer and a stopwatch"
Plugin Name: "time-tools"
Commands:
  - name: "timer", title: "Countdown Timer", mode: "view"
  - name: "stopwatch", title: "Stopwatch", mode: "view"
```

**Generated Output:**
- Complete package.json with both commands
- Separate exported functions for each command
- Timer UI with countdown functionality
- Stopwatch UI with start/stop/reset

### Example 3: Plugin with A2UI Components

**Input:**
```
Description: "Create a plugin that displays contact information with dynamic search"
```

The generator will:
1. Create the plugin manifest
2. Generate TypeScript source code
3. Generate A2UI components for dynamic UI updates
4. Include data model bindings for search functionality

## Implementation Details

### Prompt Engineering

The A2UIPluginGenerator builds specialized prompts that:
- Explain Fleet Chat plugin structure
- Provide API reference
- Include example patterns
- Request specific output format (MANIFEST, SOURCE_CODE, A2UI_COMPONENTS)

### Code Extraction

The generator parses AI responses to extract:
- JSON manifest from markdown code blocks
- TypeScript source code from markdown code blocks
- A2UI component definitions

### Fallback Handling

If parsing fails, the generator provides sensible defaults:
- Auto-generated plugin name from description
- Single "default" command
- Basic template source code

## Configuration

### Environment Variables

```bash
# Required: At least one AI provider
OPENAI_API_KEY=sk-...        # For OpenAI GPT models
GEMINI_API_KEY=...           # For Google Gemini models

# Optional: Axum server configuration
AXUM_PORT=3000               # Default: 3000
```

### AI Provider Selection

The system automatically selects providers in this order:
1. OpenAI (if `OPENAI_API_KEY` is set)
2. Gemini (if `GEMINI_API_KEY` is set)

## Testing

### Manual Testing

1. Start the Axum backend: `cargo run` (from `src-tauri/`)
2. Start the frontend: `pnpm dev:ui`
3. Navigate to http://localhost:1420/plugin-generator
4. Test plugin generation with various descriptions

### API Testing

```bash
# Test endpoint availability
curl http://localhost:3000/ping

# Generate test plugin
curl -X POST http://localhost:3000/a2ui/plugin/generate \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test",
    "description": "Hello world plugin"
  }'
```

## Limitations

### Current Limitations

1. **AI Quality**: Generated code quality depends on the AI model
2. **No Validation**: Generated code is not validated before download
3. **No Compilation**: Source code is not compiled or type-checked
4. **Browser Downloads**: Files are downloaded via browser, not saved to disk via Tauri

### Future Improvements

1. **Code Validation**: Validate generated TypeScript code
2. **Live Preview**: Run generated plugins in sandbox before download
3. **Plugin Templates**: Pre-built templates for common plugin types
4. **Iterative Refinement**: Allow users to refine generated plugins
5. **Direct Installation**: Install generated plugins directly to Fleet Chat
6. **Version Control**: Save plugin versions and allow rollback

## Integration with Existing Systems

### Plugin System Integration

Generated plugins are fully compatible with the existing Fleet Chat plugin system:
- Standard package.json manifest format
- Compatible with plugin loader
- Uses @fleet-chat/raycast-api
- Works with drag-and-drop installation

### A2UI Integration

When generated plugins include A2UI components:
- Components follow A2UI schema
- Can be rendered by a2ui-renderer
- Support data binding and actions
- Enable dynamic UI updates

## Troubleshooting

### Plugin Generation Fails

**Problem**: API returns 500 error

**Solutions**:
- Check that AI provider API key is set
- Verify Axum server is running
- Check server logs for detailed error
- Try simpler description

### Generated Code Has Errors

**Problem**: TypeScript compilation errors in generated code

**Solutions**:
- Refine the description to be more specific
- Manually fix the generated code
- Regenerate with clearer requirements
- Use the preview endpoint to inspect code first

### No A2UI Components Generated

**Problem**: A2UI components array is empty

**Solutions**:
- This is normal for simple plugins
- Request dynamic UI explicitly in description
- A2UI components are optional
- Static React components work without A2UI

## Best Practices

### Writing Good Descriptions

✅ **Good**:
```
"Create a plugin that shows a searchable list of GitHub repositories. 
Each item should show the repo name, description, and star count. 
Clicking an item should open the repo in the browser."
```

❌ **Bad**:
```
"github"
```

### Naming Conventions

- Use kebab-case for plugin names: `my-plugin`
- Use descriptive names: `github-stars` not `gs`
- Avoid special characters
- Keep names short but meaningful

### Command Design

- Limit to 1-3 commands per plugin
- Use descriptive command titles
- Set appropriate mode ("view" or "no-view")
- Provide clear command descriptions

## Security Considerations

1. **AI-Generated Code**: Review all generated code before use
2. **API Keys**: Never commit API keys to source control
3. **Input Validation**: Descriptions are not sanitized before sending to AI
4. **Code Execution**: Generated plugins run in Web Worker isolation
5. **Network Access**: Generated plugins can make network requests

## Performance

- **Generation Time**: 3-10 seconds (depends on AI provider)
- **Token Usage**: ~2000-4000 tokens per generation
- **Rate Limits**: Subject to AI provider rate limits
- **Caching**: No caching of generated plugins (each request generates fresh)

## Roadmap

### Short Term (v0.2)

- [ ] Add code validation
- [ ] Support plugin templates
- [ ] Add more examples
- [ ] Improve error messages

### Medium Term (v0.3)

- [ ] Live preview in sandbox
- [ ] Iterative refinement
- [ ] Plugin marketplace integration
- [ ] Version management

### Long Term (v1.0)

- [ ] Multi-language support
- [ ] Custom AI models
- [ ] Collaborative editing
- [ ] Plugin analytics

## Contributing

To contribute to the A2UI Plugin Generation system:

1. Backend: Add features to `src-tauri/src/a2ui/plugin_generator.rs`
2. Frontend: Enhance `src/views/plugin-generator/plugin-generator.component.ts`
3. API Client: Extend `src/services/a2ui-plugin-generator.ts`
4. Documentation: Update this file

## Resources

- [A2UI Specification](./A2UI_ANALYSIS.md)
- [Plugin System Guide](./PLUGIN_SYSTEM.md)
- [Quick Start Guide](./docs/QUICK_START.md)
- [API Documentation](./packages/fleet-chat-api/README.md)
