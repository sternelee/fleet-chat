/**
 * template-test Plugin for Fleet Chat
 *
 * This is a template for creating Fleet Chat plugins.
 * Replace the placeholders with your actual plugin code.
 */

import {
  Action,
  ActionPanel,
  Cache, 
  Clipboard,
  type Detail,
  Grid,
  List,
  LocalStorage,
  showToast
} from '@fleet-chat/raycast-api';
import React, { useEffect, useState } from 'react';

// Your plugin's main component
export default function Command() {
  const [items, setItems] = useState([
    {
      id: 1,
      title: "Welcome to template-test!",
      subtitle: "This is your Fleet Chat plugin template",
      content: "# Welcome! 👋\n\nThis is a **template** for your Fleet Chat plugin.\n\n## Next Steps\n\n1. Edit this file to add your functionality\n2. Update the package.json with your plugin details\n3. Add more commands as needed\n4. Test your plugin in Fleet Chat\n\n## Features\n\n- ✅ React components\n- ✅ LocalStorage support\n- ✅ Clipboard integration\n- ✅ Toast notifications\n- ✅ Multiple UI components"
    },
    {
      id: 2,
      title: "Local Storage Example",
      subtitle: "Demonstrates data persistence",
      content: "This item shows how to use LocalStorage to persist data between plugin uses."
    },
    {
      id: 3,
      title: "Clipboard Integration",
      subtitle: "Shows clipboard functionality",
      content: "This demonstrates how to interact with the system clipboard."
    }
  ]);

  return (
    <List>
      {items.map((item) => (
        <List.Item
          key={item.id}
          title={item.title}
          subtitle={item.subtitle}
          actions={
            <ActionPanel>
              <Action
                title="Show Details"
                onAction={() => {
                  showToast({
                    title: item.title,
                    message: item.content
                  });
                }}
              />
              <Action
                title="Copy Content"
                onAction={async () => {
                  await Clipboard.copy(item.content);
                  await showToast({
                    title: "Copied!",
                    message: "Content copied to clipboard"
                  });
                }}
              />
              <Action
                title="Save to Storage"
                onAction={async () => {
                  await LocalStorage.setItem(`item-${item.id}`, JSON.stringify(item));
                  await showToast({
                    title: "Saved!",
                    message: "Item saved to local storage"
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

// Optional: Add additional commands
export function detailView() {
  return (
    <Detail
      markdown={`# template-test

This is a detailed view for your plugin.

## Features

- **React Components**: Use familiar React syntax
- **Local Storage**: Persist data between uses
- **Clipboard Integration**: Copy and paste functionality
- **Toast Notifications**: User feedback
- **Multiple UI Components**: List, Grid, Detail, and more

## API Usage

\`\`\`typescript
import { List, ActionPanel, Action, showToast, Clipboard, LocalStorage } from '@fleet-chat/raycast-api';

export default function Command() {
  return (
    <List>
      <List.Item
        title="Example Item"
        actions={
          <ActionPanel>
            <Action
              title="Copy Text"
              onAction={async () => {
                await Clipboard.copy("Hello World");
                await showToast({ title: "Copied!" });
              }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
\`\`\`

## Getting Started

1. Customize this template with your plugin logic
2. Update \`package.json\` with your plugin details
3. Add more commands by exporting additional functions
4. Pack your plugin with \`node tools/simple-packer.ts .\`
5. Load the \`.fcp\` file in Fleet Chat
`}
    />
  );
}