/**
 * Fleet Chat Plugin Examples
 *
 * Example plugins demonstrating the Fleet Chat plugin system
 * These examples show how to use the Raycast-compatible API
 */

// Re-export example plugins (when they are converted to TypeScript modules)
// export * from './hello-world/index.js';
// export * from './testplugin/index.js';

// Example plugin manifests
export const helloWorldManifest = {
  "$schema": "https://developers.raycast.com/schemas/extension-manifest.json",
  "icon": "👋",
  "name": "hello-world",
  "title": "Hello World",
  "description": "A simple hello world plugin for Fleet Chat",
  "author": "Fleet Chat Team",
  "license": "MIT",
  "version": "1.0.0",
  "categories": ["Productivity"],
  "commands": [
    {
      "name": "hello",
      "title": "Hello World",
      "description": "Shows a greeting message",
      "mode": "view" as const,
      "keywords": ["greeting", "welcome"]
    },
    {
      "name": "hello-list",
      "title": "Hello List",
      "description": "Shows a list of greeting options",
      "mode": "view" as const
    },
    {
      "name": "hello-detail",
      "title": "Hello Details",
      "description": "Shows detailed information about greetings",
      "mode": "view" as const
    },
    {
      "name": "hello-action",
      "title": "Hello Action",
      "description": "Shows a toast notification",
      "mode": "no-view" as const
    }
  ],
  "preferences": [
    {
      "name": "greeting_name",
      "type": "textfield" as const,
      "required": false,
      "title": "Default Name",
      "description": "The default name to greet",
      "placeholder": "World",
      "default": "World"
    },
    {
      "name": "show_emoji",
      "type": "checkbox" as const,
      "required": false,
      "title": "Show Emoji",
      "description": "Whether to include emoji in greetings",
      "default": true
    }
  ]
};

// Example plugin code snippets for documentation
export const exampleHelloWorldCommand = `
import { List, ActionPanel, Action, Detail, showToast } from '@fleet-chat/api';

export default function Command() {
  return (
    <List>
      <List.Item
        title="Hello World"
        subtitle="A simple greeting"
        icon="👋"
        actions={
          <ActionPanel>
            <Action
              title="Show Toast"
              onAction={() => showToast('Hello from Fleet Chat!')}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
`;

export const exampleDetailCommand = `
import { Detail, ActionPanel, Action } from '@fleet-chat/api';

export default function Command() {
  const markdown = \`
# Hello World

This is a **markdown** example showing how to use the Detail component.

## Features
- **Rich text** support
- **Code highlighting**
- **Links** and images

## Usage
Simply import the components from \`@fleet-chat/api\` and use them like React components.
\`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Copy Text"
            onAction={() => showToast('Text copied to clipboard')}
          />
        </ActionPanel>
      }
    />
  );
}
`;

export const exampleActionCommand = `
import { showToast, showHUD } from '@fleet-chat/api';

export default function Command() {
  // This is a no-view command that performs an action
  showToast({
    title: "Action Completed",
    message: "This command executed successfully"
  });

  showHUD("Quick notification");
}
`;

// Example plugin development guide
export const pluginDevelopmentGuide = {
  gettingStarted: `
# Getting Started with Fleet Chat Plugin Development

## 1. Create a plugin manifest
Create a package.json file in your plugin directory with the required fields.

## 2. Write your commands
Export functions that return React components or perform actions.

## 3. Use the API
Import components and functions from @fleet-chat/api.

## 4. Test your plugin
Load it in Fleet Chat and test all functionality.
`,

  apiReference: `
# API Reference

## Components
- List, Grid, Detail - Display content
- ActionPanel, Action - User interactions
- Form - User input

## Functions
- showToast, showHUD - Notifications
- getApplications - System apps
- LocalStorage, Cache - Data storage

## Hooks
- useState, useEffect - State management
`,

  bestPractices: `
# Best Practices

## Performance
- Use React.memo for expensive components
- Implement proper error boundaries
- Cache expensive calculations

## User Experience
- Provide meaningful icons and titles
- Include keyboard shortcuts
- Handle loading states gracefully

## Security
- Validate user input
- Use proper error handling
- Don't expose sensitive data
`
};

// Export example utilities
export const createExamplePlugin = (name: string, commands: any[]) => ({
  name,
  title: name.charAt(0).toUpperCase() + name.slice(1),
  description: `Example ${name} plugin`,
  version: "1.0.0",
  author: "Fleet Chat Team",
  license: "MIT",
  commands,
  icon: "📦"
});
