/**
 * Rig AI Agent
 *
 * Provides AI functionality using rig-core library
 * Supports multiple providers: OpenAI, Anthropic, Google Gemini, DeepSeek, OpenRouter
 *
 * Refactored to use AgentBuilder::new() pattern uniformly across all providers
 */
use futures::stream::{Stream, StreamExt};
use reqwest::Client;
use rig::{
    agent::{AgentBuilder, MultiTurnStreamItem},
    client::{CompletionClient, EmbeddingsClient, ProviderClient},
    completion::{Chat, Message, Prompt, PromptError},
    providers::{anthropic, deepseek, gemini, openai, openrouter},
    streaming::{StreamedAssistantContent, StreamingPrompt},
};
use serde::{Deserialize, Serialize};
use std::env;
use std::pin::Pin;
use thiserror::Error;

// Import the EmbeddingModel trait for use in the embeddings method
use rig::embeddings::{EmbeddingError, EmbeddingModel};

// Import the correct CompletionModel types
use rig::providers::openai::responses_api::ResponsesCompletionModel;

// ============================================================================
// Types
// ============================================================================

/// Enum to wrap different provider completion models
enum ProviderCompletionModel {
    OpenAI(ResponsesCompletionModel),
    Anthropic(rig::providers::anthropic::completion::CompletionModel),
    Gemini(rig::providers::gemini::completion::CompletionModel),
    DeepSeek(rig::providers::deepseek::CompletionModel),
    OpenRouter(rig::providers::openrouter::completion::CompletionModel),
}

// ============================================================================
// API Model Fetching Types
// ============================================================================

/// OpenAI models API response
#[derive(Debug, Deserialize)]
struct OpenAIModelsResponse {
    data: Vec<OpenAIModel>,
}

#[derive(Debug, Deserialize)]
struct OpenAIModel {
    id: String,
    #[serde(default)]
    created: u64,
    #[serde(default)]
    owned_by: String,
}

/// DeepSeek models API response (same format as OpenAI)
type DeepSeekModelsResponse = OpenAIModelsResponse;

/// OpenRouter models API response
#[derive(Debug, Deserialize)]
struct OpenRouterModelsResponse {
    data: Vec<OpenRouterModel>,
}

#[derive(Debug, Deserialize)]
struct OpenRouterModel {
    id: String,
    name: Option<String>,
    #[serde(default)]
    context_length: Option<usize>,
    #[serde(default)]
    description: Option<String>,
}

// Helper to create HTTP client with proper headers
fn create_http_client() -> Result<Client, RigAgentError> {
    Client::builder()
        .build()
        .map_err(|e| RigAgentError::Other(format!("Failed to create HTTP client: {}", e)))
}

// ============================================================================
// Rig Agent
// ============================================================================

pub struct RigAgent {
    provider: AIProvider,
    default_model: String,
}

impl RigAgent {
    pub fn new() -> Result<Self, RigAgentError> {
        let provider = AIProvider::from_env();
        let default_model = provider.default_model();

        // Verify that we have the required API key
        Self::verify_api_key(&provider)?;

        Ok(Self {
            provider,
            default_model,
        })
    }

    pub fn with_provider(provider: AIProvider) -> Result<Self, RigAgentError> {
        let default_model = provider.default_model();

        // Verify that we have the required API key for this provider
        Self::verify_api_key(&provider)?;

        Ok(Self {
            provider,
            default_model,
        })
    }

    fn verify_api_key(provider: &AIProvider) -> Result<(), RigAgentError> {
        match provider {
            AIProvider::OpenAI => {
                env::var("OPENAI_API_KEY").map_err(|e| RigAgentError::ApiKeyNotFound(e.to_string()))?;
            }
            AIProvider::Anthropic => {
                env::var("ANTHROPIC_API_KEY").map_err(|e| RigAgentError::ApiKeyNotFound(e.to_string()))?;
            }
            AIProvider::Gemini => {
                env::var("GEMINI_API_KEY").map_err(|e| RigAgentError::ApiKeyNotFound(e.to_string()))?;
            }
            AIProvider::DeepSeek => {
                env::var("DEEPSEEK_API_KEY").map_err(|e| RigAgentError::ApiKeyNotFound(e.to_string()))?;
            }
            AIProvider::OpenRouter => {
                env::var("OPENROUTER_API_KEY").map_err(|e| RigAgentError::ApiKeyNotFound(e.to_string()))?;
            }
            AIProvider::Ollama => {
                // Ollama doesn't need an API key
            }
        }
        Ok(())
    }

    /// Resolve provider from request options, fallback to instance provider
    fn resolve_provider(&self, options: &AIOptions) -> AIProvider {
        if let Some(provider_str) = &options.provider {
            match provider_str.to_lowercase().as_str() {
                "openai" => AIProvider::OpenAI,
                "anthropic" | "claude" => AIProvider::Anthropic,
                "gemini" | "google" => AIProvider::Gemini,
                "deepseek" => AIProvider::DeepSeek,
                "openrouter" => AIProvider::OpenRouter,
                "ollama" => AIProvider::Ollama,
                _ => {
                    eprintln!(
                        "[resolve_provider] Unknown provider '{}', using instance provider",
                        provider_str
                    );
                    self.provider.clone()
                }
            }
        } else {
            self.provider.clone()
        }
    }

    fn resolve_model(&self, options: &AIOptions) -> (AIProvider, String) {
        let provider = self.resolve_provider(options);
        let default_model = provider.default_model();
        let model = options.model.clone().unwrap_or(default_model);
        (provider, model)
    }

    /// Get the completion model for the specified provider
    fn get_completion_model(
        &self,
        provider: &AIProvider,
        model: &str,
    ) -> Result<ProviderCompletionModel, RigAgentError> {
        match provider {
            AIProvider::OpenAI => {
                let client = openai::Client::from_env();
                Ok(ProviderCompletionModel::OpenAI(client.completion_model(model)))
            }
            AIProvider::Anthropic => {
                let client = anthropic::Client::from_env();
                Ok(ProviderCompletionModel::Anthropic(client.completion_model(model)))
            }
            AIProvider::Gemini => {
                let client = gemini::Client::from_env();
                Ok(ProviderCompletionModel::Gemini(client.completion_model(model)))
            }
            AIProvider::DeepSeek => {
                println!("[get_completion_model] Creating DeepSeek client with model: {}", model);
                let api_key = env::var("DEEPSEEK_API_KEY").map_err(|e| {
                    eprintln!("[get_completion_model] DEEPSEEK_API_KEY not found: {}", e);
                    RigAgentError::ApiKeyNotFound(e.to_string())
                })?;
                println!(
                    "[get_completion_model] DEEPSEEK_API_KEY found (length: {})",
                    api_key.len()
                );

                let client = deepseek::Client::new(&api_key).map_err(|e| {
                    eprintln!("[get_completion_model] Failed to create DeepSeek client: {}", e);
                    RigAgentError::Other(format!("Failed to create DeepSeek client: {}", e))
                })?;

                println!("[get_completion_model] DeepSeek client created successfully, getting completion model");
                let completion_model = client.completion_model(model);
                println!("[get_completion_model] DeepSeek completion model created");
                Ok(ProviderCompletionModel::DeepSeek(completion_model))
            }
            AIProvider::OpenRouter => {
                let client = openrouter::Client::from_env();
                Ok(ProviderCompletionModel::OpenRouter(client.completion_model(model)))
            }
            AIProvider::Ollama => Err(RigAgentError::NotSupported("Ollama not yet implemented".to_string())),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIOptions {
    pub prompt: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provider: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_tokens: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub top_p: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub frequency_penalty: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub presence_penalty: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIResponse {
    pub text: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub usage: Option<TokenUsage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub finish_reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenUsage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbeddingRequest {
    pub text: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModerationRequest {
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModerationResponse {
    pub flagged: bool,
    pub categories: std::collections::HashMap<String, bool>,
    pub category_scores: std::collections::HashMap<String, f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageGenerationRequest {
    pub prompt: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quality: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub n: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageAnalysisRequest {
    pub image_url: String,
    pub prompt: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenCountRequest {
    pub text: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelInfo {
    pub id: String,
    pub name: String,
    pub description: String,
    pub context_length: usize,
}

#[derive(Debug, Clone, Copy)]
pub enum AIProvider {
    OpenAI,
    Anthropic,
    Gemini,
    Ollama,
    DeepSeek,
    OpenRouter,
}

impl AIProvider {
    pub fn from_env() -> Self {
        if env::var("OPENAI_API_KEY").is_ok() {
            AIProvider::OpenAI
        } else if env::var("ANTHROPIC_API_KEY").is_ok() {
            AIProvider::Anthropic
        } else if env::var("GEMINI_API_KEY").is_ok() {
            AIProvider::Gemini
        } else if env::var("DEEPSEEK_API_KEY").is_ok() {
            AIProvider::DeepSeek
        } else if env::var("OPENROUTER_API_KEY").is_ok() {
            AIProvider::OpenRouter
        } else {
            // Default to OpenAI - will fail if no key
            AIProvider::OpenAI
        }
    }

    pub fn default_model(&self) -> String {
        match self {
            AIProvider::OpenAI => "gpt-4o-mini".to_string(),
            AIProvider::Anthropic => "claude-3-5-sonnet-20241022".to_string(),
            AIProvider::Gemini => "gemini-2.0-flash-exp".to_string(),
            AIProvider::Ollama => "llama3.2".to_string(),
            AIProvider::DeepSeek => "deepseek-chat".to_string(),
            AIProvider::OpenRouter => "openrouter/auto".to_string(),
        }
    }

    pub fn api_base(&self) -> Option<String> {
        match self {
            AIProvider::DeepSeek => Some("https://api.deepseek.com/v1".to_string()),
            AIProvider::OpenRouter => Some("https://openrouter.ai/api/v1".to_string()),
            _ => None,
        }
    }
}

#[derive(Debug, Error)]
pub enum RigAgentError {
    #[error("No AI provider configured")]
    ProviderNotConfigured,
    #[error("API key not found: {0}")]
    ApiKeyNotFound(String),
    #[error("Invalid model: {0}")]
    InvalidModel(String),
    #[error("Feature not supported: {0}")]
    NotSupported(String),
    #[error("Request failed: {0}")]
    RequestFailed(String),
    #[error("Prompt error: {0}")]
    PromptError(#[from] PromptError),
    #[error("Embedding error: {0}")]
    EmbeddingError(#[from] EmbeddingError),
    #[error("HTTP error: {0}")]
    HttpError(String),
    #[error("JSON error: {0}")]
    JsonError(#[from] serde_json::Error),
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
    #[error("Other error: {0}")]
    Other(String),
}

impl From<env::VarError> for RigAgentError {
    fn from(err: env::VarError) -> Self {
        RigAgentError::ApiKeyNotFound(err.to_string())
    }
}

// ========================================================================
// Rig Agent
// ============================================================================

impl RigAgent {
    // ========================================================================
    // Text Generation
    // ========================================================================

    /// Generate text using AgentBuilder::new() pattern
    pub async fn generate(&self, options: AIOptions) -> Result<AIResponse, RigAgentError> {
        let (provider, model) = self.resolve_model(&options);
        let temperature = options.temperature.map(|t| t as f64);
        let max_tokens = options.max_tokens.map(|t| t as u64);

        // Get completion model for specified provider
        let completion_model = self.get_completion_model(&provider, &model)?;

        // Build agent and call prompt
        let text = match completion_model {
            ProviderCompletionModel::OpenAI(model) => {
                let mut builder = AgentBuilder::new(model);
                if let Some(temp) = temperature {
                    builder = builder.temperature(temp);
                }
                if let Some(tokens) = max_tokens {
                    builder = builder.max_tokens(tokens);
                }
                builder.build().prompt(&options.prompt).await?
            }
            ProviderCompletionModel::Anthropic(model) => {
                // Anthropic requires max_tokens
                let tokens = max_tokens.unwrap_or(4096);
                let mut builder = AgentBuilder::new(model).max_tokens(tokens);
                if let Some(temp) = temperature {
                    builder = builder.temperature(temp);
                }
                builder.build().prompt(&options.prompt).await?
            }
            ProviderCompletionModel::Gemini(model) => {
                let mut builder = AgentBuilder::new(model);
                if let Some(temp) = temperature {
                    builder = builder.temperature(temp);
                }
                if let Some(tokens) = max_tokens {
                    builder = builder.max_tokens(tokens);
                }
                builder.build().prompt(&options.prompt).await?
            }
            ProviderCompletionModel::DeepSeek(model) => {
                println!("[generate] Building DeepSeek agent for prompt generation");
                let mut builder = AgentBuilder::new(model);
                if let Some(temp) = temperature {
                    println!("[generate] Setting temperature: {}", temp);
                    builder = builder.temperature(temp);
                }
                if let Some(tokens) = max_tokens {
                    println!("[generate] Setting max_tokens: {}", tokens);
                    builder = builder.max_tokens(tokens);
                }
                builder.build().prompt(&options.prompt).await?
            }
            ProviderCompletionModel::OpenRouter(model) => {
                let mut builder = AgentBuilder::new(model);
                if let Some(temp) = temperature {
                    builder = builder.temperature(temp);
                }
                if let Some(tokens) = max_tokens {
                    builder = builder.max_tokens(tokens);
                }
                builder.build().prompt(&options.prompt).await?
            }
        };

        Ok(AIResponse {
            text,
            model: Some(model),
            usage: None,
            finish_reason: Some("stop".to_string()),
        })
    }

    /// Stream text generation using rig's built-in streaming support
    /// Returns a stream of text chunks
    pub fn generate_stream(
        &self,
        options: AIOptions,
    ) -> Pin<Box<dyn Stream<Item = Result<String, RigAgentError>> + Send>> {
        use tokio::sync::mpsc;
        use tokio_stream::wrappers::ReceiverStream;

        let (provider, model) = self.resolve_model(&options);
        let prompt = options.prompt.clone();
        let temperature = options.temperature.map(|t| t as f64);
        let max_tokens = options.max_tokens.map(|t| t as u64);

        eprintln!("[generate_stream] ========== START ==========");
        eprintln!("[generate_stream] provider: {:?}", provider);
        eprintln!("[generate_stream] model: {}", model);
        eprintln!("[generate_stream] prompt: {}", prompt);
        eprintln!("[generate_stream] temperature: {:?}", temperature);
        eprintln!("[generate_stream] max_tokens: {:?}", max_tokens);
        eprintln!("[generate_stream] =============================");

        // Create a channel for sending chunks
        let (tx, rx) = mpsc::channel(100);

        // Spawn a task to handle streaming
        tokio::spawn(async move {
            let result: Result<(), RigAgentError> = async move {
                // Get completion model for current provider
                let completion_model = match provider {
                    AIProvider::OpenAI => {
                        let client = openai::Client::from_env();
                        ProviderCompletionModel::OpenAI(client.completion_model(&model))
                    }
                    AIProvider::Anthropic => {
                        let client = anthropic::Client::from_env();
                        ProviderCompletionModel::Anthropic(client.completion_model(&model))
                    }
                    AIProvider::Gemini => {
                        let client = gemini::Client::from_env();
                        ProviderCompletionModel::Gemini(client.completion_model(&model))
                    }
                    AIProvider::DeepSeek => {
                        println!("[generate_stream] Creating DeepSeek client with model: {}", model);
                        let api_key = match env::var("DEEPSEEK_API_KEY") {
                            Ok(key) => {
                                println!("[generate_stream] DEEPSEEK_API_KEY found (length: {})", key.len());
                                key
                            }
                            Err(e) => {
                                eprintln!("[generate_stream] DEEPSEEK_API_KEY not found: {}", e);
                                let _ = tx.send(Err(RigAgentError::ApiKeyNotFound(e.to_string()))).await;
                                return Ok(());
                            }
                        };

                        let client = match deepseek::Client::new(&api_key) {
                            Ok(client) => {
                                println!("[generate_stream] DeepSeek client created successfully");
                                client
                            }
                            Err(e) => {
                                eprintln!("[generate_stream] Failed to create DeepSeek client: {}", e);
                                let _ = tx
                                    .send(Err(RigAgentError::Other(format!(
                                        "Failed to create DeepSeek client: {}",
                                        e
                                    ))))
                                    .await;
                                return Ok(());
                            }
                        };

                        let completion_model = client.completion_model(&model);
                        println!("[generate_stream] DeepSeek completion model created");
                        ProviderCompletionModel::DeepSeek(completion_model)
                    }
                    AIProvider::OpenRouter => {
                        let client = openrouter::Client::from_env();
                        ProviderCompletionModel::OpenRouter(client.completion_model(&model))
                    }
                    AIProvider::Ollama => {
                        let _ = tx
                            .send(Err(RigAgentError::NotSupported(
                                "Ollama not yet implemented".to_string(),
                            )))
                            .await;
                        return Ok(());
                    }
                };

                // Build agent and stream
                match completion_model {
                    ProviderCompletionModel::OpenAI(model) => {
                        let mut builder = AgentBuilder::new(model);
                        if let Some(temp) = temperature {
                            builder = builder.temperature(temp);
                        }
                        if let Some(tokens) = max_tokens {
                            builder = builder.max_tokens(tokens);
                        }
                        let agent = std::sync::Arc::new(builder.build());

                        let mut stream = agent.stream_prompt(&prompt).await;
                        while let Some(item) = stream.next().await {
                            match item {
                                Ok(chunk) => match chunk {
                                    MultiTurnStreamItem::StreamAssistantItem(StreamedAssistantContent::Text(text)) => {
                                        let _ = tx.send(Ok(text.text)).await;
                                    }
                                    MultiTurnStreamItem::FinalResponse(_) => {
                                        break;
                                    }
                                    _ => {}
                                },
                                Err(e) => {
                                    let _ = tx.send(Err(RigAgentError::Other(e.to_string()))).await;
                                    break;
                                }
                            }
                        }
                    }
                    ProviderCompletionModel::Anthropic(model) => {
                        let tokens = max_tokens.unwrap_or(4096);
                        let mut builder = AgentBuilder::new(model).max_tokens(tokens);
                        if let Some(temp) = temperature {
                            builder = builder.temperature(temp);
                        }
                        let agent = std::sync::Arc::new(builder.build());

                        let mut stream = agent.stream_prompt(&prompt).await;
                        while let Some(item) = stream.next().await {
                            match item {
                                Ok(chunk) => match chunk {
                                    MultiTurnStreamItem::StreamAssistantItem(StreamedAssistantContent::Text(text)) => {
                                        let _ = tx.send(Ok(text.text)).await;
                                    }
                                    MultiTurnStreamItem::FinalResponse(_) => {
                                        break;
                                    }
                                    _ => {}
                                },
                                Err(e) => {
                                    let _ = tx.send(Err(RigAgentError::Other(e.to_string()))).await;
                                    break;
                                }
                            }
                        }
                    }
                    ProviderCompletionModel::Gemini(model) => {
                        let mut builder = AgentBuilder::new(model);
                        if let Some(temp) = temperature {
                            builder = builder.temperature(temp);
                        }
                        if let Some(tokens) = max_tokens {
                            builder = builder.max_tokens(tokens);
                        }
                        let agent = std::sync::Arc::new(builder.build());

                        let mut stream = agent.stream_prompt(&prompt).await;
                        while let Some(item) = stream.next().await {
                            match item {
                                Ok(chunk) => match chunk {
                                    MultiTurnStreamItem::StreamAssistantItem(StreamedAssistantContent::Text(text)) => {
                                        let _ = tx.send(Ok(text.text)).await;
                                    }
                                    MultiTurnStreamItem::FinalResponse(_) => {
                                        break;
                                    }
                                    _ => {}
                                },
                                Err(e) => {
                                    let _ = tx.send(Err(RigAgentError::Other(e.to_string()))).await;
                                    break;
                                }
                            }
                        }
                    }
                    ProviderCompletionModel::DeepSeek(model) => {
                        println!("[generate_stream] Building DeepSeek agent");
                        let mut builder = AgentBuilder::new(model);
                        if let Some(temp) = temperature {
                            println!("[generate_stream] Setting temperature: {}", temp);
                            builder = builder.temperature(temp);
                        }
                        if let Some(tokens) = max_tokens {
                            println!("[generate_stream] Setting max_tokens: {}", tokens);
                            builder = builder.max_tokens(tokens);
                        }
                        let agent = std::sync::Arc::new(builder.build());
                        println!("[generate_stream] DeepSeek agent built, calling stream_prompt");

                        let mut stream = agent.stream_prompt(&prompt).await;
                        println!("[generate_stream] DeepSeek stream created, starting to consume");
                        let mut chunk_count = 0;

                        while let Some(item) = stream.next().await {
                            chunk_count += 1;
                            println!(
                                "[generate_stream] DeepSeek chunk #{}, item type: {:?}",
                                chunk_count,
                                std::mem::discriminant(&item)
                            );

                            match item {
                                Ok(chunk) => match chunk {
                                    MultiTurnStreamItem::StreamAssistantItem(StreamedAssistantContent::Text(text)) => {
                                        println!("[generate_stream] DeepSeek text chunk: '{}'", text.text);
                                        if tx.send(Ok(text.text)).await.is_err() {
                                            eprintln!("[generate_stream] Failed to send chunk, channel closed");
                                            break;
                                        }
                                    }
                                    MultiTurnStreamItem::FinalResponse(_) => {
                                        println!("[generate_stream] DeepSeek FinalResponse received");
                                        break;
                                    }
                                    _ => {
                                        println!("[generate_stream] DeepSeek ignoring non-text chunk");
                                    }
                                },
                                Err(e) => {
                                    eprintln!("[generate_stream] DeepSeek stream error: {:?}", e);
                                    let _ = tx.send(Err(RigAgentError::Other(e.to_string()))).await;
                                    break;
                                }
                            }
                        }
                        println!("[generate_stream] DeepSeek stream ended, total chunks: {}", chunk_count);
                    }
                    ProviderCompletionModel::OpenRouter(model) => {
                        let mut builder = AgentBuilder::new(model);
                        if let Some(temp) = temperature {
                            builder = builder.temperature(temp);
                        }
                        if let Some(tokens) = max_tokens {
                            builder = builder.max_tokens(tokens);
                        }
                        let agent = std::sync::Arc::new(builder.build());

                        let mut stream = agent.stream_prompt(&prompt).await;
                        while let Some(item) = stream.next().await {
                            match item {
                                Ok(chunk) => match chunk {
                                    MultiTurnStreamItem::StreamAssistantItem(StreamedAssistantContent::Text(text)) => {
                                        let _ = tx.send(Ok(text.text)).await;
                                    }
                                    MultiTurnStreamItem::FinalResponse(_) => {
                                        break;
                                    }
                                    _ => {}
                                },
                                Err(e) => {
                                    let _ = tx.send(Err(RigAgentError::Other(e.to_string()))).await;
                                    break;
                                }
                            }
                        }
                    }
                }
                Ok(())
            }
            .await;

            let _ = result;
        });

        Box::pin(ReceiverStream::new(rx))
    }

    // ========================================================================
    // Chat
    // ========================================================================

    /// Chat using AgentBuilder::new() pattern
    pub async fn chat(
        &self,
        messages: Vec<ChatMessage>,
        options: Option<AIOptions>,
    ) -> Result<AIResponse, RigAgentError> {
        let default_options = options.unwrap_or_else(|| AIOptions {
            prompt: String::new(),
            provider: None,
            model: None,
            temperature: None,
            max_tokens: None,
            top_p: None,
            frequency_penalty: None,
            presence_penalty: None,
        });
        let (provider, model) = self.resolve_model(&default_options);
        let temperature = default_options.temperature.map(|t| t as f64);
        let max_tokens = default_options.max_tokens.map(|t| t as u64);

        // Convert ChatMessage to rig's Message format
        let rig_messages: Vec<Message> = messages
            .into_iter()
            .map(|msg| match msg.role.as_str() {
                "user" => Message::user(msg.content),
                "assistant" | "system" => Message::assistant(msg.content),
                _ => Message::user(msg.content),
            })
            .collect();

        // Get the last message as the prompt, and the rest as chat history
        let prompt_msg = rig_messages.last().cloned().unwrap_or_else(|| Message::user(""));
        let chat_history = if rig_messages.len() > 1 {
            rig_messages[..rig_messages.len() - 1].to_vec()
        } else {
            vec![]
        };

        // Get completion model for specified provider
        let completion_model = self.get_completion_model(&provider, &model)?;

        // Build agent and call chat
        let text = match completion_model {
            ProviderCompletionModel::OpenAI(model) => {
                let mut builder = AgentBuilder::new(model);
                if let Some(temp) = temperature {
                    builder = builder.temperature(temp);
                }
                if let Some(tokens) = max_tokens {
                    builder = builder.max_tokens(tokens);
                }
                builder.build().chat(prompt_msg, chat_history).await?
            }
            ProviderCompletionModel::Anthropic(model) => {
                let tokens = max_tokens.unwrap_or(4096);
                let mut builder = AgentBuilder::new(model).max_tokens(tokens);
                if let Some(temp) = temperature {
                    builder = builder.temperature(temp);
                }
                builder.build().chat(prompt_msg, chat_history).await?
            }
            ProviderCompletionModel::Gemini(model) => {
                let mut builder = AgentBuilder::new(model);
                if let Some(temp) = temperature {
                    builder = builder.temperature(temp);
                }
                if let Some(tokens) = max_tokens {
                    builder = builder.max_tokens(tokens);
                }
                builder.build().chat(prompt_msg, chat_history).await?
            }
            ProviderCompletionModel::DeepSeek(model) => {
                println!("[chat] Building DeepSeek agent for chat");
                let mut builder = AgentBuilder::new(model);
                if let Some(temp) = temperature {
                    println!("[chat] Setting temperature: {}", temp);
                    builder = builder.temperature(temp);
                }
                if let Some(tokens) = max_tokens {
                    println!("[chat] Setting max_tokens: {}", tokens);
                    builder = builder.max_tokens(tokens);
                }
                builder.build().chat(prompt_msg, chat_history).await?
            }
            ProviderCompletionModel::OpenRouter(model) => {
                let mut builder = AgentBuilder::new(model);
                if let Some(temp) = temperature {
                    builder = builder.temperature(temp);
                }
                if let Some(tokens) = max_tokens {
                    builder = builder.max_tokens(tokens);
                }
                builder.build().chat(prompt_msg, chat_history).await?
            }
        };

        Ok(AIResponse {
            text,
            model: Some(model),
            usage: None,
            finish_reason: Some("stop".to_string()),
        })
    }

    // ========================================================================
    // Embeddings
    // ========================================================================

    pub async fn embed(&self, text: String, model: Option<String>) -> Result<Vec<f32>, RigAgentError> {
        match self.provider {
            AIProvider::OpenAI => {
                let _ = env::var("OPENAI_API_KEY")
                    .map_err(|_| RigAgentError::ApiKeyNotFound("OPENAI_API_KEY".to_string()))?;
                let client = openai::Client::from_env();
                let model_name = model.unwrap_or_else(|| "text-embedding-3-small".to_string());
                let embedding_model = client.embedding_model(&model_name);
                let embedding = embedding_model.embed_text(&text).await?;
                // Convert Vec<f64> to Vec<f32>
                let vec_f32: Vec<f32> = embedding.vec.into_iter().map(|v| v as f32).collect();
                Ok(vec_f32)
            }
            _ => Err(RigAgentError::NotSupported(
                "Embeddings only supported for OpenAI".to_string(),
            )),
        }
    }

    // ========================================================================
    // Moderation
    // ========================================================================

    pub async fn moderate(&self, _content: String) -> Result<ModerationResponse, RigAgentError> {
        // For now, return a placeholder response
        Ok(ModerationResponse {
            flagged: false,
            categories: std::collections::HashMap::new(),
            category_scores: std::collections::HashMap::new(),
        })
    }

    // ========================================================================
    // Image Generation
    // ========================================================================

    pub async fn generate_image(&self, _request: ImageGenerationRequest) -> Result<Vec<String>, RigAgentError> {
        Err(RigAgentError::NotSupported(
            "Image generation not yet implemented".to_string(),
        ))
    }

    // ========================================================================
    // Image Analysis
    // ========================================================================

    pub async fn analyze_image(&self, request: ImageAnalysisRequest) -> Result<String, RigAgentError> {
        let prompt = format!("{} Image URL: {}", request.prompt, request.image_url);
        let model = request.model.as_ref().map(|m| m.as_str()).unwrap_or("gpt-4o");

        match self.provider {
            AIProvider::OpenAI => {
                let _ = env::var("OPENAI_API_KEY")
                    .map_err(|_| RigAgentError::ApiKeyNotFound("OPENAI_API_KEY".to_string()))?;
                let client = openai::Client::from_env();
                let agent = client.agent(model).build();
                let response = agent.prompt(&prompt).await?;
                Ok(response)
            }
            AIProvider::Gemini => {
                let _ = env::var("GEMINI_API_KEY")
                    .map_err(|_| RigAgentError::ApiKeyNotFound("GEMINI_API_KEY".to_string()))?;
                let client = gemini::Client::from_env();
                let model = request
                    .model
                    .as_ref()
                    .map(|m| m.as_str())
                    .unwrap_or("gemini-2.0-flash-exp");
                let agent = client.agent(model).build();
                let response = agent.prompt(&prompt).await?;
                Ok(response)
            }
            _ => Err(RigAgentError::NotSupported(
                "Image analysis not supported for this provider".to_string(),
            )),
        }
    }

    // ========================================================================
    // Token Counting
    // ========================================================================

    pub async fn count_tokens(&self, text: String, _model: Option<String>) -> Result<u32, RigAgentError> {
        // Simple approximation: ~4 characters per token
        let approx_tokens = (text.len() as f32 / 4.0).ceil() as u32;
        Ok(approx_tokens)
    }

    // ========================================================================
    // Model Information
    // ========================================================================

    /// Fetch available models from the provider's API
    ///
    /// This function makes actual API calls to fetch the model list:
    /// - OpenAI: https://api.openai.com/v1/models
    /// - DeepSeek: https://api.deepseek.com/v1/models
    /// - OpenRouter: https://openrouter.ai/api/v1/models
    /// - Anthropic, Gemini: Return known model lists (no public API)
    /// - Ollama: Return known models (would require local API access)
    pub async fn get_models(&self) -> Result<Vec<ModelInfo>, RigAgentError> {
        let client = create_http_client()?;

        match self.provider {
            AIProvider::OpenAI => {
                let api_key = env::var("OPENAI_API_KEY").map_err(|e| RigAgentError::ApiKeyNotFound(e.to_string()))?;

                let response = client
                    .get("https://api.openai.com/v1/models")
                    .header("Authorization", format!("Bearer {}", api_key))
                    .send()
                    .await
                    .map_err(|e| RigAgentError::HttpError(format!("OpenAI API request failed: {}", e)))?;

                if !response.status().is_success() {
                    let status = response.status();
                    let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
                    return Err(RigAgentError::HttpError(format!(
                        "OpenAI API returned error: {} - {}",
                        status, error_text
                    )));
                }

                let models_response: OpenAIModelsResponse = response
                    .json()
                    .await
                    .map_err(|e| RigAgentError::Other(format!("Failed to parse OpenAI models response: {}", e)))?;

                // Filter and convert to ModelInfo, only include chat models
                let models: Vec<ModelInfo> = models_response
                    .data
                    .into_iter()
                    .filter(|m| {
                        // Filter for GPT models
                        m.id.starts_with("gpt-") || m.id.starts_with("o1-") || m.id == "chatgpt-4o-latest"
                    })
                    .map(|m| {
                        let (name, description, context_length) = Self::describe_openai_model(&m.id);
                        ModelInfo {
                            id: m.id.clone(),
                            name,
                            description,
                            context_length,
                        }
                    })
                    .collect();

                if models.is_empty() {
                    // Fallback to known models if API returns empty
                    return Ok(Self::get_known_openai_models());
                }

                Ok(models)
            }
            AIProvider::Anthropic => {
                // Anthropic doesn't have a public models API, return known models
                Ok(Self::get_known_anthropic_models())
            }
            AIProvider::Gemini => {
                // Gemini doesn't have a public models API, return known models
                Ok(Self::get_known_gemini_models())
            }
            AIProvider::DeepSeek => {
                let api_key = env::var("DEEPSEEK_API_KEY").map_err(|e| RigAgentError::ApiKeyNotFound(e.to_string()))?;

                let response = client
                    .get("https://api.deepseek.com/v1/models")
                    .header("Authorization", format!("Bearer {}", api_key))
                    .send()
                    .await
                    .map_err(|e| RigAgentError::HttpError(format!("DeepSeek API request failed: {}", e)))?;

                if !response.status().is_success() {
                    let status = response.status();
                    let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
                    return Err(RigAgentError::HttpError(format!(
                        "DeepSeek API returned error: {} - {}",
                        status, error_text
                    )));
                }

                let models_response: DeepSeekModelsResponse = response
                    .json()
                    .await
                    .map_err(|e| RigAgentError::Other(format!("Failed to parse DeepSeek models response: {}", e)))?;

                let models: Vec<ModelInfo> = models_response
                    .data
                    .into_iter()
                    .map(|m| {
                        let (name, description, context_length) = Self::describe_deepseek_model(&m.id);
                        ModelInfo {
                            id: m.id.clone(),
                            name,
                            description,
                            context_length,
                        }
                    })
                    .collect();

                if models.is_empty() {
                    return Ok(Self::get_known_deepseek_models());
                }

                Ok(models)
            }
            AIProvider::OpenRouter => {
                let api_key =
                    env::var("OPENROUTER_API_KEY").map_err(|e| RigAgentError::ApiKeyNotFound(e.to_string()))?;

                let response = client
                    .get("https://openrouter.ai/api/v1/models")
                    .header("Authorization", format!("Bearer {}", api_key))
                    .send()
                    .await
                    .map_err(|e| RigAgentError::HttpError(format!("OpenRouter API request failed: {}", e)))?;

                if !response.status().is_success() {
                    let status = response.status();
                    let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
                    return Err(RigAgentError::HttpError(format!(
                        "OpenRouter API returned error: {} - {}",
                        status, error_text
                    )));
                }

                let models_response: OpenRouterModelsResponse = response
                    .json()
                    .await
                    .map_err(|e| RigAgentError::Other(format!("Failed to parse OpenRouter models response: {}", e)))?;

                let models: Vec<ModelInfo> = models_response
                    .data
                    .into_iter()
                    .map(|m| ModelInfo {
                        id: m.id.clone(),
                        name: m.name.unwrap_or_else(|| m.id.clone()),
                        description: m.description.unwrap_or_else(|| {
                            let provider = m.id.split('/').next().unwrap_or("openrouter");
                            format!("Model via {}", provider)
                        }),
                        context_length: m.context_length.unwrap_or(128000),
                    })
                    .collect();

                if models.is_empty() {
                    return Ok(Self::get_known_openrouter_models());
                }

                Ok(models)
            }
            AIProvider::Ollama => {
                // Ollama would require local API access, return known models for now
                Ok(Self::get_known_ollama_models())
            }
        }
    }

    // Helper functions to describe models
    fn describe_openai_model(id: &str) -> (String, String, usize) {
        match id {
            "gpt-4o" | "chatgpt-4o-latest" => (
                "GPT-4 Omni".to_string(),
                "OpenAI's most advanced multimodal model".to_string(),
                128000,
            ),
            "gpt-4o-mini" => (
                "GPT-4 Omni Mini".to_string(),
                "Faster, cheaper version of GPT-4o".to_string(),
                128000,
            ),
            "gpt-4-turbo" | "gpt-4-turbo-2024-04-09" => (
                "GPT-4 Turbo".to_string(),
                "High-intelligence model with vision capabilities".to_string(),
                128000,
            ),
            "gpt-4" => (
                "GPT-4".to_string(),
                "OpenAI's previous flagship model".to_string(),
                8192,
            ),
            "gpt-3.5-turbo" => (
                "GPT-3.5 Turbo".to_string(),
                "Fast, efficient model for most tasks".to_string(),
                16385,
            ),
            "o1-preview" => (
                "OpenAI o1 Preview".to_string(),
                "OpenAI's reasoning model".to_string(),
                128000,
            ),
            "o1-mini" => (
                "OpenAI o1 Mini".to_string(),
                "OpenAI's fast reasoning model".to_string(),
                128000,
            ),
            _ => (id.to_string(), format!("OpenAI model: {}", id), 128000),
        }
    }

    fn describe_deepseek_model(id: &str) -> (String, String, usize) {
        match id {
            "deepseek-chat" => (
                "DeepSeek Chat".to_string(),
                "DeepSeek's advanced chat model".to_string(),
                128000,
            ),
            "deepseek-coder" => (
                "DeepSeek Coder".to_string(),
                "DeepSeek's code-specialized model".to_string(),
                128000,
            ),
            _ => (id.to_string(), format!("DeepSeek model: {}", id), 128000),
        }
    }

    // Fallback known model lists
    fn get_known_openai_models() -> Vec<ModelInfo> {
        vec![
            ModelInfo {
                id: "gpt-4o".to_string(),
                name: "GPT-4 Omni".to_string(),
                description: "OpenAI's most advanced multimodal model".to_string(),
                context_length: 128000,
            },
            ModelInfo {
                id: "gpt-4o-mini".to_string(),
                name: "GPT-4 Omni Mini".to_string(),
                description: "Faster, cheaper version of GPT-4o".to_string(),
                context_length: 128000,
            },
            ModelInfo {
                id: "gpt-4-turbo".to_string(),
                name: "GPT-4 Turbo".to_string(),
                description: "High-intelligence model with vision capabilities".to_string(),
                context_length: 128000,
            },
            ModelInfo {
                id: "gpt-3.5-turbo".to_string(),
                name: "GPT-3.5 Turbo".to_string(),
                description: "Fast, efficient model for most tasks".to_string(),
                context_length: 16385,
            },
        ]
    }

    fn get_known_anthropic_models() -> Vec<ModelInfo> {
        vec![
            ModelInfo {
                id: "claude-3-5-sonnet-20241022".to_string(),
                name: "Claude 3.5 Sonnet".to_string(),
                description: "Most intelligent model for complex tasks".to_string(),
                context_length: 200000,
            },
            ModelInfo {
                id: "claude-3-5-haiku-20241022".to_string(),
                name: "Claude 3.5 Haiku".to_string(),
                description: "Fastest model for simple tasks".to_string(),
                context_length: 200000,
            },
            ModelInfo {
                id: "claude-3-opus-20240229".to_string(),
                name: "Claude 3 Opus".to_string(),
                description: "Powerful model for nuanced tasks".to_string(),
                context_length: 200000,
            },
        ]
    }

    fn get_known_gemini_models() -> Vec<ModelInfo> {
        vec![
            ModelInfo {
                id: "gemini-2.0-flash-exp".to_string(),
                name: "Gemini 2.0 Flash".to_string(),
                description: "Google's latest experimental flash model".to_string(),
                context_length: 1000000,
            },
            ModelInfo {
                id: "gemini-1.5-pro".to_string(),
                name: "Gemini 1.5 Pro".to_string(),
                description: "Google's advanced model with long context".to_string(),
                context_length: 2000000,
            },
            ModelInfo {
                id: "gemini-1.5-flash".to_string(),
                name: "Gemini 1.5 Flash".to_string(),
                description: "Google's fast, efficient model".to_string(),
                context_length: 1000000,
            },
        ]
    }

    fn get_known_deepseek_models() -> Vec<ModelInfo> {
        vec![
            ModelInfo {
                id: "deepseek-chat".to_string(),
                name: "DeepSeek Chat".to_string(),
                description: "DeepSeek's advanced chat model".to_string(),
                context_length: 128000,
            },
            ModelInfo {
                id: "deepseek-coder".to_string(),
                name: "DeepSeek Coder".to_string(),
                description: "DeepSeek's code-specialized model".to_string(),
                context_length: 128000,
            },
        ]
    }

    fn get_known_openrouter_models() -> Vec<ModelInfo> {
        vec![
            ModelInfo {
                id: "meta-llama/llama-3.3-70b-instruct".to_string(),
                name: "Llama 3.3 70B".to_string(),
                description: "Meta's large language model via OpenRouter".to_string(),
                context_length: 128000,
            },
            ModelInfo {
                id: "anthropic/claude-3.5-sonnet".to_string(),
                name: "Claude 3.5 Sonnet".to_string(),
                description: "Anthropic's Claude via OpenRouter".to_string(),
                context_length: 200000,
            },
        ]
    }

    fn get_known_ollama_models() -> Vec<ModelInfo> {
        vec![ModelInfo {
            id: "llama3.2".to_string(),
            name: "Llama 3.2".to_string(),
            description: "Meta's open source model".to_string(),
            context_length: 128000,
        }]
    }
}
