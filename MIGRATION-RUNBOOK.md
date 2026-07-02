# Automatix — Mutare completă pe alt PC (Windows → Windows, înlocuire)

Mută **tot**: aplicația + serverul + baza de date + cheile + tunelul Cloudflare, pe un PC nou care preia complet `automatix.online`. **DNS-ul NU se schimbă** — tunelul rulează pe orice PC și Cloudflare rutează automat către instanța conectată.

> Regula de aur a acestei mutări: **`data\.dbkey` merge ÎNTOTDEAUNA împreună cu `data\promix.db`** — fără el baza de date e criptată și inutilizabilă. Și **niciodată două `cloudflared` care rulează același tunel + două servere cu DB divergentă în același timp**.

---

## 0. Ce se mută (verificat pe PC-ul actual)
| Componentă | Cale | Note |
|---|---|---|
| App + server | `C:\APLICATIE AUTOMATIX\Automatix-NEW` | rulează `node dist-server\server\index.js` pe **:3500** |
| **Date (sistem de evidență)** | `…\data\promix.db` (56 MB) **+ `…\data\.dbkey`** + `email.key` | + `data\avatars, briefing-files, documents, shared-files, uploads` |
| Tenant | `…\tenants\` (+ `registry.json`) | 1 tenant: `promix` → :3500 → automatix.online |
| **Cheie licență (semnare)** | `…\tools\license-generator\.keys\ed25519-private.pem` | CRITICĂ — semnează licențele. Fără ea nu mai emiți/revoci |
| Config | `…\.env` | RustDesk key, URL-uri |
| Tunel — binar+config | `C:\cloudflared\` (`cloudflared.exe`, `config.yml`, `tunnels.json`) | config → `localhost:3500` + RustDesk |
| **Tunel — credențiale** | `C:\Users\SERVER\.cloudflared\` (`cert.pem`, `eb0fd8b3-….json`) | CRITICE pentru a muta tunelul |
| Pornire | `Start-Automatix.cmd` → `scripts\automatix-launcher.ps1` | pornește node + cloudflared detașat |
| Runtime | **Node v24.15.0** | aceeași versiune pe noul PC |

---

## 1. Cerințe pe PC-ul NOU (înainte de orice)
1. **Windows** (la fel ca acum).
2. **Node.js v24.15.0** (aceeași versiune majoră — altfel `node_modules` native pot crăpa): https://nodejs.org → verifică `node -v`.
3. **Aceleași căi**: aplicația la `C:\APLICATIE AUTOMATIX\Automatix-NEW`, tunelul la `C:\cloudflared`.
4. **Același nume de utilizator `SERVER`** — pentru că `C:\cloudflared\config.yml` are `credentials-file: C:\Users\SERVER\.cloudflared\…json`.
   - Dacă utilizatorul NU e `SERVER`: după copiere, editează `C:\cloudflared\config.yml` linia `credentials-file:` → calea reală (`C:\Users\<user>\.cloudflared\eb0fd8b3-….json`).
5. **RustDesk** instalat (ai ales să incluzi suportul): `C:\Program Files\RustDesk\rustdesk.exe` (calea din `.env`).
6. **(Opțional) AI**: Ollama + modele — vezi §7. Nota: launcher-ul actual **NU** mai pornește ai-service (a fost scos pentru stabilitate); appul merge normal fără AI.
7. Internet (pentru ca tunelul să se conecteze la Cloudflare edge).

---

## 2. FAZA A — Export pe PC-ul VECHI (acum, cu tot pornit)
Pe PC-ul actual, dintr-un PowerShell în folderul appului:
```powershell
cd "C:\APLICATIE AUTOMATIX\Automatix-NEW"
.\scripts\migrate-export.ps1 -Dest E:\AutomatixMove      # E: = stick USB / disc extern / share de rețea
```
Durează câteva minute (~1.7 GB, mai ales `node_modules`). Rezultă în `E:\AutomatixMove`:
`Automatix-NEW\`, `cloudflared\`, `cloudflared-creds\`, `MIGRATION-RUNBOOK.md`, `BUNDLE-MANIFEST.txt` (conține SHA256-ul DB-ului).

> Această copie e „bulk". DB-ul final îl iei la cutover (§4) — nu opri nimic încă.

---

## 3. FAZA B — Instalare pe PC-ul NOU (poți face în paralel, fără downtime)
Copiază `E:\AutomatixMove` pe PC-ul nou, apoi:

1. **App**: mută `AutomatixMove\Automatix-NEW` → `C:\APLICATIE AUTOMATIX\Automatix-NEW`.
2. **Tunel binar+config**: mută `AutomatixMove\cloudflared` → `C:\cloudflared`.
3. **Tunel credențiale**: creează `C:\Users\SERVER\.cloudflared\` și copiază acolo `AutomatixMove\cloudflared-creds\*` (cert.pem + `eb0fd8b3-….json`).
4. **Verifică build & module** (deschide PowerShell în app):
   ```powershell
   cd "C:\APLICATIE AUTOMATIX\Automatix-NEW"
   node -v            # trebuie v24.15.0
   # dacă node_modules dă erori de modul nativ pe alt Node:
   #   npm ci ; npx tsc -p tsconfig.server.json
   ```
5. **Test server local** (fără tunel încă — ca să nu ciocnești DNS-ul cu PC-ul vechi):
   ```powershell
   node "dist-server\server\index.js"
   ```
   Într-un alt terminal: `curl http://127.0.0.1:3500/api/health` → `{"status":"ok","db":"ok",...}`.
   Confirmă și că **versiunea din health e 1.1.7** și `db:"ok"` (dovada că `.dbkey` s-a copiat corect). Oprește apoi cu Ctrl-C.

> NU porni încă tunelul pe PC-ul nou. Îl pornești doar la cutover (§4), altfel ai două tuneluri.

---

## 4. FAZA C — Cutover (downtime scurt, de minute)
Ordinea contează, ca să nu ai date divergente:

1. **PC VECHI — oprește tot**:
   ```powershell
   cd "C:\APLICATIE AUTOMATIX\Automatix-NEW"; .\Stop-Automatix.cmd
   ```
   (oprește node :3500 + cloudflared). Din acest moment site-ul e jos — de aceea mergem repede.
2. **PC VECHI — copiază DB-ul FINAL** (acum e 100% la zi):
   ```powershell
   .\scripts\migrate-export.ps1 -Dest E:\AutomatixMove -FinalCutover
   ```
   Copiază pe PC-ul nou peste `C:\APLICATIE AUTOMATIX\Automatix-NEW\data` și `\tenants`. Compară SHA256 cu `BUNDLE-MANIFEST.txt` dacă vrei siguranță.
3. **PC NOU — pornește tot**:
   ```powershell
   cd "C:\APLICATIE AUTOMATIX\Automatix-NEW"; .\Start-Automatix.cmd
   ```
   Fereastra arată `node PID …` + `cloudflared PID …`.
4. **PC NOU — verifică end-to-end**:
   ```powershell
   curl.exe -sI https://automatix.online/         # 200
   curl.exe -s  https://automatix.online/api/health   # {"status":"ok",...}
   curl.exe -sI https://app.automatix.online/     # 200
   ```
   Loghează-te în app din browser și verifică datele reale (proiecte, financiar).
5. **PC VECHI — dezactivează definitiv** (ca să nu repornească accidental tunelul): șterge/dezactivează orice autostart, sau pur și simplu lasă-l oprit. NU mai porni `Start-Automatix.cmd` pe el.

---

## 5. ⚠ Fă tunelul rezistent la reboot pe PC-ul NOU (fixul avariei de azi)
Azi site-ul a picat fiindcă `cloudflared` **nu are auto-pornire** (nici serviciu, nici task). Pe PC-ul nou, instalează-l ca **serviciu Windows** (o dată, în PowerShell **ca Administrator**):
```powershell
C:\cloudflared\cloudflared.exe --config C:\cloudflared\config.yml service install
Start-Service cloudflared
```
Astfel tunelul repornește singur la boot și dacă crapă.
> Dacă instalezi serviciul, **scoate pornirea cloudflared din launcher** (altfel ai două instanțe): în `scripts\automatix-launcher.ps1`, pasul „[3/3]" — comentează blocul `Start-Process $CloudflaredExe`. Node-ul rămâne pornit de launcher.
> Alternativ, pentru node ca serviciu (always-on fără fereastră), folosește NSSM sau un Task Scheduler „At startup".

---

## 6. Verificări post-mutare (checklist)
- [ ] `data\.dbkey` prezent lângă `promix.db` pe PC-ul nou (altfel `db:"error"` în health).
- [ ] `tools\license-generator\.keys\ed25519-private.pem` prezent (cheia de semnare licențe).
- [ ] `curl https://automatix.online/api/health` → 200 de pe PC-ul nou; **PC-ul vechi oprit**.
- [ ] Backup off-site: în `automatix-launcher.ps1` setează `PROMIX_BACKUP_MIRROR_DIR` către alt disc/NAS/OneDrive (doar DB-ul CRIPTAT se copiază, nu cheia).
- [ ] RustDesk: dacă folosești self-hosted, pornește hbbs/hbbr pe :21116/:21117 (tunelul deja rutează id/relay). Cheia RustDesk e în `.env`.
- [ ] `.env` — dacă ai activat vreodată `PROMIX_LICENSE_GATE`, adu și `PROMIX_CRL_URL`.

## 7. AI (Ollama) — opțional
`ai-service\` s-a copiat, dar launcher-ul nu-l pornește. Pe PC-ul nou: instalează **Ollama**, descarcă modelele (mari, separat), apoi pornește ai-service manual dacă vrei chat AI. Fără el, pagina AI zice doar „serviciu indisponibil".

## 8. Rollback (dacă noul PC nu merge)
Pornește la loc pe PC-ul VECHI: `Start-Automatix.cmd`. Tunelul revine pe vechiul PC (aceleași credențiale). Nu s-a pierdut nimic pentru că DB-ul de pe vechi n-a fost modificat cât timp appul era oprit.
