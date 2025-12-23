# Quick Start Guide: Using the Enhanced Launcher

## Opening the Launcher

Press **⌘K** (Mac) or **Ctrl+K** (Windows/Linux) anywhere in the app.

The launcher will appear with a smooth scale-in animation.

## Command Prefixes

### Plugin Mode: `>`
Type `>` as the first character to search only plugin commands.

**Example:**
```
>hello
```
Will search for "hello" in plugin commands only.

### File Mode: `/`
Type `/` as the first character to search only files.

**Example:**
```
/config
```
Will search for "config" in file names and contents.

### Everything Mode: `?`
Type `?` as the first character to search all categories.

**Example:**
```
?app
```
Will search for "app" in applications, files, and plugins.

## Keyboard Navigation

| Key | Action |
|-----|--------|
| **↑** | Move selection up |
| **↓** | Move selection down |
| **↵** (Enter) | Open selected item |
| **⌘↵** (Cmd+Enter) | Show quick actions |
| **Esc** | Clear search or close launcher |

## Quick Actions

1. Navigate to any item using arrow keys
2. Press **⌘+Enter** (or **Ctrl+Enter**)
3. A panel will slide in from the right showing:
   - **▶️ Open** - Launch the item
   - **📁 Show in Finder** - Reveal in file browser
   - **📋 Copy Path** - Copy path to clipboard
4. Click an action or press **Esc** to close

## Frecency (Smart Ranking)

The launcher learns from your usage:
- Items you use more often appear higher
- Recently used items get a boost
- The ranking adapts to your workflow

**Example:**
If you open "VS Code" 10 times, it will appear at the top when you search for "vs" or "code".

## Empty State Hints

When the search is empty, you'll see helpful hints:
```
> Plugins     - Search plugin commands
/ Files       - Search files
? Everything  - Search all
⌘↵ Quick Actions - Context menu
```

## Visual Feedback

### Command Prefix Badge
When you type a prefix, a purple badge appears showing the mode:
- `[PLUGINS]` for `>`
- `[FILES]` for `/`
- `[ALL]` for `?`

### Selection Indicator
The selected item has:
- A purple left border
- Highlighted background
- Smooth hover effect

### Animations
Everything moves smoothly:
- Launcher appears with a subtle scale effect
- Results fade in gracefully
- Items slide in one by one
- Quick actions slide from the right

## Tips & Tricks

### 1. Fast Plugin Launch
```
⌘K + >hello + ↵
```
Opens plugin launcher → Filters to plugins → Opens "hello" plugin

### 2. Quick File Access
```
⌘K + /config + ↵
```
Opens launcher → Searches files → Opens config file

### 3. Copy Path Without Opening
```
⌘K + Search + ⌘↵ + Click "Copy Path"
```
Quick way to get a file path without opening it

### 4. Frecency Boost
Use the launcher regularly for items you access often. They'll automatically rise to the top.

### 5. Clear and Start Fresh
Press **Esc** once to clear the search, twice to close the launcher.

## Performance

The launcher is optimized for speed:
- Search results appear in < 200ms
- Cached searches are instant
- Smooth 60fps animations
- No lag or stuttering

## Troubleshooting

### Launcher won't open
- Make sure the app has focus
- Try pressing ⌘K (or Ctrl+K) again
- Check if another app is capturing the shortcut

### Frecency not working
- Data is stored in browser localStorage
- Check browser console for errors
- Clear and rebuild: localStorage.removeItem('fleet-chat-frecency')

### Animations are choppy
- Check system graphics performance
- Close other heavy applications
- Try disabling browser extensions

### Search is slow
- Network issues may affect results
- Try searching for simpler terms
- Check the backend connection

## Advanced Usage

### Combining with Filters
1. Use prefix for mode
2. Type search term
3. Use filter buttons for refinement

### Keyboard-Only Workflow
You can accomplish everything without touching the mouse:
1. **⌘K** - Open
2. Type prefix + search
3. **↓** - Navigate
4. **⌘↵** - Actions
5. **↵** - Execute
6. **Esc** - Close

### Building Muscle Memory
Practice these common flows:
- Open app: `⌘K → type name → ↵`
- Search files: `⌘K → / → filename → ↵`
- Run plugin: `⌘K → > → command → ↵`
- Copy path: `⌘K → search → ⌘↵ → Copy`

## What's Next?

Future enhancements planned:
- Custom keyboard shortcuts for actions
- Skeleton loading screens
- Plugin-specific actions
- Fuzzy search matching
- Search history view
- Pinned favorite items

---

**Enjoy the enhanced launcher! 🚀**

For more details, see:
- IMPLEMENTATION_SUMMARY.md
- LAUNCHER_IMPROVEMENTS.md
- LAUNCHER_CODE_EXAMPLES.md
- LAUNCHER_VISUAL_GUIDE.md
