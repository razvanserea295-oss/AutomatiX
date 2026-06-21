;(function () {
  var MSGS = [
    'Se inițializează mediul de lucru…',
    'Se verifică sesiunea utilizatorului…',
    'Se încarcă modulele de interfață…',
    'Se pregătesc componentele…',
    'Se conectează la server…',
    'Gata.'
  ];

  var idx      = 0;
  var statusEl = document.getElementById('boot-status');
  var barEl    = document.getElementById('boot-bar');
  var screenEl = document.getElementById('boot-screen');
  var logoEl   = document.getElementById('boot-logo');
  var titleEl  = document.getElementById('boot-title');

  // Animate icon in, then slide title up
  requestAnimationFrame(function () {
    setTimeout(function () {
      if (logoEl)  { logoEl.style.opacity  = '1'; logoEl.style.transform  = 'scale(1)'; }
      setTimeout(function () {
        if (titleEl) { titleEl.style.opacity = '1'; titleEl.style.transform = 'translateY(0)'; }
      }, 250);
    }, 60);
  });

  // Advance loading message and progress bar
  function tick() {
    if (statusEl) statusEl.textContent = MSGS[Math.min(idx, MSGS.length - 1)];
    var pct = idx === 0 ? 5 : Math.min(88, Math.round((idx / (MSGS.length - 1)) * 88));
    if (barEl) barEl.style.width = pct + '%';
    idx++;
    if (idx < MSGS.length) setTimeout(tick, 520 + Math.floor(Math.random() * 180));
  }
  setTimeout(tick, 80);

  // Dismiss: fill bar → short pause → fade out → remove from DOM
  window.addEventListener('app:ready', function () {
    if (barEl) barEl.style.width = '100%';
    setTimeout(function () {
      if (screenEl) {
        screenEl.style.opacity = '0';
        setTimeout(function () {
          if (screenEl && screenEl.parentNode) screenEl.parentNode.removeChild(screenEl);
        }, 520);
      }
    }, 160);
  });
})();
