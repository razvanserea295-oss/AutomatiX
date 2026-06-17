use anyhow::{bail, Result};
use serde_json::{json, Value};
use crate::agent::AppState;

/// Commands that expect their payload wrapped in a "request" field.
/// The server dispatcher reads `a.request` for these.
const WRAPPED_COMMANDS: &[&str] = &[
    "create_project", "update_project",
    "create_client", "update_client",
    "create_material", "update_material",
    "create_document", "update_document",
    "create_document_category", "update_document_category",
    "create_alert",
    "create_supplier",
    "create_purchase_order",
    "create_finance_invoice", "update_invoice_status", "record_invoice_payment",
    "create_project_expense", "update_project_expense",
    "create_project_revenue",
    "upsert_finance_override",
    "create_compliance_task", "update_compliance_task",
    "update_company_settings",
    "create_contract", "update_contract",
    "create_engineering_node", "update_engineering_node",
    "add_engineering_bom_item",
    "create_standard_part", "update_standard_part",
    "create_custom_part",
    "create_project_piece", "update_project_piece",
    "create_piece_material_requirement",
    "create_station", "create_intervention",
    "create_sales_lead", "update_sales_lead",
    "create_deplasare", "update_deplasare",
    "create_checklist", "update_checklist",
    "create_bon_consum", "create_aviz", "create_invoice",
    "record_stock_movement", "create_stock_reservation",
    "create_user", "update_user",
    "update_workspace_profile",
    "email_save_account", "email_send", "email_save_draft",
    "send_chat_message",
    "create_moderation_report",
    "save_ai_memory",
];

/// Call any PROMIX server command. Wraps payload in {"request": ...} for
/// create/update commands. Uses the caller's JWT when present so PROMIX
/// enforces that user's role; only falls back to the service token (with
/// auto-refresh on 401) when the chat request didn't carry one.
pub async fn run(args: Value, state: &AppState, user_token: Option<&str>) -> Result<Value> {
    let command = args["command"]
        .as_str()
        .ok_or_else(|| anyhow::anyhow!("args.command must be a string"))?;

    let raw_payload = args.get("payload").cloned().unwrap_or(Value::Object(Default::default()));

    // Wrap payload for commands that expect a.request
    let body = if WRAPPED_COMMANDS.contains(&command) {
        json!({ "request": raw_payload })
    } else {
        raw_payload
    };

    let base_url = &state.config.erp.api_base_url;
    let url = format!("{}/api/cmd/{}", base_url.trim_end_matches('/'), command);

    // Pick token: caller's JWT (per-request user role) when available,
    // service token otherwise.
    let (token, using_service) = match user_token {
        Some(t) if !t.is_empty() => (t.to_string(), false),
        _ => (state.service_token.read().await.clone(), true),
    };

    let resp = state.http
        .post(&url)
        .header("Authorization", format!("Bearer {}", token))
        .json(&body)
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("PROMIX server error: {}", e))?;

    let status = resp.status().as_u16();

    // Token expired → only refresh+retry when we used the service token. A
    // user JWT must NOT silently escalate to service privileges; surface 401.
    if status == 401 && using_service {
        tracing::warn!("Service token expired, refreshing...");
        state.refresh_token().await?;

        let new_token = state.service_token.read().await.clone();
        let resp2 = state.http
            .post(&url)
            .header("Authorization", format!("Bearer {}", new_token))
            .json(&body)
            .send()
            .await
            .map_err(|e| anyhow::anyhow!("PROMIX retry error: {}", e))?;

        let status2 = resp2.status().as_u16();
        let body2: Value = resp2.json().await.unwrap_or(Value::Null);

        if status2 >= 400 {
            bail!("Comanda '{}' a esuat ({}): {}", command, status2, body2);
        }
        return Ok(json!({ "status": status2, "body": body2 }));
    }

    let resp_body: Value = resp.json().await.unwrap_or(Value::Null);
    if status >= 400 {
        bail!("Comanda '{}' a esuat ({}): {}", command, status, resp_body);
    }

    Ok(json!({ "status": status, "body": resp_body }))
}
