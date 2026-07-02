;(function () {
  var statusEl = document.getElementById('boot-status');
  var barEl    = document.getElementById('boot-bar');
  var screenEl = document.getElementById('boot-screen');
  var isReady  = false;
  var didFail  = false;

  function showBootError(message) {
    if (didFail || isReady) return;
    didFail = true;
    if (statusEl) statusEl.textContent = message;
    if (barEl) {
      barEl.style.width = '100%';
      barEl.style.background = 'linear-gradient(90deg, #7F1D1D, #DC2626)';
    }
    if (!screenEl || document.getElementById('boot-recovery')) return;
    var wrap = document.createElement('div');
    wrap.id = 'boot-recovery';
    wrap.style.cssText = 'position:absolute;left:24px;right:24px;bottom:56px;padding:12px;border:1px solid rgba(239,68,68,.45);border-radius:8px;background:rgba(30,10,10,.65);color:#fca5a5;font:12px/1.45 "72",system-ui,sans-serif;';
    wrap.textContent = 'Interfața nu s-a putut încărca. Serverul poate fi căzut sau restartat incomplet.';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Reîncarcă';
    btn.style.cssText = 'margin-left:10px;padding:4px 10px;border:1px solid rgba(252,165,165,.5);border-radius:6px;background:#1f2937;color:#f3f4f6;font:12px "72",system-ui,sans-serif;cursor:pointer;';
    btn.onclick = function () { location.reload(); };
    wrap.appendChild(btn);
    screenEl.appendChild(wrap);
  }

  // Static boot state — no progress/message cycling on refresh.
  if (statusEl) statusEl.textContent = 'Se încarcă…';
  if (barEl) barEl.style.width = '36%';

  // Let the boot animation (hexagon draw-in + nodes) play before dismissing,
  // even when React mounts faster than the ~2s reveal.
  var BOOT_MIN_MS = 2000;
  var bootStart = Date.now();
  var prefersReducedMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function removeBootScreen() {
    if (!screenEl || !screenEl.parentNode) return;
    if (prefersReducedMotion) {
      screenEl.parentNode.removeChild(screenEl);
      return;
    }
    // Graceful fade-out, then remove.
    if (barEl) barEl.style.width = '100%';
    screenEl.classList.add('boot-exit');
    var fallback = setTimeout(function () {
      if (screenEl && screenEl.parentNode) screenEl.parentNode.removeChild(screenEl);
    }, 600);
    screenEl.addEventListener('transitionend', function onEnd() {
      clearTimeout(fallback);
      if (screenEl && screenEl.parentNode) screenEl.parentNode.removeChild(screenEl);
    });
  }

  // If the module bundle fails to load (e.g. backend crashed mid-load),
  // avoid leaving users on a silent black splash forever.
  var bootGuard = setTimeout(function () {
    if (!isReady) showBootError('Pornirea durează prea mult…');
  }, 15000);
  window.addEventListener('error', function () {
    showBootError('Eroare la încărcarea aplicației.');
  });
  window.addEventListener('unhandledrejection', function () {
    showBootError('Eroare la pornire.');
  });

  // Once the app is ready, hold for the remainder of the boot animation, then
  // fade the splash out gracefully.
  window.addEventListener('app:ready', function () {
    isReady = true;
    clearTimeout(bootGuard);
    if (didFail) return;
    var elapsed = Date.now() - bootStart;
    var wait = Math.max(0, (prefersReducedMotion ? 0 : BOOT_MIN_MS) - elapsed);
    setTimeout(removeBootScreen, wait);
  });
})();
