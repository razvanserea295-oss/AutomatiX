/* =========================================================
   ZET BURGERS — app logic (fluid edition)
   One unified rAF loop drives every motion via lerp:
   - inertial smooth scroll (Lenis-style) with scroll-velocity skew
   - parallax layers, scroll-progress bar
   - lerped cursor glow, magnetic buttons, smoothed 3D card tilt
   - event-driven particle background (pointer · scroll · time-of-day)
   - growing-card modal, scroll reveal, counters, reservation form
   ========================================================= */
(() => {
  "use strict";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer  = window.matchMedia("(pointer: fine)").matches;
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const lerp  = (a, b, t) => a + (b - a) * t;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(v, hi));

  /* ---------- shared motion state (read by the rAF loop) ---------- */
  const M = {
    pointerX: innerWidth / 2, pointerY: innerHeight / 2,   // raw target
    glowX: innerWidth / 2,    glowY: innerHeight / 2,      // smoothed
    scrollVel: 0,                                          // px/frame from smooth scroll
    skew: 0,                                               // eased skew applied to <main>
    tiltCard: null,                                        // currently hovered card + targets
  };

  /* ---------- loader ---------- */
  window.addEventListener("load", () => {
    const loader = $("#loader");
    setTimeout(() => loader && loader.classList.add("done"), reduceMotion ? 0 : 1100);
  });
  $("#year").textContent = new Date().getFullYear();

  /* =========================================================
     INERTIAL SMOOTH SCROLL  (desktop + fine pointer only)
     ========================================================= */
  const Scroll = (() => {
    const enabled = !reduceMotion && finePointer;
    let target = window.scrollY, current = window.scrollY, running = false;
    const EASE = 0.09;
    const maxScroll = () => document.documentElement.scrollHeight - innerHeight;

    function start() { if (!running) { running = true; requestAnimationFrame(loop); } }
    function loop() {
      const prev = current;
      current = lerp(current, target, EASE);
      M.scrollVel = current - prev;
      if (Math.abs(target - current) < 0.35) {
        current = target; M.scrollVel = 0; running = false;
        window.scrollTo(0, Math.round(current));
        return;
      }
      window.scrollTo(0, current);
      requestAnimationFrame(loop);
    }
    function onWheel(e) {
      if (e.ctrlKey) return;            // let pinch-zoom through
      e.preventDefault();
      target = clamp(target + e.deltaY, 0, maxScroll());
      start();
    }
    function scrollToY(y, snap) {
      target = clamp(y, 0, maxScroll());
      if (snap || !enabled) { current = target; window.scrollTo(0, target); }
      else start();
    }
    if (enabled) {
      window.addEventListener("wheel", onWheel, { passive: false });
      // keep in sync when scrolled by keyboard / scrollbar / programmatic native scroll
      window.addEventListener("scroll", () => {
        if (!running) { current = target = window.scrollY; }
      }, { passive: true });
      window.addEventListener("resize", () => { target = clamp(target, 0, maxScroll()); });
    }
    return { scrollToY, get enabled() { return enabled; } };
  })();

  // smooth anchor navigation through the inertial scroller
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener("click", e => {
      const id = a.getAttribute("href");
      if (id.length < 2) return;
      const el = $(id);
      if (!el) return;
      e.preventDefault();
      const y = el.getBoundingClientRect().top + window.scrollY - 80;
      Scroll.scrollToY(y);
    });
  });

  /* =========================================================
     POINTER + MAGNETIC BUTTONS (targets only; lerp in the loop)
     ========================================================= */
  window.addEventListener("pointermove", e => {
    M.pointerX = e.clientX; M.pointerY = e.clientY;
    document.body.classList.add("has-pointer");
  }, { passive: true });

  const magnets = $$(".btn, .nav__brand");
  magnets.forEach(el => {
    el._mag = { x: 0, y: 0, tx: 0, ty: 0 };
    if (!finePointer || reduceMotion) return;
    el.addEventListener("pointermove", e => {
      const r = el.getBoundingClientRect();
      el._mag.tx = (e.clientX - (r.left + r.width / 2)) * 0.28;
      el._mag.ty = (e.clientY - (r.top + r.height / 2)) * 0.4;
    });
    el.addEventListener("pointerleave", () => { el._mag.tx = 0; el._mag.ty = 0; });
  });

  /* ---------- parallax targets ---------- */
  const parallax = $$("[data-parallax]").map(el => ({ el, speed: parseFloat(el.dataset.parallax) || 0.1 }));

  /* ---------- scroll progress ---------- */
  const progress = $("#scroll-progress");

  /* =========================================================
     THE UNIFIED rAF LOOP — everything pointer/scroll-driven
     ========================================================= */
  const mainEl = $("main");
  const glow = $("#cursor-glow");
  function tick() {
    // cursor glow follows pointer with inertia
    M.glowX = lerp(M.glowX, M.pointerX, 0.16);
    M.glowY = lerp(M.glowY, M.pointerY, 0.16);
    glow.style.transform = `translate(${M.glowX}px, ${M.glowY}px)`;

    // scroll-velocity skew on the whole content (the "fluid" signature)
    if (!reduceMotion) {
      const targetSkew = clamp(M.scrollVel * 0.035, -2.4, 2.4);
      M.skew = lerp(M.skew, targetSkew, 0.12);
      mainEl.style.transform = Math.abs(M.skew) > 0.01 ? `skewY(${M.skew.toFixed(3)}deg)` : "";

      // parallax layers
      for (const p of parallax) {
        p.el.style.transform = `translate3d(0, ${(-window.scrollY * p.speed).toFixed(1)}px, 0)`;
      }
    }

    // magnetic buttons
    for (const el of magnets) {
      const m = el._mag;
      m.x = lerp(m.x, m.tx, 0.18); m.y = lerp(m.y, m.ty, 0.18);
      el.style.transform = (Math.abs(m.x) + Math.abs(m.y) > 0.1)
        ? `translate(${m.x.toFixed(2)}px, ${m.y.toFixed(2)}px)` : "";
    }

    // smoothed 3D tilt for the hovered card
    const c = M.tiltCard;
    if (c) {
      c.rx = lerp(c.rx, c.trx, 0.14); c.ry = lerp(c.ry, c.try, 0.14);
      c.el.style.transform =
        `translateY(-8px) perspective(820px) rotateX(${c.rx.toFixed(2)}deg) rotateY(${c.ry.toFixed(2)}deg)`;
      if (c.releasing && Math.abs(c.rx) < 0.05 && Math.abs(c.ry) < 0.05) {
        c.el.style.transform = ""; M.tiltCard = null;
      }
    }

    // scroll progress bar
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? clamp(window.scrollY / max, 0, 1) : 0})`;

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  /* =========================================================
     DAYPART — palette/mood by time of day (background event)
     ========================================================= */
  const DAYPARTS = [
    { key: "night",   from: 0 },  { key: "morning", from: 6 },
    { key: "day",     from: 11 }, { key: "sunset",  from: 18 }, { key: "night", from: 22 },
  ];
  let manualDaypart = null;
  function currentDaypart() {
    if (manualDaypart) return manualDaypart;
    const h = new Date().getHours();
    let pick = DAYPARTS[0];
    for (const d of DAYPARTS) if (h >= d.from) pick = d;
    return pick.key;
  }
  function applyDaypart(key) { document.body.dataset.daypart = key; bg.recolor(); }
  const cycle = ["morning", "day", "sunset", "night"];
  $("#theme-toggle").addEventListener("click", () => {
    const now = manualDaypart || currentDaypart();
    manualDaypart = cycle[(cycle.indexOf(now) + 1) % cycle.length];
    applyDaypart(manualDaypart);
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
    $("#open-label").textContent = isOpen ? "Deschis acum" : "Închis";
  }

  /* =========================================================
     CANVAS BACKGROUND — embers reacting to pointer + scroll vel
     ========================================================= */
  const bg = (() => {
    const canvas = $("#bg-canvas");
    const ctx = canvas.getContext("2d");
    let w, h, dpr, particles = [], color = "#ff5e3a", color2 = "#ffd23f", raf;

    function readColors() {
      const cs = getComputedStyle(document.body);
      color  = cs.getPropertyValue("--accent").trim()  || color;
      color2 = cs.getPropertyValue("--accent-2").trim() || color2;
    }
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.width  = innerWidth  * dpr;
      h = canvas.height = innerHeight * dpr;
      canvas.style.width = innerWidth + "px";
      canvas.style.height = innerHeight + "px";
      build();
    }
    function build() {
      const count = innerWidth < 640 ? 34 : 70;
      particles = Array.from({ length: count }, () => spawn(true));
    }
    function spawn(initial) {
      return {
        x: Math.random() * w, y: initial ? Math.random() * h : h + 20 * dpr,
        r: (Math.random() * 2.4 + 0.6) * dpr,
        vy: (Math.random() * 0.5 + 0.15) * dpr,
        vx: (Math.random() - 0.5) * 0.3 * dpr,
        a: Math.random() * 0.5 + 0.15, tw: Math.random() * Math.PI * 2,
      };
    }
    function step() {
      ctx.clearRect(0, 0, w, h);
      const boost = Math.min(Math.abs(M.scrollVel) * 0.05, 6);
      for (let p of particles) {
        p.tw += 0.03;
        p.y -= p.vy * (1 + boost);
        p.x += p.vx + Math.sin(p.tw) * 0.2 * dpr;
        const px = M.pointerX * dpr, py = M.pointerY * dpr;
        const dx = p.x - px, dy = p.y - py, dist = Math.hypot(dx, dy);
        if (document.body.classList.contains("has-pointer") && dist < 120 * dpr && dist > 0.1) {
          const force = (120 * dpr - dist) / (120 * dpr);
          p.x += (dx / dist) * force * 2.4 * dpr;
          p.y += (dy / dist) * force * 2.4 * dpr;
        }
        if (p.y < -20 * dpr) Object.assign(p, spawn(false));
        const flick = 0.6 + Math.sin(p.tw) * 0.4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = hexA(p.tw % 1 > 0.5 ? color : color2, p.a * flick);
        ctx.shadowBlur = 12 * dpr; ctx.shadowColor = color;
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      raf = requestAnimationFrame(step);
    }
    function hexA(hex, a) {
      hex = hex.replace("#", "");
      if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
      const n = parseInt(hex, 16);
      return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a.toFixed(3)})`;
    }
    window.addEventListener("resize", resize);
    return {
      init() { readColors(); resize(); if (!reduceMotion) raf = requestAnimationFrame(step); },
      recolor: readColors,
    };
  })();

  /* =========================================================
     MENU CARDS — render + smoothed tilt + growing modal
     ========================================================= */
  const cards = $("#cards");
  (window.ZET_MENU || []).forEach((item, i) => {
    const el = document.createElement("article");
    el.className = "card reveal";
    el.setAttribute("role", "listitem");
    el.tabIndex = 0;
    el.style.transitionDelay = `${(i % 4) * 70}ms`;
    el.innerHTML = `
      <div class="card__emoji">${item.emoji}</div>
      <div class="card__body">
        <span class="card__tag">${item.tag}</span>
        <h3 class="card__name">${item.name}</h3>
        <p class="card__desc">${item.desc}</p>
        <div class="card__foot">
          <span class="card__price"><b>${item.price}</b> lei</span>
          <span class="card__more">detalii <span aria-hidden="true">→</span></span>
        </div>
      </div>`;

    el.addEventListener("pointermove", e => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      el.style.setProperty("--mx", px * 100 + "%");
      el.style.setProperty("--my", py * 100 + "%");
      if (reduceMotion) return;
      if (!M.tiltCard || M.tiltCard.el !== el) {
        M.tiltCard = { el, rx: 0, ry: 0, trx: 0, try: 0, releasing: false };
      }
      M.tiltCard.trx = (py - 0.5) * -9;
      M.tiltCard.try = (px - 0.5) * 9;
      M.tiltCard.releasing = false;
    });
    el.addEventListener("pointerleave", () => {
      if (M.tiltCard && M.tiltCard.el === el) {
        M.tiltCard.trx = 0; M.tiltCard.try = 0; M.tiltCard.releasing = true;
      }
    });
    el.addEventListener("click", () => openModal(item, el));
    el.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openModal(item, el); }
    });
    cards.appendChild(el);
  });

  /* ---------- growing-card modal ---------- */
  const modal = $("#card-modal"), panel = $("#modal-panel");
  let lastFocus = null;
  function openModal(item, originEl) {
    lastFocus = originEl;
    panel.innerHTML = `
      <button class="modal__close" aria-label="Închide" data-close>✕</button>
      <div class="modal__hero">${item.emoji}</div>
      <div class="modal__content">
        <span class="card__tag">${item.tag}</span>
        <h3>${item.name}</h3>
        <p>${item.story}</p>
        <div class="modal__ing">${item.ingredients.map(x => `<span>${x}</span>`).join("")}</div>
        <div class="modal__row">
          <span class="modal__price"><b>${item.price}</b> lei</span>
          <a href="#reserve" class="btn btn--solid" data-close>Comandă acum</a>
        </div>
      </div>`;
    if (!reduceMotion && originEl) {
      const r = originEl.getBoundingClientRect();
      const ox = r.left + r.width / 2 - innerWidth / 2;
      const oy = r.top + r.height / 2 - innerHeight / 2;
      panel.animate(
        [{ transform: `translate(${ox}px, ${oy}px) scale(.2)`, opacity: 0 },
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
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && modal.classList.contains("open")) closeModal();
  });

  /* =========================================================
     SCROLL REVEAL (staggered)
     ========================================================= */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
  $$(".reveal").forEach(el => io.observe(el));

  /* ---------- nav shrink ---------- */
  const nav = $("#nav");
  addEventListener("scroll", () => nav.classList.toggle("shrink", window.scrollY > 40), { passive: true });

  /* =========================================================
     ANIMATED COUNTERS
     ========================================================= */
  function animateCount(el, target, opts = {}) {
    const { decimals = 0, suffix = "", dur = 1800 } = opts;
    const start = performance.now();
    (function tickC(now) {
      const t = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = (target * eased).toFixed(decimals) + suffix;
      if (t < 1) requestAnimationFrame(tickC);
    })(start);
  }
  let counted = false;
  const heroIO = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !counted) {
      counted = true;
      animateCount($("#stat-burgers"), 128000, { suffix: "+" });
      animateCount($("#stat-rating"), 4.9, { decimals: 1 });
      animateCount($("#stat-minutes"), 8);
    }
  }, { threshold: 0.3 });
  heroIO.observe($(".hero"));

  /* ---------- live orders ticker ---------- */
  const ordersEl = $("#live-orders");
  let orders = 12 + Math.floor(Math.random() * 8);
  (function tickOrders() {
    orders = Math.max(6, orders + (Math.random() < 0.6 ? 1 : -1));
    ordersEl.textContent = `${orders} comenzi`;
    setTimeout(tickOrders, 3200);
  })();

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
    if (!name || !phone || !date) {
      msg.textContent = "Completează numele, telefonul și data, te rugăm.";
      msg.classList.add("error"); return;
    }
    try { localStorage.setItem("zet_last_reservation", JSON.stringify({ name, phone, date, guests, at: Date.now() })); } catch (_) {}
    const nice = new Date(date).toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long" });
    msg.textContent = `Mulțumim, ${name}! Masă pentru ${guests} pe ${nice} — te sunăm pentru confirmare. 🍔`;
    form.reset(); $("#r-guests").value = 2;
  });

  /* ---------- boot ---------- */
  applyDaypart(currentDaypart());
  bg.init();
  refreshOpenStatus();
  setInterval(() => { if (!manualDaypart) applyDaypart(currentDaypart()); refreshOpenStatus(); }, 60000);
})();
