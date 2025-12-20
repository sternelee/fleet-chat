use chrono::{DateTime, Utc};
use jsonschema::JSONSchema;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use thiserror::Error;
use tokio::sync::RwLock;
use uuid::Uuid;

use super::provider::{AIProvider, ChatMessage as ProviderChatMessage, ChatRequest, Tool, ToolParameters};
use super::schema::*;

#[derive(Debug)]
pub struct A2UIAgent {
    pub client: Client,
    pub provider: Arc<dyn AIProvider>,
    pub sessions: Arc<RwLock<HashMap<String, A2UISession>>>,
    pub tools: Vec<A2UITool>,
    pub schema_validator: JSONSchema,
    pub templates: A2UITemplates,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct A2UISession {
    pub id: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub messages: Vec<A2UIMessage>,
    pub context: A2UIContext,
    pub tools_used: Vec<String>,
    pub base_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct A2UIContext {
    pub user_id: String,
    pub app_name: String,
    pub session_state: HashMap<String, String>,
    pub conversation_state: ConversationState,
    pub last_tool_call: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ConversationState {
    Initial,
    ToolCalling,
    ResponseGeneration,
    Validation,
    Complete,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct A2UIMessage {
    pub id: String,
    pub role: String,
    pub content: String,
    pub timestamp: DateTime<Utc>,
    pub metadata: Option<HashMap<String, String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct A2UITool {
    pub name: String,
    pub description: String,
    pub parameters: Vec<ToolParameter>,
    pub handler: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolParameter {
    pub name: String,
    pub parameter_type: String,
    pub description: String,
    pub required: bool,
    pub default_value: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct A2UITemplates {
    pub contact_list_template: String,
    pub contact_card_template: String,
    pub action_confirmation_template: String,
    pub search_results_template: String,
    pub no_results_template: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct CreateSessionRequest {
    pub user_id: String,
    pub app_name: String,
    pub base_url: Option<String>,
    pub initial_context: Option<HashMap<String, String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct ToolCallRequest {
    pub session_id: String,
    pub tool_name: String,
    pub parameters: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCall {
    pub id: String,
    pub name: String,
    pub parameters: HashMap<String, serde_json::Value>,
    pub result: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolResult {
    pub success: bool,
    pub data: Option<serde_json::Value>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratedResponse {
    pub content: String,
    pub a2ui_messages: Vec<A2UIMessageResponse>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum A2UIMessageResponse {
    #[serde(rename = "beginRendering")]
    BeginRendering(BeginRendering),
    #[serde(rename = "surfaceUpdate")]
    SurfaceUpdate(SurfaceUpdate),
    #[serde(rename = "dataModelUpdate")]
    DataModelUpdate(DataModelUpdate),
    #[serde(rename = "deleteSurface")]
    DeleteSurface(DeleteSurface),
}

#[derive(Debug, Error)]
pub enum A2UIAgentError {
    #[error("Session not found: {0}")]
    SessionNotFound(String),
    #[error("Invalid session ID")]
    InvalidSessionId,
    #[error("Tool not found: {0}")]
    ToolNotFound(String),
    #[error("Invalid tool parameters: {0}")]
    InvalidParameters(String),
    #[error("Tool execution failed: {0}")]
    ToolExecutionError(String),
    #[error("Template error: {0}")]
    TemplateError(String),
    #[error("AI Provider error: {0}")]
    ProviderError(#[from] super::provider::ProviderError),
    #[error("Message parsing error: {0}")]
    MessageError(String),
    #[error("Validation error: {0}")]
    ValidationError(String),
    #[error("JSON serialization error: {0}")]
    JsonError(#[from] serde_json::Error),
    #[error("HTTP client error: {0}")]
    HttpClientError(#[from] reqwest::Error),
}

impl A2UIAgent {
    pub fn new(provider: Arc<dyn AIProvider>) -> Result<Self, A2UIAgentError> {
        let client = Client::new();

        // Load A2UI schema for validation
        let schema_json = include_str!("schema.json");
        let schema_value: serde_json::Value = serde_json::from_str(schema_json)?;
        let schema_validator = JSONSchema::compile(&schema_value)
            .map_err(|e| A2UIAgentError::TemplateError(format!("Schema compilation error: {}", e)))?;

        // Initialize built-in tools
        let tools = vec![
            A2UITool {
                name: "get_contact_info".to_string(),
                description: "Get contact information from the directory".to_string(),
                parameters: vec![
                    ToolParameter {
                        name: "name".to_string(),
                        parameter_type: "string".to_string(),
                        description: "Name of the person to search for".to_string(),
                        required: true,
                        default_value: None,
                    },
                    ToolParameter {
                        name: "department".to_string(),
                        parameter_type: "string".to_string(),
                        description: "Optional department to filter by".to_string(),
                        required: false,
                        default_value: None,
                    },
                ],
                handler: "handle_get_contact_info".to_string(),
            },
            A2UITool {
                name: "create_contact_list".to_string(),
                description: "Create a contact list UI with specified contacts".to_string(),
                parameters: vec![
                    ToolParameter {
                        name: "contacts".to_string(),
                        parameter_type: "array".to_string(),
                        description: "Array of contact objects to display".to_string(),
                        required: true,
                        default_value: None,
                    },
                    ToolParameter {
                        name: "title".to_string(),
                        parameter_type: "string".to_string(),
                        description: "Title for the contact list".to_string(),
                        required: false,
                        default_value: Some("Contact List".to_string()),
                    },
                ],
                handler: "handle_create_contact_list".to_string(),
            },
            A2UITool {
                name: "display_search_results".to_string(),
                description: "Display search results in a formatted UI".to_string(),
                parameters: vec![
                    ToolParameter {
                        name: "results".to_string(),
                        parameter_type: "array".to_string(),
                        description: "Array of search results to display".to_string(),
                        required: true,
                        default_value: None,
                    },
                    ToolParameter {
                        name: "search_query".to_string(),
                        parameter_type: "string".to_string(),
                        description: "The search query that generated these results".to_string(),
                        required: true,
                        default_value: None,
                    },
                ],
                handler: "handle_display_search_results".to_string(),
            },
        ];

        let templates = A2UITemplates {
            contact_list_template: include_str!("../templates/contact_list.json").to_string(),
            contact_card_template: include_str!("../templates/contact_card.json").to_string(),
            action_confirmation_template: include_str!("../templates/action_confirmation.json").to_string(),
            search_results_template: include_str!("../templates/search_results.json").to_string(),
            no_results_template: include_str!("../templates/no_results.json").to_string(),
        };

        Ok(A2UIAgent {
            client,
            provider,
            sessions: Arc::new(RwLock::new(HashMap::new())),
            tools,
            schema_validator,
            templates,
        })
    }

    pub async fn create_session(&self, request: CreateSessionRequest) -> Result<String, A2UIAgentError> {
        let session_id = Uuid::new_v4().to_string();
        self.create_session_with_id(&session_id, request).await?;
        Ok(session_id)
    }

    pub async fn create_session_with_id(
        &self,
        session_id: &str,
        request: CreateSessionRequest,
    ) -> Result<(), A2UIAgentError> {
        let now = Utc::now();

        let session = A2UISession {
            id: session_id.to_string(),
            created_at: now,
            updated_at: now,
            messages: Vec::new(),
            context: A2UIContext {
                user_id: request.user_id,
                app_name: request.app_name,
                session_state: request.initial_context.unwrap_or_default(),
                conversation_state: ConversationState::Initial,
                last_tool_call: None,
            },
            tools_used: Vec::new(),
            base_url: request.base_url.unwrap_or_else(|| "http://localhost:1420".to_string()),
        };

        let mut sessions = self.sessions.write().await;
        sessions.insert(session_id.to_string(), session);

        Ok(())
    }

    pub async fn get_session(&self, session_id: &str) -> Result<A2UISession, A2UIAgentError> {
        let sessions = self.sessions.read().await;
        sessions
            .get(session_id)
            .cloned()
            .ok_or_else(|| A2UIAgentError::SessionNotFound(session_id.to_string()))
    }

    pub async fn delete_session(&self, session_id: &str) -> Result<(), A2UIAgentError> {
        let mut sessions = self.sessions.write().await;
        sessions
            .remove(session_id)
            .ok_or_else(|| A2UIAgentError::SessionNotFound(session_id.to_string()))?;
        Ok(())
    }

    pub async fn list_sessions(&self) -> Result<Vec<String>, A2UIAgentError> {
        let sessions = self.sessions.read().await;
        Ok(sessions.keys().cloned().collect())
    }

    pub async fn handle_message(
        &self,
        session_id: &str,
        message: &str,
        use_ui: bool,
    ) -> Result<GeneratedResponse, A2UIAgentError> {
        // Auto-create session if it doesn't exist
        if !self.sessions.read().await.contains_key(session_id) {
            self.create_session_with_id(
                session_id,
                CreateSessionRequest {
                    user_id: "default".to_string(),
                    app_name: "Fleet Chat".to_string(),
                    base_url: None,
                    initial_context: Some(HashMap::from([("status".to_string(), "initial".to_string())])),
                },
            )
            .await?;
        }

        let mut sessions = self.sessions.write().await;
        let session = sessions
            .get_mut(session_id)
            .ok_or_else(|| A2UIAgentError::SessionNotFound(session_id.to_string()))?;

        // Add user message to history
        let user_message = A2UIMessage {
            id: Uuid::new_v4().to_string(),
            role: "user".to_string(),
            content: message.to_string(),
            timestamp: Utc::now(),
            metadata: None,
        };

        session.messages.push(user_message);
        session.updated_at = Utc::now();

        // Process the message and generate response
        let response = self.generate_response(&session, message, use_ui).await?;

        // Add assistant response to history
        let assistant_message = A2UIMessage {
            id: Uuid::new_v4().to_string(),
            role: "assistant".to_string(),
            content: response.content.clone(),
            timestamp: Utc::now(),
            metadata: None,
        };

        session.messages.push(assistant_message);
        session.updated_at = Utc::now();

        Ok(response)
    }

    async fn generate_response(
        &self,
        session: &A2UISession,
        query: &str,
        use_ui: bool,
    ) -> Result<GeneratedResponse, A2UIAgentError> {
        // Build the comprehensive UI prompt
        let prompt = self.build_ui_prompt(session, query, use_ui).await?;

        // Create provider chat request with tools
        let chat_request = self.create_chat_request(&prompt, session, use_ui)?;

        // Call AI provider
        let provider_response = self.provider.chat_completion(chat_request).await?;

        // Parse and process the response
        let parsed_response = self.parse_response(&provider_response.content)?;

        // Convert to A2UI messages with auto-fixing
        let a2ui_messages = self.convert_json_to_a2ui_message(&parsed_response, session).await?;

        // Validate A2UI response
        if use_ui {
            self.validate_a2ui_response(&a2ui_messages)?;
        }

        Ok(GeneratedResponse {
            content: provider_response.content,
            a2ui_messages,
        })
    }

    async fn build_ui_prompt(
        &self,
        session: &A2UISession,
        query: &str,
        use_ui: bool,
    ) -> Result<String, A2UIAgentError> {
        let mut prompt = String::new();

        // System prompt
        prompt.push_str("You are an intelligent UI assistant that can analyze user requests and generate appropriate user interfaces using the A2UI (Agent to UI) protocol.\n\n");

        prompt.push_str("A2UI PROTOCOL OVERVIEW:\n");
        prompt.push_str("A2UI allows you to dynamically create and update user interfaces through JSON messages. Each message can contain exactly ONE of these actions:\n");
        prompt.push_str("1. beginRendering: Start rendering a new UI surface\n");
        prompt.push_str("2. surfaceUpdate: Update components on an existing surface\n");
        prompt.push_str("3. dataModelUpdate: Update data bindings for components\n");
        prompt.push_str("4. deleteSurface: Remove a surface from the UI\n\n");

        prompt.push_str("AVAILABLE COMPONENTS:\n");
        prompt.push_str("- Text: Display text with various usage hints (h1, h2, h3, body, caption)\n");
        prompt.push_str("- Button: Interactive buttons with actions\n");
        prompt.push_str("- Card: Container components with borders and padding\n");
        prompt.push_str("- Row/Column: Layout components for arranging other components\n");
        prompt.push_str("- List: Repeating components for data collections\n");
        prompt.push_str("- TextField: Input fields for user data entry\n");
        prompt.push_str("- Tabs: Tab navigation components\n");
        prompt.push_str("- Icon: Icon components\n");
        prompt.push_str("- Divider: Visual separators\n\n");

        if use_ui {
            prompt.push_str("UI GENERATION GUIDELINES:\n");
            prompt.push_str("- Use meaningful, unique IDs for all components\n");
            prompt.push_str("- Follow hierarchical naming conventions (e.g., 'contact-list', 'contact-card-1')\n");
            prompt.push_str("- Use data bindings with paths like '/contacts' for dynamic content\n");
            prompt.push_str("- Always include appropriate styling hints and usage patterns\n");
            prompt.push_str("- Generate complete, self-contained UI messages\n");
            prompt.push_str("- Use surfaceUpdate for component definitions and dataModelUpdate for data\n\n");
        }

        // Context information
        prompt.push_str(&format!("SESSION CONTEXT:\n"));
        prompt.push_str(&format!("User ID: {}\n", session.context.user_id));
        prompt.push_str(&format!("App: {}\n", session.context.app_name));
        prompt.push_str(&format!(
            "Conversation State: {:?}\n\n",
            session.context.conversation_state
        ));

        // Available tools
        if !self.tools.is_empty() {
            prompt.push_str("AVAILABLE TOOLS:\n");
            for tool in &self.tools {
                prompt.push_str(&format!("- {}: {}\n", tool.name, tool.description));
            }
            prompt.push_str("\n");
        }

        // Conversation history
        if !session.messages.is_empty() {
            prompt.push_str("CONVERSATION HISTORY:\n");
            for msg in &session.messages {
                prompt.push_str(&format!("{}: {}\n", msg.role.to_uppercase(), msg.content));
            }
            prompt.push_str("\n");
        }

        // Current query
        prompt.push_str(&format!("CURRENT REQUEST: {}\n\n", query));

        if use_ui {
            prompt.push_str("RESPONSE REQUIREMENTS:\n");
            prompt.push_str("1. Provide a helpful conversational response\n");
            prompt.push_str("2. If appropriate, generate A2UI messages to create/update the UI\n");
            prompt.push_str("3. Use available tools when they can help fulfill the request\n");
            prompt.push_str("4. Format A2UI messages as valid JSON arrays\n");
            prompt.push_str("5. Ensure all component IDs are unique within the surface\n");
            prompt.push_str("6. Use proper data binding syntax for dynamic content\n\n");

            prompt.push_str("RESPONSE FORMAT:\n");
            prompt.push_str("Provide your conversational response first, then include any A2UI messages as a JSON array prefixed with 'A2UI_MESSAGES:'\n\n");
        } else {
            prompt.push_str("Provide a helpful conversational response without UI generation.\n\n");
        }

        prompt.push_str("EXAMPLE A2UI MESSAGE:\n");
        prompt.push_str("A2UI_MESSAGES: [\n");
        prompt.push_str("  {\"beginRendering\": {\"surfaceId\": \"main\", \"root\": \"container\", \"styles\": {\"primaryColor\": \"#007BFF\"}}},\n");
        prompt.push_str("  {\"surfaceUpdate\": {\"surfaceId\": \"main\", \"components\": [\n");
        prompt.push_str("    {\"id\": \"container\", \"component\": {\"Column\": {\"children\": {\"explicitList\": [\"title\", \"content\"]}}}},\n");
        prompt.push_str("    {\"id\": \"title\", \"component\": {\"Text\": {\"usageHint\": \"h1\", \"text\": {\"literalString\": \"Hello World\"}}}}\n");
        prompt.push_str("  ]}}\n");
        prompt.push_str("]\n\n");

        Ok(prompt)
    }

    fn create_chat_request(
        &self,
        prompt: &str,
        _session: &A2UISession,
        use_ui: bool,
    ) -> Result<ChatRequest, A2UIAgentError> {
        let messages = vec![ProviderChatMessage {
            role: "user".to_string(),
            content: prompt.to_string(),
        }];

        // Build tools if needed
        let tools = if use_ui && !self.tools.is_empty() {
            Some(self.convert_a2ui_tools_to_provider_tools())
        } else {
            None
        };

        let request = ChatRequest {
            messages,
            temperature: 0.7,
            max_tokens: 4096,
            tools,
        };

        Ok(request)
    }

    fn convert_a2ui_tools_to_provider_tools(&self) -> Vec<Tool> {
        self.tools
            .iter()
            .map(|tool| {
                let mut properties = HashMap::new();
                let mut required = Vec::new();

                for param in &tool.parameters {
                    let param_schema = match param.parameter_type.as_str() {
                        "string" => serde_json::json!({
                            "type": "string",
                            "description": param.description
                        }),
                        "number" | "integer" => serde_json::json!({
                            "type": "number",
                            "description": param.description
                        }),
                        "boolean" => serde_json::json!({
                            "type": "boolean",
                            "description": param.description
                        }),
                        "array" => serde_json::json!({
                            "type": "array",
                            "description": param.description,
                            "items": {"type": "object"}
                        }),
                        "object" => serde_json::json!({
                            "type": "object",
                            "description": param.description
                        }),
                        _ => serde_json::json!({
                            "type": "string",
                            "description": param.description
                        }),
                    };

                    properties.insert(param.name.clone(), param_schema);
                    if param.required {
                        required.push(param.name.clone());
                    }
                }

                Tool {
                    name: tool.name.clone(),
                    description: tool.description.clone(),
                    parameters: ToolParameters {
                        param_type: "object".to_string(),
                        properties,
                        required,
                    },
                }
            })
            .collect()
    }

    fn parse_response(&self, response: &str) -> Result<String, A2UIAgentError> {
        // Extract A2UI messages using delimiter parsing
        if let Some(start) = response.find("A2UI_MESSAGES:") {
            let after_marker = &response[start + "A2UI_MESSAGES:".len()..];

            // Find the start of JSON array
            if let Some(json_start) = after_marker.find('[') {
                let json_part = &after_marker[json_start..];

                // Find matching closing bracket
                let mut bracket_count = 0;
                let mut json_end = None;

                for (i, ch) in json_part.char_indices() {
                    match ch {
                        '[' => bracket_count += 1,
                        ']' => {
                            bracket_count -= 1;
                            if bracket_count == 0 {
                                json_end = Some(i + 1);
                                break;
                            }
                        }
                        _ => {}
                    }
                }

                if let Some(end) = json_end {
                    return Ok(json_part[..end].to_string());
                }
            }
        }

        Err(A2UIAgentError::MessageError(
            "No valid A2UI messages found in response".to_string(),
        ))
    }

    async fn convert_json_to_a2ui_message(
        &self,
        json_str: &str,
        session: &A2UISession,
    ) -> Result<Vec<A2UIMessageResponse>, A2UIAgentError> {
        // First, try to parse the JSON directly
        match serde_json::from_str::<Vec<serde_json::Value>>(json_str) {
            Ok(messages) => {
                let mut a2ui_messages = Vec::new();

                for message in messages {
                    match self.convert_single_message(message, session) {
                        Ok(a2ui_msg) => a2ui_messages.push(a2ui_msg),
                        Err(e) => {
                            // Log error but continue with other messages
                            eprintln!("Error converting message: {}", e);
                        }
                    }
                }

                Ok(a2ui_messages)
            }
            Err(_) => {
                // Try auto-fixing common JSON issues
                match self.auto_fix_json(json_str) {
                    Ok(fixed_json) => {
                        // Try parsing again with the fixed JSON (but avoid infinite recursion)
                        match serde_json::from_str::<Vec<serde_json::Value>>(&fixed_json) {
                            Ok(messages) => {
                                let mut a2ui_messages = Vec::new();

                                for message in messages {
                                    match self.convert_single_message(message, session) {
                                        Ok(a2ui_msg) => a2ui_messages.push(a2ui_msg),
                                        Err(e) => {
                                            eprintln!("Error converting message: {}", e);
                                        }
                                    }
                                }

                                Ok(a2ui_messages)
                            }
                            Err(e) => Err(A2UIAgentError::MessageError(format!(
                                "Failed to parse JSON even after auto-fixing: {}",
                                e
                            ))),
                        }
                    }
                    Err(e) => Err(A2UIAgentError::MessageError(format!("Failed to auto-fix JSON: {}", e))),
                }
            }
        }
    }

    fn convert_single_message(
        &self,
        message: serde_json::Value,
        _session: &A2UISession,
    ) -> Result<A2UIMessageResponse, A2UIAgentError> {
        if let Some(obj) = message.as_object() {
            // Check for beginRendering
            if let Some(rendering) = obj.get("beginRendering") {
                let begin_rendering: BeginRendering = serde_json::from_value(rendering.clone())?;
                return Ok(A2UIMessageResponse::BeginRendering(begin_rendering));
            }

            // Check for surfaceUpdate
            if let Some(update) = obj.get("surfaceUpdate") {
                let surface_update: SurfaceUpdate = serde_json::from_value(update.clone())?;
                return Ok(A2UIMessageResponse::SurfaceUpdate(surface_update));
            }

            // Check for dataModelUpdate
            if let Some(data_update) = obj.get("dataModelUpdate") {
                let data_model_update: DataModelUpdate = serde_json::from_value(data_update.clone())?;
                return Ok(A2UIMessageResponse::DataModelUpdate(data_model_update));
            }

            // Check for deleteSurface
            if let Some(delete) = obj.get("deleteSurface") {
                let delete_surface: DeleteSurface = serde_json::from_value(delete.clone())?;
                return Ok(A2UIMessageResponse::DeleteSurface(delete_surface));
            }
        }

        Err(A2UIAgentError::MessageError("Invalid A2UI message format".to_string()))
    }

    fn auto_fix_json(&self, json_str: &str) -> Result<String, A2UIAgentError> {
        let mut fixed = json_str.trim().to_string();

        // Fix trailing commas
        fixed = fixed.replace(",\n]", "\n]").replace(",\n}", "\n}");

        // Fix single quotes to double quotes
        fixed = fixed.replace("'", "\"");

        // Try to parse and format properly
        match serde_json::from_str::<serde_json::Value>(&fixed) {
            Ok(value) => serde_json::to_string_pretty(&value).map_err(|e| A2UIAgentError::JsonError(e)),
            Err(_) => {
                // If still fails, return original error
                Err(A2UIAgentError::MessageError(
                    "Could not auto-fix JSON format".to_string(),
                ))
            }
        }
    }

    fn validate_a2ui_response(&self, messages: &[A2UIMessageResponse]) -> Result<(), A2UIAgentError> {
        for message in messages {
            let json_value = match message {
                A2UIMessageResponse::BeginRendering(br) => serde_json::to_value(br)?,
                A2UIMessageResponse::SurfaceUpdate(su) => serde_json::to_value(su)?,
                A2UIMessageResponse::DataModelUpdate(dmu) => serde_json::to_value(dmu)?,
                A2UIMessageResponse::DeleteSurface(ds) => serde_json::to_value(ds)?,
            };

            // Validate against the schema
            let result = self.schema_validator.validate(&json_value);
            if let Err(errors) = result {
                let error_messages: Vec<String> = errors
                    .into_iter()
                    .map(|e| format!("Path: {} - Error: {}", e.instance_path, e))
                    .collect();

                return Err(A2UIAgentError::ValidationError(format!(
                    "Schema validation failed: {}",
                    error_messages.join(", ")
                )));
            }
        }

        Ok(())
    }

    // Tool execution methods
    async fn execute_tool(
        &self,
        tool_name: &str,
        parameters: HashMap<String, serde_json::Value>,
    ) -> Result<ToolResult, A2UIAgentError> {
        let _tool = self
            .tools
            .iter()
            .find(|t| t.name == tool_name)
            .ok_or_else(|| A2UIAgentError::ToolNotFound(tool_name.to_string()))?;

        // Mock tool implementations
        match tool_name {
            "get_contact_info" => {
                let name = parameters.get("name").and_then(|v| v.as_str()).unwrap_or("Unknown");

                let contacts = vec![
                    serde_json::json!({
                        "name": "John Doe",
                        "title": "Software Engineer",
                        "department": "Engineering",
                        "email": "john.doe@example.com",
                        "imageUrl": "https://via.placeholder.com/50"
                    }),
                    serde_json::json!({
                        "name": "Jane Smith",
                        "title": "Product Manager",
                        "department": "Product",
                        "email": "jane.smith@example.com",
                        "imageUrl": "https://via.placeholder.com/50"
                    }),
                ];

                let filtered_contacts: Vec<serde_json::Value> = contacts
                    .into_iter()
                    .filter(|c| {
                        c["name"]
                            .as_str()
                            .unwrap_or("")
                            .to_lowercase()
                            .contains(&name.to_lowercase())
                    })
                    .collect();

                Ok(ToolResult {
                    success: true,
                    data: Some(serde_json::json!({
                        "contacts": filtered_contacts,
                        "searchTerm": name
                    })),
                    error: None,
                })
            }
            "create_contact_list" => {
                let contacts = parameters
                    .get("contacts")
                    .and_then(|v| v.as_array())
                    .unwrap_or(&vec![])
                    .clone();

                let title = parameters
                    .get("title")
                    .and_then(|v| v.as_str())
                    .unwrap_or("Contact List");

                Ok(ToolResult {
                    success: true,
                    data: Some(serde_json::json!({
                        "contacts": contacts,
                        "title": title
                    })),
                    error: None,
                })
            }
            "display_search_results" => {
                let results = parameters
                    .get("results")
                    .and_then(|v| v.as_array())
                    .unwrap_or(&vec![])
                    .clone();

                let query = parameters.get("search_query").and_then(|v| v.as_str()).unwrap_or("");

                Ok(ToolResult {
                    success: true,
                    data: Some(serde_json::json!({
                        "results": results,
                        "searchQuery": query
                    })),
                    error: None,
                })
            }
            _ => Ok(ToolResult {
                success: false,
                data: None,
                error: Some(format!("Tool '{}' not implemented", tool_name)),
            }),
        }
    }
}
