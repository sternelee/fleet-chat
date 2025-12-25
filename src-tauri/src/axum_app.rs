//! Axum Web Server Application
//!
//! This module sets up the Axum web server with all HTTP routes for the Fleet Chat backend.
//! Routes are organized into separate modules for better maintainability.

use crate::a2ui::agent::A2UIAgent;
use crate::a2ui::provider::{AIProvider, GeminiProvider, OpenAIProvider};
use crate::gemini_agent::GeminiAgent;
use crate::rig_agent::RigAgent;
use crate::routes::{a2ui, ai};
use axum::{
    extract::{Path, State},
    http,
    routing::{delete, get, post},
    Json, Router,
};
use serde::Deserialize;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

// ============================================================================
// Application State
// ============================================================================

/// Combined application state for all route handlers
#[derive(Clone)]
pub struct AppState {
    pub surfaces: Arc<Mutex<HashMap<String, a2ui::SurfaceState>>>,
    pub agent: Option<GeminiAgent>,
    pub a2ui_agent: Option<Arc<A2UIAgent>>,
    pub rig_agent: Option<Arc<RigAgent>>,
}

/// State for A2UI routes
impl From<&AppState> for a2ui::A2UIState {
    fn from(state: &AppState) -> Self {
        a2ui::A2UIState {
            surfaces: state.surfaces.clone(),
            a2ui_agent: state.a2ui_agent.clone(),
            rig_agent: state.rig_agent.clone(),
        }
    }
}

/// State for AI routes
impl From<&AppState> for ai::AIState {
    fn from(state: &AppState) -> Self {
        ai::AIState {
            rig_agent: state.rig_agent.clone(),
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            surfaces: Arc::new(Mutex::new(HashMap::new())),
            agent: Self::create_gemini_agent(),
            a2ui_agent: Self::create_a2ui_agent(),
            rig_agent: Self::create_rig_agent(),
        }
    }
}

impl AppState {
    fn create_gemini_agent() -> Option<GeminiAgent> {
        std::env::var("GEMINI_API_KEY")
            .ok()
            .and_then(|api_key| GeminiAgent::new(api_key).ok())
    }

    fn create_a2ui_agent() -> Option<Arc<A2UIAgent>> {
        // Try OpenAI first, then fall back to Gemini
        if let Ok(api_key) = std::env::var("OPENAI_API_KEY") {
            let provider = Arc::new(OpenAIProvider::new(api_key)) as Arc<dyn AIProvider>;
            return A2UIAgent::new(provider).ok().map(Arc::new);
        }

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

// ============================================================================
// Gemini Agent API Types and Handlers (Legacy)
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct CreateSessionRequest {
    pub settings: Option<AgentSettingsOverride>,
}

#[derive(Debug, Deserialize)]
pub struct AgentSettingsOverride {
    pub temperature: Option<f32>,
    pub max_tokens: Option<u32>,
}

pub async fn create_agent_session(
    State(state): State<AppState>,
    Json(request): Json<CreateSessionRequest>,
) -> Result<Json<Value>, http::StatusCode> {
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

pub async fn get_agent_session(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
) -> Result<Json<Value>, http::StatusCode> {
    let agent = state.agent.as_ref().ok_or(http::StatusCode::SERVICE_UNAVAILABLE)?;

    match agent.get_session(&session_id).await {
        Ok(session) => Ok(Json(json!({
            "id": session.id,
            "created_at": session.created_at,
            "updated_at": session.updated_at,
            "message_count": session.messages.len(),
            "conversation_state": format!("{:?}", session.context.conversation_state)
        }))),
        Err(crate::gemini_agent::AgentError::SessionNotFound(_)) => Err(http::StatusCode::NOT_FOUND),
        Err(_) => Err(http::StatusCode::INTERNAL_SERVER_ERROR),
    }
}

pub async fn list_agent_sessions(State(state): State<AppState>) -> Result<Json<Value>, http::StatusCode> {
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
) -> Result<Json<Value>, http::StatusCode> {
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

// ============================================================================
// Router Creation
// ============================================================================
/// Creates the main Axum application with all routes
///
/// This function sets up the complete HTTP router with:
/// - Basic health check endpoints
/// - A2UI core API endpoints (surface management)
/// - A2UI agent chat endpoints (streaming and non-streaming)
/// - A2UI plugin generation endpoints
/// - AI endpoints (Rig agent)
/// - Legacy Gemini agent API endpoints
pub fn create_axum_app() -> Router {
    let state = AppState::default();

    // Create route-specific states
    let a2ui_state: a2ui::A2UIState = (&state).into();
    let ai_state: ai::AIState = (&state).into();

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
        // Legacy Gemini Agent API endpoints
        .route("/agent/session", post(create_agent_session))
        .route("/agent/session/{id}", get(get_agent_session))
        .route("/agent/session/{id}", delete(delete_agent_session))
        .route("/agent/sessions", get(list_agent_sessions))
        // A2UI routes (mounted at /a2ui)
        .nest("/a2ui", a2ui::create_a2ui_router().with_state(a2ui_state))
        // AI routes (mounted at /ai)
        .nest("/ai", ai::create_ai_router().with_state(ai_state))
        .with_state(state)
}
