use crate::a2ui::agent::{A2UIAgent, GeneratedResponse};
use crate::a2ui::plugin_generator::{
    generate_default_manifest, generate_plugin_code, sanitize_plugin_name, PluginGenerationRequest,
    PluginGenerationResponse,
};
use crate::a2ui::provider::{AIProvider, GeminiProvider, OpenAIProvider};
use crate::rig_agent::{
    AIOptions, AIResponse, ChatMessage, EmbeddingRequest, ImageAnalysisRequest, ImageGenerationRequest,
    ModerationRequest, ModerationResponse, RigAgent, RigAgentError, TokenCountRequest,
};
use axum::{
    extract::{Path, State},
    http::{self},
    response::{sse::Event, IntoResponse, Response, Sse},
    routing::{delete, get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use uuid::Uuid;

// A2UI Schema Types

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TextReference {
    pub literal_string: Option<String>,
    pub path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ValueReference {
    pub literal_string: Option<String>,
    pub literal_number: Option<f64>,
    pub literal_boolean: Option<bool>,
    pub path: Option<String>,
    #[serde(rename = "literalArray")]
    pub literal_array: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Action {
    pub name: String,
    pub context: Option<Vec<ActionContext>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionContext {
    pub key: String,
    pub value: ValueReference,
}

// UI Components

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "component", rename_all = "PascalCase")]
pub enum UIComponent {
    Text {
        text: TextReference,
        #[serde(rename = "usageHint")]
        usage_hint: Option<String>,
    },
    Image {
        url: TextReference,
        fit: Option<String>,
        #[serde(rename = "usageHint")]
        usage_hint: Option<String>,
    },
    Icon {
        name: TextReference,
    },
    Video {
        url: TextReference,
    },
    AudioPlayer {
        url: TextReference,
        description: Option<TextReference>,
    },
    Row {
        children: ComponentChildren,
        distribution: Option<String>,
        alignment: Option<String>,
    },
    Column {
        children: ComponentChildren,
        distribution: Option<String>,
        alignment: Option<String>,
    },
    List {
        children: ComponentChildren,
        direction: Option<String>,
        alignment: Option<String>,
    },
    Card {
        child: String,
    },
    Tabs {
        #[serde(rename = "tabItems")]
        tab_items: Vec<TabItem>,
    },
    Divider {
        axis: Option<String>,
    },
    Modal {
        #[serde(rename = "entryPointChild")]
        entry_point_child: String,
        #[serde(rename = "contentChild")]
        content_child: String,
    },
    Button {
        child: String,
        primary: Option<bool>,
        action: Action,
    },
    CheckBox {
        label: TextReference,
        value: ValueReference,
    },
    TextField {
        label: TextReference,
        text: Option<TextReference>,
        #[serde(rename = "textFieldType")]
        text_field_type: Option<String>,
        #[serde(rename = "validationRegexp")]
        validation_regexp: Option<String>,
    },
    DateTimeInput {
        value: TextReference,
        #[serde(rename = "enableDate")]
        enable_date: Option<bool>,
        #[serde(rename = "enableTime")]
        enable_time: Option<bool>,
    },
    MultipleChoice {
        selections: ValueReference,
        options: Vec<ChoiceOption>,
        #[serde(rename = "maxAllowedSelections")]
        max_allowed_selections: Option<i32>,
    },
    Slider {
        value: ValueReference,
        #[serde(rename = "minValue")]
        min_value: f64,
        #[serde(rename = "maxValue")]
        max_value: f64,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ComponentChildren {
    #[serde(rename = "explicitList")]
    pub explicit_list: Option<Vec<String>>,
    pub template: Option<Template>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Template {
    #[serde(rename = "componentId")]
    pub component_id: String,
    #[serde(rename = "dataBinding")]
    pub data_binding: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TabItem {
    pub title: TextReference,
    pub child: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChoiceOption {
    pub label: TextReference,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UIComponentInstance {
    pub id: String,
    pub weight: Option<f64>,
    pub component: UIComponent,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BeginRendering {
    #[serde(rename = "surfaceId")]
    pub surface_id: String,
    pub root: String,
    pub styles: Option<Styles>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Styles {
    pub font: Option<String>,
    #[serde(rename = "primaryColor")]
    pub primary_color: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SurfaceUpdate {
    #[serde(rename = "surfaceId")]
    pub surface_id: String,
    pub components: Vec<UIComponentInstance>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DataPatch {
    pub path: String,
    pub value: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DataModelUpdate {
    #[serde(rename = "surfaceId")]
    pub surface_id: String,
    pub patches: Vec<DataPatch>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteSurface {
    #[serde(rename = "surfaceId")]
    pub surface_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "t", content = "c")]
pub enum A2UIMessage {
    BeginRendering(BeginRendering),
    SurfaceUpdate(SurfaceUpdate),
    DataModelUpdate(DataModelUpdate),
    DeleteSurface(DeleteSurface),
}

// Application State

#[derive(Debug, Clone)]
pub struct SurfaceState {
    pub id: String,
    pub components: HashMap<String, UIComponentInstance>,
    pub data_model: HashMap<String, serde_json::Value>,
}

#[derive(Clone)]
pub struct AppState {
    pub surfaces: Arc<Mutex<HashMap<String, SurfaceState>>>,
    pub agent: Option<crate::gemini_agent::GeminiAgent>,
    pub a2ui_agent: Option<Arc<A2UIAgent>>,
    pub rig_agent: Option<Arc<RigAgent>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            surfaces: Arc::new(Mutex::new(HashMap::new())),
            agent: Self::create_agent(),
            a2ui_agent: Self::create_a2ui_agent(),
            rig_agent: Self::create_rig_agent(),
        }
    }
}

impl AppState {
    fn create_agent() -> Option<crate::gemini_agent::GeminiAgent> {
        // Try to get API key from environment variable
        std::env::var("GEMINI_API_KEY")
            .ok()
            .map(|api_key| crate::gemini_agent::GeminiAgent::new(api_key).ok())
            .flatten()
    }

    fn create_a2ui_agent() -> Option<Arc<A2UIAgent>> {
        // Try OpenAI first, then fall back to Gemini
        if let Ok(api_key) = std::env::var("OPENAI_API_KEY") {
            let provider = Arc::new(OpenAIProvider::new(api_key)) as Arc<dyn AIProvider>;
            return A2UIAgent::new(provider).ok().map(Arc::new);
        }

        // Fall back to Gemini if OpenAI key not found
        if let Ok(api_key) = std::env::var("GEMINI_API_KEY") {
            let provider = Arc::new(GeminiProvider::new(api_key)) as Arc<dyn AIProvider>;
            return A2UIAgent::new(provider).ok().map(Arc::new);
        }

        None
    }

    fn create_rig_agent() -> Option<Arc<RigAgent>> {
        RigAgent::new().ok().map(Arc::new)
    }
}

// Request/Response Types

#[derive(Debug, Deserialize)]
pub struct CreateSurfaceRequest {
    #[serde(rename = "surfaceId")]
    pub surface_id: Option<String>,
    pub root: String,
    pub styles: Option<Styles>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateComponentRequest {
    #[serde(rename = "surfaceId")]
    pub surface_id: String,
    pub components: Vec<UIComponentInstance>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDataModelRequest {
    #[serde(rename = "surfaceId")]
    pub surface_id: String,
    pub patches: Vec<DataPatch>,
}

#[derive(Debug, Deserialize)]
pub struct UserActionRequest {
    #[serde(rename = "surfaceId")]
    pub surface_id: String,
    pub action: Action,
}

// Utility Functions

fn apply_data_patches(current: &mut HashMap<String, serde_json::Value>, patches: &[DataPatch]) {
    for patch in patches {
        // Parse JSON Pointer path (RFC 6901)
        let path_parts: Vec<&str> = patch.path.trim_start_matches('/').split('/').collect();

        if path_parts.is_empty() || (path_parts.len() == 1 && path_parts[0].is_empty()) {
            // Root path "/" - merge or replace based on value type
            match &patch.value {
                serde_json::Value::Object(map) => {
                    // Merge object properties into current model
                    for (k, v) in map.iter() {
                        current.insert(k.clone(), v.clone());
                    }
                }
                _ => {
                    // For non-object values at root, log warning and skip
                    eprintln!(
                        "Warning: Attempted to set non-object value at root path. Skipping patch with value: {:?}",
                        patch.value
                    );
                }
            }
        } else {
            // Navigate to the target and set value
            set_value_at_path(current, &path_parts, patch.value.clone());
        }
    }
}

fn set_value_at_path(current: &mut HashMap<String, serde_json::Value>, path_parts: &[&str], value: serde_json::Value) {
    if path_parts.is_empty() {
        return;
    }

    if path_parts.len() == 1 {
        // Final key, set the value
        current.insert(path_parts[0].to_string(), value);
    } else {
        // Navigate deeper
        let key = path_parts[0];
        let remaining = &path_parts[1..];

        // Get or create nested object
        let nested = current
            .entry(key.to_string())
            .or_insert_with(|| serde_json::Value::Object(serde_json::Map::new()));

        if let serde_json::Value::Object(nested_map) = nested {
            let mut nested_hash: HashMap<String, serde_json::Value> =
                nested_map.iter().map(|(k, v)| (k.clone(), v.clone())).collect();
            set_value_at_path(&mut nested_hash, remaining, value);
            *nested_map = nested_hash.into_iter().collect();
        }
    }
}

// API Handlers

async fn create_surface(State(state): State<AppState>, Json(request): Json<CreateSurfaceRequest>) -> Json<Value> {
    let surface_id = request.surface_id.unwrap_or_else(|| Uuid::new_v4().to_string());

    let mut surfaces = state.surfaces.lock().unwrap();
    let surface_state = SurfaceState {
        id: surface_id.clone(),
        components: HashMap::new(),
        data_model: HashMap::new(),
    };

    surfaces.insert(surface_id.clone(), surface_state);

    let message = A2UIMessage::BeginRendering(BeginRendering {
        surface_id: surface_id.clone(),
        root: request.root,
        styles: request.styles,
    });

    Json(json!({
        "message": message,
        "surfaceId": surface_id
    }))
}

async fn update_components(State(state): State<AppState>, Json(request): Json<UpdateComponentRequest>) -> Json<Value> {
    let mut surfaces = state.surfaces.lock().unwrap();

    if let Some(surface) = surfaces.get_mut(&request.surface_id) {
        for component in request.components {
            surface.components.insert(component.id.clone(), component);
        }

        let message = A2UIMessage::SurfaceUpdate(SurfaceUpdate {
            surface_id: request.surface_id.clone(),
            components: surface.components.values().cloned().collect(),
        });

        Json(json!({
            "message": message,
            "success": true
        }))
    } else {
        Json(json!({
            "error": "Surface not found",
            "surfaceId": request.surface_id
        }))
    }
}

async fn update_data_model(State(state): State<AppState>, Json(request): Json<UpdateDataModelRequest>) -> Json<Value> {
    let mut surfaces = state.surfaces.lock().unwrap();

    if let Some(surface) = surfaces.get_mut(&request.surface_id) {
        apply_data_patches(&mut surface.data_model, &request.patches);

        let message = A2UIMessage::DataModelUpdate(DataModelUpdate {
            surface_id: request.surface_id.clone(),
            patches: request.patches,
        });

        Json(json!({
            "message": message,
            "success": true
        }))
    } else {
        Json(json!({
            "error": "Surface not found",
            "surfaceId": request.surface_id
        }))
    }
}

async fn handle_user_action(State(state): State<AppState>, Json(request): Json<UserActionRequest>) -> Json<Value> {
    // Handle user actions - this is where you'd implement business logic
    let mut surfaces = state.surfaces.lock().unwrap();

    if let Some(surface) = surfaces.get_mut(&request.surface_id) {
        // Store the action in the data model for potential use
        let action_data = json!({
            "actionName": request.action.name,
            "context": request.action.context,
            "timestamp": chrono::Utc::now().to_rfc3339()
        });

        surface.data_model.insert("lastAction".to_string(), action_data);

        Json(json!({
            "success": true,
            "action": request.action,
            "message": "Action processed successfully"
        }))
    } else {
        Json(json!({
            "error": "Surface not found",
            "surfaceId": request.surface_id
        }))
    }
}

async fn delete_surface(State(state): State<AppState>, Path(surface_id): Path<String>) -> Json<Value> {
    let mut surfaces = state.surfaces.lock().unwrap();

    if surfaces.remove(&surface_id).is_some() {
        let message = A2UIMessage::DeleteSurface(DeleteSurface {
            surface_id: surface_id.clone(),
        });

        Json(json!({
            "message": message,
            "success": true
        }))
    } else {
        Json(json!({
            "error": "Surface not found",
            "surfaceId": surface_id
        }))
    }
}

async fn get_surface(State(state): State<AppState>, Path(surface_id): Path<String>) -> Json<Value> {
    let surfaces = state.surfaces.lock().unwrap();

    if let Some(surface) = surfaces.get(&surface_id) {
        Json(json!({
            "surfaceId": surface.id,
            "components": surface.components.values().collect::<Vec<_>>(),
            "dataModel": surface.data_model
        }))
    } else {
        Json(json!({
            "error": "Surface not found",
            "surfaceId": surface_id
        }))
    }
}

async fn list_surfaces(State(state): State<AppState>) -> Json<Value> {
    let surfaces = state.surfaces.lock().unwrap();

    let surface_list: Vec<String> = surfaces.keys().cloned().collect();

    Json(json!({
        "surfaces": surface_list,
        "count": surface_list.len()
    }))
}

// Example UI Generation Functions

pub fn create_contact_list_example(contacts: &[serde_json::Value]) -> Vec<A2UIMessage> {
    let surface_id = "contact-list".to_string();

    let mut messages = vec![A2UIMessage::BeginRendering(BeginRendering {
        surface_id: surface_id.clone(),
        root: "root-column".to_string(),
        styles: Some(Styles {
            primary_color: Some("#007BFF".to_string()),
            font: Some("Roboto".to_string()),
        }),
    })];

    // Create components
    let components = vec![
        UIComponentInstance {
            id: "root-column".to_string(),
            weight: None,
            component: UIComponent::Column {
                children: ComponentChildren {
                    explicit_list: Some(vec!["title-heading".to_string(), "item-list".to_string()]),
                    template: None,
                },
                distribution: None,
                alignment: None,
            },
        },
        UIComponentInstance {
            id: "title-heading".to_string(),
            weight: None,
            component: UIComponent::Text {
                text: TextReference {
                    literal_string: Some("Found Contacts".to_string()),
                    path: None,
                },
                usage_hint: Some("h1".to_string()),
            },
        },
        UIComponentInstance {
            id: "item-list".to_string(),
            weight: None,
            component: UIComponent::List {
                direction: Some("vertical".to_string()),
                children: ComponentChildren {
                    explicit_list: None,
                    template: Some(Template {
                        component_id: "item-card-template".to_string(),
                        data_binding: "/contacts".to_string(),
                    }),
                },
                alignment: None,
            },
        },
    ];

    messages.push(A2UIMessage::SurfaceUpdate(SurfaceUpdate {
        surface_id: surface_id.clone(),
        components,
    }));

    // Data model update using patches format
    let patches = vec![
        DataPatch {
            path: "/searchPrompt".to_string(),
            value: json!(""),
        },
        DataPatch {
            path: "/contacts".to_string(),
            value: json!(contacts),
        },
    ];

    messages.push(A2UIMessage::DataModelUpdate(DataModelUpdate { surface_id, patches }));

    messages
}

pub fn create_contact_card_example(contact: &serde_json::Value) -> Vec<A2UIMessage> {
    let surface_id = "contact-card".to_string();

    let mut messages = vec![A2UIMessage::BeginRendering(BeginRendering {
        surface_id: surface_id.clone(),
        root: "main-card".to_string(),
        styles: Some(Styles {
            primary_color: Some("#007BFF".to_string()),
            font: Some("Roboto".to_string()),
        }),
    })];

    // Create comprehensive contact card components
    let components = vec![
        UIComponentInstance {
            id: "profile-image".to_string(),
            weight: None,
            component: UIComponent::Image {
                url: TextReference {
                    literal_string: Some(
                        contact["imageUrl"]
                            .as_str()
                            .unwrap_or("https://via.placeholder.com/150")
                            .to_string(),
                    ),
                    path: None,
                },
                fit: Some("cover".to_string()),
                usage_hint: Some("avatar".to_string()),
            },
        },
        UIComponentInstance {
            id: "name-heading".to_string(),
            weight: None,
            component: UIComponent::Text {
                text: TextReference {
                    literal_string: Some(contact["name"].as_str().unwrap_or("").to_string()),
                    path: None,
                },
                usage_hint: Some("h2".to_string()),
            },
        },
        UIComponentInstance {
            id: "title-text".to_string(),
            weight: None,
            component: UIComponent::Text {
                text: TextReference {
                    literal_string: Some(contact["title"].as_str().unwrap_or("").to_string()),
                    path: None,
                },
                usage_hint: Some("body".to_string()),
            },
        },
        UIComponentInstance {
            id: "email-text".to_string(),
            weight: None,
            component: UIComponent::Text {
                text: TextReference {
                    literal_string: Some(format!("Email: {}", contact["email"].as_str().unwrap_or(""))),
                    path: None,
                },
                usage_hint: Some("body".to_string()),
            },
        },
        UIComponentInstance {
            id: "main-column".to_string(),
            weight: None,
            component: UIComponent::Column {
                children: ComponentChildren {
                    explicit_list: Some(vec![
                        "profile-image".to_string(),
                        "name-heading".to_string(),
                        "title-text".to_string(),
                        "email-text".to_string(),
                    ]),
                    template: None,
                },
                alignment: Some("center".to_string()),
                distribution: None,
            },
        },
        UIComponentInstance {
            id: "main-card".to_string(),
            weight: None,
            component: UIComponent::Card {
                child: "main-column".to_string(),
            },
        },
    ];

    messages.push(A2UIMessage::SurfaceUpdate(SurfaceUpdate {
        surface_id: surface_id.clone(),
        components,
    }));

    // Data model update using patches format
    let patches = vec![
        DataPatch {
            path: "/name".to_string(),
            value: json!(contact["name"].as_str().unwrap_or("")),
        },
        DataPatch {
            path: "/title".to_string(),
            value: json!(contact["title"].as_str().unwrap_or("")),
        },
        DataPatch {
            path: "/email".to_string(),
            value: json!(contact["email"].as_str().unwrap_or("")),
        },
        DataPatch {
            path: "/imageUrl".to_string(),
            value: json!(contact["imageUrl"]
                .as_str()
                .unwrap_or("https://via.placeholder.com/150")),
        },
    ];

    messages.push(A2UIMessage::DataModelUpdate(DataModelUpdate { surface_id, patches }));

    messages
}

// Example endpoints for demonstrating the framework

async fn example_contact_list() -> Json<Value> {
    let contacts = vec![
        json!({
            "name": "Alice Wonderland",
            "email": "alice@example.com",
            "title": "Mad Hatter",
            "department": "Wonderland"
        }),
        json!({
            "name": "Bob The Builder",
            "email": "bob@example.com",
            "title": "Construction Engineer",
            "department": "Building"
        }),
    ];

    let messages = create_contact_list_example(&contacts);

    Json(json!({
        "messages": messages,
        "count": contacts.len()
    }))
}

async fn example_contact_card() -> Json<Value> {
    let contact = json!({
        "name": "Alice Wonderland",
        "email": "alice@example.com",
        "title": "Mad Hatter",
        "imageUrl": "https://via.placeholder.com/150"
    });

    let messages = create_contact_card_example(&contact);

    Json(json!({
        "messages": messages,
        "contact": contact
    }))
}

// Agent API Types

#[derive(Debug, Deserialize)]
pub struct CreateSessionRequest {
    pub settings: Option<AgentSettingsOverride>,
}

#[derive(Debug, Deserialize)]
pub struct AgentSettingsOverride {
    pub temperature: Option<f32>,
    pub max_tokens: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct SendMessageRequest {
    pub session_id: String,
    pub content: String,
    pub tool_context: Option<serde_json::Value>,
    pub use_ui: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct SendMessageResponse {
    pub session_id: String,
    pub message_id: String,
    pub content: String,
    pub suggested_ui_type: Option<String>,
    pub conversation_state: String,
}

#[derive(Debug, Serialize)]
pub struct SessionInfo {
    pub id: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
    pub message_count: usize,
    pub conversation_state: String,
}

// Agent API Handlers

pub async fn create_agent_session(
    State(state): State<AppState>,
    Json(request): Json<CreateSessionRequest>,
) -> Result<Json<serde_json::Value>, http::StatusCode> {
    let agent = state.agent.as_ref().ok_or(http::StatusCode::SERVICE_UNAVAILABLE)?;

    let agent_settings = request.settings.map(|override_settings| {
        let mut settings = agent.default_settings.clone();
        if let Some(temp) = override_settings.temperature {
            settings.temperature = temp;
        }
        if let Some(max_tokens) = override_settings.max_tokens {
            settings.max_tokens = max_tokens;
        }
        settings
    });

    match agent.create_session(agent_settings).await {
        Ok(session_id) => Ok(Json(json!({
            "session_id": session_id,
            "status": "created",
            "timestamp": chrono::Utc::now()
        }))),
        Err(_) => Err(http::StatusCode::INTERNAL_SERVER_ERROR),
    }
}

pub async fn send_agent_message(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
    Json(request): Json<SendMessageRequest>,
) -> Result<Json<SendMessageResponse>, http::StatusCode> {
    let agent = state.agent.as_ref().ok_or(http::StatusCode::SERVICE_UNAVAILABLE)?;

    match agent.send_message(&session_id, request.content).await {
        Ok(agent_response) => Ok(Json(SendMessageResponse {
            session_id,
            message_id: agent_response.message_id,
            content: agent_response.content,
            suggested_ui_type: agent_response.suggested_ui_type,
            conversation_state: agent_response.conversation_state,
        })),
        Err(crate::gemini_agent::AgentError::SessionNotFound(_)) => Err(http::StatusCode::NOT_FOUND),
        Err(_) => Err(http::StatusCode::INTERNAL_SERVER_ERROR),
    }
}

pub async fn get_agent_session(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
) -> Result<Json<SessionInfo>, http::StatusCode> {
    let agent = state.agent.as_ref().ok_or(http::StatusCode::SERVICE_UNAVAILABLE)?;

    match agent.get_session(&session_id).await {
        Ok(session) => Ok(Json(SessionInfo {
            id: session.id,
            created_at: session.created_at,
            updated_at: session.updated_at,
            message_count: session.messages.len(),
            conversation_state: format!("{:?}", session.context.conversation_state),
        })),
        Err(crate::gemini_agent::AgentError::SessionNotFound(_)) => Err(http::StatusCode::NOT_FOUND),
        Err(_) => Err(http::StatusCode::INTERNAL_SERVER_ERROR),
    }
}

pub async fn list_agent_sessions(State(state): State<AppState>) -> Result<Json<serde_json::Value>, http::StatusCode> {
    let agent = state.agent.as_ref().ok_or(http::StatusCode::SERVICE_UNAVAILABLE)?;

    match agent.list_sessions().await {
        Ok(session_ids) => Ok(Json(json!({
            "sessions": session_ids,
            "count": session_ids.len(),
            "timestamp": chrono::Utc::now()
        }))),
        Err(_) => Err(http::StatusCode::INTERNAL_SERVER_ERROR),
    }
}

pub async fn delete_agent_session(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
) -> Result<Json<serde_json::Value>, http::StatusCode> {
    let agent = state.agent.as_ref().ok_or(http::StatusCode::SERVICE_UNAVAILABLE)?;

    match agent.delete_session(&session_id).await {
        Ok(_) => Ok(Json(json!({
            "session_id": session_id,
            "status": "deleted",
            "timestamp": chrono::Utc::now()
        }))),
        Err(crate::gemini_agent::AgentError::SessionNotFound(_)) => Err(http::StatusCode::NOT_FOUND),
        Err(_) => Err(http::StatusCode::INTERNAL_SERVER_ERROR),
    }
}

pub fn create_axum_app() -> Router {
    let state = AppState::default();

    Router::new()
        .without_v07_checks()
        // Basic health checks
        .route("/", get(|| async { "A2UI Backend Service - Fleet Chat" }))
        .route("/ping", get(|| async { "pong!" }))
        .route(
            "/ping/json",
            get(|| async {
                (
                    [(http::header::CONTENT_TYPE, "application/json")],
                    Json(json!({
                        "message": "pong!",
                        "status": "success",
                        "service": "A2UI Backend"
                    })),
                )
            }),
        )
        // A2UI Core API endpoints
        .route("/a2ui/surface", post(create_surface))
        .route("/a2ui/surface/{id}/components", post(update_components))
        .route("/a2ui/surface/{id}/data", post(update_data_model))
        .route("/a2ui/surface/{id}/action", post(handle_user_action))
        .route("/a2ui/surface/{id}", delete(delete_surface))
        .route("/a2ui/surface/{id}", get(get_surface))
        .route("/a2ui/surfaces", get(list_surfaces))
        // Example endpoints for demonstration
        .route("/a2ui/examples/contact-list", get(example_contact_list))
        .route("/a2ui/examples/contact-card", get(example_contact_card))
        // Gemini Agent API endpoints
        .route("/agent/session", post(create_agent_session))
        .route("/agent/session/{id}/message", post(send_agent_message))
        .route("/agent/session/{id}", get(get_agent_session))
        .route("/agent/session/{id}", delete(delete_agent_session))
        .route("/agent/sessions", get(list_agent_sessions))
        // A2UI Agent API endpoints
        .route("/a2ui/agent/chat", post(a2ui_agent_chat))
        .route("/a2ui/agent/chat/stream", post(a2ui_agent_chat_stream))
        .route("/a2ui/agent/session/{id}", get(get_a2ui_session))
        .route("/a2ui/agent/sessions", get(list_a2ui_sessions))
        // A2UI Plugin Generation API
        .route("/a2ui/generate-plugin", post(generate_plugin))
        .route("/a2ui/generate-plugin/stream", post(generate_plugin_stream))
        // Rig AI Agent endpoints
        .route("/ai/generate", post(ai_generate))
        .route("/ai/generate/stream", post(ai_generate_stream))
        .route("/ai/chat", post(ai_chat))
        .route("/ai/embed", post(ai_embed))
        .route("/ai/moderate", post(ai_moderate))
        .route("/ai/generate_image", post(ai_generate_image))
        .route("/ai/analyze_image", post(ai_analyze_image))
        .route("/ai/count_tokens", post(ai_count_tokens))
        .route("/ai/models", get(ai_get_models))
        .with_state(state)
}

// A2UI Agent Handler Functions

async fn a2ui_agent_chat(
    State(state): State<AppState>,
    Json(request): Json<serde_json::Value>,
) -> Result<Json<GeneratedResponse>, http::StatusCode> {
    let agent = state.a2ui_agent.as_ref().ok_or(http::StatusCode::SERVICE_UNAVAILABLE)?;

    // Create a SendMessageRequest from the JSON value
    let session_id = request
        .get("session_id")
        .and_then(|v| v.as_str())
        .ok_or(http::StatusCode::BAD_REQUEST)?
        .to_string();

    let content = request
        .get("content")
        .and_then(|v| v.as_str())
        .ok_or(http::StatusCode::BAD_REQUEST)?
        .to_string();

    let tool_context = request.get("tool_context").and_then(|v| v.as_object()).map(|obj| {
        obj.iter()
            .filter_map(|(k, v)| v.as_str().map(|s| (k.clone(), s.to_string())))
            .collect()
    });

    let send_request = SendMessageRequest {
        session_id,
        content,
        use_ui: Some(true), // Default to true for A2UI agent
        tool_context,
    };

    match agent
        .handle_message(
            &send_request.session_id,
            &send_request.content,
            send_request.use_ui.unwrap_or(true),
        )
        .await
    {
        Ok(response) => Ok(Json(response)),
        Err(_) => Err(http::StatusCode::INTERNAL_SERVER_ERROR),
    }
}

// Streaming A2UI Chat via Server-Sent Events (SSE)
async fn a2ui_agent_chat_stream(
    State(state): State<AppState>,
    Json(request): Json<serde_json::Value>,
) -> Result<Response, http::StatusCode> {
    println!("[DEBUG] a2ui_agent_chat_stream called");

    let agent = state
        .a2ui_agent
        .as_ref()
        .ok_or(http::StatusCode::SERVICE_UNAVAILABLE)?
        .clone();

    println!("[DEBUG] Agent available: true");

    // Create a SendMessageRequest from the JSON value
    let session_id = request
        .get("session_id")
        .and_then(|v| v.as_str())
        .ok_or(http::StatusCode::BAD_REQUEST)?
        .to_string();

    let content = request
        .get("content")
        .and_then(|v| v.as_str())
        .ok_or(http::StatusCode::BAD_REQUEST)?
        .to_string();

    let tool_context = request.get("tool_context").and_then(|v| v.as_object()).map(|obj| {
        obj.iter()
            .filter_map(|(k, v)| v.as_str().map(|s| (k.clone(), s.to_string())))
            .collect()
    });

    println!(
        "[DEBUG] Parsed request - session_id: {}, content: {}",
        session_id, content
    );

    let send_request = SendMessageRequest {
        session_id,
        content,
        use_ui: Some(true), // Default to true for A2UI agent
        tool_context,
    };

    println!("[DEBUG] SendRequest created: {:?}", send_request);

    // Simple SSE implementation that sends all A2UI messages
    let (tx, rx) = tokio::sync::mpsc::channel::<Result<Event, std::convert::Infallible>>(32);

    // Spawn a task to handle the agent response and send messages
    tokio::spawn(async move {
        println!("[DEBUG] Starting SSE task");

        // Send initial processing event
        let processing_data = json!({
            "type": "processing",
            "message": "Generating response...",
            "timestamp": chrono::Utc::now().to_rfc3339()
        });

        println!("[DEBUG] Sending processing event: {}", processing_data);

        if tx
            .send(Ok(Event::default().data(processing_data.to_string()).event("update")))
            .await
            .is_err()
        {
            println!("[ERROR] Failed to send processing event");
            return;
        }

        // Get response from agent
        println!("[DEBUG] Calling agent.send_message...");
        match agent
            .handle_message(
                &send_request.session_id,
                &send_request.content,
                send_request.use_ui.unwrap_or(true),
            )
            .await
        {
            Ok(response) => {
                println!(
                    "[DEBUG] Agent response received, message count: {}, content length: {}",
                    response.a2ui_messages.len(),
                    response.content.len()
                );
                let message_count = response.a2ui_messages.len();

                // If there are A2UI messages, send them
                if !response.a2ui_messages.is_empty() {
                    for (i, a2ui_message) in response.a2ui_messages.into_iter().enumerate() {
                        let message_data = json!({
                            "type": "a2ui_message",
                            "message_index": i,
                            "a2ui_message": a2ui_message
                        });

                        println!("[DEBUG] Sending A2UI message {}: {}", i, message_data);

                        if tx
                            .send(Ok(Event::default()
                                .data(message_data.to_string())
                                .event("a2ui_message")))
                            .await
                            .is_err()
                        {
                            println!("[ERROR] Failed to send A2UI message {}", i);
                            break;
                        }
                    }
                } else {
                    // No A2UI messages, send the content as a regular message
                    let content_data = json!({
                        "type": "content_message",
                        "content": response.content
                    });

                    println!("[DEBUG] Sending content message: {}", content_data);

                    if tx
                        .send(Ok(Event::default().data(content_data.to_string()).event("content")))
                        .await
                        .is_err()
                    {
                        println!("[ERROR] Failed to send content message");
                    }
                }

                // Send completion event
                let completion_data = json!({
                    "type": "completed",
                    "message_count": message_count,
                    "timestamp": chrono::Utc::now().to_rfc3339()
                });

                println!("[DEBUG] Sending completion event: {}", completion_data);
                let _ = tx.send(Ok(Event::default().data(completion_data.to_string()).event("complete")));
            }
            Err(e) => {
                println!("[ERROR] Agent error: {:?}", e);
                // Send error event
                let error_data = json!({
                    "type": "error",
                    "message": format!("Failed to generate response: {}", e),
                    "timestamp": chrono::Utc::now().to_rfc3339()
                });
                println!("[DEBUG] Sending error event: {}", error_data);
                let _ = tx.send(Ok(Event::default().data(error_data.to_string()).event("error")));
            }
        }
    });

    // Convert the channel receiver to a stream
    let stream = tokio_stream::wrappers::ReceiverStream::new(rx);

    println!("[DEBUG] Returning SSE response");
    Ok(Sse::new(stream).into_response())
}

async fn get_a2ui_session(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
) -> Result<Json<serde_json::Value>, http::StatusCode> {
    let agent = state.a2ui_agent.as_ref().ok_or(http::StatusCode::SERVICE_UNAVAILABLE)?;

    match agent.get_session(&session_id).await {
        Ok(session) => Ok(Json(json!({
            "session_id": session_id,
            "created_at": session.created_at,
            "message_count": session.messages.len(),
            "last_activity": session.updated_at
        }))),
        Err(_) => Err(http::StatusCode::NOT_FOUND),
    }
}

async fn list_a2ui_sessions(State(state): State<AppState>) -> Result<Json<serde_json::Value>, http::StatusCode> {
    let agent = state.a2ui_agent.as_ref().ok_or(http::StatusCode::SERVICE_UNAVAILABLE)?;

    match agent.list_sessions().await {
        Ok(sessions) => Ok(Json(json!({
            "sessions": sessions,
            "count": sessions.len()
        }))),
        Err(_) => Err(http::StatusCode::INTERNAL_SERVER_ERROR),
    }
}

// ============================================================================
// Rig AI Agent Handlers
// ============================================================================

// Helper function to convert RigAgentError to HTTP status
fn rig_error_to_status(error: RigAgentError) -> http::StatusCode {
    match error {
        RigAgentError::ProviderNotConfigured => http::StatusCode::SERVICE_UNAVAILABLE,
        RigAgentError::ApiKeyNotFound(_) => http::StatusCode::UNAUTHORIZED,
        RigAgentError::InvalidModel(_) => http::StatusCode::BAD_REQUEST,
        RigAgentError::NotSupported(_) => http::StatusCode::NOT_IMPLEMENTED,
        RigAgentError::PromptError(_) => http::StatusCode::BAD_REQUEST,
        RigAgentError::EmbeddingError(_) => http::StatusCode::BAD_REQUEST,
        RigAgentError::HttpError(_) => http::StatusCode::BAD_GATEWAY,
        RigAgentError::JsonError(_) => http::StatusCode::INTERNAL_SERVER_ERROR,
        RigAgentError::IoError(_) => http::StatusCode::INTERNAL_SERVER_ERROR,
        RigAgentError::Other(_) => http::StatusCode::INTERNAL_SERVER_ERROR,
    }
}

// AI Generate endpoint
async fn ai_generate(
    State(state): State<AppState>,
    Json(options): Json<AIOptions>,
) -> Result<Json<AIResponse>, http::StatusCode> {
    let agent = state.rig_agent.as_ref().ok_or(http::StatusCode::SERVICE_UNAVAILABLE)?;

    agent.generate(options).await.map(Json).map_err(rig_error_to_status)
}

// AI Generate Stream endpoint (SSE)
async fn ai_generate_stream(
    State(state): State<AppState>,
    Json(options): Json<AIOptions>,
) -> Result<Response, http::StatusCode> {
    let agent = state.rig_agent.as_ref().ok_or(http::StatusCode::SERVICE_UNAVAILABLE)?;

    let text = agent.generate_stream(options).await.map_err(rig_error_to_status)?;

    // Convert the result to SSE
    let (tx, rx) = tokio::sync::mpsc::channel::<Result<Event, std::convert::Infallible>>(32);

    tokio::spawn(async move {
        // Send the text as a single chunk
        let data = json!({ "text": text });
        if tx
            .send(Ok(Event::default().data(data.to_string()).event("chunk")))
            .await
            .is_err()
        {
            return;
        }

        // Send completion event
        let _ = tx.send(Ok(Event::default().event("done")));
    });

    let stream = tokio_stream::wrappers::ReceiverStream::new(rx);
    Ok(Sse::new(stream).into_response())
}

// AI Chat endpoint
async fn ai_chat(
    State(state): State<AppState>,
    Json(request): Json<serde_json::Value>,
) -> Result<Json<AIResponse>, http::StatusCode> {
    let agent = state.rig_agent.as_ref().ok_or(http::StatusCode::SERVICE_UNAVAILABLE)?;

    let messages: Vec<ChatMessage> = serde_json::from_value(serde_json::Value::Array(
        request
            .get("messages")
            .and_then(|v| v.as_array())
            .ok_or(http::StatusCode::BAD_REQUEST)?
            .to_owned(),
    ))
    .map_err(|_| http::StatusCode::BAD_REQUEST)?;

    let options: Option<AIOptions> = request
        .get("options")
        .and_then(|v| v.as_object())
        .and_then(|obj| serde_json::from_value(serde_json::Value::Object(obj.clone())).ok());

    agent
        .chat(messages, options)
        .await
        .map(Json)
        .map_err(rig_error_to_status)
}

// AI Embed endpoint
async fn ai_embed(
    State(state): State<AppState>,
    Json(request): Json<EmbeddingRequest>,
) -> Result<Json<serde_json::Value>, http::StatusCode> {
    let agent = state.rig_agent.as_ref().ok_or(http::StatusCode::SERVICE_UNAVAILABLE)?;

    let embedding = agent
        .embed(request.text, request.model)
        .await
        .map_err(rig_error_to_status)?;

    Ok(Json(json!({ "embedding": embedding })))
}

// AI Moderate endpoint
async fn ai_moderate(
    State(state): State<AppState>,
    Json(request): Json<ModerationRequest>,
) -> Result<Json<ModerationResponse>, http::StatusCode> {
    let agent = state.rig_agent.as_ref().ok_or(http::StatusCode::SERVICE_UNAVAILABLE)?;

    agent
        .moderate(request.content)
        .await
        .map(Json)
        .map_err(rig_error_to_status)
}

// AI Generate Image endpoint
async fn ai_generate_image(
    State(state): State<AppState>,
    Json(request): Json<ImageGenerationRequest>,
) -> Result<Json<serde_json::Value>, http::StatusCode> {
    let agent = state.rig_agent.as_ref().ok_or(http::StatusCode::SERVICE_UNAVAILABLE)?;

    let urls = agent.generate_image(request).await.map_err(rig_error_to_status)?;

    Ok(Json(json!({ "urls": urls })))
}

// AI Analyze Image endpoint
async fn ai_analyze_image(
    State(state): State<AppState>,
    Json(request): Json<ImageAnalysisRequest>,
) -> Result<Json<serde_json::Value>, http::StatusCode> {
    let agent = state.rig_agent.as_ref().ok_or(http::StatusCode::SERVICE_UNAVAILABLE)?;

    let analysis = agent.analyze_image(request).await.map_err(rig_error_to_status)?;

    Ok(Json(json!({ "analysis": analysis })))
}

// AI Count Tokens endpoint
async fn ai_count_tokens(
    State(state): State<AppState>,
    Json(request): Json<TokenCountRequest>,
) -> Result<Json<serde_json::Value>, http::StatusCode> {
    let agent = state.rig_agent.as_ref().ok_or(http::StatusCode::SERVICE_UNAVAILABLE)?;

    let count = agent
        .count_tokens(request.text, request.model)
        .await
        .map_err(rig_error_to_status)?;

    Ok(Json(json!({ "count": count })))
}

// AI Get Models endpoint
async fn ai_get_models(State(state): State<AppState>) -> Result<Json<serde_json::Value>, http::StatusCode> {
    let agent = state.rig_agent.as_ref().ok_or(http::StatusCode::SERVICE_UNAVAILABLE)?;

    let models = agent.get_models().await.map_err(rig_error_to_status)?;

    Ok(Json(json!({ "models": models })))
}

// ============================================================================
// A2UI Plugin Generation Endpoints
// ============================================================================

/// Generate a Fleet Chat plugin using A2UI agent
async fn generate_plugin(
    State(state): State<AppState>,
    Json(request): Json<PluginGenerationRequest>,
) -> Result<Json<PluginGenerationResponse>, http::StatusCode> {
    // Get plugin type (default to "list")
    let plugin_type = request.plugin_type.as_deref().unwrap_or("list");

    // Generate plugin name from description if not provided
    let plugin_name = request
        .name
        .as_ref()
        .map(|s| s.as_str())
        .unwrap_or(&request.description);

    let sanitized_name = sanitize_plugin_name(plugin_name);

    // Generate manifest
    let manifest = generate_default_manifest(plugin_name, &request.description, plugin_type);

    // Generate plugin code
    let requirements = request.requirements.unwrap_or_default();
    let include_sample_data = request.include_sample_data.unwrap_or(true);

    let source_code = generate_plugin_code(&manifest, plugin_type, &requirements, include_sample_data)
        .map_err(|_| http::StatusCode::INTERNAL_SERVER_ERROR)?;

    // Generate explanation using Rig agent if available
    let explanation = if let Some(agent) = state.rig_agent.as_ref() {
        // Use AI to generate a better explanation
        let prompt = format!(
            "Explain the following plugin that was generated:\n\nName: {}\nDescription: {}\nType: {}\n\nProvide a brief, helpful explanation for the user.",
            manifest.name, manifest.description, plugin_type
        );

        match agent.generate(AIOptions {
            prompt,
            model: None,
            temperature: None,
            max_tokens: None,
            top_p: None,
            frequency_penalty: None,
            presence_penalty: None,
        }).await {
            Ok(response) => response.text,
            Err(_) => format!(
                "Generated a {} plugin named '{}'. {}",
                plugin_type, manifest.name, manifest.description
            ),
        }
    } else {
        format!(
            "Generated a {} plugin named '{}'. {}",
            plugin_type, manifest.name, manifest.description
        )
    };

    // Generate warnings if any
    let warnings = if requirements.is_empty() {
        Some(vec![
            "No specific requirements provided. The plugin uses a generic template.".to_string(),
            "Consider customizing the generated code to match your specific needs.".to_string(),
        ])
    } else {
        None
    };

    let response = PluginGenerationResponse {
        manifest: manifest.clone(),
        source_code,
        plugin_id: format!("plugin-{}", uuid::Uuid::new_v4()),
        package_name: format!("{}.fcp", sanitized_name),
        explanation,
        warnings,
    };

    Ok(Json(response))
}

/// Generate a Fleet Chat plugin with streaming response
async fn generate_plugin_stream(
    State(_state): State<AppState>,
    Json(request): Json<PluginGenerationRequest>,
) -> Result<Sse<impl futures_util::Stream<Item = Result<Event, std::convert::Infallible>>>, http::StatusCode> {
    use futures_util::stream;

    // First, generate the plugin synchronously
    let plugin_type = request.plugin_type.as_deref().unwrap_or("list");
    let plugin_name = request
        .name
        .as_ref()
        .map(|s| s.as_str())
        .unwrap_or(&request.description);

    let sanitized_name = sanitize_plugin_name(plugin_name);
    let manifest = generate_default_manifest(plugin_name, &request.description, plugin_type);

    let requirements = request.requirements.unwrap_or_default();
    let include_sample_data = request.include_sample_data.unwrap_or(true);

    let source_code = generate_plugin_code(&manifest, plugin_type, &requirements, include_sample_data)
        .map_err(|_| http::StatusCode::INTERNAL_SERVER_ERROR)?;

    // Create streaming events
    let events = vec![
        Event::default()
            .json_data(json!({
                "type": "status",
                "message": "Generating plugin manifest...",
                "progress": 25
            }))
            .unwrap(),
        Event::default()
            .json_data(json!({
                "type": "status",
                "message": "Generating plugin code...",
                "progress": 50
            }))
            .unwrap(),
        Event::default()
            .json_data(json!({
                "type": "status",
                "message": "Validating plugin structure...",
                "progress": 75
            }))
            .unwrap(),
        Event::default()
            .json_data(json!({
                "type": "complete",
                "progress": 100,
                "data": {
                    "manifest": manifest,
                    "source_code": source_code,
                    "plugin_id": format!("plugin-{}", uuid::Uuid::new_v4()),
                    "package_name": format!("{}.fcp", sanitized_name),
                    "explanation": format!("Generated a {} plugin named '{}'.", plugin_type, manifest.name),
                }
            }))
            .unwrap(),
    ];

    let stream = stream::iter(events.into_iter().map(Ok));
    Ok(Sse::new(stream))
}

// ============================================================================
// Router Creation
// ============================================================================
