# AI Provider Usage Guide

This guide explains how to configure and use different AI providers with the A2UI agent service.

## Supported Providers

The application supports two AI providers:

1. **OpenAI** - GPT-4, GPT-3.5-turbo, and other OpenAI models
2. **Google Gemini** - Gemini 2.5 Flash and other Gemini models

## Configuration

### Option 1: Environment Variables (Recommended)

Set one of the following environment variables:

```bash
# For OpenAI
export OPENAI_API_KEY=your-openai-api-key-here

# For Google Gemini
export GEMINI_API_KEY=your-gemini-api-key-here
```

### Option 2: .env File

Create a `.env` file in the project root:

```env
# Use OpenAI
OPENAI_API_KEY=sk-...

# Or use Gemini
GEMINI_API_KEY=AIza...
```

## Provider Selection

The system automatically selects the provider based on available API keys:

1. **Priority 1**: OpenAI (if `OPENAI_API_KEY` is set)
2. **Priority 2**: Gemini (if `GEMINI_API_KEY` is set and OpenAI not available)

If both keys are set, OpenAI will be used by default.

## Default Models

Each provider uses a default model:

- **OpenAI**: `gpt-4`
- **Gemini**: `gemini-2.5-flash`

## API Key Setup

### Getting an OpenAI API Key

1. Visit [OpenAI Platform](https://platform.openai.com)
2. Sign up or log in to your account
3. Navigate to [API Keys](https://platform.openai.com/api-keys)
4. Click "Create new secret key"
5. Copy the key and set it as `OPENAI_API_KEY`

### Getting a Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Select or create a Google Cloud project
5. Copy the key and set it as `GEMINI_API_KEY`

## Usage Examples

### Starting the Application

With OpenAI:
```bash
export OPENAI_API_KEY=sk-your-key-here
pnpm dev
```

With Gemini:
```bash
export GEMINI_API_KEY=AIza-your-key-here
pnpm dev
```

### Switching Providers

To switch from one provider to another:

1. Stop the application
2. Set the new API key environment variable
3. Unset or remove the old API key
4. Restart the application

Example:
```bash
# Switch from Gemini to OpenAI
unset GEMINI_API_KEY
export OPENAI_API_KEY=sk-your-key-here
pnpm dev
```

## Verification

To verify which provider is being used, check the application logs on startup. You should see a message indicating which AI provider was initialized.

## Troubleshooting

### Error: "No AI provider available"

This means neither API key is set. Make sure you have set either `OPENAI_API_KEY` or `GEMINI_API_KEY`.

### Error: "API call failed with status 401"

Your API key is invalid or has expired. Check that:
- The key is correct and complete
- The key has not been revoked
- Your account has API access enabled

### Error: "API call failed with status 429"

You've exceeded the rate limit or quota. For OpenAI, check your usage limits. For Gemini, check your quota in Google Cloud Console.

## Architecture

The provider abstraction is implemented in `src-tauri/src/a2ui/provider.rs`:

```rust
// Example: The AIProvider trait
pub trait AIProvider: Send + Sync {
    async fn chat_completion(&self, request: ChatRequest) -> Result<ChatResponse, ProviderError>;
    fn provider_name(&self) -> &str;
    fn default_model(&self) -> &str;
}
```

Both OpenAI and Gemini providers implement this trait, ensuring a consistent interface regardless of the underlying service.

## Advanced Configuration

### Custom Model Selection

To use a different model than the default, you'll need to modify the provider initialization in `src-tauri/src/axum_app.rs`:

```rust
// Example for using GPT-3.5-turbo instead of GPT-4
let provider = Arc::new(OpenAIProvider::with_model(
    api_key,
    "gpt-3.5-turbo".to_string()
)) as Arc<dyn AIProvider>;
```

### Adding a New Provider

To add support for another AI provider:

1. Implement the `AIProvider` trait in `provider.rs`
2. Add the provider initialization logic in `axum_app.rs`
3. Add corresponding environment variable handling
4. Update this documentation

## Performance Considerations

- **OpenAI**: Generally faster response times, higher cost
- **Gemini**: Good balance of speed and cost, free tier available

Choose the provider based on your needs and budget.

## Security Notes

- Never commit API keys to version control
- Use environment variables or secure vaults for production
- Rotate API keys regularly
- Monitor usage to detect unauthorized access
- Keep API keys in `.env` files that are in `.gitignore`
