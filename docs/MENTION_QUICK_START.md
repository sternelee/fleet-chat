# Quick Start: Mention Feature

## What is it?

Fleet Chat now lets you mention applications and files directly in your search using:
- **@** for apps (like @chrome, @vscode)
- **#** for files (like #README.md, #config.json)

## How to use

### 1. Mention an Application

Type `@` followed by an app name:

```
@chr     →  Shows Chrome, Chromium, etc.
@code    →  Shows VSCode
@fire    →  Shows Firefox
```

Press Enter or click to select!

### 2. Mention a File

Type `#` followed by a file name:

```
#README      →  Shows README.md, README.txt
#package     →  Shows package.json
#config      →  Shows config files
```

### 3. Use with AI

Ask the AI to do something with mentioned items:

**English:**
```
"Open @chrome and show #README.md"
"Delete #old-file.txt"
"Compare #file1.txt and #file2.txt"
```

**Chinese:**
```
"打开 @chrome"
"显示 #配置文件.json"
"帮我用 @vscode 编辑 #文档.md"
```

## Tips

✅ **DO:**
- Use specific names: `@chrome` instead of `@c`
- Include file extensions: `#file.json` instead of `#file`
- Verify selection before pressing Enter

❌ **DON'T:**
- Don't type spaces after @ or #
- Don't use wildcards (not supported yet)
- Don't expect real-time file watching

## Keyboard Shortcuts

- **↑ / ↓** - Navigate suggestions
- **Enter / Tab** - Select highlighted item
- **Esc** - Close dropdown
- **Backspace** - Edit mention

## Common Uses

### Quick App Launch
```
@app-name [Enter]
```

### File Quick Open
```
#filename [Enter]
```

### AI Commands
```
"Open @app with #file"
"Show me #file contents"
"Delete #file"
```

## Troubleshooting

**Q: Autocomplete not showing?**
- Make sure you typed @ or # 
- Check cursor is after the mention
- Try typing more characters

**Q: Can't find my app?**
- Check the app name spelling
- Try a partial name
- Verify app is installed

**Q: File not appearing?**
- Include the file extension
- Check the file exists
- Try searching from home directory

## More Information

- Full documentation: `docs/MENTION_SUPPORT.md`
- Examples: `docs/MENTION_EXAMPLES.md`
- UI Guide: `docs/MENTION_UI_GUIDE.md`

---

**That's it!** Start using @ and # in your searches to make AI commands more powerful! 🚀
