# A2UI Plugin Generation System

## Overview

The A2UI Plugin Generation System leverages Fleet Chat's A2UI (Agent-to-UI) framework to dynamically generate Fleet Chat plugins using AI. This system allows users to describe what they want their plugin to do, and the system will generate a complete, working plugin with code, manifest, and structure.

## Architecture

### Backend Components

1. **Plugin Generator Module** (`src-tauri/src/a2ui/plugin_generator.rs`)
   - Core logic for generating plugin code and manifests
   - Supports multiple plugin types (List, Grid, Detail, Form)
   - Generates TypeScript/React code compatible with Fleet Chat's plugin system
   - Includes code templates for different plugin types

2. **API Endpoints** (`src-tauri/src/axum_app.rs`)
   - `POST /a2ui/generate-plugin` - Generate a plugin synchronously
   - `POST /a2ui/generate-plugin/stream` - Generate a plugin with streaming progress

### Frontend Components

1. **Plugin Generator UI** (`src/views/plugin-generator/plugin-generator.component.ts`)
   - User-friendly form interface for plugin generation
   - Real-time preview of generated plugins
   - Code viewing and downloading capabilities
   - Integration with A2UI backend

## Features

### Plugin Types Supported

1. **List Plugin** - Display items in a list with search and actions
2. **Grid Plugin** - Display items in a grid layout with visual cards
3. **Detail Plugin** - Display detailed information with markdown support
4. **Form Plugin** - Collect user input with form fields

### Generated Plugin Features

- ✅ Complete TypeScript/React source code
- ✅ Package manifest (package.json)
- ✅ Sample data (optional)
- ✅ Raycast API compatibility
- ✅ Local storage integration
- ✅ Clipboard integration
- ✅ Action panels with multiple actions
- ✅ Search functionality (for List plugins)
- ✅ Error handling and loading states

## Usage

### Via UI

1. Navigate to `/plugin-generator` in Fleet Chat
2. Fill in the plugin details:
   - **Description**: What the plugin should do (required)
   - **Name**: Plugin name (auto-generated if empty)
   - **Type**: Choose from List, Grid, Detail, or Form
   - **Requirements**: Additional specific requirements (optional)
   - **Sample Data**: Include example data for testing
3. Click "Generate Plugin"
4. Review the generated code and manifest
5. Download or copy the plugin for further customization

### Via API

#### Generate Plugin (Synchronous)

```bash
curl -X POST http://localhost:3000/a2ui/generate-plugin \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Display a list of GitHub repositories",
    "name": "github-repos",
    "plugin_type": "list",
    "requirements": [
      "Show repository name and description",
      "Include star count",
      "Add action to open in browser"
    ],
    "include_sample_data": true
  }'
```

Response:
```json
{
  "manifest": {
    "name": "github-repos",
    "version": "1.0.0",
    "description": "Display a list of GitHub repositories",
    "author": "A2UI Plugin Generator",
    "icon": "📋",
    "commands": [
      {
        "name": "default",
        "title": "GitHub Repos",
        "description": "Display a list of GitHub repositories",
        "mode": "view"
      }
    ]
  },
  "source_code": "/* Generated TypeScript code */",
  "plugin_id": "plugin-123e4567-e89b-12d3-a456-426614174000",
  "package_name": "github-repos.fcp",
  "explanation": "Generated a list plugin...",
  "warnings": []
}
```

#### Generate Plugin (Streaming)

```bash
curl -X POST http://localhost:3000/a2ui/generate-plugin/stream \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Todo list manager",
    "plugin_type": "form"
  }'
```

## Request Schema

### PluginGenerationRequest

```typescript
interface PluginGenerationRequest {
  // Human-readable description of plugin functionality (required)
  description: string;
  
  // Plugin name (optional, auto-generated from description if empty)
  name?: string;
  
  // Plugin type: "list" | "grid" | "detail" | "form" (default: "list")
  plugin_type?: string;
  
  // Additional requirements (optional)
  requirements?: string[];
  
  // Include sample data for testing (default: true)
  include_sample_data?: boolean;
  
  // User preferences (optional)
  preferences?: Record<string, any>;
}
```

### PluginGenerationResponse

```typescript
interface PluginGenerationResponse {
  // Generated plugin manifest
  manifest: {
    name: string;
    version: string;
    description: string;
    author: string;
    icon: string;
    commands: Array<{
      name: string;
      title: string;
      description: string;
      mode: string;
    }>;
    categories?: string[];
    preferences?: any[];
  };
  
  // Generated TypeScript/React source code
  source_code: string;
  
  // Unique plugin ID
  plugin_id: string;
  
  // Suggested package name for .fcp file
  package_name: string;
  
  // AI-generated explanation of the plugin
  explanation: string;
  
  // Any warnings or recommendations
  warnings?: string[];
}
```

## Generated Code Structure

### List Plugin Example

```typescript
import React, { useState, useEffect } from 'react';
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Clipboard,
  LocalStorage,
} from '@fleet-chat/raycast-api';

export default function Command() {
  const [items, setItems] = useState([
    {
      id: '1',
      title: 'Sample Item',
      subtitle: 'Description',
      content: 'Content',
    },
  ]);

  const [searchText, setSearchText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const filteredItems = items.filter(item =>
    item.title.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      {filteredItems.map((item) => (
        <List.Item
          key={item.id}
          title={item.title}
          subtitle={item.subtitle}
          actions={
            <ActionPanel>
              <Action
                title="View Details"
                onAction={async () => {
                  await showToast({
                    title: 'Item Selected',
                    message: item.title,
                  });
                }}
              />
              <Action
                title="Copy to Clipboard"
                onAction={async () => {
                  await Clipboard.copy(item.content);
                  await showToast({
                    title: 'Copied',
                    message: 'Copied to clipboard',
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

## Customization

After generating a plugin, you can:

1. **Modify the Code**: Edit the generated TypeScript to add custom logic
2. **Add API Calls**: Integrate with external APIs for data fetching
3. **Customize UI**: Adjust the layout, styling, and components
4. **Add Preferences**: Define user-configurable settings
5. **Add Multiple Commands**: Export additional functions for more commands

## Packaging & Installation

### 1. Save Generated Files

Save the generated code and manifest to a directory:

```bash
mkdir my-plugin
cd my-plugin
# Save source_code to src/index.ts
# Save manifest to package.json
```

### 2. Package the Plugin

Use the Fleet Chat plugin CLI:

```bash
node tools/plugin-cli.js build my-plugin
```

This creates a `.fcp` file (Fleet Chat Plugin package).

### 3. Install the Plugin

- **Drag & Drop**: Drag the `.fcp` file into Fleet Chat
- **Programmatic**: Use the plugin manager API

## Best Practices

### Description Guidelines

- Be specific about functionality
- Include key features you want
- Mention data sources if relevant
- Specify UI preferences

Good examples:
- ✅ "Display GitHub repositories with star count, last updated date, and ability to open in browser"
- ✅ "Todo list manager with add, edit, delete, and mark complete functionality"
- ✅ "Weather dashboard showing current conditions, 5-day forecast, and temperature charts"

Poor examples:
- ❌ "Make a plugin"
- ❌ "Show stuff"
- ❌ "List things"

### Requirements

Use requirements to add specific features:
- Data validation rules
- Specific UI components
- Integration with external APIs
- Keyboard shortcuts
- Custom actions

### Sample Data

- ✅ Enable for initial development and testing
- ✅ Provides working examples to build upon
- ❌ Disable for production plugins
- ❌ Replace with real data loading logic

## Troubleshooting

### Common Issues

1. **Generation Fails**
   - Check that A2UI backend is running (port 3000)
   - Verify AI provider is configured (OpenAI or Gemini)
   - Check backend logs for errors

2. **Generated Code Has Errors**
   - TypeScript errors may need manual fixing
   - Update import paths if needed
   - Add missing type definitions

3. **Plugin Won't Load**
   - Validate package.json structure
   - Check for syntax errors in generated code
   - Ensure all required dependencies are present

### Getting Help

- Review generated code warnings
- Check console for error messages
- Refer to Fleet Chat plugin documentation
- Examine example plugins in `src/plugins/examples/`

## Examples

### Example 1: Weather Plugin

Request:
```json
{
  "description": "Show current weather and 5-day forecast",
  "name": "weather-widget",
  "plugin_type": "detail",
  "requirements": [
    "Display temperature, humidity, and conditions",
    "Show 5-day forecast",
    "Include weather icon"
  ]
}
```

### Example 2: Todo Manager

Request:
```json
{
  "description": "Manage todo items with categories",
  "name": "todo-manager",
  "plugin_type": "list",
  "requirements": [
    "Add, edit, delete todos",
    "Mark as complete/incomplete",
    "Filter by category",
    "Persist to local storage"
  ],
  "include_sample_data": true
}
```

### Example 3: Contact Form

Request:
```json
{
  "description": "Submit contact information form",
  "name": "contact-form",
  "plugin_type": "form",
  "requirements": [
    "Name, email, phone fields",
    "Message textarea",
    "Email validation",
    "Save to local storage"
  ]
}
```

## Future Enhancements

- [ ] AI-powered code refinement based on feedback
- [ ] Template library for common plugin patterns
- [ ] Direct plugin installation from generator
- [ ] Version control and plugin updates
- [ ] Plugin marketplace integration
- [ ] Multi-language code generation
- [ ] Visual plugin builder interface
- [ ] Plugin testing framework integration

## API Reference

See also:
- [A2UI Agent API](./AI_PROVIDER_GUIDE.md)
- [Plugin System Guide](./PLUGIN_SYSTEM_GUIDE.md)
- [Fleet Chat API Reference](../packages/fleet-chat-api/README.md)

## License

This feature is part of Fleet Chat and is licensed under MIT/Apache-2.0.
