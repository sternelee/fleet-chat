# A2UI Plugin Generation Examples

This document provides practical examples of using the A2UI Plugin Generation System to create Fleet Chat plugins.

## Example 1: GitHub Repository Browser

### Description
Create a plugin that displays GitHub repositories with search, filtering, and actions.

### Request

```bash
curl -X POST http://localhost:3000/a2ui/generate-plugin \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Browse and search GitHub repositories with details",
    "name": "github-browser",
    "plugin_type": "list",
    "requirements": [
      "Display repository name, description, and star count",
      "Show owner avatar and username",
      "Add action to open repository in browser",
      "Add action to copy repository URL",
      "Include search functionality",
      "Show language and last updated date"
    ],
    "include_sample_data": true
  }'
```

### Generated Code Preview

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
      name: 'fleet-chat',
      description: 'A modern desktop application built with Tauri and Lit',
      stars: 1234,
      owner: 'sternelee',
      language: 'TypeScript',
      url: 'https://github.com/sternelee/fleet-chat',
      lastUpdated: '2024-01-15',
    },
    // ... more sample data
  ]);

  const [searchText, setSearchText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchText.toLowerCase()) ||
    item.description.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle="GitHub Browser"
    >
      {filteredItems.map((item) => (
        <List.Item
          key={item.id}
          title={item.name}
          subtitle={`⭐ ${item.stars} • ${item.language}`}
          accessories={[{ text: item.owner }]}
          actions={
            <ActionPanel>
              <Action
                title="Open in Browser"
                onAction={() => {
                  window.open(item.url, '_blank');
                }}
              />
              <Action
                title="Copy URL"
                onAction={async () => {
                  await Clipboard.copy(item.url);
                  await showToast({
                    title: 'Copied',
                    message: 'Repository URL copied to clipboard',
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

## Example 2: Weather Dashboard

### Description
Create a detail view plugin showing weather information.

### Request

```bash
curl -X POST http://localhost:3000/a2ui/generate-plugin \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Display current weather conditions and forecast",
    "name": "weather-dashboard",
    "plugin_type": "detail",
    "requirements": [
      "Show current temperature and conditions",
      "Display humidity and wind speed",
      "Include weather icon",
      "Show 5-day forecast",
      "Add location selector"
    ],
    "include_sample_data": false
  }'
```

### Usage
After generation, customize the code to fetch real weather data from an API like OpenWeatherMap.

## Example 3: Todo List Manager

### Description
Create a comprehensive todo list with categories and persistence.

### Request

```bash
curl -X POST http://localhost:3000/a2ui/generate-plugin \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Manage todo items with categories and completion tracking",
    "name": "todo-manager",
    "plugin_type": "list",
    "requirements": [
      "Add new todos",
      "Mark todos as complete/incomplete",
      "Organize by categories",
      "Persist data to local storage",
      "Search and filter todos",
      "Show completion statistics"
    ],
    "include_sample_data": true
  }'
```

### Enhanced Features
The generated plugin includes:
- Local storage persistence
- Search functionality
- Action panel with multiple actions
- State management with useState
- Error handling

## Example 4: Contact Form

### Description
Create a form for submitting contact information.

### Request

```bash
curl -X POST http://localhost:3000/a2ui/generate-plugin \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Submit contact information form with validation",
    "name": "contact-form",
    "plugin_type": "form",
    "requirements": [
      "Name field (required)",
      "Email field with validation",
      "Phone number field",
      "Message textarea",
      "Submit action with confirmation",
      "Save to local storage"
    ],
    "include_sample_data": false
  }'
```

### Generated Form Components
- Text fields with validation
- Textarea for messages
- Submit action handler
- Success/error feedback
- Data persistence

## Example 5: Image Gallery

### Description
Create a grid-based image gallery plugin.

### Request

```bash
curl -X POST http://localhost:3000/a2ui/generate-plugin \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Display images in a grid layout with lightbox view",
    "name": "image-gallery",
    "plugin_type": "grid",
    "requirements": [
      "Display images in grid",
      "Show image titles",
      "Add zoom action",
      "Include download action",
      "Support image categories",
      "Add search functionality"
    ],
    "include_sample_data": true
  }'
```

## Example 6: Code Snippet Manager

### Description
A sophisticated plugin for managing code snippets.

### Request

```bash
curl -X POST http://localhost:3000/a2ui/generate-plugin \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Manage and search code snippets with syntax highlighting",
    "name": "code-snippets",
    "plugin_type": "list",
    "requirements": [
      "Store code snippets with language tags",
      "Search by name, language, or content",
      "Copy snippet to clipboard",
      "Edit existing snippets",
      "Organize by categories",
      "Export/import functionality",
      "Syntax highlighting preview"
    ],
    "include_sample_data": true
  }'
```

### Post-Generation Steps
1. Add syntax highlighting library (e.g., Prism.js)
2. Implement edit functionality
3. Add export/import logic
4. Enhance with keyboard shortcuts

## Example 7: API Testing Tool

### Description
A form-based plugin for testing REST APIs.

### Request

```bash
curl -X POST http://localhost:3000/a2ui/generate-plugin \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Test REST API endpoints with request/response viewer",
    "name": "api-tester",
    "plugin_type": "form",
    "requirements": [
      "URL input field",
      "HTTP method selector (GET, POST, PUT, DELETE)",
      "Headers editor",
      "Request body editor",
      "Send button",
      "Response viewer with JSON formatting",
      "Status code display",
      "Save request history"
    ],
    "include_sample_data": false
  }'
```

## Example 8: Bookmark Manager

### Description
Organize and search bookmarks.

### Request

```bash
curl -X POST http://localhost:3000/a2ui/generate-plugin \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Organize and search web bookmarks with tags",
    "name": "bookmark-manager",
    "plugin_type": "list",
    "requirements": [
      "Add bookmarks with URL, title, and description",
      "Tag bookmarks for organization",
      "Search by title, URL, or tags",
      "Open bookmark in browser",
      "Edit bookmark details",
      "Delete bookmarks",
      "Export bookmarks to JSON",
      "Import bookmarks from browser"
    ],
    "include_sample_data": true
  }'
```

## Example 9: Time Tracker

### Description
Track time spent on tasks and projects.

### Request

```bash
curl -X POST http://localhost:3000/a2ui/generate-plugin \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Track time on tasks with start/stop timer and reports",
    "name": "time-tracker",
    "plugin_type": "list",
    "requirements": [
      "Start/stop timer for tasks",
      "Show current timer status",
      "Display task list with time spent",
      "Add manual time entries",
      "Generate daily/weekly reports",
      "Export time data to CSV",
      "Category-based organization"
    ],
    "include_sample_data": true
  }'
```

## Example 10: Quick Notes

### Description
Simple note-taking plugin with markdown support.

### Request

```bash
curl -X POST http://localhost:3000/a2ui/generate-plugin \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Create and manage quick notes with markdown support",
    "name": "quick-notes",
    "plugin_type": "detail",
    "requirements": [
      "Create new notes",
      "Edit existing notes",
      "Markdown rendering",
      "Search notes",
      "Tag notes",
      "Pin important notes",
      "Auto-save functionality"
    ],
    "include_sample_data": true
  }'
```

## Streaming Example

For real-time progress feedback:

```javascript
const eventSource = new EventSource(
  'http://localhost:3000/a2ui/generate-plugin/stream',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      description: 'Calculator plugin',
      plugin_type: 'form',
    }),
  }
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'status') {
    console.log(`Progress: ${data.progress}% - ${data.message}`);
  } else if (data.type === 'complete') {
    console.log('Plugin generated!', data.data);
    eventSource.close();
  }
};
```

## Tips for Better Results

### 1. Be Specific
Instead of "make a todo plugin", say "todo plugin with categories, due dates, priority levels, and local storage persistence".

### 2. Break Down Complex Features
For complex plugins, generate a basic version first, then customize the code to add advanced features.

### 3. Use Sample Data Initially
Enable sample data during development to see how the plugin works, then replace with real data loading logic.

### 4. Specify Data Sources
If integrating with APIs, mention the data structure you expect:
```
"requirements": [
  "Fetch data from GitHub API",
  "Each item should have: name, description, stars, url",
  "Handle API errors gracefully"
]
```

### 5. Mention UI Preferences
Specify layout preferences:
```
"requirements": [
  "Use grid layout with 3 columns",
  "Show images at 200x200px",
  "Include hover effects"
]
```

## Common Patterns

### Loading Data Pattern
```typescript
useEffect(() => {
  async function loadData() {
    setIsLoading(true);
    try {
      const data = await fetchFromAPI();
      setItems(data);
    } catch (error) {
      await showToast({
        title: 'Error',
        message: String(error)
      });
    } finally {
      setIsLoading(false);
    }
  }
  loadData();
}, []);
```

### Search Pattern
```typescript
const filteredItems = items.filter(item =>
  item.title.toLowerCase().includes(searchText.toLowerCase())
);
```

### Storage Pattern
```typescript
// Save
await LocalStorage.setItem('my-data', JSON.stringify(data));

// Load
const stored = await LocalStorage.getItem('my-data');
if (stored) {
  setData(JSON.parse(stored));
}
```

## Next Steps After Generation

1. **Review the Code** - Understand what was generated
2. **Test Locally** - Use sample data to test functionality
3. **Customize** - Add your specific logic and styling
4. **Add Real Data** - Replace sample data with actual data sources
5. **Handle Errors** - Add proper error handling
6. **Add Loading States** - Improve UX with loading indicators
7. **Package** - Use the Fleet Chat CLI to create .fcp file
8. **Install & Test** - Test in Fleet Chat environment
9. **Iterate** - Refine based on testing

## Resources

- [A2UI Plugin Generation Guide](./A2UI_PLUGIN_GENERATION.md)
- [Plugin System Documentation](./PLUGIN_SYSTEM_GUIDE.md)
- [Fleet Chat API Reference](../packages/fleet-chat-api/README.md)
- [Raycast API Documentation](https://developers.raycast.com/api-reference)
