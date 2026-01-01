# Mention Support in Search Input (@app and #file)

## Overview

Fleet Chat now supports mentioning applications and files directly in the search input using a Twitter/Slack-like mention syntax:
- `@` for applications (e.g., `@chrome`, `@vscode`)
- `#` for files (e.g., `#README.md`, `#package.json`)

This enables natural language commands with context, such as:
- "帮我把 #某文件 删除，并且打开 @chrome 访问github"
- "Open @vscode and show me #config.json"

## Features

### 1. Real-time Autocomplete

When you type `@` or `#` followed by text, an autocomplete dropdown appears with suggestions:

- **Application Mentions (@)**: Shows matching installed applications
- **File Mentions (#)**: Shows matching files in your system

### 2. Keyboard Navigation

Navigate the autocomplete dropdown with:
- `↑` / `↓` - Move selection up/down
- `Enter` / `Tab` - Select highlighted suggestion
- `Esc` - Close dropdown

### 3. AI Context Integration

When you send a query with mentions to an AI provider, the system:
1. Parses all mentions in your query
2. Resolves them to actual applications/files
3. Adds context to the AI prompt
4. AI receives full information about referenced entities

## Architecture

### Frontend Components

#### 1. Mention Parser (`src/utils/mention-parser.ts`)
```typescript
// Parse text to extract mentions
const parsed = parseInput("Open @chrome and #file.txt");
// Returns: {
//   mentions: [
//     { type: 'app', text: 'chrome', startIndex: 5, endIndex: 12 },
//     { type: 'file', text: 'file.txt', startIndex: 17, endIndex: 26 }
//   ]
// }

// Get active mention while typing
const mention = getCurrentMention("@chr", 4);
// Returns: { type: 'app', text: 'chr', ... }
```

#### 2. Suggestion Dropdown (`src/components/suggestion-dropdown.ts`)
- Lit component for displaying autocomplete suggestions
- Shows application/file icons and paths
- Handles keyboard and mouse interaction
- Animated slide-down appearance

#### 3. Search Component Integration (`src/views/search/search.component.ts`)
- Detects mention typing in real-time
- Fetches suggestions from backend
- Manages dropdown state and position
- Resolves mentions before sending to AI

### Backend Commands

#### 1. Application Search (`search_app_suggestions`)
```rust
#[command]
pub async fn search_app_suggestions(
    query: String,
    limit: Option<usize>
) -> Result<Vec<Application>, String>
```
- Fast partial matching for installed applications
- Returns up to N matches (default: 10)
- Sorted by relevance (exact match > starts with > contains)

#### 2. File Search (`search_file_suggestions`)
```rust
#[command]
pub async fn search_file_suggestions(
    query: String,
    search_path: Option<String>,
    limit: Option<usize>
) -> Result<Vec<FileMatch>, String>
```
- Searches files by name (not content)
- Respects `.gitignore` rules
- Limited depth (5 levels) for performance
- Returns up to N matches (default: 10)

## Usage Examples

### Example 1: Simple Application Mention
```
Input: "Open @firefox"
Result: Autocomplete shows Firefox browser
Action: Select from dropdown or press Enter
```

### Example 2: File with Extension
```
Input: "Show me #package.json"
Result: Autocomplete shows package.json files in the project
Action: Select the specific file you want
```

### Example 3: AI Command with Context
```
Input: "帮我打开 @vscode 并显示 #README.md"
AI Receives:
  Original: "帮我打开 @vscode 并显示 #README.md"
  Context:
    - App: Visual Studio Code (/Applications/Visual Studio Code.app)
    - File: README.md (/Users/you/project/README.md)
```

### Example 4: Multiple Mentions
```
Input: "Compare #config.dev.json and #config.prod.json using @vscode"
Result: All three mentions are resolved and passed to AI
```

## Implementation Details

### Mention Detection Algorithm

1. **Real-time parsing**: Text is parsed on every keystroke
2. **Cursor-aware**: Only shows suggestions for mention at cursor position
3. **Debouncing**: API calls are debounced to avoid excessive requests
4. **Caching**: Recent searches are cached for instant responses

### Suggestion Matching

Applications and files are matched using fuzzy search:
1. **Exact match**: Highest priority (name === query)
2. **Starts with**: Medium priority (name.startsWith(query))
3. **Contains**: Lower priority (name.includes(query))
4. **Case insensitive**: All matching is case-insensitive

### AI Context Building

When a query contains mentions:
```typescript
// Original query
"Open @chrome and show #README"

// Enhanced prompt sent to AI
`Open @chrome and show #README

Context:
- Application "chrome" refers to an installed application
- File "README" refers to a file in the system

Resolved entities:
- App: Google Chrome (/Applications/Google Chrome.app)
- File: /Users/you/project/README.md`
```

## Performance Considerations

### Frontend Optimization
- Application cache loaded once at startup
- Icon loading is asynchronous and on-demand
- Dropdown rendered only when needed
- Event handlers properly cleaned up

### Backend Optimization
- Application list cached per context
- File search limited to 5 directory levels
- Results limited to 10 items by default
- Respects `.gitignore` to avoid searching node_modules, etc.

## Future Enhancements

### Planned Features
1. **Visual highlighting**: Color-code mentions in input (blue for @, green for #)
2. **Hover tooltips**: Show full path/details on mention hover
3. **Recent mentions**: Remember frequently used mentions
4. **Mention deletion**: Easy removal with backspace
5. **Smart suggestions**: Learn from usage patterns

### Potential Extensions
1. **URL mentions**: `@url/https://example.com`
2. **Command mentions**: `>command` for built-in commands
3. **User mentions**: `@user` for multi-user environments
4. **Workspace mentions**: `#workspace/project-name`

## Troubleshooting

### Autocomplete not showing
- Ensure you're typing `@` or `#` followed by text
- Check that the cursor is after the mention character
- Verify backend commands are registered (check console)

### No suggestions appearing
- On macOS, check Application permissions for filesystem access
- Verify the search path is accessible
- Check if any applications/files match the query

### AI not understanding mentions
- Ensure mentions are resolved (check console logs)
- Verify AI provider is configured
- Check that the mention text matches actual apps/files

## Technical Notes

### Type Definitions
```typescript
interface Mention {
  type: 'app' | 'file';
  text: string;           // e.g., "chrome"
  fullText: string;       // e.g., "@chrome"
  startIndex: number;
  endIndex: number;
  entity?: any;          // Resolved app/file object
}

interface ParsedInput {
  raw: string;
  plainText: string;
  mentions: Mention[];
  hasAppMention: boolean;
  hasFileMention: boolean;
}
```

### Event Flow
```
User types "@chr"
  ↓
Input event fires
  ↓
getCurrentMention() detects active mention
  ↓
_fetchMentionSuggestions() calls backend
  ↓
Backend: search_app_suggestions("chr")
  ↓
Results displayed in dropdown
  ↓
User selects suggestion
  ↓
suggestion-select event fires
  ↓
_handleMentionSelect() updates query
  ↓
Dropdown closes
```

## Contributing

To extend mention functionality:

1. **Add new mention types**: Update `mention-parser.ts` regex
2. **New backend searches**: Add commands in `search.rs`
3. **Custom rendering**: Modify `suggestion-dropdown.ts`
4. **AI integration**: Enhance `_askAIProvider()` in search component

## Related Files

- `src/utils/mention-parser.ts` - Core parsing logic
- `src/components/suggestion-dropdown.ts` - Autocomplete UI
- `src/views/search/search.component.ts` - Integration
- `src-tauri/src/search.rs` - Backend commands
- `src-tauri/src/lib.rs` - Command registration
