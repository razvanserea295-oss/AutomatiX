# Automatix — Generator de licențe (standalone, offline)

Software-ul cu care **tu** (proprietarul) emiți cheile de licență pentru clienți.
Rulează complet offline, pe mașina ta, și deține cheia privată de semnare. Nu are
nevoie de server, internet sau de aplicația Automatix ca să genereze chei.

## Cum funcționează

Fiecare licență este un **token semnat Ed25519**, legat de o firmă:

```
AX1.<payload(base64url)>.<semnătură(base64url)>
```

Payload-ul conține: `license_id`, `company_name`, `email`, `cui`, `issued_at`.
Cheia **publică** (înglobată în server, în app și pe site) poate *verifica* orice
token offline, dar **nu** poate emite. Doar acest generator, cu cheia **privată**,
poate semna. Fără expirare, fără limită de dispozitive, fără tier-uri.

## 1. Inițializare (o singură dată)

```bash
node tools/license-generator/init-keys.mjs
```

- Scrie cheia privată în `.keys/ed25519-private.pem` (SECRET).
- Printează cheia publică — **lipește-o** în:
  - `server/licensePublicKey.ts`  → `LICENSE_PUBLIC_KEY_PEM`
  - `src/shared/license.ts`        → `LICENSE_PUBLIC_KEY_PEM`
- Apoi rebuild (`npm run build:app` / `vite build`) ca serverul și site-ul să
  înglobeze cheia nouă.

> ⚠️ **Fă backup offline al cheii private.** Dacă o pierzi, trebuie să
> re-generezi perechea și să re-emiți TOATE licențele. Dacă se scurge, oricine
> poate emite licențe — atunci re-cheiezi și re-emiți.

## 2. Emite o licență pentru un client

```bash
node tools/license-generator/generate.mjs --company "Firma SRL" --email contact@firma.ro --cui RO12345678
```

- Printează **cheia** (copy-paste pentru client) și scrie un fișier `out/*.lic`.
- Adaugă o intrare în `registry.json` (evidența ta locală a emiterilor).
- Clientul lipește cheia pe `automatix.online` (download) și în aplicație
  (activare). Adminul firmei o importă o dată → tenantul devine licențiat.

## 3. Revocă o licență

```bash
node tools/license-generator/revoke.mjs --id <license_id> --reason "neplată"
```

- Marchează licența `revoked` în `registry.json`.
- Regenerează `out/revocations.json` — un **CRL semnat**.
- Importă CRL-ul în server: **Sistem → Licențe → Import CRL** (sau
  `POST /api/license/crl/import`). Aplicația desktop îl preia la următorul
  check online; offline rămâne validă în perioada de grație.

## Fișiere

| Fișier            | Rol                                            | Commit? |
|-------------------|------------------------------------------------|---------|
| `lib.mjs`         | helpers cripto comuni (format token, semnare)  | da      |
| `init-keys.mjs`   | generează perechea de chei                     | da      |
| `generate.mjs`    | emite o licență                                | da      |
| `revoke.mjs`      | revocă + regenerează CRL semnat                | da      |
| `.keys/`          | cheia privată (SECRET)                          | **NU**  |
| `out/`            | fișiere `.lic` + `revocations.json`            | **NU**  |
| `registry.json`   | evidența licențelor emise                      | **NU**  |

Contractul de format (token, canonicalizare, cheie publică) trebuie să rămână
identic între `lib.mjs`, `server/licenseCore.ts` și `src/shared/license.ts`.
