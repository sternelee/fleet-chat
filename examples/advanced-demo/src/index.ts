/**
 * Advanced Demo Plugin
 *
 * Demonstrates all features of the new Fleet Chat plugin system
 */

import React from 'react';
import { List, ActionPanel, Action, Detail, Grid, showToast, Clipboard, LocalStorage, Cache } from '@fleet-chat/raycast-api';

// Main command showcase
export default function Command() {
  const showcaseItems = [
    {
      title: "📁 File Browser",
      subtitle: "Browse and manage files using Fleet Chat APIs",
      actions: [
        {
          title: "Open File Browser",
          action: () => {
            showToast({
              title: "File Browser",
              message: "Navigate to file-browser command"
            });
          }
        }
      ]
    },
    {
      title: "📋 Clipboard History",
      subtitle: "Access and manage clipboard history",
      actions: [
        {
          title: "View Clipboard",
          action: async () => {
            try {
              const clipboardText = await Clipboard.read();
              await showToast({
                title: "Clipboard Content",
                message: clipboardText || "Empty"
              });
            } catch (error) {
              await showToast({
                title: "Error",
                message: "Could not access clipboard"
              });
            }
          }
        },
        {
          title: "Copy Test Text",
          action: async () => {
            await Clipboard.copy("Hello from Fleet Chat plugin!");
            await showToast({
              title: "Copied!",
              message: "Test text copied to clipboard"
            });
          }
        }
      ]
    },
    {
      title: "💾 Data Storage",
      subtitle: "Local storage and cache demonstrations",
      actions: [
        {
          title: "Save to Storage",
          action: async () => {
            await LocalStorage.setItem("demo-key", "Hello from plugin!");
            await showToast({
              title: "Saved",
              message: "Data stored in LocalStorage"
            });
          }
        },
        {
          title: "Load from Storage",
          action: async () => {
            const value = await LocalStorage.getItem("demo-key");
            await showToast({
              title: "Loaded",
              message: value || "No data found"
            });
          }
        }
      ]
    },
    {
      title: "🔧 System Integration",
      subtitle: "System-level features and utilities",
      actions: [
        {
          title: "Show System Info",
          action: () => {
            showToast({
              title: "System Info",
              message: "Navigate to system-info command"
            });
          }
        }
      ]
    },
    {
      title: "🎨 UI Components",
      subtitle: "Different UI component demonstrations",
      actions: [
        {
          title: "View Grid Demo",
          action: () => {
            showToast({
              title: "Grid Component",
              message: "Grid view demonstration available"
            });
          }
        },
        {
          title: "View Detail Demo",
          action: () => {
            showToast({
              title: "Detail Component",
              message: "Markdown content display available"
            });
          }
        }
      ]
    }
  ];

  return (
    <List>
      {showcaseItems.map((item, index) => (
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

// File browser command
export function fileBrowser() {
  const [files, setFiles] = React.useState([
    { name: "Documents", type: "folder", path: "/Users/Documents" },
    { name: "Downloads", type: "folder", path: "/Users/Downloads" },
    { name: "Desktop", type: "folder", path: "/Users/Desktop" },
    { name: "config.txt", type: "file", path: "/Users/config.txt" },
    { name: "notes.md", type: "file", path: "/Users/notes.md" }
  ]);

  return (
    <List>
      {files.map((file, index) => (
        <List.Item
          key={index}
          title={file.name}
          subtitle={file.type === 'folder' ? 'Folder' : 'File'}
          icon={file.type === 'folder' ? '📁' : '📄'}
          actions={
            <ActionPanel>
              <Action
                title={file.type === 'folder' ? 'Open Folder' : 'Open File'}
                onAction={() => {
                  Clipboard.copy(file.path);
                  showToast({
                    title: "Path Copied",
                    message: `${file.path} copied to clipboard`
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

// Clipboard history command
export function clipboardHistory() {
  const [history, setHistory] = React.useState([
    { id: 1, content: "Hello World", timestamp: new Date(Date.now() - 3600000) },
    { id: 2, content: "Fleet Chat Plugin System", timestamp: new Date(Date.now() - 7200000) },
    { id: 3, content: "@fleet-chat/raycast-api", timestamp: new Date(Date.now() - 10800000) }
  ]);

  return (
    <List>
      {history.map((item) => (
        <List.Item
          key={item.id}
          title={item.content}
          subtitle={item.timestamp.toLocaleString()}
          actions={
            <ActionPanel>
              <Action
                title="Copy to Clipboard"
                onAction={async () => {
                  await Clipboard.copy(item.content);
                  await showToast({
                    title: "Copied",
                    message: "Content copied to clipboard"
                  });
                }}
              />
              <Action
                title="Delete from History"
                onAction={() => {
                  setHistory(history.filter(h => h.id !== item.id));
                  showToast({
                    title: "Deleted",
                    message: "Removed from history"
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

// System info command (no-view)
export default async function systemInfo() {
  const systemData = {
    platform: navigator.platform,
    userAgent: navigator.userAgent,
    language: navigator.language,
    timestamp: new Date().toISOString()
  };

  await Clipboard.copy(JSON.stringify(systemData, null, 2));
  await showToast({
    title: "System Info Copied",
    message: "System information copied to clipboard"
  });
}