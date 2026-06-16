/**
 * make-icon.mjs — generate a neutral brand icon (build/icon.png, 256×256)
 * with zero image dependencies. Draws a teal rounded-square tile with a
 * stylised white "A", matching the design-system accent. electron-builder
 * converts this PNG to .ico / .icns at package time.
 *
 * Idempotent: regenerates on every build so the icon always exists in CI/
 * fresh checkouts. Pure Node (zlib) PNG encoder.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'build', 'icon.png');
const S = 256;

// ── colours ──
const ACCENT_TOP = [13, 148, 136];   // #0D9488 teal-600
const ACCENT_BOT = [45, 212, 191];   // #2DD4BF teal-400
const WHITE = [255, 255, 255];

const lerp = (a, b, t) => Math.round(a + (b - a) * t);

// Distance from point P to segment AB.
function distToSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx, cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

// Rounded-rect signed coverage (1 inside, 0 outside, soft edge).
function roundedRectCoverage(px, py, x0, y0, x1, y1, r) {
  const cx = Math.max(x0 + r, Math.min(px, x1 - r));
  const cy = Math.max(y0 + r, Math.min(py, y1 - r));
  const d = Math.hypot(px - cx, py - cy);
  return Math.max(0, Math.min(1, r - d + 0.5));
}

// "A" glyph strokes.
const APEX = [128, 66];
const LEGL = [82, 190];
const LEGR = [174, 190];
const BAR_A = [101, 150];
const BAR_B = [155, 150];
const STROKE_HW = 9; // half-width

function glyphCoverage(px, py) {
  const d = Math.min(
    distToSeg(px, py, APEX[0], APEX[1], LEGL[0], LEGL[1]),
    distToSeg(px, py, APEX[0], APEX[1], LEGR[0], LEGR[1]),
    distToSeg(px, py, BAR_A[0], BAR_A[1], BAR_B[0], BAR_B[1]),
  );
  return Math.max(0, Math.min(1, STROKE_HW - d + 0.5));
}

// ── render RGBA ──
const raw = Buffer.alloc(S * (1 + S * 4)); // +1 filter byte per row
let o = 0;
for (let y = 0; y < S; y++) {
  raw[o++] = 0; // filter: none
  for (let x = 0; x < S; x++) {
    const tileA = roundedRectCoverage(x, y, 12, 12, S - 12, S - 12, 52);
    const g = y / S;
    let r = lerp(ACCENT_TOP[0], ACCENT_BOT[0], g);
    let gg = lerp(ACCENT_TOP[1], ACCENT_BOT[1], g);
    let b = lerp(ACCENT_TOP[2], ACCENT_BOT[2], g);
    // composite white glyph over tile
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

// ── PNG encode ──
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
ihdr[8] = 8;   // bit depth
ihdr[9] = 6;   // colour type RGBA
ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
const idat = deflateSync(raw, { level: 9 });
const png = Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);

const buildDir = dirname(OUT);
if (!existsSync(buildDir)) mkdirSync(buildDir, { recursive: true });
writeFileSync(OUT, png);
console.log(`[make-icon] wrote ${OUT} (${png.length} bytes, ${S}×${S})`);
