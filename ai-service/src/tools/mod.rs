pub mod database;
pub mod workflow;
pub mod files;
// `api` module (the writable PROMIX command tool) is intentionally NOT
// re-exported. Keeping the file around so we can re-enable it later by
// uncommenting one line, but for now the AI is strictly read-only.
#[allow(dead_code)]
pub mod api;

use anyhow::Result;
use serde_json::{json, Value};
use crate::llm::ToolDef;
use crate::agent::AppState;

pub fn all_tool_defs() -> Vec<ToolDef> {
    // AI is read-only: it can SELECT from the database and read files, but
    // CANNOT create/update/delete anything. The previous `promix_command`
    // tool let it call any backend command (including write paths like
    // `create_project`, `update_user`, `delete_document`); that capability
    // was removed at user request — they want the AI strictly as an
    // analyst, not an actor.
    vec![
        ToolDef {
            name: "query_database".into(),
            description: "Interogheaza baza de date SQLite cu SELECT. Tabele: projects, clients, materials, documents, contracts, engineering_nodes, engineering_bom_items, stock_movements, stock_reservations, warehouse_locations, project_revenues, project_expenses, purchase_orders, purchase_order_lines, production_stages, project_pieces, sales_leads, deplasari, users, roles. NU EXISTA modalitate de a modifica date — daca userul iti cere sa creezi/sterge/actualizezi ceva, raspunde-i ca nu poti si sa faca singur din UI.".into(),
            parameters: json!({
                "type": "object",
                "required": ["sql"],
                "properties": {
                    "sql": { "type": "string", "description": "SELECT SQL valid" }
                }
            }),
        },
        ToolDef {
            name: "parse_file".into(),
            description: "Citeste continutul unui fisier PDF, Excel sau CSV de pe server.".into(),
            parameters: json!({
                "type": "object",
                "required": ["path"],
                "properties": {
                    "path": { "type": "string" },
                    "file_type": { "type": "string", "enum": ["pdf", "excel", "csv", "auto"] }
                }
            }),
        },
    ]
}

pub async fn execute(
    name: &str,
    args: Value,
    state: &AppState,
    _user_token: Option<&str>,
) -> Result<Value> {
    match name {
        "query_database" => database::run(args, &state.db).await,
        // `promix_command` was the AI's write tool. Disabled — kept here as
        // an explicit hard-no so a smart-aleck model that hallucinates the
        // tool name can't sneak around the read-only policy by guessing.
        "promix_command" => anyhow::bail!(
            "Tool 'promix_command' nu mai este disponibil. AI-ul are doar acces de citire."
        ),
        "parse_file" => {
            let allowed = std::env::var("AI_FILES_DIR")
                .unwrap_or_else(|_| "./files".to_string());
            files::run(args, &allowed)
        },
        other => anyhow::bail!("Tool necunoscut: '{}'", other),
    }
}
