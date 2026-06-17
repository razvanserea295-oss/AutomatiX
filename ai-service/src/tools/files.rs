use anyhow::{bail, Result};
use serde_json::{json, Value};
use std::path::Path;

pub fn run(args: Value, allowed_dir: &str) -> Result<Value> {
    let path_str = args["path"]
        .as_str()
        .ok_or_else(|| anyhow::anyhow!("args.path must be a string"))?;
    let file_type = args["file_type"]
        .as_str()
        .unwrap_or("auto");

    // security: only allow files inside allowed_dir
    let path = Path::new(path_str).canonicalize()
        .map_err(|_| anyhow::anyhow!("File not found: {}", path_str))?;
    let allowed = Path::new(allowed_dir).canonicalize()
        .map_err(|_| anyhow::anyhow!("allowed_dir not found"))?;
    if !path.starts_with(&allowed) {
        bail!("Access denied: path is outside allowed directory");
    }

    let ext = path.extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let detected = if file_type != "auto" {
        file_type.to_string()
    } else {
        ext.clone()
    };

    match detected.as_str() {
        "pdf" => parse_pdf(&path),
        "xlsx" | "xls" | "excel" => parse_excel(&path),
        "csv" => parse_csv(&path),
        other => bail!("Unsupported file type: {}", other),
    }
}

fn parse_pdf(path: &Path) -> Result<Value> {
    let content = pdf_extract::extract_text(path)
        .map_err(|e| anyhow::anyhow!("PDF error: {}", e))?;
    Ok(json!({ "content": content, "row_count": 0 }))
}

fn parse_excel(path: &Path) -> Result<Value> {
    use calamine::{Reader, open_workbook_auto};
    let mut wb = open_workbook_auto(path)
        .map_err(|e| anyhow::anyhow!("Excel error: {}", e))?;
    let sheet = wb.sheet_names().first()
        .ok_or_else(|| anyhow::anyhow!("No sheets found"))?.clone();
    let range = wb.worksheet_range(&sheet)
        .map_err(|e| anyhow::anyhow!("Sheet error: {}", e))?;
    let rows: Vec<Vec<String>> = range.rows()
        .map(|r| r.iter().map(|c| c.to_string()).collect())
        .collect();
    let count = rows.len();
    Ok(json!({ "rows": rows, "row_count": count }))
}

fn parse_csv(path: &Path) -> Result<Value> {
    let mut rdr = csv::Reader::from_path(path)
        .map_err(|e| anyhow::anyhow!("CSV error: {}", e))?;
    let rows: Vec<Vec<String>> = rdr.records()
        .filter_map(|r| r.ok())
        .map(|r| r.iter().map(String::from).collect())
        .collect();
    let count = rows.len();
    Ok(json!({ "rows": rows, "row_count": count }))
}
