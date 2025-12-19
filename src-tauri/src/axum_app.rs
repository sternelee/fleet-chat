use axum::{
    http,
    routing::{get, post},
    Json, Router,
};
use serde_json::{json, Value};
use std::sync::{Arc, Mutex};

#[derive(Debug, Clone, Default)]
pub struct AppState {}

pub fn create_axum_app() -> Router {
    let state = AppState {};

    Router::new()
        .route("/", get(|| async { "Hello, World!" }))
        .route("/ping", get(|| async { "pong!" }))
        .route(
            "/ping/json",
            get(|| async {
                (
                    [(http::header::CONTENT_TYPE, "application/json")],
                    Json(json!({
                        "message": "pong!",
                        "status": "success"
                    })),
                )
            }),
        )
        .with_state(state)
}
