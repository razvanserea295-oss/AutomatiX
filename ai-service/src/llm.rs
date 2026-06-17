use anyhow::{bail, Result};
#[cfg(feature = "llm")]
use anyhow::Context;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;

use crate::config::ModelConfig;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/// OpenAI-format chat message. `tool_calls` is set on assistant turns that
/// emitted a tool call; `tool_call_id` is set on tool-result turns so the
/// template can pair them correctly.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    #[serde(default)]
    pub content: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tool_calls: Option<Vec<ToolCallRecord>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tool_call_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCallRecord {
    pub id: String,
    #[serde(rename = "type", default = "default_function_type")]
    pub r#type: String,
    pub function: ToolFunctionCall,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolFunctionCall {
    pub name: String,
    /// Arguments as a stringified JSON object (OpenAI convention).
    pub arguments: String,
}

fn default_function_type() -> String { "function".into() }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolDef {
    pub name: String,
    pub description: String,
    pub parameters: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum LlmResponse {
    ToolCall { name: String, arguments: serde_json::Value },
    Text(String),
}

// ---------------------------------------------------------------------------
// Thread-safe handle
// ---------------------------------------------------------------------------

pub type SharedLlm = Arc<Mutex<LlmEngine>>;

// ---------------------------------------------------------------------------
// Engine — feature-gated on `llm`
// ---------------------------------------------------------------------------

#[cfg(feature = "llm")]
mod engine {
    use super::*;
    use llama_cpp_2::context::params::LlamaContextParams;
    use llama_cpp_2::llama_backend::LlamaBackend;
    use llama_cpp_2::llama_batch::LlamaBatch;
    use llama_cpp_2::model::params::LlamaModelParams;
    use llama_cpp_2::model::{
        AddBos, GrammarTriggerType, LlamaChatTemplate, LlamaModel,
    };
    use llama_cpp_2::openai::OpenAIChatTemplateParams;
    use llama_cpp_2::sampling::LlamaSampler;
    use llama_cpp_2::token::LlamaToken;
    use std::num::NonZeroU32;

    const MAX_RESPONSE_TOKENS: i32 = 4096;
    const BATCH_SIZE: usize = 8192;

    pub struct LlmEngine {
        backend: LlamaBackend,
        model: LlamaModel,
        chat_tmpl: LlamaChatTemplate,
        ctx_size: u32,
        threads: i32,
    }

    impl LlmEngine {
        pub fn new(cfg: &ModelConfig) -> Result<Self> {
            let backend = LlamaBackend::init()
                .context("Failed to initialise llama.cpp backend")?;

            let model_params = LlamaModelParams::default()
                .with_n_gpu_layers(cfg.gpu_layers);

            let model = LlamaModel::load_from_file(&backend, &cfg.path, &model_params)
                .map_err(|e| anyhow::anyhow!("Failed to load model {}: {e}", cfg.path))?;

            // Prefer the template baked into the model GGUF; fall back to ChatML.
            let chat_tmpl = match model.chat_template(None) {
                Ok(t) => {
                    tracing::info!("Using chat template from model GGUF");
                    t
                }
                Err(_) => {
                    tracing::warn!("Model has no chat template; falling back to 'chatml'");
                    LlamaChatTemplate::new("chatml")
                        .context("Failed to build fallback ChatML template")?
                }
            };

            tracing::info!(
                path = %cfg.path,
                gpu_layers = cfg.gpu_layers,
                ctx_size = cfg.ctx_size,
                "Model loaded"
            );

            Ok(Self {
                backend,
                model,
                chat_tmpl,
                ctx_size: cfg.ctx_size,
                threads: if cfg.threads == 0 { -1 } else { cfg.threads as i32 },
            })
        }

        pub fn chat(
            &self,
            messages: &[ChatMessage],
            tools: &[ToolDef],
        ) -> Result<LlmResponse> {
            // ---- Build OpenAI-format prompt + grammar via the model's own template ----
            let messages_json = serde_json::to_string(messages)
                .map_err(|e| anyhow::anyhow!("Serialise messages: {e}"))?;

            let tools_array: Vec<serde_json::Value> = tools.iter().map(|t| {
                serde_json::json!({
                    "type": "function",
                    "function": {
                        "name":        t.name,
                        "description": t.description,
                        "parameters":  t.parameters,
                    }
                })
            }).collect();
            let tools_json = serde_json::to_string(&tools_array)
                .map_err(|e| anyhow::anyhow!("Serialise tools: {e}"))?;

            let params = OpenAIChatTemplateParams {
                messages_json: messages_json.as_str(),
                tools_json: if tools.is_empty() { None } else { Some(tools_json.as_str()) },
                tool_choice: Some("auto"),
                json_schema: None,
                grammar: None,
                reasoning_format: None,
                chat_template_kwargs: None,
                add_generation_prompt: true,
                use_jinja: true,
                parallel_tool_calls: false,
                enable_thinking: false,
                add_bos: true,
                add_eos: false,
                parse_tool_calls: !tools.is_empty(),
            };

            let tmpl_result = self.model
                .apply_chat_template_oaicompat(&self.chat_tmpl, &params)
                .map_err(|e| anyhow::anyhow!("apply_chat_template_oaicompat: {e:?}"))?;

            // ---- Sampler chain ----
            // NOTE: we intentionally skip llama.cpp grammar sampling: the GBNF
            // returned by apply_chat_template_oaicompat trips an internal
            // llama-grammar.cpp assertion (`stacks.empty()`) mid-generation on
            // Qwen2.5, crashing the process. The oaicompat prompt alone (with
            // the model's native <tool_call> template) plus low-temperature
            // sampling is already a big upgrade vs. the old free-text prompt.
            let _ = tmpl_result.grammar.as_ref(); // suppress unused-field warning
            let _ = tmpl_result.grammar_lazy;
            let _: &[llama_cpp_2::model::GrammarTrigger] = &tmpl_result.grammar_triggers;
            let _: &[LlamaToken] = &[]; // placeholder for re-enable later
            let _ = GrammarTriggerType::Word;

            let samplers: Vec<LlamaSampler> = vec![
                LlamaSampler::temp(0.2),
                LlamaSampler::top_p(0.9, 1),
                LlamaSampler::dist(1234),
            ];
            let mut sampler = LlamaSampler::chain_simple(samplers);

            // ---- Context (fresh per call; TODO: cache + KV reuse) ----
            let n_ctx = NonZeroU32::new(self.ctx_size)
                .context("ctx_size must be > 0")?;

            let ctx_params = LlamaContextParams::default()
                .with_n_ctx(Some(n_ctx))
                .with_n_batch(BATCH_SIZE as u32)
                .with_n_threads(self.threads)
                .with_n_threads_batch(self.threads);

            let mut ctx = self.model
                .new_context(&self.backend, ctx_params)
                .map_err(|e| anyhow::anyhow!("Failed to create context: {e}"))?;

            // ---- Tokenise prompt ----
            let tokens = self.model
                .str_to_token(&tmpl_result.prompt, AddBos::Never)
                .map_err(|e| anyhow::anyhow!("Tokenisation failed: {e}"))?;
            if tokens.is_empty() {
                bail!("Prompt produced zero tokens");
            }
            let prompt_len = tokens.len() as i32;
            if prompt_len as u32 >= self.ctx_size {
                bail!("Prompt ({prompt_len} tokens) exceeds context size ({})", self.ctx_size);
            }

            // ---- Decode prompt ----
            let mut batch = LlamaBatch::new(BATCH_SIZE, 1);
            let last_idx = prompt_len - 1;
            for (i, &token) in tokens.iter().enumerate() {
                batch.add(token, i as i32, &[0], i as i32 == last_idx)
                    .map_err(|e| anyhow::anyhow!("Batch add failed: {e}"))?;
            }
            ctx.decode(&mut batch)
                .map_err(|e| anyhow::anyhow!("Prompt decode failed: {e}"))?;

            // ---- Generate ----
            let mut decoder = encoding_rs::UTF_8.new_decoder();
            let mut output = String::new();
            let mut n_cur = prompt_len;
            let stops = &tmpl_result.additional_stops;

            while n_cur < prompt_len + MAX_RESPONSE_TOKENS {
                let token = sampler.sample(&ctx, batch.n_tokens() - 1);
                sampler.accept(token);

                if self.model.is_eog_token(token) {
                    break;
                }

                let piece = self.model
                    .token_to_piece(token, &mut decoder, true, None)
                    .map_err(|e| anyhow::anyhow!("Detokenisation failed: {e}"))?;
                output.push_str(&piece);

                // Check additional stop strings (from chat template)
                if !stops.is_empty() && stops.iter().any(|s| !s.is_empty() && output.ends_with(s)) {
                    // Strip the matched stop string before parsing.
                    if let Some(s) = stops.iter().find(|s| !s.is_empty() && output.ends_with(s.as_str())) {
                        let new_len = output.len() - s.len();
                        output.truncate(new_len);
                    }
                    break;
                }

                batch.clear();
                batch.add(token, n_cur, &[0], true)
                    .map_err(|e| anyhow::anyhow!("Batch add failed: {e}"))?;
                n_cur += 1;

                ctx.decode(&mut batch)
                    .map_err(|e| anyhow::anyhow!("Decode failed: {e}"))?;
            }

            Ok(parse_response(&output))
        }
    }
}

#[cfg(feature = "llm")]
pub use engine::LlmEngine;

// ---------------------------------------------------------------------------
// Stub engine when compiled without `llm` feature
// ---------------------------------------------------------------------------

#[cfg(not(feature = "llm"))]
pub struct LlmEngine {
    _private: (),
}

#[cfg(not(feature = "llm"))]
impl LlmEngine {
    pub fn new(_cfg: &ModelConfig) -> Result<Self> {
        bail!("AI service compiled without LLM support. Rebuild with --features llm")
    }

    pub fn chat(
        &self,
        _messages: &[ChatMessage],
        _tools: &[ToolDef],
    ) -> Result<LlmResponse> {
        bail!("LLM not available")
    }
}

// ---------------------------------------------------------------------------
// Response parser — detect tool calls from model output.
//
// Supports the two common on-the-wire formats the model may emit even after
// grammar-lazy shaping:
//   1. Qwen-style  : `<tool_call>{"name":..,"arguments":..}</tool_call>`
//   2. Bare JSON   : `{"name":"..","arguments":{..}}`   (entire output or a
//      trailing block after reasoning text)
// ---------------------------------------------------------------------------

#[cfg(feature = "llm")]
fn parse_response(raw: &str) -> LlmResponse {
    let trimmed = raw.trim();

    // Qwen / Hermes XML wrapper
    if let Some(tc) = extract_wrapped(trimmed, "<tool_call>", "</tool_call>") {
        return tc;
    }

    // Whole-response JSON
    if let Some(tc) = try_extract_tool_call(trimmed) {
        return tc;
    }

    // Trailing JSON block after prose
    for (i, _) in trimmed.rmatch_indices('{') {
        let candidate = &trimmed[i..];
        let mut depth = 0i32;
        let mut end = 0;
        for (j, ch) in candidate.char_indices() {
            match ch {
                '{' => depth += 1,
                '}' => { depth -= 1; if depth == 0 { end = j + ch.len_utf8(); break; } }
                _ => {}
            }
        }
        if end > 0 {
            if let Some(tc) = try_extract_tool_call(&candidate[..end]) {
                return tc;
            }
        }
    }

    LlmResponse::Text(trimmed.to_string())
}

#[cfg(feature = "llm")]
fn extract_wrapped(s: &str, open: &str, close: &str) -> Option<LlmResponse> {
    let start = s.find(open)? + open.len();
    let end = s[start..].find(close)? + start;
    let body = s[start..end].trim();
    try_extract_tool_call(body)
}

#[cfg(feature = "llm")]
fn try_extract_tool_call(s: &str) -> Option<LlmResponse> {
    let val: serde_json::Value = serde_json::from_str(s).ok()?;
    let name = val.get("name")?.as_str()?;
    // Accept either "arguments" (OpenAI / Qwen) or "parameters" (Llama 3.1).
    let arguments = val.get("arguments")
        .or_else(|| val.get("parameters"))?
        .clone();
    let arguments = match arguments {
        // Models sometimes emit arguments as a JSON-encoded STRING.
        serde_json::Value::String(ref s) => serde_json::from_str::<serde_json::Value>(s)
            .unwrap_or_else(|_| serde_json::Value::String(s.clone())),
        other => other,
    };
    Some(LlmResponse::ToolCall { name: name.to_string(), arguments })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(all(test, feature = "llm"))]
mod tests {
    use super::*;

    #[test]
    fn parse_plain_text() {
        let resp = parse_response("The project is on track.");
        match resp {
            LlmResponse::Text(t) => assert_eq!(t, "The project is on track."),
            _ => panic!("Expected Text variant"),
        }
    }

    #[test]
    fn parse_tool_call_bare() {
        let raw = r#"{"name":"query_stock","arguments":{"material_id":"MAT-001"}}"#;
        match parse_response(raw) {
            LlmResponse::ToolCall { name, arguments } => {
                assert_eq!(name, "query_stock");
                assert_eq!(arguments["material_id"], "MAT-001");
            }
            _ => panic!("Expected ToolCall"),
        }
    }

    #[test]
    fn parse_tool_call_qwen_wrapped() {
        let raw = "<tool_call>\n{\"name\":\"get_projects\",\"arguments\":{}}\n</tool_call>";
        match parse_response(raw) {
            LlmResponse::ToolCall { name, .. } => assert_eq!(name, "get_projects"),
            _ => panic!("Expected ToolCall"),
        }
    }

    #[test]
    fn parse_tool_call_stringified_args() {
        let raw = r#"{"name":"f","arguments":"{\"x\":1}"}"#;
        match parse_response(raw) {
            LlmResponse::ToolCall { name, arguments } => {
                assert_eq!(name, "f");
                assert_eq!(arguments["x"], 1);
            }
            _ => panic!("Expected ToolCall"),
        }
    }

    #[test]
    fn parse_json_without_tool_keys_is_text() {
        let raw = r#"{"status":"ok"}"#;
        match parse_response(raw) {
            LlmResponse::Text(_) => {}
            _ => panic!("Expected Text"),
        }
    }
}
