# Raycast-Like Launcher: Code Examples

## Command Prefix Detection

### Implementation
```typescript
private _detectCommandPrefix() {
  const firstChar = this.query.charAt(0);
  if (firstChar === '>' || firstChar === '/' || firstChar === '?') {
    this.commandPrefix = firstChar;
    // Auto-switch modes based on prefix
    if (firstChar === '>') {
      this.searchMode = 'plugins';
    } else if (firstChar === '/') {
      this.searchMode = 'files';
    } else if (firstChar === '?') {
      this.searchMode = 'all';
    }
  } else {
    this.commandPrefix = '';
  }
}
```

### Usage
```
User types: ">hello"
Result: Filters to plugins mode, searches for "hello" in plugin commands
```

## Frecency Algorithm

### Scoring Formula
```typescript
private _updateFrecency(query: string) {
  const now = Date.now();
  const existing = this.frecencyItems.find(item => item.query === query);
  
  if (existing) {
    existing.count += 1;
    existing.lastUsed = now;
  } else {
    this.frecencyItems.push({ query, count: 1, lastUsed: now });
  }

  // Sort by combined frequency and recency score
  this.frecencyItems.sort((a, b) => {
    const scoreA = a.count * Math.log(now - a.lastUsed + 1);
    const scoreB = b.count * Math.log(now - b.lastUsed + 1);
    return scoreB - scoreA;
  });
}
```

### Score Calculation
- **Frequency**: Number of times used (count)
- **Recency**: Logarithmic decay based on time since last use
- **Combined Score**: `count * log(timeSinceUse + 1)`

Higher score = Higher ranking in results

## Animation Examples

### Scale-In (Launcher Entrance)
```css
.search-container {
  animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

### Slide-In (Results)
```css
.result-item {
  animation: slideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Quick Actions Panel
```css
.quick-actions-panel {
  animation: slideInRight 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateY(-50%) translateX(10px);
  }
  to {
    opacity: 1;
    transform: translateY(-50%) translateX(0);
  }
}
```

## Quick Actions Implementation

### Getting Actions for Selected Item
```typescript
private _getQuickActionsForSelected(): QuickAction[] {
  if (this.selectedIndex < this.results.applications.length) {
    const app = this.results.applications[this.selectedIndex];
    return [
      {
        title: 'Open',
        icon: '▶️',
        shortcut: '↵',
        action: () => this._openApplication(app)
      },
      {
        title: 'Show in Finder',
        icon: '📁',
        shortcut: '⌘↵',
        action: () => this._showInFinder(app.path)
      },
      {
        title: 'Copy Path',
        icon: '📋',
        shortcut: '⌘C',
        action: () => this._copyToClipboard(app.path)
      }
    ];
  }
  return [];
}
```

### Rendering Quick Actions
```typescript
private _renderQuickActions() {
  const actions = this._getQuickActionsForSelected();
  if (actions.length === 0) return null;

  return html`
    <div class="quick-actions-panel">
      ${actions.map(action => html`
        <button 
          class="quick-action-btn"
          @click=${action.action}
          title="${action.title}"
        >
          <span>${action.icon}</span>
          <span>${action.title}</span>
          <span class="quick-action-shortcut">${action.shortcut}</span>
        </button>
      `)}
    </div>
  `;
}
```

## Prefix Hints UI

### Visual Helper
```typescript
private _renderPrefixHints() {
  if (this.query || this._getTotalResults() > 0) return null;

  return html`
    <div class="prefix-hints">
      <div class="prefix-hint">
        <span class="prefix-hint-key">></span>
        <span>Plugins</span>
      </div>
      <div class="prefix-hint">
        <span class="prefix-hint-key">/</span>
        <span>Files</span>
      </div>
      <div class="prefix-hint">
        <span class="prefix-hint-key">?</span>
        <span>Everything</span>
      </div>
      <div class="prefix-hint">
        <span class="prefix-hint-key">⌘↵</span>
        <span>Quick Actions</span>
      </div>
    </div>
  `;
}
```

## Performance: Result Caching

### Cache Strategy
```typescript
private prefetchCache: Map<string, SearchResult> = new Map();

private async _performSearch() {
  const actualQuery = this.commandPrefix 
    ? this.query.slice(1).trim() 
    : this.query.trim();

  // Check cache first
  const cacheKey = `${this.searchMode}:${actualQuery}`;
  if (this.prefetchCache.has(cacheKey)) {
    this.results = this.prefetchCache.get(cacheKey)!;
    this.selectedIndex = 0;
    return;
  }

  // Fetch from API
  const result = await invoke<SearchResult>("unified_search", {
    query: actualQuery,
    searchPath: null,
    includeFiles: this.searchMode === "all" || this.searchMode === "files",
  });

  // Cache the result
  this.prefetchCache.set(cacheKey, this.results);
  
  this.results = result;
  this.selectedIndex = 0;
}
```

### Benefits
- Eliminates duplicate API calls
- Instant results for repeated searches
- Mode-specific caching
- Memory efficient (Map-based)

## Keyboard Shortcut Handling

### Global Listener
```typescript
private _globalKeyHandler = (e: KeyboardEvent) => {
  // Toggle launcher (⌘K / Ctrl+K)
  if ((e.metaKey || e.ctrlKey) && e.key === "k") {
    e.preventDefault();
    this._toggleVisibility();
    return;
  }

  // Toggle quick actions (⌘↵ / Ctrl+↵)
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && this.isVisible) {
    e.preventDefault();
    this.showQuickActions = !this.showQuickActions;
    return;
  }
};
```

### Result Navigation
```typescript
private _handleKeyDown(e: KeyboardEvent) {
  const totalResults = this._getTotalResults();

  switch (e.key) {
    case "ArrowDown":
      e.preventDefault();
      if (totalResults > 0) {
        this.selectedIndex = Math.min(this.selectedIndex + 1, totalResults - 1);
      }
      break;
      
    case "ArrowUp":
      e.preventDefault();
      if (totalResults > 0) {
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
      }
      break;
      
    case "Enter":
      e.preventDefault();
      if (this.query && totalResults > 0) {
        this._openSelected();
      }
      break;
      
    case "Escape":
      e.preventDefault();
      this._handleEscape();
      break;
  }
}
```

## Dynamic Placeholder

### Context-Aware Text
```typescript
private _getPlaceholder(): string {
  if (this.commandPrefix === '>') {
    return 'Search plugins and commands...';
  } else if (this.commandPrefix === '/') {
    return 'Search files...';
  } else if (this.commandPrefix === '?') {
    return 'Search everything...';
  }
  return 'Search apps, files, plugins... (> / ? for modes)';
}
```

### Usage in Template
```html
<input
  type="text"
  class="search-input"
  placeholder="${this._getPlaceholder()}"
  .value=${this.query}
  @input=${this._handleInput}
/>
```

## Testing Checklist

### Functional Tests
- [ ] Type `>test` - Should filter to plugins
- [ ] Type `/readme` - Should filter to files
- [ ] Type `?app` - Should search everything
- [ ] Press ⌘K - Should toggle launcher
- [ ] Press ⌘↵ on result - Should show quick actions
- [ ] Use ↑↓ keys - Should navigate results
- [ ] Press Enter - Should open selected item
- [ ] Open same app twice - Should rank higher (frecency)

### Visual Tests
- [ ] Search results appear smoothly
- [ ] Prefix badge shows correct mode
- [ ] Quick actions slide in from right
- [ ] Selected item has left border
- [ ] Prefix hints appear when empty
- [ ] Placeholder updates with prefix

### Performance Tests
- [ ] Search response < 300ms
- [ ] Cached results instant
- [ ] Animations smooth at 60fps
- [ ] No memory leaks after 100 searches
- [ ] Frecency data persists after reload

## Debugging

### Enable Console Logging
```typescript
// In _performSearch
console.log('Search query:', actualQuery);
console.log('Search mode:', this.searchMode);
console.log('Cache key:', cacheKey);
console.log('Cache hit:', this.prefetchCache.has(cacheKey));
```

### Inspect Frecency Data
```typescript
// In browser console
const data = localStorage.getItem('fleet-chat-frecency');
console.log('Frecency items:', JSON.parse(data));
```

### Check Animation Performance
```typescript
// In browser DevTools
// Performance tab → Record → Type in search
// Look for:
// - Layout thrashing
// - Paint issues
// - Composite layer issues
```

## Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| CSS Transforms | ✅ | ✅ | ✅ | ✅ |
| Cubic-Bezier | ✅ | ✅ | ✅ | ✅ |
| localStorage | ✅ | ✅ | ✅ | ✅ |
| Map | ✅ | ✅ | ✅ | ✅ |
| Optional Chaining | ✅ | ✅ | ✅ | ✅ |
| Keyboard Events | ✅ | ✅ | ✅ | ✅ |

All features are supported in modern browsers (2020+).
