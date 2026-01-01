# Mention Feature Examples

## Basic Usage

### Application Mentions (@)

```
Type: @chr
Shows: Chrome, Chromium, etc.

Type: @code
Shows: VSCode, VSCodium, etc.

Type: @fire
Shows: Firefox, etc.
```

### File Mentions (#)

```
Type: #README
Shows: README.md, README.txt, etc.

Type: #package
Shows: package.json, package-lock.json, etc.

Type: #config
Shows: config.js, config.json, .config, etc.
```

## Advanced Examples

### Example 1: Open Application
```
Query: 打开 @chrome
AI Response: "I'll open Google Chrome for you."
Action: Opens Chrome browser
```

### Example 2: View File
```
Query: 显示 #package.json
AI Response: "Here's the content of package.json..."
Action: Opens package.json in default editor
```

### Example 3: Multiple Actions (Chinese)
```
Query: 帮我把 #test.txt 删除，并且打开 @vscode 访问 github
AI Response: "I'll help you:
1. Delete test.txt file
2. Open Visual Studio Code
3. Navigate to GitHub

Would you like me to proceed?"
```

### Example 4: File Comparison
```
Query: Compare #config.dev.json and #config.prod.json
AI Response: "I'll compare these configuration files:
- config.dev.json: Development settings
- config.prod.json: Production settings

Key differences:
1. API endpoints differ
2. Debug mode enabled in dev
3. Different database connections"
```

### Example 5: Development Workflow
```
Query: Open @vscode with #src/main.ts and #README.md
AI Response: "Opening Visual Studio Code with:
- src/main.ts
- README.md

Both files will be displayed in split view."
```

## Natural Language Commands

### File Operations
```
"Delete #old-file.txt"
"Rename #document.txt to #report.txt"
"Copy #config.json to #config.backup.json"
"Show me #package.json"
```

### Application Control
```
"Launch @firefox"
"Close @chrome"
"Switch to @vscode"
"Open @terminal"
```

### Combined Operations
```
"Open #README.md with @vscode"
"Send #report.pdf via @mail"
"Edit #config.js in @sublime"
"Compare #file1.txt and #file2.txt using @beyond-compare"
```

## Context-Aware Queries

### Example 1: Project Management
```
Query: What's in #package.json and which @node version should I use?
Context:
- File: /Users/you/project/package.json
- AI analyzes package.json content
- Suggests compatible Node.js version
```

### Example 2: Documentation
```
Query: Summarize #CHANGELOG.md and open @browser to show the release notes
Context:
- File: /Users/you/project/CHANGELOG.md
- AI reads and summarizes changes
- Opens browser to project website
```

### Example 3: Development Setup
```
Query: Install dependencies from #package.json using @terminal
Context:
- File: Contains npm dependencies
- AI generates appropriate commands
- Opens terminal and suggests: npm install
```

## Multilingual Support

### English
```
"Open @chrome and navigate to GitHub"
"Show me #README.md"
"Delete #temp-file.txt"
```

### Chinese
```
"打开 @浏览器"
"显示 #配置文件.json"
"删除 #临时文件.txt"
"帮我用 @编辑器 编辑 #文档.md"
```

### Mixed Language
```
"Open @vscode and show 配置文件 #config.json"
"用 @chrome 打开 #README.md"
```

## Smart Suggestions

### Partial Matching
```
Type: @vs
Matches:
- Visual Studio Code
- Visual Studio
- VSCodium

Type: #read
Matches:
- README.md
- README.txt
- reader.js
- thread.ts (contains 'read')
```

### Case Insensitive
```
Type: @CHROME
Type: @Chrome  
Type: @chrome
All match: Google Chrome
```

### Fuzzy Matching
```
Type: @frefx
Might match: Firefox (typo tolerance)

Type: #pckg
Might match: package.json
```

## Tips and Tricks

### 1. Quick Application Launch
```
Just type: @app-name
Press Enter to select
Application launches
```

### 2. File Quick Open
```
Type: #file-name
Select from suggestions
Opens in default application
```

### 3. Combine with Search Prefixes
```
>@plugin      - Search plugins mentioning app
/@file        - Search files mode
?@anything    - Search everything
```

### 4. Use in AI Chat
```
Any mention in AI chat gets full context
AI understands which specific file/app
More accurate and helpful responses
```

### 5. Recent Mentions
```
Frequently used mentions appear first
System learns your patterns
Faster selection over time
```

## Error Handling

### No Matches Found
```
Type: @nonexistent-app
Shows: "No applications found"
Suggestion: Check spelling or try partial name
```

### Multiple Matches
```
Type: @code
Shows: 
- Visual Studio Code
- Code.app
- CodeEdit
Select the one you want
```

### Ambiguous Files
```
Type: #config
Shows multiple config files
Each with full path
Select based on location
```

## Keyboard Shortcuts

```
@              - Start application mention
#              - Start file mention
↑ / ↓         - Navigate suggestions
Enter / Tab   - Select highlighted item
Esc           - Close dropdown
Backspace     - Edit mention
```

## Integration Examples

### With Plugin System
```
Query: Use @browser to test >my-plugin results
- Mentions app: @browser
- References plugin: >my-plugin
- AI coordinates both systems
```

### With File Search
```
Query: Find #*.json files and open with @vscode
- File wildcard: *.json
- App mention: @vscode
- AI finds all JSON files
- Opens them in VSCode
```

### With AI Insights
```
Query: Analyze #package.json dependencies
- AI reads package.json
- Checks for updates
- Security vulnerabilities
- Suggests improvements
```

## Best Practices

1. **Be specific**: Use unique parts of names (@chrom vs @chr)
2. **Include extensions**: #file.json vs #file
3. **Use full names**: For clarity in AI commands
4. **Check suggestions**: Verify the right item is selected
5. **Combine wisely**: Don't overload with too many mentions

## Common Patterns

### Development Workflow
```
1. @terminal
2. #package.json
3. @editor for #src/main.ts
4. @browser for testing
```

### Document Editing
```
1. Open #document.md with @markdown-editor
2. Check #style-guide.md
3. Generate PDF with @pandoc
4. Review in @pdf-viewer
```

### System Administration
```
1. Check #system-logs.txt
2. Monitor with @activity-monitor
3. Configure #settings.conf
4. Restart @service
```
