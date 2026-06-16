








export const MOBILE_HTML = `<!DOCTYPE html>
<html lang="ro">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0E0E0E">
<title>automatiX</title>
<style>
  /* Theme tokens — six-step luminance ladder, drastic separation between
     chrome, page, card, and elevated surfaces. Mirrors the desktop dark
     theme. */
  :root {
    --rail:         #000000;
    --chrome:       #0E0E0E;
    --bg:           #262626;
    --surface:      #303030;
    --surface-2:    #3D3D3D;
    --elevated:     #484848;
    --line:         #3F3F3F;
    --line-soft:    #262626;
    --accent:       #FBBF24;
    --accent-soft:  rgba(251, 191, 36, 0.18);
    --accent-hi:    #FCD34D;
    --on-accent:    #1A1500;
    --text:         #ECECEC;
    --text-muted:   #ADADAD;
    --text-faint:   #707070;
    --red:          #ef4444;
    --amber:        #f59e0b;
    --blue:         #9CA3AF;
    --green:        #22c55e;
    /* Tight, professional radii */
    --r-sm: 6px;
    --r-md: 8px;
    --r-lg: 10px;
    --r-xl: 14px;
  }
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    background: var(--bg);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    font-size: 15px;
    line-height: 1.4;
    -webkit-tap-highlight-color: transparent;
    padding-bottom: env(safe-area-inset-bottom);
  }
  a { color: var(--accent-hi); }
  button { font: inherit; cursor: pointer; }
  input, button { font-size: 16px; } /* prevent iOS zoom */
  .muted { color: var(--text-muted); }
  .red { color: var(--red); }
  .amber { color: var(--amber); }
  .green { color: var(--green); }
  .blue { color: var(--blue); }
  .num { font-variant-numeric: tabular-nums; }
  .tag {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 10px; border-radius: 999px;
    font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;
  }
  .tag.red    { background: rgba(217,119,102,0.15); color: var(--red); }
  .tag.amber  { background: rgba(216,168,92,0.15); color: var(--amber); }
  .tag.blue   { background: rgba(106,166,255,0.15); color: var(--blue); }
  .tag.green  { background: rgba(111,174,124,0.15); color: var(--green); }
  .tag.gray   { background: rgba(255,255,255,0.05); color: var(--text-muted); }

  /* Header */
  header.appbar {
    position: sticky; top: 0; z-index: 10;
    display: flex; align-items: center; gap: 10px;
    padding: 11px 16px;
    background: rgba(14,14,14,0.92);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid var(--line);
  }
  header.appbar .brand {
    font-weight: 700; letter-spacing: 0.04em;
    font-size: 13px; text-transform: uppercase;
    color: var(--text);
  }
  header.appbar .who { margin-left: auto; font-size: 12px; color: var(--text-muted); }
  header.appbar button.refresh,
  header.appbar button.logout {
    background: var(--surface); border: 1px solid var(--line); color: var(--text);
    padding: 6px 10px; border-radius: var(--r-sm); font-size: 12px;
  }
  header.appbar button.logout { margin-left: 4px; }
  header.appbar button.refresh:active,
  header.appbar button.logout:active { background: var(--surface-2); }

  /* Login */
  .login-wrap {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    padding: 24px;
  }
  .login-card {
    width: 100%; max-width: 360px;
    background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-xl);
    padding: 28px 24px;
  }
  .login-card h1 {
    margin: 0 0 4px; font-size: 22px; font-weight: 700;
    letter-spacing: 0.02em;
    color: var(--text);
  }
  .login-card p.sub { margin: 0 0 20px; color: var(--text-muted); font-size: 13px; }
  label { display: block; font-size: 12px; color: var(--text-muted); margin: 12px 0 6px; }
  input[type=text], input[type=password] {
    width: 100%; padding: 11px 13px;
    background: var(--bg); border: 1px solid var(--line); border-radius: var(--r-sm);
    color: var(--text);
  }
  input:focus {
    outline: 2px solid var(--accent); outline-offset: -1px;
    border-color: transparent;
  }
  button.primary {
    margin-top: 18px; width: 100%; padding: 11px;
    background: var(--accent); color: var(--on-accent);
    border: none; border-radius: var(--r-sm);
    font-weight: 600; letter-spacing: 0.02em;
  }
  button.primary:active { background: var(--accent-hi); }
  button.primary:disabled { opacity: 0.5; }
  .err {
    margin-top: 12px; padding: 9px 11px; border-radius: var(--r-sm);
    background: rgba(239,68,68,0.10); color: var(--red); font-size: 13px;
    border: 1px solid rgba(239,68,68,0.25);
  }

  /* Dashboard */
  main { padding: 12px 12px 32px; max-width: 760px; margin: 0 auto; }
  section.block {
    background: var(--surface); border: 1px solid var(--line-soft); border-radius: var(--r-md);
    padding: 13px 14px; margin-bottom: 10px;
  }
  section.block h2 {
    margin: 0 0 10px; font-size: 11px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.12em; color: var(--text-muted);
    display: flex; align-items: center; gap: 8px;
  }
  section.block h2 .count {
    margin-left: auto; padding: 1px 8px; border-radius: 999px;
    background: var(--bg); color: var(--text); letter-spacing: 0; font-size: 11px;
    border: 1px solid var(--line-soft);
  }

  /* KPI grid */
  .kpis { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .kpi {
    background: var(--bg); border: 1px solid var(--line-soft); border-radius: var(--r-sm);
    padding: 10px 12px;
  }
  .kpi .lbl { font-size: 10.5px; font-weight: 700; text-transform: uppercase;
              letter-spacing: 0.12em; color: var(--text-muted); }
  .kpi .val { font-size: 22px; font-weight: 600; margin-top: 4px; color: var(--text); }
  .kpi .sub { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

  /* Lists */
  ul.list { list-style: none; margin: 0; padding: 0; }
  ul.list li {
    padding: 10px 0; border-bottom: 1px solid var(--line-soft);
  }
  ul.list li:last-child { border-bottom: none; }
  .row1 { display: flex; align-items: center; gap: 8px; }
  .row1 .ttl {
    font-weight: 500; flex: 1; min-width: 0; color: var(--text);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .row2 {
    font-size: 12px; color: var(--text-muted);
    margin-top: 2px; display: flex; gap: 8px; flex-wrap: wrap;
  }
  .empty { padding: 16px 0; text-align: center; color: var(--text-muted); font-size: 13px; }

  .pill {
    display: inline-block; padding: 1px 7px; border-radius: 4px;
    font-size: 11px; font-weight: 600;
    background: var(--accent-soft); color: var(--accent-hi);
  }

  .loading { text-align: center; color: var(--text-muted); padding: 40px 0; font-size: 14px; }
  .footer-meta { text-align: center; color: var(--text-faint); font-size: 11px; margin-top: 16px; }
</style>
</head>
<body>

<div id="login" class="login-wrap" style="display:none">
  <form class="login-card" id="loginForm">
    <h1>automatiX</h1>
    <p class="sub">Preview mobil — read only</p>
    <label for="u">Utilizator</label>
    <input id="u" type="text" autocapitalize="none" autocorrect="off" autocomplete="username" required>
    <label for="p">Parolă</label>
    <input id="p" type="password" autocomplete="current-password" required>
    <button class="primary" type="submit" id="loginBtn">Conectare</button>
    <div id="loginErr" class="err" style="display:none"></div>
  </form>
</div>

<div id="app" style="display:none">
  <header class="appbar">
    <span class="brand">automatiX</span>
    <span class="who" id="who"></span>
    <button class="refresh" id="refreshBtn" title="Reîmprospătare">↻</button>
    <button class="logout" id="logoutBtn">Ieșire</button>
  </header>

  <main>
    <div id="loadingState" class="loading">Se încarcă…</div>
    <div id="content" style="display:none"></div>
    <div class="footer-meta" id="footer"></div>
  </main>
</div>

<script>
(() => {
  const TOKEN_KEY = 'automatix_mobile_token';
  const USER_KEY  = 'automatix_mobile_user';
  const $ = (id) => document.getElementById(id);

  const fmt = (n) => {
    if (n == null || isNaN(n)) return '—';
    return new Intl.NumberFormat('ro-RO').format(Math.round(n));
  };
  const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[c]);
  const timeAgo = (iso) => {
    if (!iso) return '';
    const t = new Date(iso).getTime();
    if (isNaN(t)) return '';
    const m = Math.floor((Date.now() - t) / 60000);
    if (m < 1) return 'acum';
    if (m < 60) return m + ' min';
    const h = Math.floor(m / 60);
    if (h < 24) return h + 'h';
    return Math.floor(h / 24) + 'z';
  };
  const fmtDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  async function api(command, body = {}) {
    const token = localStorage.getItem(TOKEN_KEY) || '';
    const res = await fetch('/api/cmd/' + encodeURIComponent(command), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': 'Bearer ' + token } : {}),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      let msg = 'HTTP ' + res.status;
      try { const j = await res.json(); msg = j.message || msg; } catch {}
      const e = new Error(msg); e.status = res.status; throw e;
    }
    return res.json();
  }

  function showLogin(errMsg) {
    $('app').style.display = 'none';
    $('login').style.display = 'flex';
    if (errMsg) {
      const el = $('loginErr');
      el.textContent = errMsg;
      el.style.display = 'block';
    }
  }
  function showApp() {
    $('login').style.display = 'none';
    $('app').style.display = 'block';
    const u = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    if (u) $('who').textContent = u.full_name || u.username || '';
  }

  $('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = $('u').value.trim();
    const p = $('p').value;
    const btn = $('loginBtn');
    const err = $('loginErr');
    err.style.display = 'none';
    btn.disabled = true; btn.textContent = 'Se conectează…';
    try {
      const r = await api('login', { request: { username: u, password: p } });
      if (!r || !r.token) throw new Error('Răspuns invalid de la server');
      localStorage.setItem(TOKEN_KEY, r.token);
      localStorage.setItem(USER_KEY, JSON.stringify(r.user || {}));
      showApp();
      load();
    } catch (e) {
      err.textContent = e.message || 'Eroare la conectare';
      err.style.display = 'block';
    } finally {
      btn.disabled = false; btn.textContent = 'Conectare';
    }
  });

  $('logoutBtn').addEventListener('click', async () => {
    try { await api('logout'); } catch {}
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    showLogin();
  });

  $('refreshBtn').addEventListener('click', () => load());

  async function load() {
    const content = $('content');
    const loading = $('loadingState');
    const footer = $('footer');
    const refreshBtn = $('refreshBtn');
    refreshBtn.disabled = true;
    loading.style.display = 'block';
    content.style.display = 'none';

    try {
      const [dashRes, handoffsRes, alertsRes, projectsRes, financeRes] = await Promise.allSettled([
        api('get_dashboard_data'),
        api('get_my_handoffs'),
        api('get_alerts'),
        api('get_projects'),
        api('get_finance_overview'),
      ]);

      const anyUnauth = [dashRes, handoffsRes, alertsRes, projectsRes].find(
        r => r.status === 'rejected' && (r.reason && r.reason.status === 401)
      );
      if (anyUnauth) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        showLogin('Sesiune expirată. Reconectează-te.');
        return;
      }

      const dash      = (dashRes.status === 'fulfilled') ? dashRes.value : null;
      const handoffs  = (handoffsRes.status === 'fulfilled') ? handoffsRes.value : [];
      const alerts    = (alertsRes.status === 'fulfilled') ? alertsRes.value : [];
      const projects  = (projectsRes.status === 'fulfilled') ? projectsRes.value : [];
      const finance   = (financeRes.status === 'fulfilled') ? financeRes.value : null;

      content.innerHTML = renderDashboard({ dash, handoffs, alerts, projects, finance });
      content.style.display = 'block';
      footer.textContent = 'Actualizat ' + new Date().toLocaleTimeString('ro-RO');
    } catch (e) {
      loading.innerHTML = '<div class="err" style="margin:16px">' + escapeHtml(e.message || 'Eroare') + '</div>';
      return;
    } finally {
      loading.style.display = 'none';
      refreshBtn.disabled = false;
    }
  }

  function renderDashboard({ dash, handoffs, alerts, projects, finance }) {
    const summary = (dash && (dash.summary || dash)) || {};
    const profit = (finance && finance.total_actual_profit) ?? summary.profit_total ?? 0;
    const revenue = (finance && finance.total_actual_revenue) ?? summary.revenue_total ?? 0;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    const pendingHandoffs = (handoffs || []).slice().sort((a,b) => {
      if (a.is_urgent !== b.is_urgent) return a.is_urgent ? -1 : 1;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    const activeProjects = (projects || [])
      .filter(p => p.status !== 'finalizat' && p.status !== 'anulat')
      .sort((a, b) => (a.deadline || '').localeCompare(b.deadline || ''))
      .slice(0, 8);

    const recentAlerts = (alerts || []).slice(0, 6);

    const kpiHtml = \`
      <section class="block">
        <h2>Privire de ansamblu</h2>
        <div class="kpis">
          <div class="kpi"><div class="lbl">Profit net</div>
            <div class="val \${profit < 0 ? 'red' : ''} num">\${fmt(profit)}</div>
            <div class="sub">\${margin.toFixed(1)}% marjă</div></div>
          <div class="kpi"><div class="lbl">Venituri</div>
            <div class="val num">\${fmt(revenue)}</div>
            <div class="sub">RON</div></div>
          <div class="kpi"><div class="lbl">Proiecte active</div>
            <div class="val num">\${summary.projects_active ?? 0}</div>
            <div class="sub">din \${summary.projects_total ?? 0}</div></div>
          <div class="kpi"><div class="lbl">În producție</div>
            <div class="val num">\${summary.projects_in_production ?? 0}</div>
            <div class="sub">pe linie</div></div>
          <div class="kpi"><div class="lbl">Stoc critic</div>
            <div class="val num \${(summary.materials_critical_stock ?? 0) > 0 ? 'red' : ''}">\${summary.materials_critical_stock ?? 0}</div>
            <div class="sub">sub minim</div></div>
          <div class="kpi"><div class="lbl">Alerte active</div>
            <div class="val num \${(summary.active_alerts ?? 0) > 0 ? 'amber' : ''}">\${summary.active_alerts ?? 0}</div>
            <div class="sub">nerezolvate</div></div>
        </div>
      </section>\`;

    const handoffsHtml = \`
      <section class="block">
        <h2>Predări pendinte<span class="count">\${pendingHandoffs.length}</span></h2>
        \${pendingHandoffs.length === 0
          ? '<div class="empty">Nicio predare pendinte ✓</div>'
          : '<ul class="list">' + pendingHandoffs.map(h => {
              const overdue = new Date(h.sla_due_at).getTime() < Date.now();
              return \`<li>
                <div class="row1">
                  \${h.is_urgent ? '<span class="tag red">Urgent</span>' : ''}
                  \${overdue && !h.is_urgent ? '<span class="tag amber">SLA depășit</span>' : ''}
                  <span class="ttl">\${escapeHtml(h.project_name)}</span>
                </div>
                <div class="row2">
                  <span>\${escapeHtml(h.from_stage_name || '—')} → \${escapeHtml(h.to_stage_name || '—')}</span>
                  <span class="muted">· \${timeAgo(h.created_at)}</span>
                </div>
              </li>\`;
            }).join('') + '</ul>'}
      </section>\`;

    const alertsHtml = \`
      <section class="block">
        <h2>Alerte recente<span class="count">\${recentAlerts.length}</span></h2>
        \${recentAlerts.length === 0
          ? '<div class="empty">Nicio alertă recentă</div>'
          : '<ul class="list">' + recentAlerts.map(a => \`
              <li>
                <div class="row1">
                  <span class="tag \${a.severity === 'critical' ? 'red' : a.severity === 'high' ? 'amber' : 'blue'}">\${escapeHtml(a.severity || 'info')}</span>
                  <span class="ttl">\${escapeHtml(a.title || a.message || '')}</span>
                </div>
                <div class="row2"><span>\${timeAgo(a.created_at)}</span></div>
              </li>\`).join('') + '</ul>'}
      </section>\`;

    const projectsHtml = \`
      <section class="block">
        <h2>Proiecte active<span class="count">\${activeProjects.length}</span></h2>
        \${activeProjects.length === 0
          ? '<div class="empty">Niciun proiect activ</div>'
          : '<ul class="list">' + activeProjects.map(p => \`
              <li>
                <div class="row1">
                  <span class="ttl">\${escapeHtml(p.name)}</span>
                  <span class="pill">\${escapeHtml(p.stage || p.status || '—')}</span>
                </div>
                <div class="row2">
                  <span>\${escapeHtml(p.client_name || '—')}</span>
                  <span class="muted">· termen \${fmtDate(p.deadline)}</span>
                </div>
              </li>\`).join('') + '</ul>'}
      </section>\`;

    return kpiHtml + handoffsHtml + alertsHtml + projectsHtml;
  }

  if (localStorage.getItem(TOKEN_KEY)) {
    showApp();
    load();
  } else {
    showLogin();
  }
})();
</script>
</body>
</html>`;
