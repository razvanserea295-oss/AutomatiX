use anyhow::{bail, Result};
use serde_json::{json, Value};
use sqlx::{AnyPool, Row, Column};

/// SECURITY: deny-list of column names AND tables. Pentest finding showed
/// the previous filter (only `PASSWORD_HASH` / `TOKEN_HASH`) was bypassable
/// via `SELECT * FROM users` — `*` doesn't contain the literal token, so
/// the SQL passed the regex check but the result set still leaked the
/// hashes. Hardened to:
///
///   1. Refuse queries that touch the most sensitive tables (users,
///      sessions, audit_logs) entirely. The AI doesn't need to read PII
///      to answer business questions about projects, materials, etc.
///   2. After execution, strip any column whose name matches a
///      sensitive-column allowlist from every returned row.
///
/// Layer (1) prevents enumeration; layer (2) catches join-leak edge
/// cases (e.g. `SELECT u.password_hash FROM users u JOIN ... ` where
/// the table name appears but slips through any future relaxation).
const DENIED_TABLES: &[&str] = &[
    "USERS",
    "SESSIONS",
    "AUDIT_LOGS",
    "USER_NOTIFICATIONS",
];

/// Columns scrubbed from every row before returning. Defense in depth on
/// top of the table block: even if a query somehow surfaces these via a
/// view or join expression we redact them post-hoc.
const SCRUBBED_COLUMNS: &[&str] = &[
    "password_hash",
    "token_hash",
    "password",
    "token",
    "imap_password",
    "smtp_password",
    "api_token",
];

/// Read-only SELECT queries
pub async fn run(args: Value, pool: &AnyPool) -> Result<Value> {
    let sql = args["sql"]
        .as_str()
        .ok_or_else(|| anyhow::anyhow!("args.sql must be a string"))?;

    let upper = sql.to_uppercase();
    if !upper.trim_start().starts_with("SELECT") {
        bail!("query_database permite doar SELECT. AI-ul nu poate modifica datele — directioneaza userul sa o faca din UI.");
    }

    // Block queries that mention any of the sensitive tables. The match
    // is conservative: any occurrence of the table name as a word boundary
    // (FROM, JOIN, INTO subqueries, etc.) trips the gate. SQL comments are
    // weak cover — we don't bother stripping them; the LLM doesn't usually
    // emit them and the table name still appears literally.
    for table in DENIED_TABLES {
        // Match on word boundaries: surrounded by non-alphanumeric chars
        // or string ends. Avoids false positives like `users_view` or
        // `inactive_sessions`.
        let needle = *table;
        if contains_word(&upper, needle) {
            bail!(
                "query_database: cerere blocată — tabela '{}' contine date sensibile (PII / credentials / audit). \
                Foloseste tabele de business (projects, clients, materials, documents, sales_leads, etc.).",
                needle.to_lowercase()
            );
        }
    }

    // Also reject SELECT * (too permissive — explicit column lists make
    // the intent visible and the column scrubber more reliable).
    let trimmed = upper.trim_start();
    if trimmed.starts_with("SELECT *") || trimmed.starts_with("SELECT*") {
        bail!(
            "query_database: 'SELECT *' interzis. Listeaza explicit coloanele de care ai nevoie."
        );
    }

    // Hard row cap so the agent can't dump the whole DB in one query.
    let needs_limit = !upper.contains("LIMIT");
    let safe_sql = if needs_limit {
        format!("{} LIMIT 500", sql.trim_end_matches(';'))
    } else {
        sql.to_string()
    };

    let rows = sqlx::query(&safe_sql)
        .fetch_all(pool)
        .await
        .map_err(|e| anyhow::anyhow!("DB error: {}", e))?;

    let result: Vec<Value> = rows
        .iter()
        .map(|row| {
            let mut obj = serde_json::Map::new();
            for col in row.columns() {
                let name = col.name();
                // Defense in depth — even if the query slipped past the
                // filters above, we drop sensitive columns from the
                // serialized output. Case-insensitive match.
                if SCRUBBED_COLUMNS.iter().any(|c| c.eq_ignore_ascii_case(name)) {
                    continue;
                }
                let val: Value = row.try_get::<String, _>(name)
                    .map(Value::String)
                    .or_else(|_| row.try_get::<i64, _>(name).map(|v| json!(v)))
                    .or_else(|_| row.try_get::<f64, _>(name).map(|v| json!(v)))
                    .or_else(|_| row.try_get::<bool, _>(name).map(|v| json!(v)))
                    .unwrap_or(Value::Null);
                obj.insert(name.to_string(), val);
            }
            Value::Object(obj)
        })
        .collect();

    Ok(json!({ "rows": result, "count": result.len() }))
}

/// Word-boundary "contains" — `haystack` contains `needle` as a token
/// (i.e. surrounded by non-alphanumeric chars or string ends), not as a
/// substring. Used by the table deny-list so `users_view` doesn't trip
/// the `USERS` rule. Both inputs are expected to be uppercase.
fn contains_word(haystack: &str, needle: &str) -> bool {
    let bytes = haystack.as_bytes();
    let nb = needle.as_bytes();
    let mut i = 0;
    while i + nb.len() <= bytes.len() {
        if &bytes[i..i + nb.len()] == nb {
            let before_ok = i == 0 || !is_word_char(bytes[i - 1]);
            let after_ok = i + nb.len() == bytes.len() || !is_word_char(bytes[i + nb.len()]);
            if before_ok && after_ok {
                return true;
            }
        }
        i += 1;
    }
    false
}

fn is_word_char(b: u8) -> bool {
    b.is_ascii_alphanumeric() || b == b'_'
}
