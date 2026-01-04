/**
 * Simple Demo Plugin
 *
 * Demonstrates the new simplified Fleet Chat plugin system
 * using @fleet-chat/raycast-api for direct React support
 */

import { type Action, ActionPanel, Clipboard, List, showToast } from '@fleet-chat/raycast-api';

export default function Command() {
  const items = [
    {
      title: "Hello World",
      subtitle: "Welcome to the new Fleet Chat plugin system",
      actions: [
        {
          title: "Say Hello",
          action: () => {
            showToast({
              title: "Hello!",
              message: "This is a demo action"
            });
          }
        },
        {
          title: "Copy to Clipboard",
          action: async () => {
            await Clipboard.copy("Hello from Fleet Chat plugin!");
            await showToast({
              title: "Copied!",
              message: "Text copied to clipboard"
            });
          }
        }
      ]
    },
    {
      title: "New Features",
      subtitle: "What's new in the simplified system",
      actions: [
        {
          title: "Learn More",
          action: () => {
            showToast({
              title: "Features",
              message: "Direct React support with @lit/react"
            });
          }
        }
      ]
    },
    {
      title: "Documentation",
      subtitle: "Find more information and examples",
      actions: [
        {
          title: "Open Guide",
          action: () => {
            showToast({
              title: "Guide",
              message: "Check docs/PLUGIN_SYSTEM_GUIDE.md"
            });
          }
        }
      ]
    }
  ];

  return (
    <List>
      {items.map((item, index) => (
        <List.Item
          key={index}
          title={item.title}
          subtitle={item.subtitle}
          actions={
            <ActionPanel>
              {item.actions.map((action, actionIndex) => (
                <Action
                  key={actionIndex}
                  title={action.title}
                  onAction={action.action}
                />
              ))}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}