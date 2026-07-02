// Bespoke animation primitives for the marketing landing — hand-rolled with
// requestAnimationFrame + CSS custom properties (no animation lib). All effects
// are GPU-friendly (transforms only), rAF-throttled, and fully disabled under
// prefers-reduced-motion.

import {
  useEffect, useRef, useState, type ReactNode, type ElementType,
} from 'react';

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduced;
}

const isCoarse = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

// ── Scroll-reveal (IntersectionObserver) with directional variants ──────────
type RevealVariant = 'up' | 'fade' | 'scale' | 'left' | 'right';
export function Reveal({
  children, className = '', delay = 0, variant = 'up', as: Tag = 'div',
}: {
  children: ReactNode; className?: string; delay?: number; variant?: RevealVariant; as?: ElementType;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // No-IntersectionObserver fallback: reveal immediately so content is never
    // stuck hidden. (Visible tabs with IO animate in on scroll as normal.)
    if (typeof IntersectionObserver === 'undefined') { el.classList.add('in'); return; }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { el.classList.add('in'); io.disconnect(); } }),
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag
      ref={ref as never}
      className={`rv rv-${variant} ${className}`}
      style={delay ? ({ ['--rv-delay' as string]: `${delay}ms` }) : undefined}
    >
      {children}
    </Tag>
  );
}

// ── 3D pointer tilt with moving glare ───────────────────────────────────────
export function Tilt({
  children, className = '', max = 10, glare = true,
}: { children: ReactNode; className?: string; max?: number; glare?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced || isCoarse()) return;
    let rect = el.getBoundingClientRect();
    const onEnter = () => { rect = el.getBoundingClientRect(); el.style.setProperty('--tilt-t', '1'); };
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        el.style.setProperty('--rx', `${(0.5 - py) * max * 2}deg`);
        el.style.setProperty('--ry', `${(px - 0.5) * max * 2}deg`);
        el.style.setProperty('--gx', `${px * 100}%`);
        el.style.setProperty('--gy', `${py * 100}%`);
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(raf.current);
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
      el.style.setProperty('--tilt-t', '0');
    };
    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf.current);
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [max, reduced]);

  return (
    <div ref={ref} className={`tilt ${className}`}>
      <div className="tilt-inner">
        {children}
        {glare && <span className="tilt-glare" aria-hidden />}
      </div>
    </div>
  );
}

// ── Magnetic element (pulls toward the cursor) ──────────────────────────────
export function Magnetic({
  children, className = '', strength = 0.4,
}: { children: ReactNode; className?: string; strength?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced || isCoarse()) return;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        const x = (e.clientX - (r.left + r.width / 2)) * strength;
        const y = (e.clientY - (r.top + r.height / 2)) * strength;
        el.style.setProperty('--mxp', `${x}px`);
        el.style.setProperty('--myp', `${y}px`);
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(raf.current);
      el.style.setProperty('--mxp', '0px');
      el.style.setProperty('--myp', '0px');
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf.current);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [strength, reduced]);
  return <div ref={ref} className={`magnetic ${className}`}>{children}</div>;
}

// ── Count-up number that runs once when scrolled into view ───────────────────
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export function CountUp({
  to, decimals = 0, prefix = '', suffix = '', duration = 1500, className = '',
}: { to: number; decimals?: number; prefix?: string; suffix?: string; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fmt = (v: number) =>
      prefix + v.toLocaleString('ro-RO', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
    if (reduced || typeof IntersectionObserver === 'undefined') { el.textContent = fmt(to); return; }
    let started = false; let raf = 0; let t0 = 0;
    const step = (ts: number) => {
      if (!t0) t0 = ts;
      const p = Math.min((ts - t0) / duration, 1);
      el.textContent = fmt(to * easeOut(p));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting && !started) { started = true; raf = requestAnimationFrame(step); io.disconnect(); } });
    }, { threshold: 0.4 });
    el.textContent = fmt(0);
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to, decimals, prefix, suffix, duration, reduced]);
  return <span ref={ref} className={className} />;
}

// ── Top scroll-progress bar ─────────────────────────────────────────────────
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const h = document.documentElement.scrollHeight - window.innerHeight;
        el.style.transform = `scaleX(${h > 0 ? Math.min(window.scrollY / h, 1) : 0})`;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, []);
  return <div className="lp-progress" ref={ref} aria-hidden />;
}

// ── Spotlight: card-local glow that follows the cursor ───────────────────────
export function Spotlight({
  children, className = '', as: Tag = 'div',
}: { children: ReactNode; className?: string; as?: ElementType }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || isCoarse()) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty('--sx', `${e.clientX - r.left}px`);
        el.style.setProperty('--sy', `${e.clientY - r.top}px`);
      });
    };
    el.addEventListener('pointermove', onMove);
    return () => { cancelAnimationFrame(raf); el.removeEventListener('pointermove', onMove); };
  }, []);
  return <Tag ref={ref as never} className={`spotlight ${className}`}>{children}</Tag>;
}

// ── Aurora: a layer whose blobs track the pointer (set on a parent) ─────────
export function useAuroraPointer(targetRef: React.RefObject<HTMLElement>) {
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    const el = targetRef.current;
    if (!el || reduced || isCoarse()) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty('--mx', `${(e.clientX / window.innerWidth) * 100}%`);
        el.style.setProperty('--my', `${(e.clientY / window.innerHeight) * 100}%`);
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => { cancelAnimationFrame(raf); window.removeEventListener('pointermove', onMove); };
  }, [targetRef, reduced]);
}

// ── Scroll-linked progress → CSS var (the Apple "device comes forward" move) ─
// Writes a 0→1 number into `varName` on the element as it travels through the
// viewport, so CSS can interpolate transforms with calc(). Range is expressed
// in viewport-height fractions: progress is 0 while the element top sits at
// `startVh` of the viewport, 1 once it reaches `endVh`. rAF-throttled; pins to
// the finished state (1) under reduced motion. `onProgress` lets callers derive
// state (e.g. the active step in a sticky narrative) without re-rendering.
export function useScrollProgress(
  ref: React.RefObject<HTMLElement>,
  { varName = '--p', startVh = 0.9, endVh = 0.4, through = false, onProgress }:
    { varName?: string; startVh?: number; endVh?: number; through?: boolean; onProgress?: (p: number) => void } = {},
) {
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced) { el.style.setProperty(varName, '1'); onProgress?.(1); return; }
    let raf = 0;
    let last = -1;
    const compute = () => {
      raf = 0;
      const vh = window.innerHeight || 1;
      const r = el.getBoundingClientRect();
      // `through`: progress across the element's OWN scroll length (0 when its
      // top hits the viewport top, 1 when its bottom hits the viewport bottom) —
      // for tall pinned scenes. Otherwise: a fixed viewport-height window.
      const raw = through
        ? (-r.top) / ((r.height - vh) || 1)
        : (startVh * vh - r.top) / ((startVh - endVh) * vh || 1);
      const p = Math.min(1, Math.max(0, raw));
      if (p !== last) {
        last = p;
        el.style.setProperty(varName, p.toFixed(4));
        onProgress?.(p);
      }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(compute); };
    compute();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, [ref, varName, startVh, endVh, through, reduced, onProgress]);
}

// ── Parallax: drift children as the element passes the viewport center ───────
// Sets `--par` to a signed pixel offset (CSS applies translate3d). Pure GPU,
// rAF-throttled, neutralized under reduced motion / coarse pointers.
export function Parallax({
  children, className = '', speed = 0.12, axis = 'y',
}: { children: ReactNode; className?: string; speed?: number; axis?: 'y' | 'x' }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    let raf = 0;
    const compute = () => {
      raf = 0;
      const vh = window.innerHeight || 1;
      const r = el.getBoundingClientRect();
      const center = r.top + r.height / 2;
      const offset = (center - vh / 2) * -speed;
      el.style.setProperty('--par', `${offset.toFixed(2)}px`);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(compute); };
    compute();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, [speed, reduced]);
  return <div ref={ref} className={`parallax parallax-${axis} ${className}`}>{children}</div>;
}

// ── Infinite marquee (duplicated track; pauses on hover) ─────────────────────
export function Marquee({
  children, className = '', speed = 38,
}: { children: ReactNode; className?: string; speed?: number }) {
  return (
    <div className={`marquee ${className}`} style={{ ['--mq-dur' as string]: `${speed}s` }}>
      <div className="marquee-track">
        <div className="marquee-group">{children}</div>
        <div className="marquee-group" aria-hidden>{children}</div>
      </div>
    </div>
  );
}
