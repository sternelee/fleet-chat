use async_trait::async_trait;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ProviderError {
    #[error("API error: {0}")]
    ApiError(String),
    #[error("HTTP client error: {0}")]
    HttpError(#[from] reqwest::Error),
    #[error("JSON error: {0}")]
    JsonError(#[from] serde_json::Error),
    #[error("Invalid response: {0}")]
    InvalidResponse(String),
}

#[derive(Debug, Clone, Serialize)]
pub struct ChatRequest {
    pub messages: Vec<ChatMessage>,
    pub temperature: f32,
    pub max_tokens: i32,
    pub tools: Option<Vec<Tool>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct Tool {
    pub name: String,
    pub description: String,
    pub parameters: ToolParameters,
}

#[derive(Debug, Clone, Serialize)]
pub struct ToolParameters {
    #[serde(rename = "type")]
    pub param_type: String,
    pub properties: HashMap<String, serde_json::Value>,
    pub required: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatResponse {
    pub content: String,
    pub tool_calls: Option<Vec<ToolCall>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCall {
    pub id: String,
    pub name: String,
    pub arguments: serde_json::Value,
}

#[async_trait]
pub trait AIProvider: Send + Sync {
    async fn chat_completion(&self, request: ChatRequest) -> Result<ChatResponse, ProviderError>;
    fn provider_name(&self) -> &str;
    fn default_model(&self) -> &str;
}

// Gemini Provider Implementation
pub struct GeminiProvider {
    pub client: Client,
    pub api_key: String,
    pub model: String,
}

impl GeminiProvider {
    pub fn new(api_key: String) -> Self {
        Self {
            client: Client::new(),
            api_key,
            model: "gemini-2.5-flash".to_string(),
        }
    }

    pub fn with_model(api_key: String, model: String) -> Self {
        Self {
            client: Client::new(),
            api_key,
            model,
        }
    }
}

// Gemini API structures
#[derive(Debug, Serialize)]
struct GeminiRequest {
    contents: Vec<GeminiContent>,
    generation_config: Option<GeminiGenerationConfig>,
    tools: Option<Vec<GeminiTool>>,
}

#[derive(Debug, Serialize)]
struct GeminiContent {
    parts: Vec<GeminiPart>,
    role: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(untagged)]
enum GeminiPart {
    Text { text: String },
}

#[derive(Debug, Serialize)]
struct GeminiGenerationConfig {
    temperature: f32,
    #[serde(rename = "maxOutputTokens")]
    max_output_tokens: i32,
    #[serde(rename = "topK")]
    top_k: i32,
    #[serde(rename = "topP")]
    top_p: f32,
}

#[derive(Debug, Serialize)]
struct GeminiTool {
    function_declarations: Vec<GeminiFunctionDeclaration>,
}

#[derive(Debug, Serialize)]
struct GeminiFunctionDeclaration {
    name: String,
    description: String,
    parameters: ToolParameters,
}

#[derive(Debug, Deserialize)]
struct GeminiResponse {
    candidates: Vec<GeminiCandidate>,
}

#[derive(Debug, Deserialize)]
struct GeminiCandidate {
    content: GeminiResponseContent,
}

#[derive(Debug, Deserialize)]
struct GeminiResponseContent {
    parts: Vec<GeminiResponsePart>,
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
enum GeminiResponsePart {
    Text { text: String },
}

#[async_trait]
impl AIProvider for GeminiProvider {
    async fn chat_completion(&self, request: ChatRequest) -> Result<ChatResponse, ProviderError> {
        let mut contents = Vec::new();

        for msg in request.messages {
            contents.push(GeminiContent {
                parts: vec![GeminiPart::Text { text: msg.content }],
                role: Some(msg.role),
            });
        }

        let tools = request.tools.map(|tools| {
            vec![GeminiTool {
                function_declarations: tools
                    .into_iter()
                    .map(|tool| GeminiFunctionDeclaration {
                        name: tool.name,
                        description: tool.description,
                        parameters: tool.parameters,
                    })
                    .collect(),
            }]
        });

        let gemini_request = GeminiRequest {
            contents,
            generation_config: Some(GeminiGenerationConfig {
                temperature: request.temperature,
                max_output_tokens: request.max_tokens,
                top_k: 40,
                top_p: 0.95,
            }),
            tools,
        };

        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
            self.model, self.api_key
        );

        let response = self
            .client
            .post(&url)
            .header("Content-Type", "application/json")
            .json(&gemini_request)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(ProviderError::ApiError(format!(
                "API call failed with status {}: {}",
                status, error_text
            )));
        }

        let gemini_response: GeminiResponse = response.json().await?;

        if let Some(candidate) = gemini_response.candidates.first() {
            let mut text_parts = Vec::new();

            for part in &candidate.content.parts {
                match part {
                    GeminiResponsePart::Text { text } => {
                        text_parts.push(text.clone());
                    }
                }
            }

            return Ok(ChatResponse {
                content: text_parts.join(" "),
                tool_calls: None,
            });
        }

        Err(ProviderError::InvalidResponse(
            "No valid response from Gemini API".to_string(),
        ))
    }

    fn provider_name(&self) -> &str {
        "Gemini"
    }

    fn default_model(&self) -> &str {
        "gemini-2.5-flash"
    }
}

// OpenAI Provider Implementation
pub struct OpenAIProvider {
    pub client: Client,
    pub api_key: String,
    pub model: String,
}

impl OpenAIProvider {
    pub fn new(api_key: String) -> Self {
        Self {
            client: Client::new(),
            api_key,
            model: "gpt-4".to_string(),
        }
    }

    pub fn with_model(api_key: String, model: String) -> Self {
        Self {
            client: Client::new(),
            api_key,
            model,
        }
    }
}

// OpenAI API structures
#[derive(Debug, Serialize)]
struct OpenAIRequest {
    model: String,
    messages: Vec<OpenAIMessage>,
    temperature: f32,
    max_tokens: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    tools: Option<Vec<OpenAITool>>,
}

#[derive(Debug, Serialize)]
struct OpenAIMessage {
    role: String,
    content: String,
}

#[derive(Debug, Serialize)]
struct OpenAITool {
    #[serde(rename = "type")]
    tool_type: String,
    function: OpenAIFunction,
}

#[derive(Debug, Serialize)]
struct OpenAIFunction {
    name: String,
    description: String,
    parameters: ToolParameters,
}

#[derive(Debug, Deserialize)]
struct OpenAIResponse {
    choices: Vec<OpenAIChoice>,
}

#[derive(Debug, Deserialize)]
struct OpenAIChoice {
    message: OpenAIResponseMessage,
}

#[derive(Debug, Deserialize)]
struct OpenAIResponseMessage {
    content: Option<String>,
    #[serde(default)]
    tool_calls: Vec<OpenAIToolCall>,
}

#[derive(Debug, Deserialize)]
struct OpenAIToolCall {
    id: String,
    #[serde(rename = "type")]
    tool_type: String,
    function: OpenAIFunctionCall,
}

#[derive(Debug, Deserialize)]
struct OpenAIFunctionCall {
    name: String,
    arguments: String,
}

#[async_trait]
impl AIProvider for OpenAIProvider {
    async fn chat_completion(&self, request: ChatRequest) -> Result<ChatResponse, ProviderError> {
        let messages: Vec<OpenAIMessage> = request
            .messages
            .into_iter()
            .map(|msg| OpenAIMessage {
                role: msg.role,
                content: msg.content,
            })
            .collect();

        let tools = request.tools.map(|tools| {
            tools
                .into_iter()
                .map(|tool| OpenAITool {
                    tool_type: "function".to_string(),
                    function: OpenAIFunction {
                        name: tool.name,
                        description: tool.description,
                        parameters: tool.parameters,
                    },
                })
                .collect()
        });

        let openai_request = OpenAIRequest {
            model: self.model.clone(),
            messages,
            temperature: request.temperature,
            max_tokens: request.max_tokens,
            tools,
        };

        let url = "https://api.openai.com/v1/chat/completions";

        let response = self
            .client
            .post(url)
            .header("Content-Type", "application/json")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&openai_request)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(ProviderError::ApiError(format!(
                "API call failed with status {}: {}",
                status, error_text
            )));
        }

        let openai_response: OpenAIResponse = response.json().await?;

        if let Some(choice) = openai_response.choices.first() {
            let content = choice.message.content.clone().unwrap_or_default();

            let tool_calls = if !choice.message.tool_calls.is_empty() {
                Some(
                    choice
                        .message
                        .tool_calls
                        .iter()
                        .map(|tc| {
                            let arguments =
                                serde_json::from_str(&tc.function.arguments).unwrap_or_else(|_| serde_json::json!({}));
                            ToolCall {
                                id: tc.id.clone(),
                                name: tc.function.name.clone(),
                                arguments,
                            }
                        })
                        .collect(),
                )
            } else {
                None
            };

            return Ok(ChatResponse { content, tool_calls });
        }

        Err(ProviderError::InvalidResponse(
            "No valid response from OpenAI API".to_string(),
        ))
    }

    fn provider_name(&self) -> &str {
        "OpenAI"
    }

    fn default_model(&self) -> &str {
        "gpt-4"
    }
}
