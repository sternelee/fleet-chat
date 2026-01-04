/**
 * Hello World Plugin for Fleet Chat
 *
 * A simple example demonstrating basic plugin functionality
 */

import { List, ActionPanel, Action, showToast, showHUD } from '@fleet-chat/core-api';
import { useState } from '@fleet-chat/core-api';

interface GreetState {
  count: number;
}

// Default command - Simple hello world list
export default function Command() {
  const [count, setCount] = useState<GreetState['count']>(0);

  return (
    <List>
      <List.Item
        title="Hello, World!"
        subtitle="Welcome to Fleet Chat plugins"
        icon="👋"
        accessories={[
          { text: `Count: ${count}` },
          { icon: "💬" }
        ]}
        actions={
          <ActionPanel>
            <Action
              title="Increment Counter"
              shortcut={{ modifiers: ["cmd"], key: "i" }}
              onAction={() => {
                const newCount = count + 1;
                setCount(newCount);
                showHUD(`Count is now ${newCount}`);
              }}
            />
            <Action
              title="Show Toast"
              onAction={() => {
                showToast({
                  title: "Hello!",
                  message: "This is a toast notification from the plugin",
                  style: "success"
                });
              }}
            />
            <Action
              title="Reset Counter"
              style="destructive"
              onAction={() => {
                setCount(0);
                showHUD("Counter reset");
              }}
            />
          </ActionPanel>
        }
      />
      <List.Item
        title="What is Fleet Chat?"
        subtitle="A Raycast-like desktop application built with Tauri"
        icon="❓"
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="Open GitHub Repository"
              url="https://github.com/sternelee/fleet-chat"
            />
            <Action
              title="Show Documentation"
              onAction={() => {
                showToast({
                  title: "Documentation",
                  message: "Visit the docs to learn more about plugin development",
                  style: "info"
                });
              }}
            />
          </ActionPanel>
        }
      />
      <List.Item
        title="Plugin Development"
        subtitle="Learn how to build your own plugins"
        icon="🔧"
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="View Plugin System Docs"
              url="https://github.com/sternelee/fleet-chat#plugin-system"
            />
            <Action
              title="API Reference"
              onAction={() => {
                showHUD("API Reference coming soon!");
              }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}

// Named command - Personalized greeting
export function greet() {
  const names = ["Alice", "Bob", "Charlie", "Diana", "Eve"];
  const randomName = names[Math.floor(Math.random() * names.length)];

  return (
    <List>
      <List.Item
        title={`Hello, ${randomName}!`}
        subtitle="This is a personalized greeting from the plugin"
        icon="🎉"
        actions={
          <ActionPanel>
            <Action
              title="Another Greeting"
              onAction={() => {
                showToast({
                  title: "Greetings!",
                  message: `Hello again, ${randomName}!`,
                  style: "success"
                });
              }}
            />
            <Action
              title="Show HUD"
              onAction={() => {
                showHUD(`Nice to meet you, ${randomName}!`);
              }}
            />
          </ActionPanel>
        }
      />
      <List.Item
        title="Available Names"
        subtitle={names.join(", ")}
        icon="👥"
      />
    </List>
  );
}
