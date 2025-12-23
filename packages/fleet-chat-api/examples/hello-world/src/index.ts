/**
 * Hello World Plugin Example
 * Demonstrates basic plugin functionality for Fleet Chat
 */

// Import React in a compatible way
// @ts-ignore - React types are provided by the compatibility layer
import * as React from 'react'
import { List, Detail, showToast } from '../../index.js'

export default async function () {
  // Plugin initialization logic
  console.log('Hello World Plugin initialized')
}

/**
 * Simple hello command using Detail component
 */
export async function hello() {
  const name = 'World' // Would come from preferences or arguments

  return React.createElement(Detail, {
    markdown: `# Hello, ${name}! 👋

Welcome to **Fleet Chat** plugin system!

This is a demonstration of the Detail component in Fleet Chat plugins.

## Features

- ✅ **Raycast-compatible API**
- ✅ **Lit web components**
- ✅ **TypeScript support**
- ✅ **Tauri integration**

## Usage

This plugin demonstrates several component types:

1. **Detail** - Rich markdown content display
2. **List** - Interactive item lists
3. **Action Panel** - Contextual actions
4. **Toast notifications** - System notifications

## Code Example

\`\`\`typescript
// Example plugin command
export async function hello() {
  return React.createElement(Detail, { markdown: "Hello World!" });
}
\`\`\`

---
*Built with ❤️ for Fleet Chat*`,
    metadata: [
      {
        label: 'Plugin Name',
        text: 'Hello World',
      },
      {
        label: 'Version',
        text: '1.0.0',
      },
      {
        label: 'License',
        text: 'MIT',
      },
    ],
  })
}

/**
 * Hello command using List component
 */
export async function helloList() {
  const greetings = [
    {
      title: 'Hello World',
      subtitle: 'A classic greeting',
      icon: '🌍',
      keywords: ['classic', 'basic'],
    },
    {
      title: 'Hello Fleet Chat',
      subtitle: 'Greeting for our application',
      icon: '💬',
      keywords: ['fleet', 'chat', 'app'],
    },
    {
      title: 'Hello Developer',
      subtitle: 'A greeting for plugin developers',
      icon: '👨‍💻',
      keywords: ['developer', 'coder', 'programmer'],
    },
    {
      title: 'Hello Friend',
      subtitle: 'A friendly greeting',
      icon: '👋',
      keywords: ['friend', 'friendly'],
    },
  ]

  return React.createElement(
    List,
    null,
    greetings.map((greeting, index) =>
      React.createElement(List.Item, {
        key: index,
        title: greeting.title,
        subtitle: greeting.subtitle,
        icon: greeting.icon,
        keywords: greeting.keywords,
        actions: null,
      }),
    ),
  )
}

/**
 * Hello command with rich Detail view
 */
export async function helloDetail() {
  return React.createElement(Detail, {
    markdown: `# Greeting Details 🎉

This example demonstrates the **Detail** component with comprehensive markdown support.

## Typography Examples

### Headers
# H1 Header
## H2 Header
### H3 Header

#### Text Formatting
- **Bold text** using asterisks
- *Italic text* using single asterisks

## Lists

### Unordered List
- Item 1
- Item 2
  - Nested item
  - Another nested item
- Item 3

## Links and Images

### Blockquotes
> This is a blockquote.
> It can span multiple lines.

## Tables

| Feature | Status |
|---------|--------|
| Plugin System | ✅ Complete |

---

*This is a comprehensive example of markdown rendering in Fleet Chat plugins.*`,
    actions: null,
    metadata: [
      {
        label: 'Component',
        text: 'Detail',
      },
      {
        label: 'Renderer',
        text: 'Custom Markdown Parser',
      },
      {
        label: 'Features',
        text: 'Headers, Lists, Code, Tables, Links',
      },
      {
        label: 'Status',
        text: '✅ Working',
      },
    ],
  })
}

/**
 * No-view command that shows a toast
 */
export async function helloAction() {
  await showToast({
    title: 'Hello from Plugin! 🎉',
    message: 'This is a no-view command that shows a notification',
    style: 'success',
  })
}

// Additional utility functions for plugin development
export const utils = {
  /**
   * Format greeting message
   */
  formatGreeting: (name: string, includeEmoji = true): string => {
    const emoji = includeEmoji ? '👋' : ''
    return `${emoji} Hello, ${name}!`
  },

  /**
   * Generate random greeting
   */
  randomGreeting: (): string => {
    const greetings = ['Hello there!', 'Hi there!', 'Hey there!', 'Greetings!', 'Howdy!', 'Yo!']
    return greetings[Math.floor(Math.random() * greetings.length)]
  },

  /**
   * Validate greeting input
   */
  validateName: (name: string): boolean => {
    return name.trim().length > 0 && name.length <= 50
  },
}
