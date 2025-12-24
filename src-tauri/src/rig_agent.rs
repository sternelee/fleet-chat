/**
 * Rig AI Agent
 *
 * Provides AI functionality using rig-core library
 * Supports multiple providers: OpenAI, Anthropic, Google Gemini, etc.
 */
use futures::stream::{Stream, StreamExt};
use reqwest::Client;
use rig::{
    client::{CompletionClient, EmbeddingsClient, ProviderClient},
    completion::{Chat, Message, Prompt, PromptError},
    embeddings::EmbeddingError,
    embeddings::EmbeddingModel,
    providers::{anthropic, deepseek, gemini, openai},
};
use serde::{Deserialize, Serialize};
use std::env;
use std::pin::Pin;
use thiserror::Error;

// ============================================================================
// Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIOptions {
    pub prompt: String,
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
            AIProvider::OpenRouter => "meta-llama/llama-3.3-70b-instruct".to_string(),
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
        match provider {
            AIProvider::OpenAI => {
                env::var("OPENAI_API_KEY").map_err(|_| RigAgentError::ApiKeyNotFound("OPENAI_API_KEY".to_string()))?;
            }
            AIProvider::Anthropic => {
                env::var("ANTHROPIC_API_KEY")
                    .map_err(|_| RigAgentError::ApiKeyNotFound("ANTHROPIC_API_KEY".to_string()))?;
            }
            AIProvider::Gemini => {
                env::var("GEMINI_API_KEY").map_err(|_| RigAgentError::ApiKeyNotFound("GEMINI_API_KEY".to_string()))?;
            }
            AIProvider::DeepSeek => {
                env::var("DEEPSEEK_API_KEY")
                    .map_err(|_| RigAgentError::ApiKeyNotFound("DEEPSEEK_API_KEY".to_string()))?;
            }
            AIProvider::OpenRouter => {
                env::var("OPENROUTER_API_KEY")
                    .map_err(|_| RigAgentError::ApiKeyNotFound("OPENROUTER_API_KEY".to_string()))?;
            }
            AIProvider::Ollama => {
                // Ollama doesn't need an API key
            }
        }

        Ok(Self {
            provider,
            default_model,
        })
    }

    pub fn with_provider(provider: AIProvider) -> Result<Self, RigAgentError> {
        let default_model = provider.default_model();

        // Verify that we have the required API key for this provider
        match provider {
            AIProvider::OpenAI => {
                env::var("OPENAI_API_KEY").map_err(|_| RigAgentError::ApiKeyNotFound("OPENAI_API_KEY".to_string()))?;
            }
            AIProvider::Anthropic => {
                env::var("ANTHROPIC_API_KEY")
                    .map_err(|_| RigAgentError::ApiKeyNotFound("ANTHROPIC_API_KEY".to_string()))?;
            }
            AIProvider::Gemini => {
                env::var("GEMINI_API_KEY").map_err(|_| RigAgentError::ApiKeyNotFound("GEMINI_API_KEY".to_string()))?;
            }
            AIProvider::DeepSeek => {
                env::var("DEEPSEEK_API_KEY")
                    .map_err(|_| RigAgentError::ApiKeyNotFound("DEEPSEEK_API_KEY".to_string()))?;
            }
            AIProvider::OpenRouter => {
                env::var("OPENROUTER_API_KEY")
                    .map_err(|_| RigAgentError::ApiKeyNotFound("OPENROUTER_API_KEY".to_string()))?;
            }
            AIProvider::Ollama => {
                // Ollama doesn't need an API key
            }
        }

        Ok(Self {
            provider,
            default_model,
        })
    }

    fn resolve_model(&self, options: &AIOptions) -> String {
        options.model.clone().unwrap_or_else(|| self.default_model.clone())
    }

    // ========================================================================
    // Text Generation
    // ========================================================================

    pub async fn generate(&self, options: AIOptions) -> Result<AIResponse, RigAgentError> {
        let model = self.resolve_model(&options);

        let text = match self.provider {
            AIProvider::OpenAI => {
                let _ = env::var("OPENAI_API_KEY")
                    .map_err(|_| RigAgentError::ApiKeyNotFound("OPENAI_API_KEY".to_string()))?;
                let client = openai::Client::from_env();
                let agent = client.agent(&model).build();
                agent.prompt(&options.prompt).await?
            }
            AIProvider::Anthropic => {
                let _ = env::var("ANTHROPIC_API_KEY")
                    .map_err(|_| RigAgentError::ApiKeyNotFound("ANTHROPIC_API_KEY".to_string()))?;
                let client = anthropic::Client::from_env();
                let agent = client.agent(&model).build();
                agent.prompt(&options.prompt).await?
            }
            AIProvider::Gemini => {
                let _ = env::var("GEMINI_API_KEY")
                    .map_err(|_| RigAgentError::ApiKeyNotFound("GEMINI_API_KEY".to_string()))?;
                let client = gemini::Client::from_env();
                let agent = client.agent(&model).build();
                agent.prompt(&options.prompt).await?
            }
            AIProvider::Ollama => {
                return Err(RigAgentError::NotSupported(
                    "Ollama text generation not yet implemented".to_string(),
                ));
            }
            AIProvider::DeepSeek => {
                let _ = env::var("DEEPSEEK_API_KEY")
                    .map_err(|_| RigAgentError::ApiKeyNotFound("DEEPSEEK_API_KEY".to_string()))?;
                let client = deepseek::Client::from_env();
                let agent = client.agent(&model).build();
                agent.prompt(&options.prompt).await?
            }
            AIProvider::OpenRouter => {
                // Use OpenAI client with OpenRouter's base URL for better compatibility
                let api_key = env::var("OPENROUTER_API_KEY")
                    .map_err(|_| RigAgentError::ApiKeyNotFound("OPENROUTER_API_KEY".to_string()))?;

                println!("[RigAgent] Creating OpenRouter client with model: {}", model);

                // Set environment variables before creating the client
                env::set_var("OPENAI_BASE_URL", "https://openrouter.ai/api/v1");
                env::set_var("OPENAI_API_KEY", &api_key);

                // Use CompletionsClient directly (not Responses API client)
                let completions_client = openai::CompletionsClient::from_env();
                let completion_model = completions_client.completion_model(&model);
                let agent = completion_model.into_agent_builder().build();

                println!("[RigAgent] Sending prompt to OpenRouter...");
                let result = agent.prompt(&options.prompt).await?;
                println!("[RigAgent] OpenRouter response received");

                result
            }
        };

        Ok(AIResponse {
            text,
            model: Some(model),
            usage: None,
            finish_reason: Some("stop".to_string()),
        })
    }

    /// Stream text generation with real streaming support
    /// Returns a stream of text chunks
    pub fn generate_stream(
        &self,
        options: AIOptions,
    ) -> Pin<Box<dyn Stream<Item = Result<String, RigAgentError>> + Send>> {
        use tokio_stream::wrappers::ReceiverStream;
        use tokio::sync::mpsc;

        let model = self.resolve_model(&options);
        let provider = self.provider.clone();
        let prompt = options.prompt;
        let temperature = options.temperature.unwrap_or(0.7);

        // Create a channel for sending chunks
        let (tx, rx) = mpsc::channel(100);

        // Spawn a task to handle streaming
        tokio::spawn(async move {
            let result: Result<(), String> = async move {
                match provider {
                    AIProvider::OpenAI => {
                        stream_openai(&model, &prompt, temperature, tx)
                            .await
                            .map_err(|e| e.to_string())
                    }
                    AIProvider::Anthropic => {
                        stream_anthropic(&model, &prompt, temperature, tx)
                            .await
                            .map_err(|e| e.to_string())
                    }
                    AIProvider::Gemini => {
                        stream_gemini(&model, &prompt, temperature, tx)
                            .await
                            .map_err(|e| e.to_string())
                    }
                    AIProvider::DeepSeek => {
                        stream_deepseek(&model, &prompt, temperature, tx)
                            .await
                            .map_err(|e| e.to_string())
                    }
                    AIProvider::OpenRouter => {
                        stream_openrouter(&model, &prompt, temperature, tx)
                            .await
                            .map_err(|e| e.to_string())
                    }
                    AIProvider::Ollama => {
                        Err("Ollama streaming not yet implemented".to_string())
                    }
                }
            }
            .await;

            // Note: tx is moved into the async block, so we can't use it here
            // Error handling is done inside the async block
        });

        Box::pin(ReceiverStream::new(rx))
    }

    // ========================================================================
    // Chat
    // ========================================================================

    pub async fn chat(
        &self,
        messages: Vec<ChatMessage>,
        _options: Option<AIOptions>,
    ) -> Result<AIResponse, RigAgentError> {
        let default_options = AIOptions {
            prompt: String::new(),
            model: None,
            temperature: None,
            max_tokens: None,
            top_p: None,
            frequency_penalty: None,
            presence_penalty: None,
        };
        let model = self.resolve_model(&default_options);

        // Convert ChatMessage to rig's Message format
        let rig_messages: Vec<Message> = messages
            .into_iter()
            .map(|msg| match msg.role.as_str() {
                "user" => Message::user(msg.content),
                "assistant" | "system" => Message::assistant(msg.content),
                _ => Message::user(msg.content),
            })
            .collect();

        let text = match self.provider {
            AIProvider::OpenAI => {
                let _ = env::var("OPENAI_API_KEY")
                    .map_err(|_| RigAgentError::ApiKeyNotFound("OPENAI_API_KEY".to_string()))?;
                let client = openai::Client::from_env();
                let agent = client.agent(&model).build();

                // Get the last message as the prompt, and the rest as chat history
                let prompt_msg = rig_messages.last().cloned().unwrap_or_else(|| Message::user(""));
                let chat_history = if rig_messages.len() > 1 {
                    rig_messages[..rig_messages.len() - 1].to_vec()
                } else {
                    vec![]
                };

                agent.chat(prompt_msg, chat_history).await?
            }
            AIProvider::Anthropic => {
                let _ = env::var("ANTHROPIC_API_KEY")
                    .map_err(|_| RigAgentError::ApiKeyNotFound("ANTHROPIC_API_KEY".to_string()))?;
                let client = anthropic::Client::from_env();
                let agent = client.agent(&model).build();

                let prompt_msg = rig_messages.last().cloned().unwrap_or_else(|| Message::user(""));
                let chat_history = if rig_messages.len() > 1 {
                    rig_messages[..rig_messages.len() - 1].to_vec()
                } else {
                    vec![]
                };

                agent.chat(prompt_msg, chat_history).await?
            }
            AIProvider::Gemini => {
                let _ = env::var("GEMINI_API_KEY")
                    .map_err(|_| RigAgentError::ApiKeyNotFound("GEMINI_API_KEY".to_string()))?;
                let client = gemini::Client::from_env();
                let agent = client.agent(&model).build();

                let prompt_msg = rig_messages.last().cloned().unwrap_or_else(|| Message::user(""));
                let chat_history = if rig_messages.len() > 1 {
                    rig_messages[..rig_messages.len() - 1].to_vec()
                } else {
                    vec![]
                };

                agent.chat(prompt_msg, chat_history).await?
            }
            AIProvider::Ollama => {
                return Err(RigAgentError::NotSupported(
                    "Ollama chat not yet implemented".to_string(),
                ));
            }
            AIProvider::DeepSeek => {
                let _ = env::var("DEEPSEEK_API_KEY")
                    .map_err(|_| RigAgentError::ApiKeyNotFound("DEEPSEEK_API_KEY".to_string()))?;
                let client = deepseek::Client::from_env();
                let agent = client.agent(&model).build();

                let prompt_msg = rig_messages.last().cloned().unwrap_or_else(|| Message::user(""));
                let chat_history = if rig_messages.len() > 1 {
                    rig_messages[..rig_messages.len() - 1].to_vec()
                } else {
                    vec![]
                };

                agent.chat(prompt_msg, chat_history).await?
            }
            AIProvider::OpenRouter => {
                // Use OpenAI client with OpenRouter's base URL for better compatibility
                let api_key = env::var("OPENROUTER_API_KEY")
                    .map_err(|_| RigAgentError::ApiKeyNotFound("OPENROUTER_API_KEY".to_string()))?;

                println!("[RigAgent] Creating OpenRouter client for chat with model: {}", model);

                // Set environment variables before creating the client
                env::set_var("OPENAI_BASE_URL", "https://openrouter.ai/api/v1");
                env::set_var("OPENAI_API_KEY", &api_key);

                // Use CompletionsClient directly (not Responses API client)
                let completions_client = openai::CompletionsClient::from_env();
                let completion_model = completions_client.completion_model(&model);
                let agent = completion_model.into_agent_builder().build();

                let prompt_msg = rig_messages.last().cloned().unwrap_or_else(|| Message::user(""));
                let chat_history = if rig_messages.len() > 1 {
                    rig_messages[..rig_messages.len() - 1].to_vec()
                } else {
                    vec![]
                };

                println!("[RigAgent] Sending chat request to OpenRouter...");
                let result = agent.chat(prompt_msg, chat_history).await?;
                println!("[RigAgent] OpenRouter chat response received");

                result
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

    pub async fn get_models(&self) -> Result<Vec<ModelInfo>, RigAgentError> {
        match self.provider {
            AIProvider::OpenAI => Ok(vec![
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
            ]),
            AIProvider::Anthropic => Ok(vec![
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
            ]),
            AIProvider::Gemini => Ok(vec![
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
            ]),
            AIProvider::Ollama => Ok(vec![ModelInfo {
                id: "llama3.2".to_string(),
                name: "Llama 3.2".to_string(),
                description: "Meta's open source model".to_string(),
                context_length: 128000,
            }]),
            AIProvider::DeepSeek => Ok(vec![
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
            ]),
            AIProvider::OpenRouter => Ok(vec![
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
            ]),
        }
    }
}

// ============================================================================
// Streaming Helper Functions
// ============================================================================

type StreamSender = tokio::sync::mpsc::Sender<Result<String, RigAgentError>>;

async fn stream_openai(
    model: &str,
    prompt: &str,
    temperature: f32,
    tx: StreamSender,
) -> Result<(), Box<dyn std::error::Error>> {
    use reqwest::header::{HeaderMap, CONTENT_TYPE, AUTHORIZATION};
    use serde_json::json;

    let api_key = env::var("OPENAI_API_KEY")?;
    let client = Client::new();

    let mut headers = HeaderMap::new();
    headers.insert(CONTENT_TYPE, "application/json".parse()?);
    headers.insert(AUTHORIZATION, format!("Bearer {}", api_key).parse()?);

    let body = json!({
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": temperature,
        "stream": true
    });

    let response = client
        .post("https://api.openai.com/v1/chat/completions")
        .headers(headers)
        .json(&body)
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await?;
        return Err(format!("OpenAI API error: {} - {}", status, error_text).into());
    }

    let mut stream = response.bytes_stream();
    use futures::stream::StreamExt;

    while let Some(chunk_result) = stream.next().await {
        match chunk_result {
            Ok(chunk) => {
                let text = String::from_utf8_lossy(&chunk);
                for line in text.lines() {
                    let line = line.trim();
                    if line.starts_with("data: ") && line != "data: [DONE]" {
                        let data = &line[6..];
                        if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                            if let Some(content) = json["choices"][0]["delta"]["content"].as_str() {
                                let _ = tx.send(Ok(content.to_string())).await;
                            }
                        }
                    }
                }
            }
            Err(e) => {
                let _ = tx.send(Err(RigAgentError::RequestFailed(e.to_string()))).await;
                break;
            }
        }
    }

    Ok(())
}

async fn stream_anthropic(
    model: &str,
    prompt: &str,
    temperature: f32,
    tx: StreamSender,
) -> Result<(), Box<dyn std::error::Error>> {
    use reqwest::header::{HeaderMap, CONTENT_TYPE};
    use serde_json::json;

    let api_key = env::var("ANTHROPIC_API_KEY")?;
    let client = Client::new();

    let mut headers = HeaderMap::new();
    headers.insert(CONTENT_TYPE, "application/json".parse()?);
    headers.insert("x-api-key", api_key.parse()?);
    headers.insert("anthropic-version", "2023-06-01".parse()?);

    let body = json!({
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": temperature,
        "stream": true,
        "max_tokens": 4096
    });

    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .headers(headers)
        .json(&body)
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await?;
        return Err(format!("Anthropic API error: {} - {}", status, error_text).into());
    }

    let mut stream = response.bytes_stream();
    use futures::stream::StreamExt;

    while let Some(chunk_result) = stream.next().await {
        match chunk_result {
            Ok(chunk) => {
                let text = String::from_utf8_lossy(&chunk);
                for line in text.lines() {
                    let line = line.trim();
                    if line.starts_with("data: ") {
                        let data = &line[6..];
                        if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                            if let Some(delta) = json.get("delta") {
                                if let Some(text) = delta.get("text").and_then(|t| t.as_str()) {
                                    let _ = tx.send(Ok(text.to_string())).await;
                                }
                            }
                        }
                    }
                }
            }
            Err(e) => {
                let _ = tx.send(Err(RigAgentError::RequestFailed(e.to_string()))).await;
                break;
            }
        }
    }

    Ok(())
}

async fn stream_gemini(
    model: &str,
    prompt: &str,
    temperature: f32,
    tx: StreamSender,
) -> Result<(), Box<dyn std::error::Error>> {
    // Gemini doesn't support SSE streaming in the same way
    // Fall back to non-streaming for now
    use rig::providers::gemini;

    let api_key = env::var("GEMINI_API_KEY")?;
    let client = gemini::Client::from_env();
    let agent = client.agent(model).build();
    let response = agent.prompt(prompt).await?;

    // Send the full response as one chunk
    let _ = tx.send(Ok(response)).await;
    Ok(())
}

async fn stream_deepseek(
    model: &str,
    prompt: &str,
    temperature: f32,
    tx: StreamSender,
) -> Result<(), Box<dyn std::error::Error>> {
    // DeepSeek uses OpenAI-compatible API
    use reqwest::header::{HeaderMap, CONTENT_TYPE};
    use serde_json::json;

    let api_key = env::var("DEEPSEEK_API_KEY")?;
    let client = Client::new();

    let mut headers = HeaderMap::new();
    headers.insert(CONTENT_TYPE, "application/json".parse()?);
    headers.insert("Authorization", format!("Bearer {}", api_key).parse()?);

    let body = json!({
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": temperature,
        "stream": true
    });

    let response = client
        .post("https://api.deepseek.com/v1/chat/completions")
        .headers(headers)
        .json(&body)
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await?;
        return Err(format!("DeepSeek API error: {} - {}", status, error_text).into());
    }

    let mut stream = response.bytes_stream();
    use futures::stream::StreamExt;

    while let Some(chunk_result) = stream.next().await {
        match chunk_result {
            Ok(chunk) => {
                let text = String::from_utf8_lossy(&chunk);
                for line in text.lines() {
                    let line = line.trim();
                    if line.starts_with("data: ") && line != "data: [DONE]" {
                        let data = &line[6..];
                        if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                            if let Some(content) = json["choices"][0]["delta"]["content"].as_str() {
                                let _ = tx.send(Ok(content.to_string())).await;
                            }
                        }
                    }
                }
            }
            Err(e) => {
                let _ = tx.send(Err(RigAgentError::RequestFailed(e.to_string()))).await;
                break;
            }
        }
    }

    Ok(())
}

async fn stream_openrouter(
    model: &str,
    prompt: &str,
    temperature: f32,
    tx: StreamSender,
) -> Result<(), Box<dyn std::error::Error>> {
    // OpenRouter uses OpenAI-compatible API
    use reqwest::header::{HeaderMap, CONTENT_TYPE};
    use serde_json::json;

    let api_key = env::var("OPENROUTER_API_KEY")?;
    let client = Client::new();

    let mut headers = HeaderMap::new();
    headers.insert(CONTENT_TYPE, "application/json".parse()?);
    headers.insert("Authorization", format!("Bearer {}", api_key).parse()?);
    headers.insert("HTTP-Referer", "https://fleet-chat.app".parse()?);

    let body = json!({
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": temperature,
        "stream": true
    });

    let response = client
        .post("https://openrouter.ai/api/v1/chat/completions")
        .headers(headers)
        .json(&body)
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await?;
        return Err(format!("OpenRouter API error: {} - {}", status, error_text).into());
    }

    let mut stream = response.bytes_stream();
    use futures::stream::StreamExt;

    while let Some(chunk_result) = stream.next().await {
        match chunk_result {
            Ok(chunk) => {
                let text = String::from_utf8_lossy(&chunk);
                for line in text.lines() {
                    let line = line.trim();
                    if line.starts_with("data: ") && line != "data: [DONE]" {
                        let data = &line[6..];
                        if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                            if let Some(content) = json["choices"][0]["delta"]["content"].as_str() {
                                let _ = tx.send(Ok(content.to_string())).await;
                            }
                        }
                    }
                }
            }
            Err(e) => {
                let _ = tx.send(Err(RigAgentError::RequestFailed(e.to_string()))).await;
                break;
            }
        }
    }

    Ok(())
}
