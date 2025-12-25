//! A2UI Routes - Agent-to-UI backend service endpoints
//!
//! This module contains all HTTP handlers for A2UI (Agent-to-UI) service endpoints.
//! It provides surface management, agent chat with streaming, and plugin generation capabilities.

use crate::a2ui::agent::{A2UIAgent, GeneratedResponse};
use crate::a2ui::plugin_generator::{
    generate_default_manifest, generate_plugin_code, sanitize_plugin_name, PluginGenerationRequest,
    PluginGenerationResponse,
};
use crate::a2ui::schema::*;
use crate::rig_agent::{AIOptions, RigAgent};
use axum::{
    extract::{Path, State},
    http::{self},
    response::{sse::Event, IntoResponse, Response, Sse},
    routing::{delete, get, post},
    Json, Router,
};
use futures_util::stream;
use serde::Deserialize;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use uuid::Uuid;

/// The application state used by A2UI handlers
#[derive(Clone)]
pub struct A2UIState {
    pub surfaces: Arc<Mutex<HashMap<String, SurfaceState>>>,
    pub a2ui_agent: Option<Arc<A2UIAgent>>,
    pub rig_agent: Option<Arc<RigAgent>>,
}

/// State for a single surface
#[derive(Debug, Clone)]
pub struct SurfaceState {
    pub id: String,
    pub components: HashMap<String, UIComponent>,
    pub data_model: HashMap<String, serde_json::Value>,
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
    pub components: Vec<UIComponent>,
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

// ============================================================================
// A2UI Core API Handlers
// ============================================================================

/// Create a new surface for rendering
pub async fn create_surface(State(state): State<A2UIState>, Json(request): Json<CreateSurfaceRequest>) -> Json<Value> {
    let surface_id = request.surface_id.unwrap_or_else(|| Uuid::new_v4().to_string());

    let mut surfaces = state.surfaces.lock().unwrap();
    let surface_state = SurfaceState {
        id: surface_id.clone(),
        components: HashMap::new(),
        data_model: HashMap::new(),
    };

    surfaces.insert(surface_id.clone(), surface_state);

    let message = json!({
        "beginRendering": {
            "surfaceId": surface_id,
            "root": request.root,
            "styles": request.styles
        }
    });

    Json(json!({
        "message": message,
        "surfaceId": surface_id
    }))
}

/// Update components on a surface
pub async fn update_components(
    State(state): State<A2UIState>,
    Json(request): Json<UpdateComponentRequest>,
) -> Json<Value> {
    let mut surfaces = state.surfaces.lock().unwrap();

    if let Some(surface) = surfaces.get_mut(&request.surface_id) {
        for component in request.components {
            surface.components.insert(component.id.clone(), component);
        }

        let message = json!({
            "surfaceUpdate": {
                "surfaceId": request.surface_id,
                "components": surface.components.values().collect::<Vec<_>>()
            }
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

/// Update the data model for a surface
pub async fn update_data_model(
    State(state): State<A2UIState>,
    Json(request): Json<UpdateDataModelRequest>,
) -> Json<Value> {
    let mut surfaces = state.surfaces.lock().unwrap();

    if let Some(surface) = surfaces.get_mut(&request.surface_id) {
        apply_data_patches(&mut surface.data_model, &request.patches);

        let message = json!({
            "dataModelUpdate": {
                "surfaceId": request.surface_id,
                "patches": request.patches
            }
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

/// Handle user actions from the UI
pub async fn handle_user_action(State(state): State<A2UIState>, Json(request): Json<UserActionRequest>) -> Json<Value> {
    let mut surfaces = state.surfaces.lock().unwrap();

    if let Some(surface) = surfaces.get_mut(&request.surface_id) {
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

/// Delete a surface
pub async fn delete_surface(State(state): State<A2UIState>, Path(surface_id): Path<String>) -> Json<Value> {
    let mut surfaces = state.surfaces.lock().unwrap();

    if surfaces.remove(&surface_id).is_some() {
        let message = json!({
            "deleteSurface": {
                "surfaceId": surface_id
            }
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

/// Get a surface by ID
pub async fn get_surface(State(state): State<A2UIState>, Path(surface_id): Path<String>) -> Json<Value> {
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

/// List all surfaces
pub async fn list_surfaces(State(state): State<A2UIState>) -> Json<Value> {
    let surfaces = state.surfaces.lock().unwrap();

    let surface_list: Vec<String> = surfaces.keys().cloned().collect();

    Json(json!({
        "surfaces": surface_list,
        "count": surface_list.len()
    }))
}

// ============================================================================
// A2UI Agent Handlers
// ============================================================================

/// A2UI Agent chat endpoint - non-streaming
pub async fn a2ui_agent_chat(
    State(state): State<A2UIState>,
    Json(request): Json<Value>,
) -> Result<Json<GeneratedResponse>, http::StatusCode> {
    let agent = state.a2ui_agent.as_ref().ok_or(http::StatusCode::SERVICE_UNAVAILABLE)?;

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

    let _tool_context: Option<HashMap<String, String>> =
        request.get("tool_context").and_then(|v| v.as_object()).map(|obj| {
            obj.iter()
                .filter_map(|(k, v)| v.as_str().map(|s| (k.clone(), s.to_string())))
                .collect()
        });

    // Don't need the send_request struct anymore - call agent directly
    match agent.handle_message(&session_id, &content, true).await {
        Ok(response) => Ok(Json(response)),
        Err(_) => Err(http::StatusCode::INTERNAL_SERVER_ERROR),
    }
}

/// A2UI Agent chat endpoint with SSE streaming
pub async fn a2ui_agent_chat_stream(
    State(state): State<A2UIState>,
    Json(request): Json<Value>,
) -> Result<Response, http::StatusCode> {
    let agent = state
        .a2ui_agent
        .as_ref()
        .ok_or(http::StatusCode::SERVICE_UNAVAILABLE)?
        .clone();

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

    // Clone session_id for use in spawn
    let session_id_clone = session_id.clone();

    // Simple SSE implementation that sends all A2UI messages
    let (tx, rx) = tokio::sync::mpsc::channel::<Result<Event, std::convert::Infallible>>(32);

    // Spawn a task to handle the agent response and send messages
    tokio::spawn(async move {
        // Send initial processing event
        let processing_data = json!({
            "type": "processing",
            "message": "Generating response...",
            "timestamp": chrono::Utc::now().to_rfc3339()
        });

        let _ = tx.send(Ok(Event::default().data(processing_data.to_string()).event("update")));

        // Get response from agent
        match agent.handle_message(&session_id_clone, &content, true).await {
            Ok(response) => {
                let message_count = response.a2ui_messages.len();

                // If there are A2UI messages, send them
                if !response.a2ui_messages.is_empty() {
                    for (i, a2ui_message) in response.a2ui_messages.into_iter().enumerate() {
                        let message_data = json!({
                            "type": "a2ui_message",
                            "message_index": i,
                            "a2ui_message": a2ui_message
                        });

                        let _ = tx.send(Ok(Event::default()
                            .data(message_data.to_string())
                            .event("a2ui_message")));
                    }
                } else {
                    // No A2UI messages, send the content as a regular message
                    let content_data = json!({
                        "type": "content_message",
                        "content": response.content
                    });

                    let _ = tx.send(Ok(Event::default().data(content_data.to_string()).event("content")));
                }

                // Send completion event
                let completion_data = json!({
                    "type": "completed",
                    "message_count": message_count,
                    "timestamp": chrono::Utc::now().to_rfc3339()
                });

                let _ = tx.send(Ok(Event::default().data(completion_data.to_string()).event("complete")));
            }
            Err(_) => {
                // Send error event
                let error_data = json!({
                    "type": "error",
                    "message": "Failed to generate response",
                    "timestamp": chrono::Utc::now().to_rfc3339()
                });
                let _ = tx.send(Ok(Event::default().data(error_data.to_string()).event("error")));
            }
        }
    });

    let stream = tokio_stream::wrappers::ReceiverStream::new(rx);
    Ok(Sse::new(stream).into_response())
}

/// Get A2UI agent session info
pub async fn get_a2ui_session(
    State(state): State<A2UIState>,
    Path(session_id): Path<String>,
) -> Result<Json<Value>, http::StatusCode> {
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

/// List A2UI agent sessions
pub async fn list_a2ui_sessions(State(state): State<A2UIState>) -> Result<Json<Value>, http::StatusCode> {
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
// Plugin Generation Handlers
// ============================================================================

/// Generate a Fleet Chat plugin (non-streaming)
pub async fn generate_plugin(
    State(state): State<A2UIState>,
    Json(request): Json<PluginGenerationRequest>,
) -> Result<Json<PluginGenerationResponse>, http::StatusCode> {
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

    // Generate explanation using Rig agent if available
    let explanation = if let Some(agent) = state.rig_agent.as_ref() {
        let prompt = format!(
            "Explain the following plugin that was generated:\n\nName: {}\nDescription: {}\nType: {}\n\nProvide a brief, helpful explanation for the user.",
            manifest.name, manifest.description, plugin_type
        );

        match agent
            .generate(AIOptions {
                prompt,
                provider: None,
                model: None,
                temperature: None,
                max_tokens: None,
                top_p: None,
                frequency_penalty: None,
                presence_penalty: None,
            })
            .await
        {
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
        plugin_id: format!("plugin-{}", Uuid::new_v4()),
        package_name: format!("{}.fcp", sanitized_name),
        explanation,
        warnings,
    };

    Ok(Json(response))
}

/// Generate a Fleet Chat plugin with SSE streaming
pub async fn generate_plugin_stream(
    State(_state): State<A2UIState>,
    Json(request): Json<PluginGenerationRequest>,
) -> Result<Sse<impl futures_util::Stream<Item = Result<Event, std::convert::Infallible>>>, http::StatusCode> {
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
                    "plugin_id": format!("plugin-{}", Uuid::new_v4()),
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
// Utility Functions
// ============================================================================

fn apply_data_patches(current: &mut HashMap<String, serde_json::Value>, patches: &[DataPatch]) {
    for patch in patches {
        let path_parts: Vec<&str> = patch.path.trim_start_matches('/').split('/').collect();

        if path_parts.is_empty() || (path_parts.len() == 1 && path_parts[0].is_empty()) {
            match &patch.value {
                serde_json::Value::Object(map) => {
                    for (k, v) in map.iter() {
                        current.insert(k.clone(), v.clone());
                    }
                }
                _ => {
                    eprintln!(
                        "Warning: Attempted to set non-object value at root path. Skipping patch with value: {:?}",
                        patch.value
                    );
                }
            }
        } else {
            set_value_at_path(current, &path_parts, patch.value.clone());
        }
    }
}

fn set_value_at_path(current: &mut HashMap<String, serde_json::Value>, path_parts: &[&str], value: serde_json::Value) {
    if path_parts.is_empty() {
        return;
    }

    if path_parts.len() == 1 {
        current.insert(path_parts[0].to_string(), value);
    } else {
        let key = path_parts[0];
        let remaining = &path_parts[1..];

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

/// Creates the A2UI router with all A2UI endpoints
pub fn create_a2ui_router() -> Router<A2UIState> {
    Router::new()
        // A2UI Core API endpoints
        .route("/surface", post(create_surface))
        .route("/surface/{id}/components", post(update_components))
        .route("/surface/{id}/data", post(update_data_model))
        .route("/surface/{id}/action", post(handle_user_action))
        .route("/surface/{id}", delete(delete_surface))
        .route("/surface/{id}", get(get_surface))
        .route("/surfaces", get(list_surfaces))
        // A2UI Agent API endpoints
        .route("/agent/chat", post(a2ui_agent_chat))
        .route("/agent/chat/stream", post(a2ui_agent_chat_stream))
        .route("/agent/session/{id}", get(get_a2ui_session))
        .route("/agent/sessions", get(list_a2ui_sessions))
        // A2UI Plugin Generation API
        .route("/generate-plugin", post(generate_plugin))
        .route("/generate-plugin/stream", post(generate_plugin_stream))
}
