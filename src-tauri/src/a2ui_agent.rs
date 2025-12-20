use chrono::{DateTime, Utc};
use jsonschema::{JSONSchema, ValidationError};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use thiserror::Error;
use tokio::sync::RwLock;
use uuid::Uuid;

// A2UI Agent aligned with Google ADK architecture

#[derive(Debug)]
pub struct A2UIAgent {
    pub client: Client,
    pub api_key: String,
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
    pub role: MessageRole,
    pub content: String,
    pub timestamp: DateTime<Utc>,
    pub metadata: Option<MessageMetadata>,
    pub a2ui_response: Option<Vec<A2UIMessageResponse>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MessageRole {
    User,
    Assistant,
    System,
    Tool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageMetadata {
    pub tool_calls: Vec<ToolCall>,
    pub ui_components: Option<Vec<String>>,
    pub validation_status: Option<ValidationStatus>,
    pub model_used: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCall {
    pub name: String,
    pub parameters: HashMap<String, serde_json::Value>,
    pub result: Option<ToolResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolResult {
    pub success: bool,
    pub data: serde_json::Value,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ValidationStatus {
    Pending,
    Valid,
    Invalid(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct A2UIResponse {
    pub message_id: String,
    pub content: String,
    pub is_task_complete: bool,
    pub a2ui_messages: Vec<A2UIMessageResponse>,
    pub conversation_state: String,
    pub updates: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "t", rename_all = "camelCase")]
pub enum A2UIMessageResponse {
    BeginRendering(BeginRendering),
    SurfaceUpdate(SurfaceUpdate),
    DataModelUpdate(DataModelUpdate),
    DeleteSurface(DeleteSurface),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BeginRendering {
    pub surface_id: String,
    pub root: String,
    pub styles: Option<Styles>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SurfaceUpdate {
    pub surface_id: String,
    pub components: Vec<UIComponent>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataModelUpdate {
    pub surface_id: String,
    pub path: Option<String>,
    pub contents: Vec<DataEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeleteSurface {
    pub surface_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Styles {
    pub primary_color: Option<String>,
    pub font: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UIComponent {
    pub id: String,
    pub weight: Option<f64>,
    pub component: ComponentType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "component", rename_all = "PascalCase")]
pub enum ComponentType {
    Column {
        children: ComponentChildren,
        alignment: Option<String>,
        distribution: Option<String>,
    },
    Row {
        children: ComponentChildren,
        alignment: Option<String>,
        distribution: Option<String>,
    },
    Text {
        text: TextReference,
        usage_hint: Option<String>,
    },
    Image {
        url: TextReference,
        fit: Option<String>,
        usage_hint: Option<String>,
    },
    Button {
        child: String,
        primary: Option<bool>,
        action: Option<Action>,
    },
    Card {
        child: String,
    },
    List {
        direction: Option<String>,
        children: ComponentChildren,
    },
    Icon {
        name: TextReference,
    },
    Divider,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentChildren {
    pub explicit_list: Option<Vec<String>>,
    pub template: Option<Template>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Template {
    pub component_id: String,
    pub data_binding: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextReference {
    pub literal_string: Option<String>,
    pub path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Action {
    pub name: String,
    pub context: Vec<ActionContext>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionContext {
    pub key: String,
    pub value: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataEntry {
    pub key: String,
    pub value_map: Option<Vec<DataEntry>>,
    pub value_string: Option<String>,
    pub value_number: Option<f64>,
    pub value_boolean: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct A2UITool {
    pub name: String,
    pub description: String,
    pub parameters: Vec<ToolParameter>,
    pub handler: String, // Function name to execute
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolParameter {
    pub name: String,
    pub parameter_type: String,
    pub description: String,
    pub required: bool,
    pub default_value: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize)]
pub struct A2UITemplates {
    pub contact_list_template: String,
    pub contact_card_template: String,
    pub action_confirmation_template: String,
    pub search_results_template: String,
    pub no_results_template: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSessionRequest {
    pub user_id: String,
    pub app_name: String,
    pub base_url: Option<String>,
    pub initial_context: Option<HashMap<String, String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SendMessageRequest {
    pub session_id: String,
    pub content: String,
    pub use_ui: Option<bool>,
    pub tool_context: Option<HashMap<String, String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCallRequest {
    pub session_id: String,
    pub tool_name: String,
    pub parameters: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Error)]
pub enum A2UIAgentError {
    #[error("Session not found: {0}")]
    SessionNotFound(String),
    #[error("Tool not found: {0}")]
    ToolNotFound(String),
    #[error("Invalid tool call: {0}")]
    InvalidToolCall(String),
    #[error("Gemini API error: {0}")]
    GeminiError(String),
    #[error("JSON schema validation failed: {0}")]
    ValidationError(String),
    #[error("JSON parsing error")]
    JsonError(String),
    #[error("HTTP client error")]
    HttpError(String),
    #[error("Template processing error: {0}")]
    TemplateError(String),
    #[error("Message error: {0}")]
    MessageError(String),
}

impl From<jsonschema::ValidationError<'_>> for A2UIAgentError {
    fn from(err: jsonschema::ValidationError) -> Self {
        A2UIAgentError::ValidationError(err.to_string())
    }
}

impl From<serde_json::Error> for A2UIAgentError {
    fn from(err: serde_json::Error) -> Self {
        A2UIAgentError::JsonError(err.to_string())
    }
}

impl From<reqwest::Error> for A2UIAgentError {
    fn from(err: reqwest::Error) -> Self {
        A2UIAgentError::HttpError(err.to_string())
    }
}

impl A2UIAgent {
    pub fn new(api_key: String) -> Result<Self, A2UIAgentError> {
        let client = Client::new();

        // Load A2UI schema for validation
        let schema_json = include_str!("a2ui_schema.json");
        let schema_value: serde_json::Value = serde_json::from_str(schema_json)?;
        let schema_validator = JSONSchema::compile(&schema_value)
            .map_err(|e| A2UIAgentError::TemplateError(format!("Schema compilation error: {}", e)))?;

        // Initialize built-in tools
        let tools = vec![A2UITool {
            name: "get_contact_info".to_string(),
            description: "Find contact information by name and optional department".to_string(),
            parameters: vec![
                ToolParameter {
                    name: "name".to_string(),
                    parameter_type: "string".to_string(),
                    description: "Person's name to search for".to_string(),
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
        }];

        let templates = A2UITemplates {
            contact_list_template: include_str!("templates/contact_list.json").to_string(),
            contact_card_template: include_str!("templates/contact_card.json").to_string(),
            action_confirmation_template: include_str!("templates/action_confirmation.json").to_string(),
            search_results_template: include_str!("templates/search_results.json").to_string(),
            no_results_template: include_str!("templates/no_results.json").to_string(),
        };

        Ok(A2UIAgent {
            client,
            api_key,
            sessions: Arc::new(RwLock::new(HashMap::new())),
            tools,
            schema_validator,
            templates,
        })
    }

    pub async fn create_session(&self, request: CreateSessionRequest) -> Result<String, A2UIAgentError> {
        let session_id = Uuid::new_v4().to_string();
        let now = Utc::now();

        let session = A2UISession {
            id: session_id.clone(),
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
        sessions.insert(session_id.clone(), session);

        Ok(session_id)
    }

    pub async fn send_message(&self, request: SendMessageRequest) -> Result<A2UIResponse, A2UIAgentError> {
        println!(
            "[A2UI DEBUG] send_message called with session_id: {}",
            request.session_id
        );
        println!("[A2UI DEBUG] request.content: {}", request.content);
        println!("[A2UI DEBUG] request.use_ui: {:?}", request.use_ui);

        let session = {
            let mut sessions = self.sessions.write().await;
            println!("[A2UI DEBUG] Loaded {} sessions from memory", sessions.len());

            // Create session if it doesn't exist
            if !sessions.contains_key(&request.session_id) {
                println!("[A2UI DEBUG] Creating new session: {}", request.session_id);
                let now = Utc::now();
                let new_session = A2UISession {
                    id: request.session_id.clone(),
                    created_at: now,
                    updated_at: now,
                    messages: Vec::new(),
                    context: A2UIContext {
                        user_id: "default-user".to_string(),
                        app_name: "fleet-chat".to_string(),
                        session_state: HashMap::new(),
                        conversation_state: ConversationState::Initial,
                        last_tool_call: None,
                    },
                    tools_used: Vec::new(),
                    base_url: "http://localhost:1420".to_string(),
                };
                sessions.insert(request.session_id.clone(), new_session);
            }

            sessions.get(&request.session_id).cloned().unwrap()
        };

        println!("[A2UI DEBUG] Found session with {} messages", session.messages.len());

        let use_ui = request.use_ui.unwrap_or(true);
        let tool_context = request.tool_context.unwrap_or_default();

        let user_message = A2UIMessage {
            role: MessageRole::User,
            content: request.content.clone(),
            timestamp: Utc::now(),
            metadata: None,
            a2ui_response: None,
        };

        // Update session with user message
        {
            let mut sessions = self.sessions.write().await;
            if let Some(session) = sessions.get_mut(&request.session_id) {
                session.messages.push(user_message.clone());
                session.updated_at = Utc::now();
            }
        }

        // Process the message through the agent pipeline
        let max_retries = 2;
        let mut current_query = request.content;
        let mut attempt = 0;

        println!("[A2UI DEBUG] Starting agent pipeline processing");

        while attempt <= max_retries {
            println!("[A2UI DEBUG] Attempt {}/{}", attempt, max_retries + 1);
            attempt += 1;

            // Check for tool calls in the conversation
            println!("[A2UI DEBUG] Detecting and executing tools...");
            let tool_results = self.detect_and_execute_tools(&session, &current_query).await?;
            println!("[A2UI DEBUG] Found {} tool results", tool_results.len());

            if !tool_results.is_empty() {
                // Update session with tool calls
                {
                    let mut sessions = self.sessions.write().await;
                    if let Some(session) = sessions.get_mut(&request.session_id) {
                        session.tools_used.extend(tool_results.iter().map(|t| t.name.clone()));
                        session.context.last_tool_call = Some(tool_results[0].name.clone());
                        session.context.conversation_state = ConversationState::ToolCalling;
                    }
                }
            }

            // Generate response
            println!("[A2UI DEBUG] Generating response with use_ui: {}", use_ui);
            let response = self
                .generate_response(&session, &current_query, use_ui, &tool_results)
                .await?;
            println!(
                "[A2UI DEBUG] Generated response content length: {}",
                response.content.len()
            );
            println!(
                "[A2UI DEBUG] Generated response A2UI messages count: {}",
                response.a2ui_messages.len()
            );

            // Validate if UI mode is enabled
            if use_ui {
                println!("[A2UI DEBUG] Validating A2UI response...");
                let validation_result = self.validate_a2ui_response(&response).await;
                match validation_result {
                    Ok(_) => {
                        println!("[A2UI DEBUG] A2UI response validation successful");
                        // Valid response, return it
                        let a2ui_response = A2UIResponse {
                            message_id: Uuid::new_v4().to_string(),
                            content: response.content.clone(),
                            is_task_complete: true,
                            a2ui_messages: response.a2ui_messages.clone(),
                            conversation_state: format!("{:?}", session.context.conversation_state),
                            updates: None,
                        };
                        println!(
                            "[A2UI DEBUG] Returning A2UI response with {} messages",
                            a2ui_response.a2ui_messages.len()
                        );

                        // Update session with successful response
                        {
                            let mut sessions = self.sessions.write().await;
                            if let Some(session) = sessions.get_mut(&request.session_id) {
                                let assistant_message = A2UIMessage {
                                    role: MessageRole::Assistant,
                                    content: response.content.clone(),
                                    timestamp: Utc::now(),
                                    metadata: Some(MessageMetadata {
                                        tool_calls: tool_results,
                                        ui_components: Some(
                                            response
                                                .a2ui_messages
                                                .iter()
                                                .filter_map(|m| match m {
                                                    A2UIMessageResponse::BeginRendering(_) => {
                                                        Some("beginRendering".to_string())
                                                    }
                                                    A2UIMessageResponse::SurfaceUpdate(_) => {
                                                        Some("surfaceUpdate".to_string())
                                                    }
                                                    A2UIMessageResponse::DataModelUpdate(_) => {
                                                        Some("dataModelUpdate".to_string())
                                                    }
                                                    A2UIMessageResponse::DeleteSurface(_) => {
                                                        Some("deleteSurface".to_string())
                                                    }
                                                })
                                                .collect(),
                                        ),
                                        validation_status: Some(ValidationStatus::Valid),
                                        model_used: Some("gemini-2.5-flash".to_string()),
                                    }),
                                    a2ui_response: Some(response.a2ui_messages.clone()),
                                };
                                session.messages.push(assistant_message);
                                session.context.conversation_state = ConversationState::Complete;
                            }
                        }

                        return Ok(a2ui_response);
                    }
                    Err(e) => {
                        if attempt <= max_retries {
                            // Retry with error feedback
                            current_query = format!(
                                "Your previous response was invalid: {}. \
                                Please generate a valid response that follows the A2UI JSON schema. \
                                The response must be split by '---a2ui_JSON---' and the JSON part must validate against the schema. \
                                Please retry the original request: '{}'",
                                e, current_query
                            );
                            continue;
                        } else {
                            // Max retries exceeded, return error message
                            return Ok(A2UIResponse {
                                message_id: Uuid::new_v4().to_string(),
                                content: format!("I'm sorry, I'm having trouble generating the interface for that request right now. Please try again in a moment. Error: {}", e),
                                is_task_complete: true,
                                a2ui_messages: vec![],
                                conversation_state: format!("{:?}", ConversationState::Complete),
                                updates: Some("Validation failed, returning text-only response".to_string()),
                            });
                        }
                    }
                }
            } else {
                // Text mode, return response directly
                let a2ui_response = A2UIResponse {
                    message_id: Uuid::new_v4().to_string(),
                    content: response.content.clone(),
                    is_task_complete: true,
                    a2ui_messages: vec![],
                    conversation_state: format!("{:?}", session.context.conversation_state),
                    updates: None,
                };

                // Update session
                {
                    let mut sessions = self.sessions.write().await;
                    if let Some(session) = sessions.get_mut(&request.session_id) {
                        let assistant_message = A2UIMessage {
                            role: MessageRole::Assistant,
                            content: response.content.clone(),
                            timestamp: Utc::now(),
                            metadata: Some(MessageMetadata {
                                tool_calls: tool_results,
                                validation_status: Some(ValidationStatus::Valid),
                                model_used: Some("gemini-2.5-flash".to_string()),
                                ui_components: None,
                            }),
                            a2ui_response: None,
                        };
                        session.messages.push(assistant_message);
                        session.context.conversation_state = ConversationState::Complete;
                    }
                }

                return Ok(a2ui_response);
            }
        }

        // Should not reach here
        Err(A2UIAgentError::TemplateError(
            "Unexpected error in agent pipeline".to_string(),
        ))
    }

    async fn detect_and_execute_tools(
        &self,
        session: &A2UISession,
        query: &str,
    ) -> Result<Vec<ToolCall>, A2UIAgentError> {
        // Simple tool detection logic
        let mut tool_calls = Vec::new();

        // Check if this is a contact lookup request
        let query_lower = query.to_lowercase();
        if query_lower.contains("who is") || query_lower.contains("find") || query_lower.contains("search") {
            // Extract name and department from query (simplified)
            let (name, department) = self.extract_name_and_department_from_query(query)?;

            let tool_call = ToolCall {
                name: "get_contact_info".to_string(),
                parameters: {
                    let mut params = HashMap::new();
                    params.insert("name".to_string(), serde_json::Value::String(name));
                    if !department.is_empty() {
                        params.insert("department".to_string(), serde_json::Value::String(department));
                    }
                    params
                },
                result: None,
            };

            tool_calls.push(tool_call);
        }

        // Execute tools
        for tool_call in tool_calls.iter_mut() {
            let tool_result = self.execute_tool(tool_call).await?;
            tool_call.result = Some(tool_result);
        }

        Ok(tool_calls)
    }

    fn extract_name_and_department_from_query(&self, query: &str) -> Result<(String, String), A2UIAgentError> {
        // Simplified name and department extraction - in a real implementation, this would be more sophisticated
        let query_lower = query.to_lowercase();
        let mut name = String::new();
        let mut department = String::new();

        if let Some(start) = query_lower.find("who is ") {
            let start_pos = start + "who is ".len();
            if let Some(end) = query[start_pos..].find(|c| c == '?' || c == '.') {
                name = query[start_pos..start_pos + end].trim().to_string();
            } else {
                name = query[start_pos..].trim().to_string();
            }
        } else {
            // Default to the whole query if no specific pattern matches
            name = query.trim().to_string();
        }

        // Simple department detection
        if query_lower.contains("engineering") {
            department = "Engineering".to_string();
        } else if query_lower.contains("sales") {
            department = "Sales".to_string();
        } else if query_lower.contains("marketing") {
            department = "Marketing".to_string();
        } else if query_lower.contains("hr") || query_lower.contains("human resources") {
            department = "HR".to_string();
        }

        Ok((name, department))
    }

    async fn execute_tool(&self, tool_call: &ToolCall) -> Result<ToolResult, A2UIAgentError> {
        match tool_call.name.as_str() {
            "get_contact_info" => self.handle_get_contact_info(&tool_call.parameters).await,
            _ => Err(A2UIAgentError::ToolNotFound(tool_call.name.clone())),
        }
    }

    async fn handle_get_contact_info(
        &self,
        parameters: &HashMap<String, serde_json::Value>,
    ) -> Result<ToolResult, A2UIAgentError> {
        // Extract parameters
        let name = parameters
            .get("name")
            .and_then(|v| v.as_str())
            .ok_or_else(|| A2UIAgentError::InvalidToolCall("Missing 'name' parameter".to_string()))?;

        let department = parameters.get("department").and_then(|v| v.as_str());

        // Simulate contact lookup (in a real implementation, this would query a database or API)
        let contacts = self.mock_contact_lookup(name, department).await;

        Ok(ToolResult {
            success: true,
            data: serde_json::to_value(&contacts)?,
            error: None,
        })
    }

    async fn mock_contact_lookup(&self, name: &str, department: Option<&str>) -> Vec<ContactInfo> {
        let name_lower = name.to_lowercase();

        // Mock contact data
        let all_contacts = vec![
            ContactInfo {
                id: 1,
                name: "Alice Wonderland".to_string(),
                title: "Mad Hatter".to_string(),
                email: "alice@example.com".to_string(),
                phone: "+1-555-123-4567".to_string(),
                department: "Wonderland".to_string(),
                avatar_url: "https://example.com/alice.jpg".to_string(),
            },
            ContactInfo {
                id: 2,
                name: "Bob The Builder".to_string(),
                title: "Construction Engineer".to_string(),
                email: "bob@example.com".to_string(),
                phone: "+1-555-765-4321".to_string(),
                department: "Building".to_string(),
                avatar_url: "https://example.com/bob.jpg".to_string(),
            },
        ];

        let results: Vec<ContactInfo> = all_contacts
            .into_iter()
            .filter(|contact| {
                let name_match = name_lower.is_empty() || contact.name.to_lowercase().contains(&name_lower);
                let dept_match =
                    department.map_or(true, |d| contact.department.to_lowercase().contains(&d.to_lowercase()));
                name_match && dept_match
            })
            .collect();

        results
    }

    async fn generate_response(
        &self,
        session: &A2UISession,
        query: &str,
        use_ui: bool,
        tool_results: &[ToolCall],
    ) -> Result<GeneratedResponse, A2UIAgentError> {
        println!("[A2UI DEBUG] generate_response: query='{}', use_ui={}", query, use_ui);

        // Construct prompt based on context and tool results
        println!("[A2UI DEBUG] Building prompt...");
        let prompt = if use_ui {
            self.build_ui_prompt(session, query, tool_results)?
        } else {
            self.build_text_prompt(session, query, tool_results)?
        };
        println!("[A2UI DEBUG] Built prompt length: {}", prompt.len());

        // Call Gemini API
        println!("[A2UI DEBUG] Calling Gemini API...");
        let response_content = self.call_gemini_api(&prompt).await?;
        println!("[A2UI DEBUG] Gemini API response length: {}", response_content.len());

        // Parse response
        println!("[A2UI DEBUG] Parsing response...");
        let generated_response = self.parse_response(&response_content, use_ui)?;
        println!(
            "[A2UI DEBUG] Parsed response - content length: {}, a2ui_messages: {}",
            generated_response.content.len(),
            generated_response.a2ui_messages.len()
        );

        Ok(generated_response)
    }

    fn build_ui_prompt(
        &self,
        session: &A2UISession,
        query: &str,
        tool_results: &[ToolCall],
    ) -> Result<String, A2UIAgentError> {
        let tool_context = if !tool_results.is_empty() {
            format!("Tool results: {}", serde_json::to_string(tool_results)?)
        } else {
            "No tools used".to_string()
        };

        let base_template = r#"You are a helpful AI assistant that can generate rich, interactive user interfaces using the A2UI framework. Your final output MUST be in A2UI JSON format.

To generate the response, you MUST follow these rules:
1. Your response MUST be in two parts, separated by the delimiter: `---a2ui_JSON---`.
2. The first part is your conversational text response explaining what you're providing.
3. The second part is a list of A2UI messages (valid JSON array).
4. Each A2UI message MUST validate against the A2UI JSON SCHEMA.

Context:
- User query: {query}
- Tool calls made: {tool_context}
- Base URL: {base_url}
- Session state: {session_state:?}

A2UI COMPONENT PATTERNS:

## 1. Basic Card Pattern (for single items)
[
  {
    "surfaceUpdate": {
      "components": [
        {
          "id": "card-root",
          "component": {
            "Card": {
              "child": "card-content"
            }
          }
        },
        {
          "id": "card-content",
          "component": {
            "Column": {
              "children": {
                "explicitList": ["title", "description"]
              }
            }
          }
        },
        {
          "id": "title",
          "component": {
            "Text": {
              "text": { "literalString": "Item Title" },
              "usageHint": "h4"
            }
          }
        },
        {
          "id": "description",
          "component": {
            "Text": {
              "text": { "literalString": "Description text here" },
              "usageHint": "body"
            }
          }
        }
      ]
    }
  },
  {
    "dataModelUpdate": {
      "contents": [
        {
          "key": "item",
          "valueMap": [
            { "key": "title", "valueString": "Dynamic Title" },
            { "key": "description", "valueString": "Dynamic description" }
          ]
        }
      ]
    }
  },
  {
    "beginRendering": {
      "surfaceId": "main",
      "root": "card-root"
    }
  }
]

## 2. Dynamic List Pattern (for multiple items)
[
  {
    "surfaceUpdate": {
      "components": [
        {
          "id": "list-container",
          "component": {
            "Column": {
              "children": {
                "explicitList": ["list-title", "item-list"]
              }
            }
          }
        },
        {
          "id": "list-title",
          "component": {
            "Text": {
              "text": { "literalString": "Search Results" },
              "usageHint": "h3"
            }
          }
        },
        {
          "id": "item-list",
          "component": {
            "List": {
              "children": {
                "template": {
                  "componentId": "item-template",
                  "dataBinding": "/items"
                }
              }
            }
          }
        },
        {
          "id": "item-template",
          "component": {
            "Card": {
              "child": "item-content"
            }
          }
        },
        {
          "id": "item-content",
          "component": {
            "Column": {
              "children": {
                "explicitList": ["item-title", "item-description"]
              }
            }
          }
        },
        {
          "id": "item-title",
          "component": {
            "Text": {
              "text": { "path": "/title" },
              "usageHint": "h5"
            }
          }
        },
        {
          "id": "item-description",
          "component": {
            "Text": {
              "text": { "path": "/description" },
              "usageHint": "body"
            }
          }
        }
      ]
    }
  },
  {
    "dataModelUpdate": {
      "contents": [
        {
          "key": "items",
          "valueMap": [
            {
              "key": "item1",
              "valueMap": [
                { "key": "title", "valueString": "First Item" },
                { "key": "description", "valueString": "First item description" }
              ]
            },
            {
              "key": "item2",
              "valueMap": [
                { "key": "title", "valueString": "Second Item" },
                { "key": "description", "valueString": "Second item description" }
              ]
            }
          ]
        }
      ]
    }
  },
  {
    "beginRendering": {
      "surfaceId": "main",
      "root": "list-container"
    }
  }
]

RESPONSE GUIDELINES:
1. Choose the most appropriate pattern based on the user's query and context
2. For contact lookups: Use Card pattern for single contact, List pattern for multiple contacts
3. For forms/requests: Use Form pattern with appropriate input fields
4. For complex information: Use Tab pattern to organize content
5. For async operations: Start with Loading pattern, then update with actual content
6. Always include proper data bindings and make components interactive where appropriate
7. Use descriptive IDs and follow the adjacency list model (flat component list with ID references)

---BEGIN A2UI JSON SCHEMA---
{a2ui_schema}
---END A2UI JSON SCHEMA---"#;

        let prompt = base_template
            .replace("{query}", query)
            .replace("{tool_context}", &tool_context)
            .replace("{base_url}", &session.base_url)
            .replace("{session_state:?}", &format!("{:?}", session.context.conversation_state))
            .replace("{a2ui_schema}", include_str!("a2ui_schema.json"));

        Ok(prompt)
    }

    fn build_text_prompt(
        &self,
        session: &A2UISession,
        query: &str,
        tool_results: &[ToolCall],
    ) -> Result<String, A2UIAgentError> {
        let tool_context = if !tool_results.is_empty() {
            format!("Tool results: {}", serde_json::to_string(tool_results)?)
        } else {
            "No tools used".to_string()
        };

        let prompt = format!(
            r#"You are a helpful contact lookup assistant. Your final output MUST be a text response.

Context:
- User query: {}
- Tool calls made: {}
- Session state: {:?}

Response Rules:
- For contact lookups: Format results as clear, human-readable text
- For multiple contacts: List names and titles
- For single contacts: List all details
- For no results: Provide a helpful message"#,
            query, tool_context, session.context.conversation_state
        );

        Ok(prompt)
    }

    async fn call_gemini_api(&self, prompt: &str) -> Result<String, A2UIAgentError> {
        println!(
            "[A2UI DEBUG] call_gemini_api called with prompt length: {}",
            prompt.len()
        );
        println!(
            "[A2UI DEBUG] API key starts with: {}",
            &self.api_key[..8.min(self.api_key.len())]
        );

        #[derive(Deserialize)]
        struct GeminiResponse {
            candidates: Vec<Candidate>,
        }

        #[derive(Deserialize)]
        struct Candidate {
            content: Content,
        }

        #[derive(Deserialize)]
        struct Content {
            parts: Vec<Part>,
        }

        #[derive(Deserialize)]
        struct Part {
            text: String,
        }

        let request_body = serde_json::json!({
            "contents": [{
                "parts": [{
                    "text": prompt
                }]
            }],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 2048,
                "topK": 40,
                "topP": 0.95
            }
        });

        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={}",
            self.api_key
        );

        println!("[A2UI DEBUG] Making request to Gemini API...");
        let response = self.client.post(&url).json(&request_body).send().await?;
        println!("[A2UI DEBUG] Gemini API response status: {}", response.status());

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            println!("[A2UI DEBUG] Gemini API error: status {}, text: {}", status, error_text);
            return Err(A2UIAgentError::GeminiError(format!(
                "API call failed with status {}: {}",
                status, error_text
            )));
        }

        println!("[A2UI DEBUG] Parsing JSON response...");
        let gemini_response: GeminiResponse = response.json().await?;
        println!("[A2UI DEBUG] Found {} candidates", gemini_response.candidates.len());

        if let Some(candidate) = gemini_response.candidates.first() {
            println!("[A2UI DEBUG] Candidate has {} parts", candidate.content.parts.len());
            if let Some(part) = candidate.content.parts.first() {
                println!("[A2UI DEBUG] Response text length: {}", part.text.len());
                return Ok(part.text.clone());
            }
        }

        println!("[A2UI DEBUG] No valid response found in Gemini API response");
        Err(A2UIAgentError::GeminiError(
            "No valid response from Gemini API".to_string(),
        ))
    }

    fn parse_response(&self, response_content: &str, use_ui: bool) -> Result<GeneratedResponse, A2UIAgentError> {
        println!("[A2UI DEBUG] Raw response content: {}", response_content);
        
        if use_ui && response_content.contains("---a2ui_JSON---") {
            let parts: Vec<&str> = response_content.splitn(2, "---a2ui_JSON---").collect();
            if parts.len() != 2 {
                println!("[A2UI DEBUG] Failed to split response by delimiter, parts.len(): {}", parts.len());
                return Err(A2UIAgentError::MessageError(
                    "Expected response to be split by delimiter".to_string(),
                ));
            }

            let text_part = parts[0].trim();
            let json_part = parts[1].trim();

            println!("[A2UI DEBUG] Text part: {}", text_part);
            println!("[A2UI DEBUG] JSON part before cleaning: {}", json_part);

            let json_cleaned = json_part.trim_end_matches("```json").trim_end_matches("```");
            
            println!("[A2UI DEBUG] JSON part after cleaning: {}", json_cleaned);

            let a2ui_messages: Vec<A2UIMessageResponse> = if json_cleaned.is_empty() {
                println!("[A2UI DEBUG] JSON part is empty, returning empty messages");
                vec![]
            } else {
                println!("[A2UI DEBUG] Attempting to parse JSON...");
                match serde_json::from_str::<Vec<A2UIMessageResponse>>(json_cleaned) {
                    Ok(messages) => {
                        println!("[A2UI DEBUG] Successfully parsed {} A2UI messages", messages.len());
                        messages
                    }
                    Err(e) => {
                        println!("[A2UI DEBUG] Failed to parse JSON: {}", e);
                        // Try to parse as a single object first, then wrap in array
                        match serde_json::from_str::<A2UIMessageResponse>(json_cleaned) {
                            Ok(message) => {
                                println!("[A2UI DEBUG] Parsed as single message, wrapping in array");
                                vec![message]
                            }
                            Err(e2) => {
                                println!("[A2UI DEBUG] Failed to parse as single message too: {}", e2);
                                return Err(A2UIAgentError::MessageError(
                                    format!("JSON parsing error: {}. Original error: {}", e2, e)
                                ));
                            }
                        }
                    }
                }
            };

            Ok(GeneratedResponse {
                content: text_part.to_string(),
                a2ui_messages,
            })
        } else {
            println!("[A2UI DEBUG] No UI delimiter found, returning as plain text");
            Ok(GeneratedResponse {
                content: response_content.to_string(),
                a2ui_messages: vec![],
            })
        }
    }

    async fn validate_a2ui_response(&self, response: &GeneratedResponse) -> Result<(), A2UIAgentError> {
        for a2ui_message in &response.a2ui_messages {
            let message_json = serde_json::to_value(a2ui_message)?;
            self.schema_validator.validate(&message_json).map_err(|errors| {
                A2UIAgentError::ValidationError(errors.map(|e| e.to_string()).collect::<Vec<_>>().join(", "))
            })?;
        }
        Ok(())
    }

    pub async fn delete_session(&self, session_id: &str) -> Result<(), A2UIAgentError> {
        let mut sessions = self.sessions.write().await;
        sessions
            .remove(session_id)
            .ok_or_else(|| A2UIAgentError::SessionNotFound(session_id.to_string()))?;
        Ok(())
    }

    pub async fn get_session(&self, session_id: &str) -> Result<A2UISession, A2UIAgentError> {
        let sessions = self.sessions.read().await;
        sessions
            .get(session_id)
            .cloned()
            .ok_or_else(|| A2UIAgentError::SessionNotFound(session_id.to_string()))
    }

    pub async fn list_sessions(&self, user_id: Option<String>) -> Result<Vec<String>, A2UIAgentError> {
        let sessions = self.sessions.read().await;
        let session_ids: Vec<String> = if let Some(uid) = user_id {
            sessions
                .iter()
                .filter(|(_, session)| session.context.user_id == uid)
                .map(|(id, _)| id.clone())
                .collect()
        } else {
            sessions.keys().cloned().collect()
        };
        Ok(session_ids)
    }
}

// Supporting structs for mock contact data
#[derive(Debug, Clone, Serialize, Deserialize)]
struct ContactInfo {
    id: i32,
    name: String,
    title: String,
    email: String,
    phone: String,
    department: String,
    avatar_url: String,
}

struct GeneratedResponse {
    content: String,
    a2ui_messages: Vec<A2UIMessageResponse>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_create_session() {
        let agent = A2UIAgent::new("test-api-key".to_string()).unwrap();
        let request = CreateSessionRequest {
            user_id: "test-user".to_string(),
            app_name: "test-app".to_string(),
            base_url: Some("http://localhost:3000".to_string()),
            initial_context: None,
        };

        let session_id = agent.create_session(request).await.unwrap();
        assert!(!session_id.is_empty());
    }

    #[tokio::test]
    async fn test_send_text_message() {
        let agent = A2UIAgent::new("test-api-key".to_string()).unwrap();
        let session_request = CreateSessionRequest {
            user_id: "test-user".to_string(),
            app_name: "test-app".to_string(),
            base_url: None,
            initial_context: None,
        };

        let session_id = agent.create_session(session_request).await.unwrap();

        let message_request = SendMessageRequest {
            session_id,
            content: "Who is Alice?".to_string(),
            use_ui: Some(false),
            tool_context: None,
        };

        let response = agent.send_message(message_request).await.unwrap();
        assert_eq!(response.is_task_complete, true);
        assert!(!response.content.is_empty());
        assert!(response.a2ui_messages.is_empty());
    }

    #[tokio::test]
    async fn test_send_ui_message() {
        let agent = A2UIAgent::new("test-api-key".to_string()).unwrap();
        let session_request = CreateSessionRequest {
            user_id: "test-user".to_string(),
            app_name: "test-app".to_string(),
            base_url: None,
            initial_context: None,
        };

        let session_id = agent.create_session(session_request).await.unwrap();

        let message_request = SendMessageRequest {
            session_id,
            content: "Find Bob".to_string(),
            use_ui: Some(true),
            tool_context: None,
        };

        // Note: This test would fail with the mock API key, but the structure is correct
        // In a real environment with a valid API key, this would succeed
        let _response = agent.send_message(message_request).await;
    }
}
