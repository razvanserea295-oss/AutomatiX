/* =========================================================
   ZET BURGERS — app logic
   - event-driven particle background (canvas)
   - daypart palette switching (time-of-day event)
   - cursor glow + card 3D tilt (pointer events)
   - growing-card modal
   - scroll reveal, nav shrink, counters
   - reservation form
   ========================================================= */
(() => {
  "use strict";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- loader ---------- */
  window.addEventListener("load", () => {
    const loader = $("#loader");
    setTimeout(() => loader && loader.classList.add("done"), reduceMotion ? 0 : 1100);
  });

  /* ---------- year ---------- */
  $("#year").textContent = new Date().getFullYear();

  /* =========================================================
     DAYPART — switch palette + background mood by time of day.
     This is the core "background reacts to events" feature.
     ========================================================= */
  const DAYPARTS = [
    { key: "night",   from: 0,  label: "Noapte" },
    { key: "morning", from: 6,  label: "Dimineață" },
    { key: "day",     from: 11, label: "Zi" },
    { key: "sunset",  from: 18, label: "Apus" },
    { key: "night",   from: 22, label: "Noapte" },
  ];
  let manualDaypart = null;
  function currentDaypart() {
    if (manualDaypart) return manualDaypart;
    const h = new Date().getHours();
    let pick = DAYPARTS[0];
    for (const d of DAYPARTS) if (h >= d.from) pick = d;
    return pick.key;
  }
  function applyDaypart(key) {
    document.body.dataset.daypart = key;
    bg.recolor();
  }

  // manual cycle via the 🌗 toggle
  const cycle = ["morning", "day", "sunset", "night"];
  $("#theme-toggle").addEventListener("click", () => {
    const now = manualDaypart || currentDaypart();
    manualDaypart = cycle[(cycle.indexOf(now) + 1) % cycle.length];
    applyDaypart(manualDaypart);
  });

  /* =========================================================
     OPEN / CLOSED status (another time-based event)
     ========================================================= */
  function refreshOpenStatus() {
    const d = new Date(), day = d.getDay(), h = d.getHours();
    // 0=Sun … 6=Sat
    let open, close;
    if (day === 0)            { open = 13; close = 22; }
    else if (day === 5 || day === 6) { open = 12; close = 25; } // till 01:00
    else                      { open = 12; close = 23; }
    const isOpen = h >= open && h < close;
    const el = $("#open-status"), label = $("#open-label");
    el.classList.toggle("open", isOpen);
    label.textContent = isOpen ? "Deschis acum" : "Închis";
  }

  /* =========================================================
     CANVAS BACKGROUND — floating embers/particles.
     Reacts to: scroll velocity, pointer position, daypart color.
     ========================================================= */
  const bg = (() => {
    const canvas = $("#bg-canvas");
    const ctx = canvas.getContext("2d");
    let w, h, dpr, particles = [], color = "#ff5e3a", color2 = "#ffd23f";
    const pointer = { x: -9999, y: -9999, active: false };
    let scrollBoost = 0;

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
        x: Math.random() * w,
        y: initial ? Math.random() * h : h + 20 * dpr,
        r: (Math.random() * 2.4 + 0.6) * dpr,
        vy: (Math.random() * 0.5 + 0.15) * dpr,
        vx: (Math.random() - 0.5) * 0.3 * dpr,
        a: Math.random() * 0.5 + 0.15,
        tw: Math.random() * Math.PI * 2,
      };
    }
    function step() {
      ctx.clearRect(0, 0, w, h);
      scrollBoost *= 0.92;
      for (let p of particles) {
        p.tw += 0.03;
        p.y -= p.vy * (1 + scrollBoost);
        p.x += p.vx + Math.sin(p.tw) * 0.2 * dpr;

        // pointer repulsion — particles drift away from cursor
        if (pointer.active) {
          const dx = p.x - pointer.x * dpr, dy = p.y - pointer.y * dpr;
          const dist = Math.hypot(dx, dy);
          if (dist < 120 * dpr && dist > 0.1) {
            const force = (120 * dpr - dist) / (120 * dpr);
            p.x += (dx / dist) * force * 2.4 * dpr;
            p.y += (dy / dist) * force * 2.4 * dpr;
          }
        }
        if (p.y < -20 * dpr) Object.assign(p, spawn(false));

        const flick = 0.6 + Math.sin(p.tw) * 0.4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = hexA(p.tw % 1 > 0.5 ? color : color2, p.a * flick);
        ctx.shadowBlur = 12 * dpr;
        ctx.shadowColor = color;
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

    let raf;
    // pointer + scroll events feed the background
    window.addEventListener("pointermove", e => {
      pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true;
    });
    window.addEventListener("pointerleave", () => pointer.active = false);
    let lastScroll = scrollY;
    window.addEventListener("scroll", () => {
      scrollBoost = Math.min(scrollBoost + Math.abs(scrollY - lastScroll) * 0.012, 6);
      lastScroll = scrollY;
    }, { passive: true });
    window.addEventListener("resize", resize);

    return {
      init() {
        if (reduceMotion) { readColors(); resize(); ctx.clearRect(0,0,w,h); return; }
        readColors(); resize(); raf = requestAnimationFrame(step);
      },
      recolor: readColors,
    };
  })();

  /* ---------- cursor glow (pointer event) ---------- */
  const glow = $("#cursor-glow");
  window.addEventListener("pointermove", e => {
    document.body.classList.add("has-pointer");
    glow.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
  }, { passive: true });

  /* =========================================================
     MENU CARDS — render + 3D tilt + growing modal
     ========================================================= */
  const cards = $("#cards");
  (window.ZET_MENU || []).forEach((item, i) => {
    const el = document.createElement("article");
    el.className = "card reveal";
    el.setAttribute("role", "listitem");
    el.tabIndex = 0;
    el.style.transitionDelay = `${(i % 4) * 60}ms`;
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

    // pointer-tracked sheen + subtle 3D tilt
    el.addEventListener("pointermove", e => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      el.style.setProperty("--mx", px * 100 + "%");
      el.style.setProperty("--my", py * 100 + "%");
      if (!reduceMotion) {
        const rx = (py - 0.5) * -8, ry = (px - 0.5) * 8;
        el.style.transform = `translateY(-8px) perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg)`;
      }
    });
    el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    el.addEventListener("click", () => openModal(item, el));
    el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openModal(item, el); } });

    cards.appendChild(el);
  });

  /* ---------- growing-card modal ---------- */
  const modal = $("#card-modal");
  const panel = $("#modal-panel");
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

    // origin-aware grow: scale the modal out from the clicked card
    if (!reduceMotion && originEl) {
      const r = originEl.getBoundingClientRect();
      const ox = r.left + r.width / 2 - innerWidth / 2;
      const oy = r.top + r.height / 2 - innerHeight / 2;
      panel.style.transformOrigin = "center";
      panel.style.setProperty("--ox", ox + "px");
      panel.animate(
        [
          { transform: `translate(${ox}px, ${oy}px) scale(.25)`, opacity: 0 },
          { transform: "translate(0,0) scale(1)", opacity: 1 },
        ],
        { duration: 460, easing: "cubic-bezier(.34,1.56,.64,1)" }
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
     SCROLL REVEAL
     ========================================================= */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
  }, { threshold: 0.12 });
  $$(".reveal").forEach(el => io.observe(el));

  /* ---------- nav shrink on scroll ---------- */
  const nav = $("#nav");
  addEventListener("scroll", () => nav.classList.toggle("shrink", scrollY > 40), { passive: true });

  /* =========================================================
     ANIMATED COUNTERS (fire when hero visible)
     ========================================================= */
  function animateCount(el, target, opts = {}) {
    const { decimals = 0, suffix = "", dur = 1600 } = opts;
    const start = performance.now();
    function tick(now) {
      const t = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = (target * eased).toFixed(decimals) + suffix;
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
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

  /* ---------- live "orders" ticker (simulated event feed) ---------- */
  const ordersEl = $("#live-orders");
  let orders = 12 + Math.floor(Math.random() * 8);
  function tickOrders() {
    orders = Math.max(6, orders + (Math.random() < 0.6 ? 1 : -1));
    ordersEl.textContent = `${orders} comenzi`;
  }
  tickOrders();
  setInterval(tickOrders, 3200);

  /* =========================================================
     RESERVATION FORM
     ========================================================= */
  const form = $("#reserve-form");
  const msg = $("#reserve-msg");
  const dateInput = $("#r-date");
  dateInput.min = new Date().toISOString().split("T")[0];

  form.addEventListener("submit", e => {
    e.preventDefault();
    const name = $("#r-name").value.trim();
    const phone = $("#r-phone").value.trim();
    const date = dateInput.value;
    const guests = $("#r-guests").value;
    msg.classList.remove("error");

    if (!name || !phone || !date) {
      msg.textContent = "Completează numele, telefonul și data, te rugăm.";
      msg.classList.add("error");
      return;
    }
    // persist locally so a refresh keeps the confirmation context
    try {
      localStorage.setItem("zet_last_reservation", JSON.stringify({ name, phone, date, guests, at: Date.now() }));
    } catch (_) {}
    const nice = new Date(date).toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long" });
    msg.textContent = `Mulțumim, ${name}! Masă pentru ${guests} pe ${nice} — te sunăm pentru confirmare. 🍔`;
    form.reset();
    $("#r-guests").value = 2;
  });

  /* =========================================================
     BOOT
     ========================================================= */
  applyDaypart(currentDaypart());
  bg.init();
  refreshOpenStatus();
  // re-evaluate time-based events every minute
  setInterval(() => { if (!manualDaypart) applyDaypart(currentDaypart()); refreshOpenStatus(); }, 60000);
})();
