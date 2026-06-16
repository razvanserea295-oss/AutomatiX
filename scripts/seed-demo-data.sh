#!/usr/bin/env bash
# Seeds a small but realistic demo dataset via the live HTTP API.
# Run with the Node server up on :3500 and admin2 active.
#
# Usage: bash scripts/seed-demo-data.sh

set -euo pipefail
API="http://localhost:3500/api/cmd"

echo "==> Login as admin2"
LOGIN=$(curl -s -X POST -H 'Content-Type: application/json' \
  -d '{"request":{"username":"admin2","password":"Vlad@2008"}}' "$API/login")
TOKEN=$(echo "$LOGIN" | sed 's/.*"token":"\([^"]*\)".*/\1/')
[[ -z "$TOKEN" ]] && { echo "login failed: $LOGIN"; exit 1; }
H="Authorization: Bearer $TOKEN"
CT="Content-Type: application/json"

post() { curl -s -X POST -H "$CT" -H "$H" -d "$2" "$API/$1"; }
note() { echo "  - $1"; }

echo "==> Clients (3)"
post create_client '{"request":{"name":"Carpati Construct SRL","contact_person":"Andrei Popescu","phone":"+40 721 100 200","email":"contact@carpati-construct.ro","city":"București","county":"Ilfov","notes":"Client major, contracte multiple"}}' >/dev/null
post create_client '{"request":{"name":"Beton Trans Cluj","contact_person":"Maria Ionescu","phone":"+40 264 555 666","email":"office@betontrans.ro","city":"Cluj-Napoca","county":"Cluj"}}' >/dev/null
post create_client '{"request":{"name":"Hidro Construct Iași","contact_person":"Vasile Munteanu","phone":"+40 232 444 333","email":"vasile@hidroconstruct.ro","city":"Iași","county":"Iași","notes":"Plătește la 60 zile"}}' >/dev/null
note "3 clients"

echo "==> Suppliers (3)"
post create_supplier '{"request":{"name":"Otelul SA","email":"comenzi@otelul-sa.ro","phone":"+40 256 888 777","cui":"RO12345678"}}' >/dev/null
post create_supplier '{"request":{"name":"ElectroComponents","email":"vanzari@electrocomp.ro","phone":"+40 21 333 4455"}}' >/dev/null
post create_supplier '{"request":{"name":"Hidraulica Vest","email":"info@hidraulica-vest.ro","phone":"+40 256 111 222"}}' >/dev/null
note "3 suppliers"

echo "==> Materials (6)"
post create_material '{"request":{"code":"MAT-OTL-001","name":"Tablă oțel S235 5mm","unit":"kg","unit_cost":4.5,"category":"structura","stock":2500,"min_stock":500}}' >/dev/null
post create_material '{"request":{"code":"MAT-OTL-002","name":"Profil U 100x50x5","unit":"m","unit_cost":18,"category":"structura","stock":120,"min_stock":40}}' >/dev/null
post create_material '{"request":{"code":"MAT-MOT-001","name":"Motor electric 5.5kW","unit":"buc","unit_cost":1450,"category":"electric","stock":4,"min_stock":2}}' >/dev/null
post create_material '{"request":{"code":"MAT-VOP-001","name":"Vopsea industrială gri RAL7035","unit":"l","unit_cost":24,"category":"vopsitorie","stock":60,"min_stock":20}}' >/dev/null
post create_material '{"request":{"code":"MAT-HID-001","name":"Cilindru hidraulic 100x600","unit":"buc","unit_cost":890,"category":"hidraulic","stock":3,"min_stock":2}}' >/dev/null
post create_material '{"request":{"code":"MAT-CAB-001","name":"Cablu electric 4x6 mm²","unit":"m","unit_cost":12,"category":"electric","stock":15,"min_stock":50}}' >/dev/null
note "6 materials (1 sub min_stock = critic)"

echo "==> Projects (3)"
P1=$(post create_project '{"request":{"name":"Statie betoane 60mc/h Pitesti","client_id":2,"status":"active","priority":"high","description":"Statie noua pentru constructorul autostrazii A1","estimated_value":850000,"estimated_cost":620000,"deadline":"2026-09-30"}}' | sed 's/.*"id":\([0-9]*\).*/\1/')
P2=$(post create_project '{"request":{"name":"Modernizare statie Cluj","client_id":3,"status":"oferta","priority":"medium","description":"Inlocuire siloz si sistem cantarire","estimated_value":280000,"estimated_cost":195000,"deadline":"2026-08-15"}}' | sed 's/.*"id":\([0-9]*\).*/\1/')
P3=$(post create_project '{"request":{"name":"Statie mobila Iasi","client_id":4,"status":"active","priority":"high","description":"Configuratie trailer 25mc/h","estimated_value":450000,"estimated_cost":340000,"deadline":"2026-07-20"}}' | sed 's/.*"id":\([0-9]*\).*/\1/')
note "3 projects (id: $P1, $P2, $P3)"

echo "==> Sales leads (2)"
post create_sales_lead '{"request":{"client_name":"Drumuri Banat SRL","contact_person":"Costel Drăgan","contact_email":"costel@drumuribanat.ro","contact_phone":"+40 256 700 800","product_interest":"Stație 80mc/h","estimated_value":1200000,"location":"Timișoara","status":"qualified","notes":"Investiție 2026"}}' >/dev/null
post create_sales_lead '{"request":{"client_name":"Auto Ciment Brașov","contact_person":"Ana Florea","contact_email":"ana.florea@autociment.ro","product_interest":"Service & piese","estimated_value":85000,"location":"Brașov","status":"new"}}' >/dev/null
note "2 sales leads"

echo "==> Document categories (2)"
post create_document_category '{"request":{"name":"Documentație tehnică","parent_id":null}}' >/dev/null
post create_document_category '{"request":{"name":"Contracte semnate","parent_id":null}}' >/dev/null
note "2 categories"

echo "==> Alerts (2 demo)"
post create_alert '{"request":{"title":"Stoc cablu 4x6 sub minim","message":"15m din 50m. Reaprovizionare necesară.","severity":"warning"}}' >/dev/null
post create_alert '{"request":{"title":"Termen Stație Iași","message":"Mai sunt 2 luni până la livrare.","severity":"info"}}' >/dev/null
note "2 alerts"

echo
echo "=== DONE ==="
post get_dashboard_data '{}' | head -c 250
echo
