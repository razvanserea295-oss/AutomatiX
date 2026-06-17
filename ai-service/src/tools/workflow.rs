use anyhow::{bail, Result};
use serde_json::{json, Value};
use sqlx::AnyPool;

pub async fn run(args: Value, pool: &AnyPool) -> Result<Value> {
    let workflow_id = args["workflow_id"]
        .as_str()
        .ok_or_else(|| anyhow::anyhow!("args.workflow_id must be a string"))?;
    let payload = args.get("payload").cloned().unwrap_or(Value::Null);

    // audit log every call — create table if not exists
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS ai_audit_log (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            ts         TEXT NOT NULL DEFAULT (datetime('now')),
            workflow_id TEXT NOT NULL,
            payload    TEXT,
            result     TEXT
        )"
    )
    .execute(pool)
    .await
    .ok(); // ignore error if table already exists

    let result = match workflow_id {
        "approve_order" => {
            let id = payload["order_id"]
                .as_str()
                .ok_or_else(|| anyhow::anyhow!("payload.order_id required"))?;
            sqlx::query("UPDATE orders SET status = 'approved' WHERE id = ?")
                .bind(id)
                .execute(pool)
                .await
                .map_err(|e| anyhow::anyhow!("DB: {}", e))?;
            json!({ "success": true, "message": format!("Order {} approved", id) })
        }
        "reject_order" => {
            let id = payload["order_id"]
                .as_str()
                .ok_or_else(|| anyhow::anyhow!("payload.order_id required"))?;
            sqlx::query("UPDATE orders SET status = 'rejected' WHERE id = ?")
                .bind(id)
                .execute(pool)
                .await
                .map_err(|e| anyhow::anyhow!("DB: {}", e))?;
            json!({ "success": true, "message": format!("Order {} rejected", id) })
        }
        "update_status" => {
            let table  = payload["table"].as_str().ok_or_else(|| anyhow::anyhow!("payload.table required"))?;
            let id     = payload["id"].as_str().ok_or_else(|| anyhow::anyhow!("payload.id required"))?;
            let status = payload["status"].as_str().ok_or_else(|| anyhow::anyhow!("payload.status required"))?;
            // whitelist table names to prevent injection
            if !["orders","tickets","tasks"].contains(&table) {
                bail!("Table '{}' not allowed", table);
            }
            let q = format!("UPDATE {} SET status = ? WHERE id = ?", table);
            sqlx::query(&q).bind(status).bind(id)
                .execute(pool).await
                .map_err(|e| anyhow::anyhow!("DB: {}", e))?;
            json!({ "success": true, "message": format!("{} {} → {}", table, id, status) })
        }
        other => bail!("Unknown workflow_id: '{}'", other),
    };

    // write audit
    sqlx::query(
        "INSERT INTO ai_audit_log (workflow_id, payload, result) VALUES (?, ?, ?)"
    )
    .bind(workflow_id)
    .bind(payload.to_string())
    .bind(result.to_string())
    .execute(pool)
    .await
    .ok();

    Ok(result)
}
