use anyhow::{Context, Result};
use serde::Deserialize;
use std::path::PathBuf;

#[derive(Debug, Deserialize)]
pub struct Config {
    pub server: ServerConfig,
    pub model: ModelConfig,
    pub database: DatabaseConfig,
    pub erp: ErpConfig,
    #[serde(default)]
    pub auth: AuthConfig,
}

#[derive(Debug, Deserialize)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
}

#[derive(Debug, Default, Deserialize)]
pub struct AuthConfig {
    /// Shared bearer token required on every request. Empty = auth disabled
    /// (pre-existing deployments keep working). Reads env AI_SERVICE_TOKEN
    /// as an override so CI / docker can set it without touching the file.
    #[serde(default = "default_api_token")]
    pub api_token: String,
}

fn default_api_token() -> String {
    std::env::var("AI_SERVICE_TOKEN").unwrap_or_default()
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)] // fields read behind `llm` feature gate
pub struct ModelConfig {
    pub path: String,
    pub gpu_layers: u32,
    pub ctx_size: u32,
    pub threads: u32,
}

#[derive(Debug, Deserialize)]
pub struct DatabaseConfig {
    pub url: String,
}

#[derive(Debug, Deserialize)]
pub struct ErpConfig {
    pub api_base_url: String,
    #[serde(default = "default_service_username")]
    pub service_username: String,
    #[serde(default = "default_service_password")]
    pub service_password: String,
}

fn default_service_username() -> String {
    std::env::var("PROMIX_SERVICE_USERNAME").unwrap_or_else(|_| "admin".to_string())
}

fn default_service_password() -> String {
    std::env::var("PROMIX_SERVICE_PASSWORD").unwrap_or_else(|_| "1234".to_string())
}

impl Config {
    pub fn load() -> Result<Self> {
        let exe_dir = std::env::current_exe()
            .context("Failed to determine executable path")?
            .parent()
            .context("Executable has no parent directory")?
            .to_path_buf();

        let config_path = exe_dir.join("config.toml");
        Self::load_from(&config_path)
    }

    pub fn load_from(path: &PathBuf) -> Result<Self> {
        let content = std::fs::read_to_string(path)
            .with_context(|| format!("Could not read config file: {}", path.display()))?;

        let mut config: Config = toml::from_str(&content)
            .with_context(|| format!("Invalid TOML in config file: {}", path.display()))?;

        // Environment overrides win over config.toml values. The TOML file is
        // a sane default; secrets (service password, API token, ERP URL when
        // exposed publicly) belong in env vars / systemd EnvironmentFile so
        // they aren't checked into git.
        if let Ok(v) = std::env::var("PROMIX_SERVICE_USERNAME") { config.erp.service_username = v; }
        if let Ok(v) = std::env::var("PROMIX_SERVICE_PASSWORD") { config.erp.service_password = v; }
        if let Ok(v) = std::env::var("PROMIX_API_BASE_URL")     { config.erp.api_base_url = v; }
        if let Ok(v) = std::env::var("AI_SERVICE_TOKEN")        { config.auth.api_token = v; }

        // Fail fast on the committed placeholder secret — forces the operator to
        // provide a real password via PROMIX_SERVICE_PASSWORD (env) or the
        // git-ignored config.toml, so the CHANGE_ME placeholder can never ship.
        if config.erp.service_password.starts_with("CHANGE_ME") {
            anyhow::bail!(
                "ai-service: erp.service_password is still the placeholder. Set \
                 PROMIX_SERVICE_PASSWORD (env) or edit ai-service/config.toml — \
                 see scripts/create-aiservice-user.mjs to provision the account."
            );
        }

        Ok(config)
    }
}
