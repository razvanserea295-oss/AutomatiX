




interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  size: number;
  color: string;
  life: number;
}

const COLORS = ['#FBBF24', '#F97316', '#4ade80', '#f39c12', '#ff4757', '#9b59b6', '#ffffff'];

function randBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function fireConfetti(particleCount = 160, durationMs = 2500): void {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.style.cssText =
    'position:fixed;inset:0;pointer-events:none;z-index:9999;';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) { canvas.remove(); return; }

  const cx = canvas.width / 2;
  const cy = canvas.height * 0.55;

  const particles: Particle[] = Array.from({ length: particleCount }, () => {
    const angle = randBetween(-Math.PI * 0.85, -Math.PI * 0.15);
    const speed = randBetween(10, 22);
    return {
      x: cx + randBetween(-40, 40),
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rot: randBetween(0, Math.PI * 2),
      vr: randBetween(-0.3, 0.3),
      size: randBetween(6, 11),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      life: 1,
    };
  });

  const gravity = 0.45;
  const drag = 0.985;
  const start = performance.now();
  let frame = 0;

  function render(now: number) {
    const elapsed = now - start;
    if (elapsed > durationMs) {
      canvas.remove();
      return;
    }

    ctx!.clearRect(0, 0, canvas.width, canvas.height);

    for (const p of particles) {
      p.vy += gravity;
      p.vx *= drag;
      p.vy *= drag;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life = Math.max(0, 1 - elapsed / durationMs);

      ctx!.save();
      ctx!.translate(p.x, p.y);
      ctx!.rotate(p.rot);
      ctx!.globalAlpha = p.life;
      ctx!.fillStyle = p.color;
      ctx!.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.6);
      ctx!.restore();
    }

    frame = requestAnimationFrame(render);
  }

  frame = requestAnimationFrame(render);
  window.addEventListener('beforeunload', () => cancelAnimationFrame(frame), { once: true });
}
