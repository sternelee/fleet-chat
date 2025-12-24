# AI Search Integration - Visual Guide

This guide provides a visual representation of the AI Search Integration feature.

## UI Components Overview

### 1. Search Interface with AI Insights

```
┌─────────────────────────────────────────────────────────────────┐
│  Fleet Chat - Search                                      ⚫ ⚫ ⚫ │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│   ┌───────────────────────────────────────────────────────┐     │
│   │ 🔍  code                                              │     │
│   └───────────────────────────────────────────────────────┘     │
│                                                                   │
│   [ All ]  [ Apps ]  [ Files ]  [ Plugins ]                     │
│                                                                   │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │ 💡 AI Insights                                        ✕ │  │
│   ├──────────────────────────────────────────────────────────┤  │
│   │ Found 5 development applications including VSCode and    │  │
│   │ Xcode. VSCode is ideal for web development while Xcode  │  │
│   │ is best for iOS/macOS projects. Consider opening your   │  │
│   │ most recently used editor.                               │  │
│   └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │ Applications                                              │  │
│   ├──────────────────────────────────────────────────────────┤  │
│   │ [📱] Visual Studio Code            /Applications/...  App │  │
│   │ [📱] Xcode                         /Applications/...  App │  │
│   │ [📱] CodeRunner                    /Applications/...  App │  │
│   │ [📱] Code - OSS                    /Applications/...  App │  │
│   └──────────────────────────────────────────────────────────┘  │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

## Color Scheme

### AI Insights Panel
- **Background**: Linear gradient from `rgba(99, 102, 241, 0.1)` to `rgba(139, 92, 246, 0.1)`
- **Border**: `1px solid rgba(139, 92, 246, 0.3)`
- **Header Background**: `rgba(139, 92, 246, 0.15)`
- **Title Color**: `rgba(196, 181, 253, 0.9)` (Light purple)
- **Text Color**: `rgba(255, 255, 255, 0.85)` (Off-white)
- **Border Radius**: `12px`

### Loading State
```
┌──────────────────────────────────────────────────────────┐
│ 💡 AI Insights                                        ✕ │
├──────────────────────────────────────────────────────────┤
│ ⟳  Generating insights...                               │
└──────────────────────────────────────────────────────────┘
```
- **Spinner**: Rotating border animation in purple
- **Animation**: 0.8s linear infinite rotation

### Search Results
- **Background**: `rgba(255, 255, 255, 0.05)`
- **Border**: `1px solid rgba(255, 255, 255, 0.1)`
- **Selected Item**: `rgba(102, 126, 234, 0.15)`
- **Selected Indicator**: `3px left border in rgba(102, 126, 234, 0.8)`

## Animation Sequences

### 1. AI Insights Appear
```
State 1: Hidden
┌──────────────────────────┐
│ Search Results           │
└──────────────────────────┘

      ↓ (1 second delay)

State 2: Sliding In (0.3s)
┌──────────────────────────┐
│ 💡 AI Insights  ↓       │  ← Slides down
├──────────────────────────┤
│ ⟳ Generating...         │
└──────────────────────────┘
┌──────────────────────────┐
│ Search Results           │
└──────────────────────────┘

      ↓ (2-3 seconds)

State 3: Content Loaded
┌──────────────────────────┐
│ 💡 AI Insights        ✕ │
├──────────────────────────┤
│ Found 5 development...   │
└──────────────────────────┘
┌──────────────────────────┐
│ Search Results           │
└──────────────────────────┘
```

### 2. Loading Spinner Animation
```
Frame 1:    Frame 2:    Frame 3:    Frame 4:
   ⟲          ⟳          ⟲          ⟳
```
**CSS**: Continuous 360° rotation

## Interactive Elements

### Close Button (✕)
- **Default**: `rgba(255, 255, 255, 0.1)` background
- **Hover**: `rgba(255, 255, 255, 0.2)` background, brighter text
- **Size**: 20x20px
- **Position**: Top-right corner of AI insights header
- **Cursor**: Pointer

### AI Insights Panel
- **Hover**: No special state (not clickable)
- **Focus**: None (non-interactive except close button)

## Responsive Behavior

### Different Query Types

#### 1. Application Search (Mode: Apps)
```
Query: "safari"
AI: "Safari is your default web browser. Found in /Applications/. 
     Open to browse the web or access developer tools."
```

#### 2. File Search (Mode: Files)
```
Query: "README"
AI: "Found 3 README files in your project directories. The main 
     README.md contains project documentation. Consider opening 
     it to review project details."
```

#### 3. Mixed Search (Mode: All)
```
Query: "test"
AI: "Found 2 test-related applications and 15 test files. Most 
     test files are in src/test/. Consider running your test 
     suite or opening test configuration."
```

#### 4. No Results
```
Query: "xyznonexistent"
Result: No AI insights panel appears
```

## Error States

### 1. AI Provider Not Configured
```
┌──────────────────────────────────────────────────────────┐
│ 💡 AI Insights                                        ✕ │
├──────────────────────────────────────────────────────────┤
│ AI insights are currently unavailable. Please ensure an  │
│ AI provider is configured.                               │
└──────────────────────────────────────────────────────────┘
```
**Auto-hides after 5 seconds**

### 2. Network Error
```
┌──────────────────────────────────────────────────────────┐
│ 💡 AI Insights                                        ✕ │
├──────────────────────────────────────────────────────────┤
│ Failed to generate AI insights. Please check your        │
│ internet connection and try again.                       │
└──────────────────────────────────────────────────────────┘
```

## Typography

- **Panel Title**: 13px, weight 600, letter-spacing 0.05em
- **AI Icon**: 18x18px SVG
- **Insights Text**: 14px, line-height 1.6, weight 400
- **Loading Text**: 13px, weight 400

## Spacing

```
┌─ 16px padding ─────────────────────────────────┐
│ 💡 AI Insights                              ✕ │
├─ 12px padding ─────────────────────────────────┤
│ ← 16px → Insights text here... ← 16px →       │
└─ 16px padding ─────────────────────────────────┘
     ↓ 16px gap
┌────────────────────────────────────────────────┐
│ Search Results                                  │
```

## Accessibility Features

### 1. Color Contrast
- Text on background meets WCAG AA standards
- Purple gradient provides visual distinction without relying solely on color

### 2. Semantic HTML
```html
<div class="ai-insights-container" role="region" aria-label="AI Insights">
  <div class="ai-insights-header">
    <div class="ai-insights-title">
      <svg class="ai-icon" aria-hidden="true">...</svg>
      <span>AI Insights</span>
    </div>
    <button 
      class="ai-insights-close" 
      aria-label="Close AI insights"
      title="Close AI insights">
      ✕
    </button>
  </div>
  <div class="ai-insights-content">
    <p class="ai-insights-text">...</p>
  </div>
</div>
```

### 3. Keyboard Navigation
- Close button is focusable with Tab
- Enter or Space activates close button
- Escape key can be used to dismiss (if focus is within)

### 4. Screen Reader Announcements
- Panel appearance announced as "AI Insights region"
- Loading state announced as "Generating insights"
- Content changes announced

## Desktop-Specific Features

### macOS
- Uses SF Symbols for icons when available
- Follows macOS Big Sur design language
- Respects system appearance (dark mode)
- Cmd+K shortcut to toggle search

### Windows
- Adapts to Windows 11 design principles
- Ctrl+K shortcut to toggle search
- Fluent design influences

### Linux
- Works with various desktop environments
- Standard keyboard shortcuts
- Adapts to system theme

## Performance Indicators

### Visual Feedback Timeline
```
User types last character
          ↓
    200ms debounce
          ↓
Search results appear
          ↓
    1000ms debounce
          ↓
AI insights panel slides in
          ↓
Loading spinner appears
          ↓
    1-3 seconds (API call)
          ↓
Insights text fades in
```

### Network Activity Indicators
- No explicit network indicator (handled by loading spinner)
- Smooth transitions hide network latency
- Progressive enhancement (works without AI)

## Platform-Specific Icons

### Application Icons
```
macOS:   Native .icns icons extracted and displayed
Windows: .ico icons when available
Linux:   .svg or .png icons from system
```

### AI Insights Icon
```
💡 or SVG lightbulb path:
M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3
m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547
A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754
-.988-2.386l-.548-.547z
```

## Best Practices for Visual Testing

1. **Test with Real Data**: Use actual applications and files installed on system
2. **Verify Animations**: Ensure smooth 60fps animations on all platforms
3. **Check Color Accuracy**: Verify colors match design specs on different displays
4. **Test Edge Cases**: Very long insights text, empty results, errors
5. **Responsive Layout**: Verify layout works at different window sizes
6. **Dark/Light Mode**: Test in both system appearance modes
7. **Accessibility**: Test with screen readers and keyboard only

## Screenshot Checklist

For PR documentation, capture:
- [ ] Normal state with AI insights
- [ ] Loading state with spinner
- [ ] Error state with message
- [ ] Closed state (no AI insights)
- [ ] Different search modes (Apps, Files, All)
- [ ] Various window sizes
- [ ] Dark and light themes (if supported)

---

**Note**: This visual guide is a text-based representation. Actual implementation may vary slightly in colors, spacing, and effects.
