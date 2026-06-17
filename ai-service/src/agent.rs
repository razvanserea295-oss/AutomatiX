use anyhow::Result;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use sqlx::AnyPool;
use tokio::sync::RwLock;

use crate::config::Config;
use crate::llm::{ChatMessage, LlmResponse, SharedLlm, ToolCallRecord, ToolFunctionCall};
use crate::tools;

const MAX_ITERATIONS: u32 = 5;
const MAX_TOOL_RESULT_CHARS: usize = 4000;

// Schema of the tables the AI is allowed to query, dumped from the live
// DB by scripts/dump-schema.mjs. Keep this in sync after any migration
// that changes column shapes — otherwise the AI will pick the wrong
// column name (e.g. `name` vs `client_name` on `sales_leads`) and the
// query fails. Re-running the dump script + pasting the output here +
// `cargo build --release` is a 30-second loop.
const DB_SCHEMA: &str = "\
TABELE DISPONIBILE (coloane:tip):\n\
sales_leads(id, client_name, contact_person, contact_email, contact_phone, product_interest, estimated_value:REAL, location, status, notes, last_contact_date, next_followup_date, assigned_to, converted_project_id, created_by, created_at, updated_at)\n\
sales_lead_notes(id, lead_id, content, created_by, created_at)\n\
lead_attachments(id, lead_id, kind, filename, data, caption, created_by_user_id, created_at)\n\
projects(id, name, client_id, status, stage_id, priority, manager_id, description, estimated_value:REAL, estimated_cost:REAL, actual_cost:REAL, deadline, start_date, end_date, created_at, updated_at, version)\n\
project_pieces(id, project_id, stage_id, name, category, specs, quantity:REAL, status, parent_piece_id, sort_order, assembly_key, production_tracking, hall_notes, fulfillment_type, fulfillment_status, source_file_name, source_file_path, supplier_code, created_at, updated_at)\n\
project_custom_stages(id, project_id, name, order_index, description, status, created_at, updated_at)\n\
project_revenues(id, project_id, amount:REAL, source, date, notes, created_by, created_at)\n\
project_expenses(id, project_id, category, description, amount:REAL, currency, date, invoice_ref, notes, created_by, created_at)\n\
clients(id, name, contact_person, phone, email, city, county, notes, cui, reg_com, address, bank_name, iban, created_at, updated_at)\n\
suppliers(id, name, contact_person, email, phone, notes, cui, address, website, category, products, payment_terms, active:INTEGER, created_at, updated_at)\n\
materials(id, code, name, unit, unit_cost:REAL, stock:REAL, min_stock:REAL, category, supplier, location, created_at, updated_at)\n\
material_consumptions(id, project_id, material_id, stage_id, quantity:REAL, unit_cost:REAL, loss_rate:REAL, date, notes, created_by, created_at, project_piece_id)\n\
purchase_orders(id, supplier_id, project_id, status, internal_ref, ordered_at, created_by)\n\
finance_invoices(id, invoice_number, project_id, client_id, type, status, currency, subtotal:REAL, tva_rate:REAL, tva_amount:REAL, total:REAL, paid_amount:REAL, issue_date, due_date, paid_date, notes, created_by, created_at, updated_at)\n\
personal_tasks(id, user_id, title, description, status, priority, due_date, project_id, source_type, source_id, completed_at, assigned_by_user_id, instructions, notes, completion_note, completion_status, completed_by_user_id, clarification_pending, created_at, updated_at)\n\
quotations(id, quotation_number, lead_id, project_id, client_id, client_name, contact_email, title, description, currency, tva_rate:REAL, discount_percent:REAL, subtotal:REAL, tva_amount:REAL, total:REAL, status, valid_until, sent_at, viewed_at, decided_at, rejection_reason, tracking_token, converted_contract_id, notes, created_by, created_at, updated_at)\n\
rfqs(id, rfq_number, project_id, title, description, deadline, status, awarded_supplier_id, notes, created_by, created_at, updated_at)\n\
rfq_items(id, rfq_id, material_id, description, quantity:REAL, unit, notes, line_no)\n\
documents(id, project_id, category_id, name, file_type, file_size:INTEGER, file_path, original_name, version, uploaded_by, uploaded_at, updated_at, file_mime, is_private:INTEGER)\n\
piece_services(id, project_id, project_piece_id, title, defect, service_description, technician_id, service_date, labor_cost:REAL, parts_cost:REAL, status, notes, created_at, updated_at)\n\
service_tickets(id, ticket_number, station_id, project_id, client_id, severity, status, title, description, reported_via, reported_by_name, assigned_user_id, sla_due_at, first_response_at, resolved_at, closed_at, resolution_notes, cost_labor:REAL, cost_parts:REAL, cost_total:REAL, is_billable:INTEGER, invoice_id, created_by, created_at, updated_at)\n\
project_briefings(id, title, project_id, created_by_user_id, assigned_to_user_id, scope, technical_requirements, client_expectations, deadline, priority, attachments_json, status, rejection_reason, completed_at, created_at, updated_at)\n\
briefing_clarifications(id, briefing_id, asked_by_user_id, question, asked_at, answered_by_user_id, answer, answered_at, status, created_at, updated_at)\n\
roles(id, name, description, permissions, created_at, updated_at)\n\
\n\
SEMANTICA:\n\
- sales_leads.status: 'fara_contact', 'decizie_client', 'decizie_noastra', 'in_negocieri', 'convertit'\n\
- projects.status: 'ofertă', 'in_lucru', 'finalizat', 'anulat', 'blocat', 'întârziat'\n\
- materials: stoc critic cand stock <= min_stock\n\
- project_pieces.status: 'planificat', 'in_productie', 'fabricat', 'livrat', 'montat', 'testat'\n\
- finance_invoices.status: 'draft', 'sent', 'partial', 'paid', 'overdue'\n\
- Pentru 'pipeline vanzari activ' filtreaza WHERE status != 'convertit'\n\
- Pentru 'proiecte active' filtreaza WHERE status NOT IN ('finalizat', 'anulat')\n";

const SYSTEM_PROMPT_BASE: &str = "\
Esti asistentul PROMIX Automatix — fabrica statii de betoane. Raspunde IN ROMANA, scurt.\n\
\n\
REGULI:\n\
1. Esti READ-ONLY. NU poti modifica nimic. Daca userul cere create/update/delete/move/etc., raspunde-i ca trebuie sa o faca singur din UI.\n\
2. Pentru date din sistem, apeleaza IMEDIAT query_database. Foloseste schema de mai jos pentru a sti exact ce coloane exista — NU presupune coloane care nu sunt listate.\n\
3. Listeaza coloanele explicit in SELECT (NU folosi 'SELECT *').\n\
4. Tabelele cu PII (users, sessions, audit_logs, daily_briefings) sunt blocate — nu incerca sa le interoghezi.\n\
5. Dupa fiecare tool call, CITESTE rezultatul. Daca are cheia \"error\" — citeste mesajul si corecteaza query-ul. Daca 'no such column', verifica schema de mai jos. NU pretinde ca tabela lipseste fara sa fi consultat schema.\n\
6. Raspunde cu datele reale (id-uri, valori intoarse) — nu texte generice. Citeaza explicit ce ai gasit.\n\
7. Nu apela acelasi tool cu aceiasi parametri de doua ori. Daca un query a esuat, schimba coloanele/conditiile dupa schema.\n\
\n\
DATE: foloseste mereu format ISO YYYY-MM-DD (ex: 2026-05-05). Pentru intervale folosesti calendaristic — niciodata stringuri ca 'CURRENT_MONTH', 'today', 'azi'. Daca userul cere 'luna curenta' converteste tu in '2026-05-01' pana '2026-05-31'.\n\
\n\
METRICI: stoc critic daca stock <= min_stock. Marja sanatoasa > 20%.\n";

// Concatenated at module init to avoid runtime cost.
fn build_system_prompt() -> String {
    let mut s = String::with_capacity(SYSTEM_PROMPT_BASE.len() + DB_SCHEMA.len() + 32);
    s.push_str(SYSTEM_PROMPT_BASE);
    s.push_str("\n");
    s.push_str(DB_SCHEMA);
    s
}

pub struct AppState {
    pub llm:    SharedLlm,
    pub db:     AnyPool,
    pub http:   reqwest::Client,
    pub config: Arc<Config>,
    pub service_token: RwLock<String>,
}

impl AppState {
    pub async fn refresh_token(&self) -> Result<()> {
        let resp = self.http
            .post(format!("{}/api/cmd/login", self.config.erp.api_base_url))
            .json(&serde_json::json!({"request": {
                "username": self.config.erp.service_username,
                "password": self.config.erp.service_password,
            }}))
            .send()
            .await
            .map_err(|e| anyhow::anyhow!("PROMIX re-login failed: {}", e))?;

        let body: serde_json::Value = resp.json().await
            .map_err(|e| anyhow::anyhow!("Re-login parse failed: {}", e))?;

        let new_token = body["token"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("Re-login: no token"))?;

        *self.service_token.write().await = new_token.to_string();
        tracing::info!("Service token refreshed");
        Ok(())
    }
}

#[derive(Debug, Deserialize)]
pub struct AgentRequest {
    pub messages:   Vec<ChatMessage>,
    pub session_id: String,
    /// PROMIX JWT of the user invoking the chat. When present, every PROMIX
    /// command runs under this user's role; the AI inherits exactly the
    /// caller's permissions. Falls back to the service token only if absent.
    #[serde(default)]
    pub user_token: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct AgentResponse {
    pub reply:       String,
    pub tools_used:  Vec<String>,
    pub session_id:  String,
    pub iterations:  u32,
}

/// Truncate tool results to avoid blowing context window
fn truncate_result(val: &serde_json::Value) -> String {
    let s = val.to_string();
    if s.len() <= MAX_TOOL_RESULT_CHARS {
        return s;
    }
    // For arrays (query results), limit to first few rows
    if let Some(rows) = val.get("rows").and_then(|r| r.as_array()) {
        let count = rows.len();
        let limited: Vec<&serde_json::Value> = rows.iter().take(10).collect();
        return json!({
            "rows": limited,
            "count": count,
            "truncated": true,
            "note": format!("Arata primele 10 din {} rezultate", count)
        }).to_string();
    }
    format!("{}... [trunchiat la {} caractere]", &s[..MAX_TOOL_RESULT_CHARS], MAX_TOOL_RESULT_CHARS)
}

pub async fn run(req: AgentRequest, state: Arc<AppState>) -> Result<AgentResponse> {
    // Prepend system prompt if caller didn't supply one. The prompt
    // bundles the live DB schema so the model doesn't have to guess
    // column names — previously it would invent `sales_leads.name` and
    // get an SQL error, then conclude the table didn't exist.
    let mut messages: Vec<ChatMessage> = if req.messages.first().map(|m| m.role.as_str()) == Some("system") {
        req.messages.clone()
    } else {
        let mut v = Vec::with_capacity(req.messages.len() + 1);
        v.push(ChatMessage {
            role: "system".into(),
            content: build_system_prompt(),
            tool_calls: None,
            tool_call_id: None,
            name: None,
        });
        v.extend(req.messages.iter().cloned());
        v
    };

    let mut tools_used: Vec<String> = Vec::new();
    let tool_defs = tools::all_tool_defs();

    for iteration in 0..MAX_ITERATIONS {
        let response = {
            let llm = state.llm.lock().await;
            llm.chat(&messages, &tool_defs)?
        };

        match response {
            LlmResponse::Text(text) => {
                return Ok(AgentResponse {
                    reply: text,
                    tools_used,
                    session_id: req.session_id.clone(),
                    iterations: iteration + 1,
                });
            }
            LlmResponse::ToolCall { name, arguments } => {
                let call_id = format!("call_{}", iteration);
                tracing::info!("Tool call [{}]: {} args={}", iteration, name, arguments);
                tools_used.push(name.clone());

                // Assistant turn: record the tool call in OpenAI format so the
                // chat template can reconstruct it correctly on the next pass.
                messages.push(ChatMessage {
                    role: "assistant".into(),
                    content: String::new(),
                    tool_calls: Some(vec![ToolCallRecord {
                        id: call_id.clone(),
                        r#type: "function".into(),
                        function: ToolFunctionCall {
                            name: name.clone(),
                            arguments: arguments.to_string(),
                        },
                    }]),
                    tool_call_id: None,
                    name: None,
                });

                // Execute the tool. The caller's JWT (if any) flows through so
                // PROMIX commands run with the inviting user's role, not the
                // AI service account.
                let tool_result = match tools::execute(&name, arguments, &state, req.user_token.as_deref()).await {
                    Ok(v)  => v,
                    Err(e) => json!({ "error": e.to_string() }),
                };
                let truncated = truncate_result(&tool_result);
                tracing::info!("Tool result [{}]: {} chars", iteration, truncated.len());

                // Tool response turn, linked by tool_call_id.
                messages.push(ChatMessage {
                    role: "tool".into(),
                    content: truncated,
                    tool_calls: None,
                    tool_call_id: Some(call_id),
                    name: Some(name),
                });
            }
        }
    }

    Ok(AgentResponse {
        reply: "Am atins limita de pasi. Incearca o intrebare mai specifica.".into(),
        tools_used,
        session_id: req.session_id.clone(),
        iterations: MAX_ITERATIONS,
    })
}
