mod config;
mod llm;
mod agent;
mod tools;

use std::sync::Arc;
use std::time::Instant;

use anyhow::Result;
use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    middleware::{self, Next},
    response::{Json, Response},
    routing::{get, post},
    Router,
    body::Body,
    http::Request,
};
use serde_json::{json, Value};
use tower_http::cors::CorsLayer;
use tower_http::timeout::TimeoutLayer;
use std::time::Duration;

use agent::{AgentRequest, AgentResponse, AppState};
use llm::LlmEngine;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter("ai_service=info,axum=info")
        .init();

    tracing::info!("Starting ai-service");

    let config = Arc::new(config::Config::load()?);
    tracing::info!("Config loaded. Server: {}:{}", config.server.host, config.server.port);

    let t0 = Instant::now();
    tracing::info!("Loading LLM model...");
    let llm = LlmEngine::new(&config.model)?;
    tracing::info!("Model loaded in {:.1}s", t0.elapsed().as_secs_f32());
    let llm = Arc::new(tokio::sync::Mutex::new(llm));

    tracing::info!("Connecting to database...");
    sqlx::any::install_default_drivers();
    let db = sqlx::AnyPool::connect(&config.database.url).await
        .map_err(|e| anyhow::anyhow!("DB connect failed: {}", e))?;
    tracing::info!("Database connected");

    let http = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()?;

    // Login to PROMIX server as service account (credentials from config / env)
    tracing::info!("Authenticating with PROMIX server as '{}'...", config.erp.service_username);
    let login_resp = http
        .post(format!("{}/api/cmd/login", config.erp.api_base_url))
        .json(&json!({"request": {
            "username": config.erp.service_username,
            "password": config.erp.service_password,
        }}))
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("PROMIX server unreachable: {}", e))?;

    let login_body: Value = login_resp.json().await
        .map_err(|e| anyhow::anyhow!("Login parse failed: {}", e))?;
    let service_token = login_body["token"]
        .as_str()
        .ok_or_else(|| anyhow::anyhow!("Login failed: no token in response"))?
        .to_string();
    tracing::info!("Authenticated with PROMIX server");

    let state = Arc::new(AppState {
        llm, db, http, config: config.clone(),
        service_token: tokio::sync::RwLock::new(service_token),
    });

    let api_token = config.auth.api_token.clone();
    let host = config.server.host.as_str();
    let is_loopback = host == "127.0.0.1" || host == "localhost" || host == "::1";
    // SECURITY: refuse to start when the service is exposed beyond
    // loopback AND has no auth token. Previously the binary would happily
    // come up with `host = "0.0.0.0"` and `api_token = ""` — letting any
    // LAN device call /chat anonymously and run agent tools.
    if !is_loopback && api_token.is_empty() {
        tracing::error!(
            "REFUZ pornire: server.host = '{}' (non-loopback) cu auth.api_token gol. \
            Setati api_token in config.toml SAU schimbati host la 127.0.0.1.",
            host
        );
        anyhow::bail!("ai-service refuses to start: non-loopback bind without api_token");
    }
    if api_token.is_empty() {
        tracing::warn!("auth.api_token not set — /chat is unauthenticated (loopback only). Set AI_SERVICE_TOKEN or [auth].api_token in config.toml before exposing the service beyond localhost.");
    } else {
        tracing::info!("auth.api_token set — /chat requires Bearer token");
    }

    // /health stays open so the renderer + monitoring probes can check it.
    let protected = Router::new()
        .route("/chat", post(chat_handler))
        .route_layer(middleware::from_fn_with_state(api_token.clone(), require_bearer));

    let app = Router::new()
        .merge(protected)
        .route("/health", get(health_handler))
        .layer(CorsLayer::permissive())
        .layer(TimeoutLayer::new(Duration::from_secs(120)))
        .with_state(state);

    let addr = format!("{}:{}", config.server.host, config.server.port);
    tracing::info!("Listening on http://{}", addr);
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}

async fn chat_handler(
    State(state): State<Arc<AppState>>,
    Json(req): Json<AgentRequest>,
) -> Result<Json<AgentResponse>, (StatusCode, Json<Value>)> {
    tracing::info!("Chat request session={}", req.session_id);
    agent::run(req, state).await.map(Json).map_err(|e| {
        tracing::error!("Agent error: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e.to_string() })),
        )
    })
}

async fn health_handler(
    State(state): State<Arc<AppState>>,
) -> Json<Value> {
    // SECURITY: do not leak the absolute model path — that tells an attacker
    // the install location and OS layout. Just expose presence + filename.
    let model_name = std::path::Path::new(&state.config.model.path)
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("unknown")
        .to_string();
    Json(json!({
        "status": "ok",
        "model": model_name,
        "version": env!("CARGO_PKG_VERSION"),
        "auth_required": !state.config.auth.api_token.is_empty(),
    }))
}

/// Bearer-token middleware. An empty configured token disables the check,
/// preserving backwards compatibility with installs that haven't set one yet.
async fn require_bearer(
    State(expected): State<String>,
    headers: HeaderMap,
    req: Request<Body>,
    next: Next,
) -> Result<Response, (StatusCode, Json<Value>)> {
    if expected.is_empty() {
        return Ok(next.run(req).await);
    }
    let provided = headers
        .get("authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|s| s.strip_prefix("Bearer "))
        .unwrap_or("");
    if provided != expected {
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(json!({ "error": "Invalid or missing bearer token" })),
        ));
    }
    Ok(next.run(req).await)
}
