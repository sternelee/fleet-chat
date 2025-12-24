# AI Search Integration Test Plan

This document outlines the test plan for the AI search integration feature.

## Prerequisites

1. **Environment Setup**
   - Ensure one of the following API keys is set:
     - `OPENAI_API_KEY` (recommended for testing)
     - `ANTHROPIC_API_KEY`
     - `GEMINI_API_KEY`
   
2. **Build and Run**
   ```bash
   # Set API key (example with OpenAI)
   export OPENAI_API_KEY=your-api-key-here
   
   # Install dependencies
   pnpm install
   
   # Run development server
   pnpm dev
   ```

## Test Cases

### Test Case 1: Basic Search with AI Insights

**Steps:**
1. Open Fleet Chat application
2. Navigate to Search view (Cmd+K or click Search icon)
3. Type "code" in the search box
4. Wait for search results to appear
5. Wait additional ~1 second

**Expected Results:**
- Search results show applications containing "code" (VSCode, Xcode, etc.)
- AI insights panel appears above results with purple gradient background
- Panel contains 2-3 sentence summary of search results
- Summary includes suggestions for next actions

**Example AI Response:**
```
Found 5 development applications including VSCode and Xcode. 
VSCode is ideal for web development while Xcode is best for 
iOS/macOS projects. Consider opening your most recently used editor.
```

### Test Case 2: File Search with AI Insights

**Steps:**
1. In search box, type "/"
2. Notice the "Files" badge appears
3. Type "/report 2024"
4. Wait for search results and AI insights

**Expected Results:**
- Search mode automatically switches to "Files"
- Results show files matching "report 2024"
- AI insights summarize found files with dates and locations
- Suggestions include opening or organizing files

### Test Case 3: No Results Scenario

**Steps:**
1. Search for "xyzabcnonexistent123"
2. Wait for results

**Expected Results:**
- "No results found" message appears
- AI insights panel does NOT appear (no results to analyze)
- No errors in console

### Test Case 4: AI Insights Loading State

**Steps:**
1. Search for "photo"
2. Immediately after results appear, observe the AI insights panel

**Expected Results:**
- AI insights panel appears with loading spinner
- Text shows "Generating insights..."
- After 1-3 seconds, loading is replaced with AI text
- Smooth transition from loading to content

### Test Case 5: Close AI Insights

**Steps:**
1. Perform any search with results
2. Wait for AI insights to appear
3. Click the ✕ button in AI insights header

**Expected Results:**
- AI insights panel smoothly disappears
- Search results remain visible
- No errors in console

### Test Case 6: Multiple Searches

**Steps:**
1. Search for "code"
2. Wait for AI insights
3. Clear search
4. Search for "photo"
5. Wait for AI insights

**Expected Results:**
- First search shows code-related insights
- Second search shows photo-related insights
- Each search generates fresh, contextual insights
- No mixing of insights from different searches

### Test Case 7: AI Provider Unavailable

**Steps:**
1. Remove or invalidate API key
2. Restart application
3. Perform a search

**Expected Results:**
- Search results appear normally
- AI insights panel appears briefly
- Shows message: "AI insights are currently unavailable. Please ensure an AI provider is configured."
- Panel auto-hides after 5 seconds
- Search functionality continues to work

### Test Case 8: Network Error During AI Request

**Steps:**
1. Disable network connection
2. Perform a search with results
3. Wait for AI insights attempt

**Expected Results:**
- Search results appear (cached or local)
- AI insights attempt fails gracefully
- Error message appears in AI insights panel
- No application crash or freeze

## Performance Tests

### Test Case 9: Search Response Time

**Measurement:**
- Time from typing last character to search results appearing
- Time from search results to AI insights appearing

**Expected:**
- Search results: < 500ms for applications, < 1000ms for files
- AI insights: 1000ms debounce + 1-3 seconds API response

### Test Case 10: Rapid Typing / Debouncing

**Steps:**
1. Type "codephotomusic" rapidly without pausing
2. Observe behavior

**Expected Results:**
- Only final search query is executed
- No intermediate searches triggered
- AI insights only fetched once for final query
- No rate limit errors from AI provider

## Edge Cases

### Test Case 11: Empty Search Query

**Steps:**
1. Focus search box
2. Press Enter without typing

**Expected Results:**
- No search executed
- No AI insights panel
- Recent searches shown (if any)

### Test Case 12: Very Long Search Query

**Steps:**
1. Type or paste a very long query (200+ characters)
2. Wait for results

**Expected Results:**
- Search executes normally
- AI insights generated with truncated context if needed
- No UI overflow issues

### Test Case 13: Special Characters in Query

**Steps:**
1. Search for queries with special characters: `"code*test"`, `"app-name"`, `"file.txt"`
2. Wait for results and AI insights

**Expected Results:**
- Search handles special characters appropriately
- AI insights generated without errors
- No query injection or escaping issues

## Integration Tests

### Test Case 14: AI Insights with Application Results Only

**Steps:**
1. Set search mode to "Apps"
2. Search for "safari"

**Expected Results:**
- Only applications shown in results
- AI insights reference only applications
- No mention of files in insights

### Test Case 15: AI Insights with File Results Only

**Steps:**
1. Set search mode to "Files"
2. Search for "readme"

**Expected Results:**
- Only files shown in results
- AI insights reference only files
- No mention of applications in insights

### Test Case 16: Mixed Results (All Mode)

**Steps:**
1. Ensure search mode is "All"
2. Search for common term like "test"

**Expected Results:**
- Both applications and files in results
- AI insights mention both types
- Balanced summary of findings

## Accessibility Tests

### Test Case 17: Keyboard Navigation

**Steps:**
1. Use only keyboard to navigate (Tab, Enter, Escape)
2. Perform search and interact with AI insights

**Expected Results:**
- All elements keyboard accessible
- Close button focusable and activatable with Enter
- Proper focus indicators visible

### Test Case 18: Screen Reader Compatibility

**Steps:**
1. Enable screen reader
2. Navigate to search and perform query
3. Listen to AI insights announcement

**Expected Results:**
- AI insights content readable by screen reader
- Proper ARIA labels and roles
- Loading state announced

## Cross-Platform Tests (if applicable)

### Test Case 19: macOS Specific Features

**Steps:**
1. Test on macOS with various applications installed
2. Verify app icon extraction works
3. Test keyboard shortcuts (Cmd+K)

**Expected Results:**
- macOS apps searchable with icons
- Keyboard shortcuts work as expected
- AI insights reference macOS-specific apps correctly

## Regression Tests

### Test Case 20: Existing Search Functionality

**Steps:**
1. Verify all original search features still work:
   - Application search
   - File search
   - Plugin search
   - Search filters (All, Apps, Files, Plugins)
   - Command prefixes (>, /, ?)

**Expected Results:**
- All existing features work unchanged
- AI insights is additive, not breaking
- No performance degradation

## Manual Exploratory Testing

### Test Case 21: Real-World Usage

**Scenarios:**
- Search for actual applications you use daily
- Search for documents you work with
- Try various search patterns and observe AI suggestions
- Evaluate usefulness of AI insights
- Note any unexpected behaviors

**Feedback:**
- Document insights that were particularly helpful
- Note any irrelevant or confusing suggestions
- Suggest improvements to prompt engineering

## Automated Testing (Future)

**Recommended:**
1. Unit tests for `generate_search_insights` function
2. Integration tests for AI provider initialization
3. E2E tests for search flow with mocked AI responses
4. Performance benchmarks for search + AI insights

## Bug Reports

When reporting bugs, include:
- Test case number
- Steps to reproduce
- Expected vs actual behavior
- Screenshots/screen recordings
- Console logs
- Environment (OS, Node version, AI provider used)
- API key status (configured but redact actual key)

## Success Criteria

The AI search integration feature is considered successful if:
- ✅ 90%+ of test cases pass
- ✅ No critical bugs or crashes
- ✅ Performance impact < 10% on search
- ✅ AI insights are relevant and helpful
- ✅ Error handling is graceful
- ✅ Documentation is clear and complete
- ✅ User feedback is positive

## Test Execution Log

| Date | Tester | Test Cases Run | Pass | Fail | Notes |
|------|--------|---------------|------|------|-------|
| YYYY-MM-DD | Name | 1-5 | 5 | 0 | All basic features working |
| ... | ... | ... | ... | ... | ... |

---

**Last Updated:** 2024-12-24
**Version:** 1.0
**Status:** Ready for Testing
