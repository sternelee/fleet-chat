/**
 * Search List Plugin for Fleet Chat
 *
 * Demonstrates searchable lists with filtering and sections
 */

import {
  List,
  ListSection,
  ListAction,
  ActionPanel,
  Action,
  showToast,
  Detail,
  CopyToClipboardAction,
  OpenInBrowserAction,
} from '@fleet-chat/core-api';
import { useState, useEffect } from '@fleet-chat/core-api';

// Example data interfaces
interface ExampleItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  url?: string;
  category: string;
  tags?: string[];
}

interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
}

interface Bookmark {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  category: string;
}

// Example items data
const EXAMPLE_ITEMS: ExampleItem[] = [
  {
    id: '1',
    title: 'Fleet Chat',
    subtitle: 'A Raycast-like desktop application',
    icon: '🚀',
    url: 'https://github.com/sternelee/fleet-chat',
    category: 'Development',
    tags: ['opensource', 'rust', 'tauri', 'typescript']
  },
  {
    id: '2',
    title: 'Tauri',
    subtitle: 'Build smaller, faster, and more secure desktop applications',
    icon: '🦀',
    url: 'https://tauri.app',
    category: 'Development',
    tags: ['framework', 'rust', 'desktop']
  },
  {
    id: '3',
    title: 'Lit',
    subtitle: 'Simple library for building fast, lightweight Web Components',
    icon: '🔥',
    url: 'https://lit.dev',
    category: 'Development',
    tags: ['web-components', 'typescript', 'javascript']
  },
  {
    id: '4',
    title: 'TypeScript',
    subtitle: 'Typed JavaScript at Any Scale',
    icon: '📘',
    url: 'https://www.typescriptlang.org',
    category: 'Languages',
    tags: ['javascript', 'typing', 'microsoft']
  },
  {
    id: '5',
    title: 'Rust',
    subtitle: 'A systems programming language that runs blazingly fast',
    icon: '🦀',
    url: 'https://www.rust-lang.org',
    category: 'Languages',
    tags: ['systems', 'memory-safe', 'performance']
  }
];

const TASKS: Task[] = [
  { id: '1', title: 'Learn Fleet Chat API', status: 'in-progress', priority: 'high' },
  { id: '2', title: 'Build first plugin', status: 'todo', priority: 'high' },
  { id: '3', title: 'Write tests', status: 'todo', priority: 'medium' },
  { id: '4', title: 'Create documentation', status: 'done', priority: 'low' },
  { id: '5', title: 'Publish plugin', status: 'todo', priority: 'medium' }
];

const BOOKMARKS: Bookmark[] = [
  { id: '1', title: 'GitHub', url: 'https://github.com', category: 'Development' },
  { id: '2', title: 'Stack Overflow', url: 'https://stackoverflow.com', category: 'Development' },
  { id: '3', title: 'MDN Web Docs', url: 'https://developer.mozilla.org', category: 'Documentation' },
  { id: '4', title: 'Hacker News', url: 'https://news.ycombinator.com', category: 'News' },
  { id: '5', title: 'Reddit', url: 'https://www.reddit.com', category: 'Social' }
];

// Helper function to get icon for status
function getStatusIcon(status: Task['status']): string {
  switch (status) {
    case 'todo': return '⏳';
    case 'in-progress': return '🔄';
    case 'done': return '✅';
    default: return '❓';
  }
}

// Helper function to get icon for priority
function getPriorityIcon(priority: Task['priority']): string {
  switch (priority) {
    case 'high': return '🔴';
    case 'medium': return '🟡';
    case 'low': return '🟢';
    default: return '⚪';
  }
}

// Default command - Search Examples
export default function Command() {
  const [filter, setFilter] = useState<string>('all');

  const filteredItems = filter === 'all'
    ? EXAMPLE_ITEMS
    : EXAMPLE_ITEMS.filter(item => item.category === filter);

  const categories = ['all', ...Array.from(new Set(EXAMPLE_ITEMS.map(item => item.category)))];

  return (
    <List
      filtering={true}
      onSearchTextChange={(text) => {
        if (text) {
          setFilter('all');
        }
      }}
    >
      <ListSection title="Categories">
        {categories.map(category => (
          <List.Action
            key={category}
            title={category === 'all' ? 'All Items' : category}
            subtitle={
              category === 'all'
                ? `${EXAMPLE_ITEMS.length} items`
                : `${EXAMPLE_ITEMS.filter(i => i.category === category).length} items`
            }
            icon={category === 'all' ? '📁' : '📂'}
            onAction={() => {
              setFilter(category);
              showToast({ title: `Filtered by: ${category}`, style: "info" });
            }}
          />
        ))}
      </ListSection>

      <ListSection title={filter === 'all' ? 'All Items' : filter}>
        {filteredItems.map(item => (
          <List.Item
            key={item.id}
            title={item.title}
            subtitle={item.subtitle}
            icon={item.icon}
            accessories={[
              { text: item.category },
              { tag: item.tags?.slice(0, 2) }
            ]}
            actions={
              <ActionPanel>
                {item.url && <OpenInBrowserAction title="Open Website" url={item.url} />}
                <CopyToClipboardAction
                  title="Copy Title"
                  content={item.title}
                  onCopy={() => showToast({ title: "Copied to clipboard!", style: "success" })}
                />
                <Action
                  title="Show Details"
                  onAction={() => {
                    showToast({
                      title: item.title,
                      message: `Category: ${item.category}\nTags: ${item.tags?.join(', ') || 'none'}`,
                      style: "info"
                    });
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </ListSection>
    </List>
  );
}

// Named command - Task List
export function tasks() {
  const [filter, setFilter] = useState<string>('all');

  const filteredTasks = filter === 'all'
    ? TASKS
    : TASKS.filter(task => task.status === filter);

  const statusCount = {
    all: TASKS.length,
    todo: TASKS.filter(t => t.status === 'todo').length,
    'in-progress': TASKS.filter(t => t.status === 'in-progress').length,
    done: TASKS.filter(t => t.status === 'done').length,
  };

  return (
    <List>
      <ListSection title="Filter by Status">
        {(['all', 'todo', 'in-progress', 'done'] as const).map(status => (
          <List.Action
            key={status}
            title={status === 'all' ? 'All Tasks' : status.charAt(0).toUpperCase() + status.slice(1)}
            subtitle={`${statusCount[status]} tasks`}
            icon={status === 'all' ? '📋' : getStatusIcon(status)}
            onAction={() => {
              setFilter(status);
            }}
          />
        ))}
      </ListSection>

      <ListSection title="Tasks">
        {filteredTasks.map(task => (
          <List.Item
            key={task.id}
            title={task.title}
            icon={getStatusIcon(task.status)}
            accessories={[
              { text: task.priority },
              { icon: getPriorityIcon(task.priority) },
              { text: task.dueDate || 'No due date' }
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Mark as Todo"
                  onAction={() => {
                    showToast({ title: "Task updated", message: "Marked as todo", style: "info" });
                  }}
                />
                <Action
                  title="Mark as In Progress"
                  onAction={() => {
                    showToast({ title: "Task updated", message: "Marked as in progress", style: "info" });
                  }}
                />
                <Action
                  title="Mark as Done"
                  onAction={() => {
                    showToast({ title: "Task updated", message: "Marked as done", style: "success" });
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </ListSection>
    </List>
  );
}

// Named command - Bookmarks
export function bookmarks() {
  const [filter, setFilter] = useState<string>('all');

  const filteredBookmarks = filter === 'all'
    ? BOOKMARKS
    : BOOKMARKS.filter(b => b.category === filter);

  const categories = ['all', ...Array.from(new Set(BOOKMARKS.map(b => b.category)))];

  return (
    <List>
      <ListSection title="Categories">
        {categories.map(category => (
          <List.Action
            key={category}
            title={category === 'all' ? 'All Bookmarks' : category}
            subtitle={
              category === 'all'
                ? `${BOOKMARKS.length} bookmarks`
                : `${BOOKMARKS.filter(b => b.category === category).length} bookmarks`
            }
            icon="🔖"
            onAction={() => {
              setFilter(category);
            }}
          />
        ))}
      </ListSection>

      <ListSection title={filter === 'all' ? 'All Bookmarks' : filter}>
        {filteredBookmarks.map(bookmark => (
          <List.Item
            key={bookmark.id}
            title={bookmark.title}
            subtitle={bookmark.url}
            icon="🔗"
            actions={
              <ActionPanel>
                <OpenInBrowserAction title="Open Link" url={bookmark.url} />
                <CopyToClipboardAction
                  title="Copy URL"
                  content={bookmark.url}
                  onCopy={() => showToast({ title: "URL copied!", style: "success" })}
                />
              </ActionPanel>
            }
          />
        ))}
      </ListSection>
    </List>
  );
}
