/* =========================================================
   ZET BURGERS — editorial premium · app logic
   Refined motion: inertial smooth scroll, parallax, reveals,
   subtle magnetic buttons, growing-card detail, daypart wash.
   ========================================================= */
(() => {
  "use strict";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer  = window.matchMedia("(pointer: fine)").matches;
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const lerp  = (a, b, t) => a + (b - a) * t;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(v, hi));

  $("#year").textContent = new Date().getFullYear();

  /* shared motion state */
  const M = { scrollVel: 0 };

  /* =========================================================
     INERTIAL SMOOTH SCROLL (desktop, fine pointer)
     ========================================================= */
  const Scroll = (() => {
    const enabled = !reduceMotion && finePointer;
    let target = window.scrollY, current = window.scrollY, running = false;
    const EASE = 0.1;
    const maxY = () => document.documentElement.scrollHeight - innerHeight;
    function start() { if (!running) { running = true; requestAnimationFrame(loop); } }
    function loop() {
      const prev = current;
      current = lerp(current, target, EASE);
      M.scrollVel = current - prev;
      if (Math.abs(target - current) < 0.35) { current = target; M.scrollVel = 0; running = false; window.scrollTo(0, Math.round(current)); return; }
      window.scrollTo(0, current);
      requestAnimationFrame(loop);
    }
    function onWheel(e) { if (e.ctrlKey) return; e.preventDefault(); target = clamp(target + e.deltaY, 0, maxY()); start(); }
    function to(y, snap) { target = clamp(y, 0, maxY()); if (snap || !enabled) { current = target; window.scrollTo(0, target); } else start(); }
    if (enabled) {
      window.addEventListener("wheel", onWheel, { passive: false });
      window.addEventListener("scroll", () => { if (!running) current = target = window.scrollY; }, { passive: true });
      window.addEventListener("resize", () => { target = clamp(target, 0, maxY()); });
    }
    return { to, get enabled() { return enabled; } };
  })();

  $$('a[href^="#"]').forEach(a => {
    a.addEventListener("click", e => {
      const id = a.getAttribute("href"); if (id.length < 2) return;
      const el = $(id); if (!el) return;
      e.preventDefault();
      Scroll.to(el.getBoundingClientRect().top + window.scrollY - 70);
    });
  });

  /* =========================================================
     UNIFIED rAF LOOP — parallax, magnetic, scroll line
     ========================================================= */
  const parallax = $$("[data-parallax]").map(el => ({ el, speed: parseFloat(el.dataset.parallax) || 0.1 }));
  const magnets = $$(".btn, .brand");
  magnets.forEach(el => {
    el._m = { x: 0, y: 0, tx: 0, ty: 0 };
    if (!finePointer || reduceMotion) return;
    el.addEventListener("pointermove", e => {
      const r = el.getBoundingClientRect();
      el._m.tx = (e.clientX - (r.left + r.width / 2)) * 0.2;
      el._m.ty = (e.clientY - (r.top + r.height / 2)) * 0.3;
    });
    el.addEventListener("pointerleave", () => { el._m.tx = 0; el._m.ty = 0; });
  });
  const line = $("#scroll-line");
  function tick() {
    if (!reduceMotion) {
      for (const p of parallax) p.el.style.transform = `translate3d(0, ${(-window.scrollY * p.speed).toFixed(1)}px, 0)`;
      for (const el of magnets) {
        const m = el._m; m.x = lerp(m.x, m.tx, 0.16); m.y = lerp(m.y, m.ty, 0.16);
        el.style.transform = (Math.abs(m.x) + Math.abs(m.y) > 0.1) ? `translate(${m.x.toFixed(2)}px, ${m.y.toFixed(2)}px)` : "";
      }
    }
    const max = document.documentElement.scrollHeight - innerHeight;
    line.style.transform = `scaleX(${max > 0 ? clamp(window.scrollY / max, 0, 1) : 0})`;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  /* ---------- nav shrink ---------- */
  const nav = $("#nav");
  addEventListener("scroll", () => nav.classList.toggle("shrink", window.scrollY > 30), { passive: true });

  /* =========================================================
     DAYPART — warm wash shifts by time of day (bg event)
     ========================================================= */
  const NAMES = { morning: "dimineață", day: "zi", sunset: "apus", night: "noapte" };
  const ORDER = ["morning", "day", "sunset", "night"];
  let manual = null;
  function currentDaypart() {
    if (manual) return manual;
    const h = new Date().getHours();
    if (h < 6) return "night";
    if (h < 11) return "morning";
    if (h < 18) return "day";
    if (h < 22) return "sunset";
    return "night";
  }
  function applyDaypart(key) {
    document.body.dataset.daypart = key;
    const n = $("#daypart-name"); if (n) n.textContent = NAMES[key];
  }
  $("#theme-toggle").addEventListener("click", () => {
    const now = manual || currentDaypart();
    manual = ORDER[(ORDER.indexOf(now) + 1) % ORDER.length];
    applyDaypart(manual);
  });

  /* ---------- open / closed status ---------- */
  function refreshOpenStatus() {
    const d = new Date(), day = d.getDay(), h = d.getHours();
    let open, close;
    if (day === 0) { open = 13; close = 22; }
    else if (day === 5 || day === 6) { open = 12; close = 25; }
    else { open = 12; close = 23; }
    const isOpen = h >= open && h < close;
    $("#open-status").classList.toggle("open", isOpen);
    $("#open-label").textContent = isOpen ? "Deschis" : "Închis";
  }

  /* =========================================================
     MENU CARDS + growing-card modal
     ========================================================= */
  const burgerSVG = '<svg class="burger" viewBox="0 0 360 300"><use href="#burger-art" /></svg>';
  const cards = $("#cards");
  (window.ZET_MENU || []).forEach((item, i) => {
    const el = document.createElement("article");
    el.className = "menu-card reveal";
    el.tabIndex = 0;
    el.style.transitionDelay = `${(i % 4) * 60}ms`;
    const no = String(i + 1).padStart(2, "0");
    el.innerHTML = `
      <div class="menu-card__top">
        <span class="menu-card__no">${no}</span>
        <span class="menu-card__tag">${item.tag}</span>
      </div>
      <h3 class="menu-card__name">${item.name}</h3>
      <p class="menu-card__desc">${item.desc}</p>
      <div class="menu-card__foot">
        <span class="menu-card__price">${item.price}<i>lei</i></span>
        <span class="menu-card__more">detalii <span aria-hidden="true">→</span></span>
      </div>`;
    el.addEventListener("click", () => openModal(item, no, el));
    el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openModal(item, no, el); } });
    cards.appendChild(el);
  });

  const modal = $("#card-modal"), panel = $("#modal-panel");
  let lastFocus = null;
  function openModal(item, no, originEl) {
    lastFocus = originEl;
    panel.innerHTML = `
      <button class="modal__close" aria-label="Închide" data-close>✕</button>
      <div class="modal__art" aria-hidden="true">${burgerSVG}</div>
      <div class="modal__body">
        <span class="modal__no">${no} — ${item.tag}</span>
        <h3>${item.name}</h3>
        <p>${item.story}</p>
        <div class="modal__ing">${item.ingredients.map(x => `<span>${x}</span>`).join("")}</div>
        <div class="modal__foot">
          <span class="modal__price">${item.price}<i>lei</i></span>
          <a href="#reserve" class="btn" data-close>Comandă acum</a>
        </div>
      </div>`;
    if (!reduceMotion && originEl) {
      const r = originEl.getBoundingClientRect();
      const ox = r.left + r.width / 2 - innerWidth / 2;
      const oy = r.top + r.height / 2 - innerHeight / 2;
      panel.animate(
        [{ transform: `translate(${ox}px, ${oy}px) scale(.25)`, opacity: 0 },
         { transform: "translate(0,0) scale(1)", opacity: 1 }],
        { duration: 520, easing: "cubic-bezier(.22,1,.36,1)" }
      );
    }
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    $(".modal__close", panel).focus();
  }
  function closeModal() {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }
  modal.addEventListener("click", e => { if (e.target.closest("[data-close]")) closeModal(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && modal.classList.contains("open")) closeModal(); });

  /* =========================================================
     SCROLL REVEAL + counters
     ========================================================= */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  $$(".reveal").forEach(el => io.observe(el));

  function animateCount(el) {
    const target = parseFloat(el.dataset.count) || 0;
    const decimals = parseInt(el.dataset.decimals || "0", 10);
    const suffix = el.dataset.suffix || "";
    const fmt = n => (decimals ? n.toFixed(decimals) : Math.round(n).toLocaleString("ro-RO")) + suffix;
    const start = performance.now(), dur = 1800;
    (function step(now) {
      const t = Math.min((now - start) / dur, 1);
      el.textContent = fmt(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(step);
    })(start);
  }
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach(en => { if (en.isIntersecting) { animateCount(en.target); countIO.unobserve(en.target); } });
  }, { threshold: 0.6 });
  $$("[data-count]").forEach(el => countIO.observe(el));

  /* =========================================================
     RESERVATION FORM
     ========================================================= */
  const form = $("#reserve-form"), msg = $("#reserve-msg"), dateInput = $("#r-date");
  dateInput.min = new Date().toISOString().split("T")[0];
  form.addEventListener("submit", e => {
    e.preventDefault();
    const name = $("#r-name").value.trim(), phone = $("#r-phone").value.trim();
    const date = dateInput.value, guests = $("#r-guests").value;
    msg.classList.remove("error");
    if (!name || !phone || !date) { msg.textContent = "Completează numele, telefonul și data, te rugăm."; msg.classList.add("error"); return; }
    try { localStorage.setItem("zet_last_reservation", JSON.stringify({ name, phone, date, guests, at: Date.now() })); } catch (_) {}
    const nice = new Date(date).toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long" });
    msg.textContent = `Mulțumim, ${name}! Masă pentru ${guests} pe ${nice} — te sunăm pentru confirmare.`;
    form.reset(); $("#r-guests").value = 2;
  });

  /* ---------- boot ---------- */
  applyDaypart(currentDaypart());
  refreshOpenStatus();
  setInterval(() => { if (!manual) applyDaypart(currentDaypart()); refreshOpenStatus(); }, 60000);
})();
