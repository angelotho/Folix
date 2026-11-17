import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const buildDir = path.join(rootDir, 'build');
const publicDir = path.join(rootDir, 'public');
const officialLogoPath = path.join(rootDir, 'src', 'assets', 'folix-official.png');

fs.mkdirSync(buildDir, { recursive: true });
fs.mkdirSync(publicDir, { recursive: true });

// ============================================================================
// PNG & ICO Codec Helpers (zero external dependencies)
// ============================================================================

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

function decodePng(filePath) {
  const buf = fs.readFileSync(filePath);
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 2;
  const idat = [];

  while (offset < buf.length) {
    const len = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9];
    } else if (type === 'IDAT') {
      idat.push(data);
    }
    offset += 12 + len;
  }

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = colorType === 6 ? 4 : 3;
  const stride = width * bpp;
  const pixels = Buffer.alloc(width * height * bpp);

  function paeth(a, b, c) {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  }

  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const rowIn = y * (stride + 1) + 1;
    const rowOut = y * stride;
    for (let i = 0; i < stride; i++) {
      const x = raw[rowIn + i];
      const a = i >= bpp ? pixels[rowOut + i - bpp] : 0;
      const b = y > 0 ? pixels[rowOut - stride + i] : 0;
      const c = y > 0 && i >= bpp ? pixels[rowOut - stride + i - bpp] : 0;
      let val = x;
      if (filter === 1) val = (x + a) & 255;
      else if (filter === 2) val = (x + b) & 255;
      else if (filter === 3) val = (x + ((a + b) >> 1)) & 255;
      else if (filter === 4) val = (x + paeth(a, b, c)) & 255;
      pixels[rowOut + i] = val;
    }
  }

  // Normalize to RGBA
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const src = i * bpp;
    const dst = i * 4;
    rgba[dst] = pixels[src];
    rgba[dst + 1] = pixels[src + 1];
    rgba[dst + 2] = pixels[src + 2];
    rgba[dst + 3] = bpp === 4 ? pixels[src + 3] : 255;
  }

  return { width, height, rgba };
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

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
      buf[offset++] = rgba[srcIdx + 2];
      buf[offset++] = rgba[srcIdx + 1];
      buf[offset++] = rgba[srcIdx];
      buf[offset++] = rgba[srcIdx + 3];
    }
  }

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

function buildIco(entries) {
  const count = entries.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  const dirEntries = [];
  let offset = 6 + count * 16;

  for (const entry of entries) {
    const dir = Buffer.alloc(16);
    dir[0] = entry.size >= 256 ? 0 : entry.size;
    dir[1] = entry.size >= 256 ? 0 : entry.size;
    dir[2] = 0;
    dir[3] = 0;
    dir.writeUInt16LE(1, 4);
    dir.writeUInt16LE(32, 6);
    dir.writeUInt32LE(entry.data.length, 8);
    dir.writeUInt32LE(offset, 12);
    dirEntries.push(dir);
    offset += entry.data.length;
  }

  return Buffer.concat([header, ...dirEntries, ...entries.map((e) => e.data)]);
}

// ============================================================================
// Image Processing Utilities
// ============================================================================

function clamp(v, min = 0, max = 255) {
  return Math.max(min, Math.min(max, v));
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function unmixFromCream(r, g, b, bgR, bgG, bgB, alpha) {
  if (alpha <= 0.01) return [r, g, b];
  const ur = clamp(Math.round((r - (1 - alpha) * bgR) / alpha));
  const ug = clamp(Math.round((g - (1 - alpha) * bgG) / alpha));
  const ub = clamp(Math.round((b - (1 - alpha) * bgB) / alpha));
  return [ur, ug, ub];
}

function cropRgba(src, srcW, x0, y0, w, h) {
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    const sy = y0 + y;
    for (let x = 0; x < w; x++) {
      const sx = x0 + x;
      const si = (sy * srcW + sx) * 4;
      const di = (y * w + x) * 4;
      out[di] = src[si];
      out[di + 1] = src[si + 1];
      out[di + 2] = src[si + 2];
      out[di + 3] = src[si + 3];
    }
  }
  return out;
}

function resizeRgba(src, srcW, srcH, dstW, dstH) {
  const out = Buffer.alloc(dstW * dstH * 4);
  const scaleX = srcW / dstW;
  const scaleY = srcH / dstH;

  for (let dy = 0; dy < dstH; dy++) {
    const yStart = dy * scaleY;
    const yEnd = (dy + 1) * scaleY;
    const iy0 = Math.floor(yStart);
    const iy1 = Math.min(srcH - 1, Math.floor(yEnd));

    for (let dx = 0; dx < dstW; dx++) {
      const xStart = dx * scaleX;
      const xEnd = (dx + 1) * scaleX;
      const ix0 = Math.floor(xStart);
      const ix1 = Math.min(srcW - 1, Math.floor(xEnd));

      let sumW = 0;
      let sumA = 0;
      let sumR = 0;
      let sumG = 0;
      let sumB = 0;

      for (let sy = iy0; sy <= iy1; sy++) {
        const wy = Math.min(yEnd, sy + 1) - Math.max(yStart, sy);
        if (wy <= 0) continue;
        for (let sx = ix0; sx <= ix1; sx++) {
          const wx = Math.min(xEnd, sx + 1) - Math.max(xStart, sx);
          if (wx <= 0) continue;
          const weight = wx * wy;
          const si = (sy * srcW + sx) * 4;
          const a = src[si + 3] / 255;
          sumW += weight;
          sumA += a * weight;
          sumR += src[si] * a * weight;
          sumG += src[si + 1] * a * weight;
          sumB += src[si + 2] * a * weight;
        }
      }

      const di = (dy * dstW + dx) * 4;
      if (sumA > 0.001 && sumW > 0) {
        const finalA = sumA / sumW;
        out[di] = clamp(Math.round(sumR / sumA));
        out[di + 1] = clamp(Math.round(sumG / sumA));
        out[di + 2] = clamp(Math.round(sumB / sumA));
        out[di + 3] = clamp(Math.round(finalA * 255));
      }
    }
  }

  return out;
}

function fitInSquare(src, srcW, srcH, targetSize, paddingRatio = 0.08) {
  const maxDim = Math.round(targetSize * (1 - paddingRatio * 2));
  const ratio = Math.min(maxDim / srcW, maxDim / srcH);
  const w = Math.max(1, Math.round(srcW * ratio));
  const h = Math.max(1, Math.round(srcH * ratio));
  const resized = resizeRgba(src, srcW, srcH, w, h);

  const canvas = Buffer.alloc(targetSize * targetSize * 4);
  const ox = Math.floor((targetSize - w) / 2);
  const oy = Math.floor((targetSize - h) / 2);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const si = (y * w + x) * 4;
      const di = ((oy + y) * targetSize + (ox + x)) * 4;
      canvas[di] = resized[si];
      canvas[di + 1] = resized[si + 1];
      canvas[di + 2] = resized[si + 2];
      canvas[di + 3] = resized[si + 3];
    }
  }
  return canvas;
}

// ============================================================================
// Process Official Folix.png into Transparent Brand Assets & Windows Icons
// ============================================================================

const { width, height, rgba: rawRgba } = decodePng(officialLogoPath);
const bgR = rawRgba[0];
const bgG = rawRgba[1];
const bgB = rawRgba[2];

// 1. Flood-fill exterior background on the symbol side (x < 460)
//    Barrier at y=809 between x=192..232 preserves the interior negative-space "F" inside the symbol!
const outsideMask = new Uint8Array(width * height);
const queue = new Int32Array(width * height);
let qHead = 0;
let qTail = 0;

function isBgCandidate(idx) {
  const p = idx * 4;
  const dist = Math.hypot(
    rawRgba[p] - bgR,
    rawRgba[p + 1] - bgG,
    rawRgba[p + 2] - bgB
  );
  return dist < 24;
}

function isFloodBarrier(x, y) {
  return y === 809 && x >= 192 && x <= 232;
}

function tryEnqueue(x, y) {
  if (x < 0 || x >= width || y < 0 || y >= height) return;
  if (isFloodBarrier(x, y)) return;
  const idx = y * width + x;
  if (outsideMask[idx]) return;
  if (!isBgCandidate(idx)) return;
  outsideMask[idx] = 1;
  queue[qTail++] = idx;
}

for (let x = 0; x < width; x++) {
  tryEnqueue(x, 0);
  tryEnqueue(x, height - 1);
}
for (let y = 0; y < height; y++) {
  tryEnqueue(0, y);
  tryEnqueue(width - 1, y);
}

while (qHead < qTail) {
  const idx = queue[qHead++];
  const x = idx % width;
  const y = (idx - x) / width;
  tryEnqueue(x + 1, y);
  tryEnqueue(x - 1, y);
  tryEnqueue(x, y + 1);
  tryEnqueue(x, y - 1);
}

// 2. Build transparent Light Lockup and Dark Lockup
const lightFull = Buffer.alloc(width * height * 4);
const darkFull = Buffer.alloc(width * height * 4);

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const idx = y * width + x;
    const p = idx * 4;
    const r = rawRgba[p];
    const g = rawRgba[p + 1];
    const b = rawRgba[p + 2];
    const dist = Math.hypot(r - bgR, g - bgG, b - bgB);

    const isSymbolRegion = x < 460;

    if (isSymbolRegion) {
      if (outsideMask[idx]) {
        // Exterior background: smooth alpha edge along outer shape boundary
        const touchesFg =
          (x > 0 && !outsideMask[idx - 1]) ||
          (x < width - 1 && !outsideMask[idx + 1]) ||
          (y > 0 && !outsideMask[idx - width]) ||
          (y < height - 1 && !outsideMask[idx + width]);

        if (touchesFg && dist > 6) {
          const alpha = smoothstep(6, 36, dist);
          const [ur, ug, ub] = unmixFromCream(r, g, b, bgR, bgG, bgB, alpha);
          lightFull[p] = ur;
          lightFull[p + 1] = ug;
          lightFull[p + 2] = ub;
          lightFull[p + 3] = clamp(Math.round(alpha * 255));
        }
      } else {
        // Inside symbol: check if near edge of exterior flood-fill for crisp anti-aliasing
        const nearOut =
          (x > 0 && outsideMask[idx - 1]) ||
          (x < width - 1 && outsideMask[idx + 1]) ||
          (y > 0 && outsideMask[idx - width]) ||
          (y < height - 1 && outsideMask[idx + width]) ||
          (y >= 809 && x >= 192 && x <= 232 && dist < 35);

        if (nearOut && dist < 85 && !(y < 809 && dist < 14)) {
          const alpha = smoothstep(8, 70, dist);
          const [ur, ug, ub] = unmixFromCream(r, g, b, bgR, bgG, bgB, alpha);
          lightFull[p] = ur;
          lightFull[p + 1] = ug;
          lightFull[p + 2] = ub;
          lightFull[p + 3] = clamp(Math.round(alpha * 255));
        } else {
          // Solid symbol interior (including crisp white "F" cutout!)
          lightFull[p] = r;
          lightFull[p + 1] = g;
          lightFull[p + 2] = b;
          lightFull[p + 3] = 255;
        }
      }

      // Copy to Dark Lockup, gently lifting deep navy sheet so symbol reads clearly on dark surfaces
      darkFull[p + 3] = lightFull[p + 3];
      if (lightFull[p + 3] > 0) {
        const sr = lightFull[p];
        const sg = lightFull[p + 1];
        const sb = lightFull[p + 2];
        // Identify dark navy sheet pixels vs lavender corner or white "F"
        const isDarkNavy = sr < 90 && sg < 90 && sb < 130;
        if (isDarkNavy) {
          darkFull[p] = clamp(sr + 22);
          darkFull[p + 1] = clamp(sg + 22);
          darkFull[p + 2] = clamp(sb + 40);
        } else {
          darkFull[p] = sr;
          darkFull[p + 1] = sg;
          darkFull[p + 2] = sb;
        }
      }
    } else {
      // Wordmark region ("Folix" + lavender i-leaf): remove all cream background (including inside "o")
      const alpha = smoothstep(10, 62, dist);
      if (alpha > 0.01) {
        const [ur, ug, ub] = unmixFromCream(r, g, b, bgR, bgG, bgB, alpha);
        const aByte = clamp(Math.round(alpha * 255));

        lightFull[p] = ur;
        lightFull[p + 1] = ug;
        lightFull[p + 2] = ub;
        lightFull[p + 3] = aByte;

        // Dark variant: preserve lavender i-leaf (#9B99EE), convert dark letters to warm white (#F4F2ED)
        const isLeaf = ub - ur > 45 && ub > 140;
        if (isLeaf) {
          darkFull[p] = ur;
          darkFull[p + 1] = ug;
          darkFull[p + 2] = ub;
        } else {
          darkFull[p] = 244;
          darkFull[p + 1] = 242;
          darkFull[p + 2] = 237;
        }
        darkFull[p + 3] = aByte;
      }
    }
  }
}

// 3. Export tight-cropped, padded assets
// Symbol crop: x=142..440 (w=298), y=470..816 (h=346) -> fit into 380x380 square
const symbolCropW = 298;
const symbolCropH = 346;
const symbolCropped = cropRgba(lightFull, width, 142, 470, symbolCropW, symbolCropH);
const symbolSquare380 = fitInSquare(symbolCropped, symbolCropW, symbolCropH, 380, 0.06);
fs.writeFileSync(path.join(publicDir, 'folix-symbol.png'), encodePng(380, 380, symbolSquare380));

const symbolDarkCropped = cropRgba(darkFull, width, 142, 470, symbolCropW, symbolCropH);
const symbolDarkSquare380 = fitInSquare(symbolDarkCropped, symbolCropW, symbolCropH, 380, 0.06);
fs.writeFileSync(
  path.join(publicDir, 'folix-symbol-dark.png'),
  encodePng(380, 380, symbolDarkSquare380)
);

// Dark-ready symbol with subtle lifted navy for dark titlebars if needed (optional, keep symbol crisp)
// Full lockup crop: x=136..1124 (w=988), y=468..818 (h=350)
const fullCropW = 988;
const fullCropH = 350;
const lightFullCropped = cropRgba(lightFull, width, 136, 468, fullCropW, fullCropH);
const darkFullCropped = cropRgba(darkFull, width, 136, 468, fullCropW, fullCropH);

fs.writeFileSync(
  path.join(publicDir, 'folix-logo-light.png'),
  encodePng(fullCropW, fullCropH, lightFullCropped)
);
fs.writeFileSync(
  path.join(publicDir, 'folix-logo-dark.png'),
  encodePng(fullCropW, fullCropH, darkFullCropped)
);

// 4. Generate Windows application icon (build/icon.png & multi-res build/icon.ico)
//    Give the Windows icon a refined subtle rounded badge backdrop or pure transparent official symbol?
//    Keeping the official symbol on transparent background with 6% margin preserves exact shape & transparency!
const icon256 = fitInSquare(symbolCropped, symbolCropW, symbolCropH, 256, 0.06);
const png256 = encodePng(256, 256, icon256);
fs.writeFileSync(path.join(buildDir, 'icon.png'), png256);

const icoSizes = [16, 32, 48, 256];
const icoEntries = icoSizes.map((s) => {
  if (s === 256) return { size: 256, data: png256 };
  const resized = fitInSquare(symbolCropped, symbolCropW, symbolCropH, s, 0.04);
  return { size: s, data: encodeDib(s, s, resized) };
});
fs.writeFileSync(path.join(buildDir, 'icon.ico'), buildIco(icoEntries));

// 5. Update public/icon.svg faithfully representing the official Folix symbol
const officialSymbolSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none">
  <path d="M48 54C48 34.1177 64.1177 18 84 18H160L208 66V182C208 212.928 182.928 238 152 238H84C64.1177 238 48 221.882 48 202V54Z" fill="#1C1C3D"/>
  <path d="M160 18L208 66H178C168.059 66 160 57.9411 160 48V18Z" fill="#9B98EF"/>
  <path d="M84 102C84 85.4315 97.4315 72 114 72H172C172 91.8823 155.882 108 136 108H106C93.8497 108 84 117.85 84 130V102Z" fill="#FCF9F7"/>
  <path d="M84 150C84 133.431 97.4315 120 114 120H168C168 139.882 151.882 156 132 156H118C109.163 156 102 163.163 102 172V238H84V150Z" fill="#FCF9F7"/>
</svg>
`;
fs.writeFileSync(path.join(publicDir, 'icon.svg'), officialSymbolSvg, 'utf8');

console.log(
  'Generated official Folix brand assets: public/folix-symbol.png, public/folix-logo-light.png, public/folix-logo-dark.png, public/icon.svg, build/icon.png, build/icon.ico'
);
