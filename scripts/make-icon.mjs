








import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'build', 'icon.png');
const S = 1024;        // 1024² so macOS/electron-builder (needs ≥512) is happy
const F = S / 256;     // scale factor from the original 256-unit design


const ACCENT_TOP = [22, 48, 122];    // #16307A navy
const ACCENT_BOT = [22, 199, 255];   // #16C7FF cyan
const WHITE = [255, 255, 255];

const lerp = (a, b, t) => Math.round(a + (b - a) * t);


function distToSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx, cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}


function roundedRectCoverage(px, py, x0, y0, x1, y1, r) {
  const cx = Math.max(x0 + r, Math.min(px, x1 - r));
  const cy = Math.max(y0 + r, Math.min(py, y1 - r));
  const d = Math.hypot(px - cx, py - cy);
  return Math.max(0, Math.min(1, r - d + 0.5));
}


// New Automatix mark: a hexagon enclosing three connected nodes, mapped from
// the 0..100 design space into the 256px canvas (centre 128, scale 1.7).
const MAP = 1.7 * F;
const C = S / 2;
const m = (x, y) => [C + (x - 50) * MAP, C + (y - 50) * MAP];
const HEX = [m(50, 8), m(86.4, 29), m(86.4, 71), m(50, 92), m(13.6, 71), m(13.6, 29)];
const LINK = [m(29, 50), m(71, 50)];
const RING_C = m(29, 50), RING_R = 7 * MAP;
const DOT2_C = m(50, 50), DOT2_R = 4.5 * MAP;
const DOT3_C = m(71, 50), DOT3_R = 6 * MAP;
const HEX_HW = (7 * MAP) / 2;
const LINK_HW = (5 * MAP) / 2;
const RING_HW = (5 * MAP) / 2;

function strokeCoverage(px, py, pts, hw, closed) {
  let d = Infinity;
  const last = pts.length - (closed ? 0 : 1);
  for (let i = 0; i < last; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    d = Math.min(d, distToSeg(px, py, a[0], a[1], b[0], b[1]));
  }
  return Math.max(0, Math.min(1, hw - d + 0.5));
}
function ringCoverage(px, py, c, R, hw) {
  const d = Math.hypot(px - c[0], py - c[1]);
  return Math.max(0, Math.min(1, hw - Math.abs(d - R) + 0.5));
}
function dotCoverage(px, py, c, R) {
  const d = Math.hypot(px - c[0], py - c[1]);
  return Math.max(0, Math.min(1, R - d + 0.5));
}
function glyphCoverage(px, py) {
  return Math.max(
    strokeCoverage(px, py, HEX, HEX_HW, true),
    strokeCoverage(px, py, LINK, LINK_HW, false),
    ringCoverage(px, py, RING_C, RING_R, RING_HW),
    dotCoverage(px, py, DOT2_C, DOT2_R),
    dotCoverage(px, py, DOT3_C, DOT3_R),
  );
}


const raw = Buffer.alloc(S * (1 + S * 4)); 
let o = 0;
for (let y = 0; y < S; y++) {
  raw[o++] = 0; 
  for (let x = 0; x < S; x++) {
    const tileA = roundedRectCoverage(x, y, 12 * F, 12 * F, S - 12 * F, S - 12 * F, 52 * F);
    const g = y / S;
    let r = lerp(ACCENT_TOP[0], ACCENT_BOT[0], g);
    let gg = lerp(ACCENT_TOP[1], ACCENT_BOT[1], g);
    let b = lerp(ACCENT_TOP[2], ACCENT_BOT[2], g);
    
    const gc = glyphCoverage(x, y);
    if (gc > 0) {
      r = lerp(r, WHITE[0], gc);
      gg = lerp(gg, WHITE[1], gc);
      b = lerp(b, WHITE[2], gc);
    }
    const a = Math.round(tileA * 255);
    raw[o++] = r; raw[o++] = gg; raw[o++] = b; raw[o++] = a;
  }
}


function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0, 0);
  return Buffer.concat([len, body, crc]);
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ 0xffffffff;
}

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(S, 0);
ihdr.writeUInt32BE(S, 4);
ihdr[8] = 8;   
ihdr[9] = 6;   
ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
const idat = deflateSync(raw, { level: 9 });
const png = Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);

const buildDir = dirname(OUT);
if (!existsSync(buildDir)) mkdirSync(buildDir, { recursive: true });
writeFileSync(OUT, png);
console.log(`[make-icon] wrote ${OUT} (${png.length} bytes, ${S}×${S})`);
