# AI Search Integration

## Overview

Fleet Chat now includes AI-powered insights for search results using the Rig agent framework. When you search for applications or files, the system can optionally provide AI-generated summaries and suggestions to help you understand and act on your search results.

## Features

### Automatic Insights Generation
- After performing a search that returns results, AI insights are automatically generated after a 1-second delay
- Insights appear in a visually distinct purple-themed panel above search results
- Provides 2-3 sentence summaries of what was found and suggestions for next steps

### Smart Context Analysis
The AI analyzes your search results and provides:
- Summary of found applications and files
- Pattern recognition in search results
- Actionable suggestions based on the context
- Relevant insights about the search query

### User Controls
- **Close button**: Dismiss AI insights at any time
- **Auto-hide on error**: If AI is unavailable, the panel auto-hides after 5 seconds
- **Responsive loading**: Shows spinner while generating insights

## Usage

### Basic Search with AI Insights

1. Type a search query in the search box (e.g., "code", "photo", "document")
2. Wait for search results to appear
3. After ~1 second, AI insights will automatically appear above the results
4. Read the AI-generated summary and suggestions
5. Click the ✕ button to dismiss insights if desired

### Example Scenarios

#### Searching for Applications
```
Query: "code"
Results: VSCode, Xcode, CodeRunner, etc.
AI Insight: "Found 5 development applications. VSCode and Xcode are 
your most frequently used code editors. Consider opening VSCode for 
web development or Xcode for iOS projects."
```

#### Searching for Files
```
Query: "report 2024"
Results: Various PDF and DOCX files
AI Insight: "Found 8 documents related to 2024 reports. Most are 
PDF files in your Documents folder. The most recent is 'Q4_Report_2024.pdf' 
from last week."
```

## Configuration

### AI Provider Setup

The AI insights feature requires an AI provider to be configured. Supported providers include:

- **OpenAI** (recommended): Set `OPENAI_API_KEY` environment variable
- **Anthropic**: Set `ANTHROPIC_API_KEY` environment variable  
- **Google Gemini**: Set `GEMINI_API_KEY` environment variable

The system automatically detects which provider is available and uses it.

### Environment Variables

Create a `.env` file in the project root or set system environment variables:

```bash
# For OpenAI
OPENAI_API_KEY=sk-your-api-key-here

# For Anthropic
ANTHROPIC_API_KEY=sk-ant-your-api-key-here

# For Google Gemini
GEMINI_API_KEY=your-api-key-here
```

### Default Models

- OpenAI: `gpt-4o-mini`
- Anthropic: `claude-3-5-sonnet-20241022`
- Gemini: `gemini-2.0-flash-exp`

## Technical Architecture

### Backend (Rust)

**Command**: `generate_search_insights`
- **Location**: `src-tauri/src/search.rs`
- **Parameters**: 
  - `query: String` - The search query
  - `search_results: SearchResult` - The search results object
- **Returns**: `Result<String, String>` - AI-generated insights or error message

**Flow**:
1. Initialize Rig agent with configured AI provider
2. Build context from search results (apps and files)
3. Generate AI prompt with result summary and instructions
4. Call AI model with temperature=0.7, max_tokens=200
5. Return generated text insights

### Frontend (TypeScript/Lit)

**Component**: `ViewSearch` in `src/views/search/search.component.ts`

**State**:
- `aiInsights: string` - Generated AI insights text
- `aiInsightsLoading: boolean` - Loading state
- `showAiInsights: boolean` - Visibility toggle

**Methods**:
- `_fetchAIInsights(query, results)` - Fetches insights from backend
- `_toggleAIInsights()` - Shows/hides insights panel
- `_hasResults()` - Checks if search returned results

**UI Components**:
- AI insights container with gradient background
- Header with AI icon and title
- Loading spinner animation
- Close button
- Content area for insights text

## Performance Considerations

### Debouncing
- Search is debounced by 200ms
- AI insights fetching is debounced by 1000ms after search completes
- Prevents excessive API calls during rapid typing

### Caching
- Search results are cached in memory
- AI insights are fetched per unique search
- Cache helps with frecency sorting and repeated searches

### Error Handling
- Graceful degradation if AI provider is unavailable
- User-friendly error messages
- Auto-hide on persistent errors
- No blocking of main search functionality

## Customization

### Modifying AI Prompt

Edit the prompt in `src-tauri/src/search.rs`:

```rust
let prompt = format!(
    "{}\n\nProvide a brief, helpful summary of these search results. \
    Suggest what the user might want to do with these results. \
    If there are interesting patterns or insights, mention them. \
    Keep it concise (2-3 sentences).",
    context
);
```

### Adjusting AI Parameters

Modify the `AIOptions` in `generate_search_insights`:

```rust
let ai_options = AIOptions {
    prompt,
    model: None, // Use default or specify: Some("gpt-4".to_string())
    temperature: Some(0.7), // 0.0-1.0 (lower = more focused)
    max_tokens: Some(200), // Maximum response length
    top_p: None,
    frequency_penalty: None,
    presence_penalty: None,
};
```

### Styling

The AI insights panel can be customized via CSS in `search.component.ts`:

```css
.ai-insights-container {
  background: linear-gradient(...);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 12px;
  /* Add your custom styles */
}
```

## Troubleshooting

### AI Insights Not Appearing

1. **Check API Key**: Ensure environment variable is set correctly
2. **Verify Provider**: Check console for provider initialization errors
3. **Network Issues**: AI requires internet connection for API calls
4. **Rate Limits**: Check if you've exceeded API rate limits

### Console Commands

Debug AI integration:

```javascript
// Check if AI insights are enabled
console.log('AI insights:', document.querySelector('view-search').showAiInsights)

// Manually trigger AI insights (requires search results)
document.querySelector('view-search')._fetchAIInsights('test query', results)
```

### Common Errors

**"AI insights are currently unavailable"**
- No API key configured
- Invalid API key
- Network connectivity issues
- API rate limit exceeded

**Insights Load Slowly**
- First request may take 2-3 seconds
- Subsequent requests are usually faster
- Check network latency to AI provider

## Future Enhancements

Potential improvements for future versions:

1. **Streaming Responses**: Show insights as they're generated
2. **Follow-up Questions**: Allow users to ask questions about results
3. **Custom Prompts**: Let users customize the type of insights
4. **Offline Mode**: Cache common insights for offline use
5. **Multi-language Support**: Generate insights in user's language
6. **Learning**: Improve suggestions based on user behavior
7. **Voice Insights**: Text-to-speech for accessibility

## Contributing

To contribute improvements to AI search integration:

1. Fork the repository
2. Create a feature branch
3. Make your changes to `src-tauri/src/search.rs` and/or `src/views/search/search.component.ts`
4. Test with multiple AI providers
5. Submit a pull request with clear description

## License

This feature is part of Fleet Chat and follows the same MIT or Apache-2.0 dual license.

## Credits

- Built with [Rig](https://github.com/0xPlaygrounds/rig) - A Rust library for building LLM-powered applications
- Supports OpenAI, Anthropic, and Google Gemini AI models
- UI design inspired by modern AI assistants and launchers
