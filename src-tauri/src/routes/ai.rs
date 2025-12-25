//! AI Routes - Rig AI Agent endpoints
//!
//! This module contains all the HTTP handlers for the AI service endpoints.
//! It provides text generation, chat, embeddings, image analysis, and other AI capabilities.

use crate::rig_agent::{
    AIOptions, AIResponse, ChatMessage, EmbeddingRequest, ImageAnalysisRequest, ImageGenerationRequest,
    ModerationRequest, ModerationResponse, RigAgent, RigAgentError, TokenCountRequest,
};
use axum::{
    extract::State,
    http::{self},
    response::{sse::Event, IntoResponse, Response, Sse},
    routing::{get, post},
    Json, Router,
};
use futures::stream::StreamExt;
use serde_json::json;
use std::sync::Arc;

/// The application state used by AI handlers
#[derive(Clone)]
pub struct AIState {
    pub rig_agent: Option<Arc<RigAgent>>,
}

/// Helper function to convert RigAgentError to HTTP status code
fn rig_error_to_status(error: RigAgentError) -> http::StatusCode {
    match error {
        RigAgentError::ProviderNotConfigured => http::StatusCode::SERVICE_UNAVAILABLE,
        RigAgentError::ApiKeyNotFound(_) => http::StatusCode::UNAUTHORIZED,
        RigAgentError::InvalidModel(_) => http::StatusCode::BAD_REQUEST,
        RigAgentError::NotSupported(_) => http::StatusCode::NOT_IMPLEMENTED,
        RigAgentError::RequestFailed(_) => http::StatusCode::BAD_GATEWAY,
        RigAgentError::PromptError(_) => http::StatusCode::BAD_REQUEST,
        RigAgentError::EmbeddingError(_) => http::StatusCode::BAD_REQUEST,
        RigAgentError::HttpError(_) => http::StatusCode::BAD_GATEWAY,
        RigAgentError::JsonError(_) => http::StatusCode::INTERNAL_SERVER_ERROR,
        RigAgentError::IoError(_) => http::StatusCode::INTERNAL_SERVER_ERROR,
        RigAgentError::Other(_) => http::StatusCode::INTERNAL_SERVER_ERROR,
    }
}

/// AI Generate endpoint - generates text from a prompt
pub async fn ai_generate(
    State(state): State<AIState>,
    Json(options): Json<AIOptions>,
) -> Result<Json<AIResponse>, http::StatusCode> {
    let agent = state.rig_agent.as_ref().ok_or(http::StatusCode::SERVICE_UNAVAILABLE)?;

    agent.generate(options).await.map(Json).map_err(rig_error_to_status)
}

/// AI Generate Stream endpoint (SSE) - streams text generation
pub async fn ai_generate_stream(
    State(state): State<AIState>,
    Json(options): Json<AIOptions>,
) -> Result<Response, http::StatusCode> {
    let agent = state.rig_agent.as_ref().ok_or(http::StatusCode::SERVICE_UNAVAILABLE)?;

    let mut stream = agent.generate_stream(options);

    // Create a channel for SSE events
    let (tx, rx) = tokio::sync::mpsc::channel::<Result<Event, std::convert::Infallible>>(32);

    // Spawn a task to consume the stream and send SSE events
    tokio::spawn(async move {
        while let Some(chunk_result) = stream.next().await {
            match chunk_result {
                Ok(chunk) => {
                    let data = json!({ "text": chunk });
                    if tx
                        .send(Ok(Event::default().data(data.to_string()).event("chunk")))
                        .await
                        .is_err()
                    {
                        break;
                    }
                }
                Err(_) => {
                    let _ = tx.send(Ok(Event::default().event("error")));
                    break;
                }
            }
        }

        // Send completion event
        let _ = tx.send(Ok(Event::default().event("done")));
    });

    let stream = tokio_stream::wrappers::ReceiverStream::new(rx);
    Ok(Sse::new(stream).into_response())
}

/// AI Chat endpoint - conversational AI with message history
pub async fn ai_chat(
    State(state): State<AIState>,
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

/// AI Embed endpoint - generates embeddings for text
pub async fn ai_embed(
    State(state): State<AIState>,
    Json(request): Json<EmbeddingRequest>,
) -> Result<Json<serde_json::Value>, http::StatusCode> {
    let agent = state.rig_agent.as_ref().ok_or(http::StatusCode::SERVICE_UNAVAILABLE)?;

    let embedding = agent
        .embed(request.text, request.model)
        .await
        .map_err(rig_error_to_status)?;

    Ok(Json(json!({ "embedding": embedding })))
}

/// AI Moderate endpoint - content moderation
pub async fn ai_moderate(
    State(state): State<AIState>,
    Json(request): Json<ModerationRequest>,
) -> Result<Json<ModerationResponse>, http::StatusCode> {
    let agent = state.rig_agent.as_ref().ok_or(http::StatusCode::SERVICE_UNAVAILABLE)?;

    agent
        .moderate(request.content)
        .await
        .map(Json)
        .map_err(rig_error_to_status)
}

/// AI Generate Image endpoint - generates images from text prompts
pub async fn ai_generate_image(
    State(state): State<AIState>,
    Json(request): Json<ImageGenerationRequest>,
) -> Result<Json<serde_json::Value>, http::StatusCode> {
    let agent = state.rig_agent.as_ref().ok_or(http::StatusCode::SERVICE_UNAVAILABLE)?;

    let urls = agent.generate_image(request).await.map_err(rig_error_to_status)?;

    Ok(Json(json!({ "urls": urls })))
}

/// AI Analyze Image endpoint - analyzes images with AI
pub async fn ai_analyze_image(
    State(state): State<AIState>,
    Json(request): Json<ImageAnalysisRequest>,
) -> Result<Json<serde_json::Value>, http::StatusCode> {
    let agent = state.rig_agent.as_ref().ok_or(http::StatusCode::SERVICE_UNAVAILABLE)?;

    let analysis = agent.analyze_image(request).await.map_err(rig_error_to_status)?;

    Ok(Json(json!({ "analysis": analysis })))
}

/// AI Count Tokens endpoint - estimates token count for text
pub async fn ai_count_tokens(
    State(state): State<AIState>,
    Json(request): Json<TokenCountRequest>,
) -> Result<Json<serde_json::Value>, http::StatusCode> {
    let agent = state.rig_agent.as_ref().ok_or(http::StatusCode::SERVICE_UNAVAILABLE)?;

    let count = agent
        .count_tokens(request.text, request.model)
        .await
        .map_err(rig_error_to_status)?;

    Ok(Json(json!({ "count": count })))
}

/// AI Get Models endpoint - lists available models
pub async fn ai_get_models(State(state): State<AIState>) -> Result<Json<serde_json::Value>, http::StatusCode> {
    let agent = state.rig_agent.as_ref().ok_or(http::StatusCode::SERVICE_UNAVAILABLE)?;

    let models = agent.get_models().await.map_err(rig_error_to_status)?;

    Ok(Json(json!({ "models": models })))
}

/// Creates the AI router with all AI endpoints
pub fn create_ai_router() -> Router<AIState> {
    Router::new()
        .route("/generate", post(ai_generate))
        .route("/stream", post(ai_generate_stream))
        .route("/chat", post(ai_chat))
        .route("/embed", post(ai_embed))
        .route("/moderate", post(ai_moderate))
        .route("/generate_image", post(ai_generate_image))
        .route("/analyze_image", post(ai_analyze_image))
        .route("/count_tokens", post(ai_count_tokens))
        .route("/models", get(ai_get_models))
}
