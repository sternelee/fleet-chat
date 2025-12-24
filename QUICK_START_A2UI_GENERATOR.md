# A2UI Plugin Generator - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

This guide will help you create your first plugin using the A2UI Plugin Generator.

## Step 1: Access the Plugin Generator

### Option A: Via UI (Recommended for beginners)
1. Launch Fleet Chat
2. Navigate to `/plugin-generator` (or use the menu if available)
3. You'll see the plugin generation form

### Option B: Via API (For automation/scripting)
```bash
# Make sure Fleet Chat backend is running on port 3000
curl http://localhost:3000/ping
```

## Step 2: Describe Your Plugin

Think about what you want your plugin to do. Be specific!

### Good Examples ✅
- "Display a list of my favorite websites with ability to open them in browser"
- "Todo list manager with categories, completion tracking, and local storage"
- "Weather dashboard showing current conditions and 5-day forecast"
- "Contact form with name, email, and message fields"

### Poor Examples ❌
- "Make a plugin" (too vague)
- "Show things" (no details)
- "List" (incomplete description)

## Step 3: Configure Options

### Plugin Name (Optional)
Leave blank for auto-generation, or provide your own:
```
my-awesome-plugin
github-repos
weather-widget
```

### Plugin Type
Choose based on your use case:
- **List**: Best for displaying multiple items with search
- **Grid**: Best for images, cards, visual content
- **Detail**: Best for single-item detailed view
- **Form**: Best for collecting user input

### Requirements (Optional)
Add specific features you want:
```
Show repository star count
Include last updated date
Add action to copy URL
Filter by programming language
```

### Sample Data (Recommended)
✅ **Enable** for your first plugin - helps you see it working immediately
❌ **Disable** for production plugins - you'll add real data later

## Step 4: Generate!

### Via UI
1. Click "🚀 Generate Plugin"
2. Wait 2-10 seconds (AI is working!)
3. See your generated plugin code

### Via API
```bash
curl -X POST http://localhost:3000/a2ui/generate-plugin \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Display my favorite websites with icons and open in browser action",
    "name": "website-launcher",
    "plugin_type": "list",
    "requirements": [
      "Show website name and URL",
      "Add favicon icons",
      "Open in browser action",
      "Search by name"
    ],
    "include_sample_data": true
  }'
```

## Step 5: Review Generated Code

You'll see:
- ✅ **Manifest**: package.json with plugin metadata
- ✅ **Source Code**: Complete TypeScript/React component
- ✅ **Explanation**: What the plugin does
- ⚠️ **Warnings**: Any recommendations (if applicable)

### Example Generated Code
```typescript
import React, { useState } from 'react';
import {
  List,
  ActionPanel,
  Action,
  showToast,
} from '@fleet-chat/raycast-api';

export default function Command() {
  const [items] = useState([
    {
      id: '1',
      title: 'GitHub',
      url: 'https://github.com',
      icon: '🐙'
    },
    // ... more items
  ]);

  return (
    <List>
      {items.map((item) => (
        <List.Item
          key={item.id}
          title={item.title}
          icon={item.icon}
          actions={
            <ActionPanel>
              <Action
                title="Open in Browser"
                onAction={() => window.open(item.url)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
```

## Step 6: Test and Install

### Option 1: Validate First (Recommended)
1. Click "✅ Validate Code"
2. Review validation results
3. Check code statistics

### Option 2: Install Directly
1. Click "🔌 Install Plugin"
2. Plugin is installed immediately
3. Test in Fleet Chat!

### Option 3: Download for Customization
1. Click "💾 Download Plugin"
2. Modify the code as needed
3. Package with CLI: `node tools/plugin-cli.js build my-plugin`
4. Install the .fcp file

## Step 7: Customize (Optional)

### Add Real Data
Replace sample data with API calls:
```typescript
useEffect(() => {
  async function fetchData() {
    const response = await fetch('https://api.example.com/data');
    const data = await response.json();
    setItems(data);
  }
  fetchData();
}, []);
```

### Add More Actions
```typescript
<ActionPanel>
  <Action title="Open" onAction={...} />
  <Action title="Copy URL" onAction={async () => {
    await Clipboard.copy(item.url);
    await showToast({ title: 'Copied!' });
  }} />
  <Action title="Edit" onAction={...} />
</ActionPanel>
```

### Add Persistence
```typescript
// Save data
await LocalStorage.setItem('my-data', JSON.stringify(items));

// Load data
const saved = await LocalStorage.getItem('my-data');
if (saved) setItems(JSON.parse(saved));
```

## Common Use Cases

### 1. Quick Reference Plugin
**Description**: "Display keyboard shortcuts for my IDE"
**Type**: List
**Time**: 2 minutes

### 2. Link Manager
**Description**: "Manage bookmarks with tags and search"
**Type**: List
**Time**: 3 minutes

### 3. Note Taker
**Description**: "Create and view markdown notes"
**Type**: Detail
**Time**: 3 minutes

### 4. Contact Form
**Description**: "Submit contact information with validation"
**Type**: Form
**Time**: 2 minutes

### 5. Image Gallery
**Description**: "Display image collection in grid"
**Type**: Grid
**Time**: 3 minutes

## Troubleshooting

### Generation Fails
**Problem**: API returns error
**Solution**: 
- Check that AI provider is configured (OPENAI_API_KEY or GEMINI_API_KEY)
- Verify backend is running on port 3000
- Check backend logs for details

### Code Has Errors
**Problem**: TypeScript errors in generated code
**Solution**:
- Use validation tool first
- Check import statements
- Verify all braces are balanced
- Regenerate with clearer description

### Plugin Won't Install
**Problem**: Installation fails
**Solution**:
- Validate code structure first
- Check manifest format
- Ensure package name is valid
- Try downloading and manual install

## Tips for Success

### 1. Be Specific
Instead of: "Show data"
Try: "Display GitHub repositories with name, description, star count, and last updated date"

### 2. Start Simple
Create a basic version first, then customize with advanced features.

### 3. Use Sample Data
Enable sample data for your first plugin to see it working immediately.

### 4. Test Incrementally
Generate → Validate → Install → Test → Customize

### 5. Learn from Examples
Check `docs/A2UI_PLUGIN_EXAMPLES.md` for 10+ working examples.

## Next Steps

After creating your first plugin:

1. **Experiment** with different plugin types
2. **Customize** the generated code
3. **Add** real data sources (APIs, files, etc.)
4. **Enhance** with additional features
5. **Share** your plugins with others!

## Resources

- 📖 [Full Documentation](./docs/A2UI_PLUGIN_GENERATION.md)
- 💡 [10+ Examples](./docs/A2UI_PLUGIN_EXAMPLES.md)
- 🔧 [Plugin System Guide](./docs/PLUGIN_SYSTEM_GUIDE.md)
- 🎯 [API Reference](./packages/fleet-chat-api/README.md)

## Example Workflow

```
1. Idea: "I want a weather plugin"
   ↓
2. Description: "Weather dashboard with current conditions and 5-day forecast"
   ↓
3. Type: Detail
   ↓
4. Requirements:
   - Show temperature and humidity
   - Display weather icons
   - Show wind speed
   ↓
5. Generate → Validate → Install
   ↓
6. Customize:
   - Add API integration
   - Update with real data
   - Add refresh button
   ↓
7. Success! Working weather plugin in <10 minutes
```

## Support

Need help?
1. Check the documentation
2. Review the examples
3. Try with a simpler description first
4. Check console for error messages

---

**Ready to create your first plugin?** Navigate to `/plugin-generator` and start building! 🚀
