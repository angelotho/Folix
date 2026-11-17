import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const buildDir = path.join(rootDir, 'build');
const publicDir = path.join(rootDir, 'public');

fs.mkdirSync(buildDir, { recursive: true });
fs.mkdirSync(publicDir, { recursive: true });

// CRC32 table for valid PNG chunks
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makePngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  const combined = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(combined), 0);
  return Buffer.concat([lenBuf, combined, crcBuf]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // Add filter byte 0 per scanline
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * stride, (y + 1) * stride);
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    makePngChunk('IHDR', ihdr),
    makePngChunk('IDAT', compressed),
    makePngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function encodeDib(width, height, rgba) {
  const headerSize = 40;
  const xorSize = width * height * 4;
  const andRowStride = Math.ceil(width / 32) * 4;
  const andSize = andRowStride * height;
  const buf = Buffer.alloc(headerSize + xorSize + andSize);

  buf.writeUInt32LE(headerSize, 0);
  buf.writeInt32LE(width, 4);
  buf.writeInt32LE(height * 2, 8);
  buf.writeUInt16LE(1, 12);
  buf.writeUInt16LE(32, 14);
  buf.writeUInt32LE(0, 16);
  buf.writeUInt32LE(xorSize + andSize, 20);

  let offset = headerSize;
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      buf[offset++] = rgba[srcIdx + 2]; // B
      buf[offset++] = rgba[srcIdx + 1]; // G
      buf[offset++] = rgba[srcIdx];     // R
      buf[offset++] = rgba[srcIdx + 3]; // A
    }
  }

  // AND mask (bottom-up)
  const andStart = headerSize + xorSize;
  for (let y = height - 1; y >= 0; y--) {
    const rowOffset = andStart + (height - 1 - y) * andRowStride;
    for (let x = 0; x < width; x++) {
      const alpha = rgba[(y * width + x) * 4 + 3];
      if (alpha < 128) {
        const byteIdx = rowOffset + Math.floor(x / 8);
        const bitIdx = 7 - (x % 8);
        buf[byteIdx] |= 1 << bitIdx;
      }
    }
  }

  return buf;
}

function clamp(v, min = 0, max = 1) {
  return Math.max(min, Math.min(max, v));
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function sdRoundedRect(px, py, cx, cy, halfW, halfH, r) {
  const dx = Math.abs(px - cx) - (halfW - r);
  const dy = Math.abs(py - cy) - (halfH - r);
  const ox = Math.max(dx, 0);
  const oy = Math.max(dy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(dx, dy), 0) - r;
}

function blendPixel(out, idx, r, g, b, a) {
  if (a <= 0) return;
  const srcA = clamp(a);
  const dstA = out[idx + 3] / 255;
  const outA = srcA + dstA * (1 - srcA);
  if (outA <= 0) return;

  out[idx] = Math.round((r * srcA + out[idx] * dstA * (1 - srcA)) / outA);
  out[idx + 1] = Math.round((g * srcA + out[idx + 1] * dstA * (1 - srcA)) / outA);
  out[idx + 2] = Math.round((b * srcA + out[idx + 2] * dstA * (1 - srcA)) / outA);
  out[idx + 3] = Math.round(outA * 255);
}

/**
 * Render the Folix emblem at arbitrary resolution in normalized [0..1] space
 * with 4x4 supersampling for crisp anti-aliased edges.
 */
function renderFolixIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const sub = 4;
  const aa = 1.1 / size;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let accR = 0;
      let accG = 0;
      let accB = 0;
      let accA = 0;

      for (let sy = 0; sy < sub; sy++) {
        for (let sx = 0; sx < sub; sx++) {
          const nx = (x + (sx + 0.5) / sub) / size;
          const ny = (y + (sy + 0.5) / sub) / size;

          // Base squircle background
          const bgDist = sdRoundedRect(nx, ny, 0.5, 0.5, 0.44, 0.44, 0.14);
          const bgMask = 1 - smoothstep(-aa, aa, bgDist);

          let pr = 0;
          let pg = 0;
          let pb = 0;
          let pa = 0;

          if (bgMask > 0) {
            // Deep Sapphire-Indigo editorial gradient
            const grad = clamp(0.15 * nx + 0.85 * ny);
            const radial = clamp(1 - Math.hypot(nx - 0.3, ny - 0.22) * 1.15);

            pr = 34 + (67 - 34) * (1 - grad) + radial * 28;
            pg = 31 + (56 - 31) * (1 - grad) + radial * 26;
            pb = 92 + (202 - 92) * (1 - grad) + radial * 48;
            pa = bgMask;

            // Subtle inner highlight border
            const borderRing =
              smoothstep(-0.018, -0.008, bgDist) * (1 - smoothstep(-0.006, 0.002, bgDist));
            if (borderRing > 0) {
              const bAlpha = borderRing * 0.28;
              pr = pr * (1 - bAlpha) + 199 * bAlpha;
              pg = pg * (1 - bAlpha) + 210 * bAlpha;
              pb = pb * (1 - bAlpha) + 254 * bAlpha;
            }

            // Back folio sheet (subtle translucent indigo-white layer)
            const backDist = sdRoundedRect(nx, ny, 0.545, 0.485, 0.175, 0.235, 0.036);
            const backAlpha = (1 - smoothstep(-aa, aa, backDist)) * 0.24;
            if (backAlpha > 0) {
              pr = pr * (1 - backAlpha) + 224 * backAlpha;
              pg = pg * (1 - backAlpha) + 231 * backAlpha;
              pb = pb * (1 - backAlpha) + 255 * backAlpha;
            }

            // Main geometric "F" folio sheet
            const stemDist = sdRoundedRect(nx, ny, 0.365, 0.5, 0.058, 0.24, 0.028);
            const topBarDist = sdRoundedRect(nx, ny, 0.505, 0.318, 0.195, 0.058, 0.028);
            const midBarDist = sdRoundedRect(nx, ny, 0.465, 0.495, 0.145, 0.052, 0.026);
            const fDist = Math.min(stemDist, Math.min(topBarDist, midBarDist));
            const fAlpha = 1 - smoothstep(-aa, aa, fDist);

            if (fAlpha > 0) {
              const fShade = clamp((ny - 0.25) / 0.55);
              const fr = 255 - fShade * 12;
              const fg = 255 - fShade * 10;
              const fb = 255 - fShade * 2;
              pr = pr * (1 - fAlpha) + fr * fAlpha;
              pg = pg * (1 - fAlpha) + fg * fAlpha;
              pb = pb * (1 - fAlpha) + fb * fAlpha;
            }

            // Warm Amber/Gold editorial bookmark accent on lower right
            const dotDist = Math.hypot(nx - 0.645, ny - 0.675) - 0.056;
            const dotAlpha = 1 - smoothstep(-aa, aa, dotDist);
            if (dotAlpha > 0) {
              pr = pr * (1 - dotAlpha) + 245 * dotAlpha;
              pg = pg * (1 - dotAlpha) + 158 * dotAlpha;
              pb = pb * (1 - dotAlpha) + 11 * dotAlpha;
            }
          }

          accR += pr * pa;
          accG += pg * pa;
          accB += pb * pa;
          accA += pa;
        }
      }

      const samples = sub * sub;
      const idx = (y * size + x) * 4;
      const avgA = accA / samples;
      if (avgA > 0.001) {
        rgba[idx] = Math.round(clamp(accR / accA, 0, 255));
        rgba[idx + 1] = Math.round(clamp(accG / accA, 0, 255));
        rgba[idx + 2] = Math.round(clamp(accB / accA, 0, 255));
        rgba[idx + 3] = Math.round(clamp(avgA * 255, 0, 255));
      }
    }
  }

  return rgba;
}

function buildIco(entries) {
  // entries: Array<{ size: number, data: Buffer }>
  const count = entries.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = ICO
  header.writeUInt16LE(count, 4);

  const dirEntries = [];
  let offset = 6 + count * 16;

  for (const entry of entries) {
    const dir = Buffer.alloc(16);
    dir[0] = entry.size >= 256 ? 0 : entry.size;
    dir[1] = entry.size >= 256 ? 0 : entry.size;
    dir[2] = 0; // palette
    dir[3] = 0; // reserved
    dir.writeUInt16LE(1, 4); // planes
    dir.writeUInt16LE(32, 6); // bpp
    dir.writeUInt32LE(entry.data.length, 8);
    dir.writeUInt32LE(offset, 12);
    dirEntries.push(dir);
    offset += entry.data.length;
  }

  return Buffer.concat([header, ...dirEntries, ...entries.map((e) => e.data)]);
}

const sizes = [16, 32, 48, 256];
const icoEntries = [];
let png256 = null;

for (const s of sizes) {
  const rgba = renderFolixIcon(s);
  if (s === 256) {
    png256 = encodePng(s, s, rgba);
    icoEntries.push({ size: s, data: png256 });
  } else {
    icoEntries.push({ size: s, data: encodeDib(s, s, rgba) });
  }
}

const icoBuffer = buildIco(icoEntries);
fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuffer);
fs.writeFileSync(path.join(buildDir, 'icon.png'), png256);

const svgLogo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none">
  <defs>
    <linearGradient id="folixBg" x1="28" y1="20" x2="228" y2="236" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#4F46E5"/>
      <stop offset="55%" stop-color="#3730A3"/>
      <stop offset="100%" stop-color="#1E1B4B"/>
    </linearGradient>
    <linearGradient id="folixF" x1="78" y1="66" x2="178" y2="190" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#E0E7FF"/>
    </linearGradient>
  </defs>
  <rect x="16" y="16" width="224" height="224" rx="52" fill="url(#folixBg)"/>
  <rect x="17" y="17" width="222" height="222" rx="51" stroke="#C7D2FE" stroke-opacity="0.28" stroke-width="2"/>
  <rect x="96" y="64" width="90" height="120" rx="14" fill="#E0E7FF" fill-opacity="0.22"/>
  <path d="M80 74C80 67.3726 85.3726 62 92 62H168C174.627 62 180 67.3726 180 74V78C180 84.6274 174.627 90 168 90H110V114H148C154.627 114 160 119.373 160 126V128C160 134.627 154.627 140 148 140H110V178C110 184.627 104.627 190 98 190H92C85.3726 190 80 184.627 80 178V74Z" fill="url(#folixF)"/>
  <circle cx="165" cy="173" r="15" fill="#F59E0B"/>
</svg>
`;
fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgLogo, 'utf8');

console.log('Generated build/icon.ico, build/icon.png, and public/icon.svg');

