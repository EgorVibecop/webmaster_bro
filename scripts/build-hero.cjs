// Сборка картинок первого экрана: лед (исходник в scripts/hero-src) + настоящее фото неба и гор сверху.
// Днем: фото гор. Ночью: те же горы при лунном свете и звездное небо (звезды рисуются кодом).
// Запуск: node scripts/build-hero.cjs <путь к фото гор> [preview]
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const PHOTO = process.argv[2];
const PREVIEW = process.argv[3] === 'preview';
const OUT = path.join(__dirname, '..', 'public', 'hero');
const SRC = path.join(__dirname, 'hero-src');
const TMP = process.env.TEMP || '.';

// Параметры вариантов: куда обрезать фото, где в леде линия горизонта.
const VARIANTS = {
  d: { w: 1585, base: 'ice-base-d.webp', horizon: 146, crop: { x: 0, w: 2350, top: 607, h: 178 } },
  m: { w: 700, base: 'ice-base-m.webp', horizon: 146, crop: { x: 540, w: 790, top: 633, h: 152 } },
};
const OVERLAP = 28;

// Простая случайность с seed, чтобы звезды были одинаковыми при каждой сборке.
function rng(seed) {
  let s = seed >>> 0;
  return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

async function loadBand(v) {
  const meta = await sharp(PHOTO).metadata();
  const k = meta.width / 2350; // координаты кропа заданы для ширины 2350
  const c = v.crop;
  const left = Math.round(c.x * k), top = Math.round(c.top * k), width = Math.round(c.w * k), height = Math.round(c.h * k);
  const outH = Math.round(v.w * c.h / c.w);
  const { data } = await sharp(PHOTO).extract({ left, top, width, height }).resize(v.w, outH).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: v.w, h: outH };
}

// Линия горизонта: опорные точки по гребню (в координатах дневной полосы 1585 px), пересчитываются под каждый кроп.
const RIDGE = [[0, 352], [250, 350], [262, 347], [320, 290], [360, 262], [450, 258], [470, 220], [520, 200], [600, 178], [640, 155], [685, 144], [760, 157], [830, 170], [900, 172], [975, 180], [1060, 208], [1130, 237], [1240, 252], [1320, 243], [1400, 238], [1500, 245], [1585, 262]];
function skyline(band, v) {
  const k = 1585 / 2350, c = v.crop, sc = v.w / c.w;
  const pts = RIDGE.map(([x, y]) => [(x / k - c.x) * sc, (y / k + 250 - c.top) * sc]);
  const out = new Int32Array(band.w);
  for (let x = 0; x < band.w; x++) {
    let y = band.h - 1;
    if (x <= pts[0][0]) y = pts[0][1];
    else if (x >= pts[pts.length - 1][0]) y = pts[pts.length - 1][1];
    else for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const t = (x - pts[i - 1][0]) / ((pts[i][0] - pts[i - 1][0]) || 1); y = pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t; break; }
    out[x] = Math.max(0, Math.min(band.h - 1, Math.round(y)));
  }
  return out;
}

function nightBand(band, line) {
  const { data, w, h } = band;
  const out = Buffer.alloc(w * h * 3);
  const rand = rng(20261107);
  // небо: градиент, плавно светлеющий к горизонту
  const sky = new Float32Array(w * h * 3);
  for (let y = 0; y < h; y++) {
    const t = Math.pow(y / h, 1.4);
    const r = 2 + 16 * t, g = 7 + 40 * t, b = 16 + 66 * t;
    for (let x = 0; x < w; x++) { const i = (y * w + x) * 3; sky[i] = r; sky[i + 1] = g; sky[i + 2] = b; }
  }
  // Млечный путь: мягкая диагональная полоса
  const ang = -0.38, ca = Math.cos(ang), sa = Math.sin(ang);
  const cx = w * 0.55, cy = h * 0.18;
  function addStar(x, y, rad, peak, tint) {
    const R = Math.ceil(rad * 3);
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const px = Math.round(x) + dx, py = Math.round(y) + dy;
      if (px < 0 || py < 0 || px >= w || py >= h) continue;
      const d2 = (px - x) * (px - x) + (py - y) * (py - y);
      const a = peak * Math.exp(-d2 / (2 * rad * rad));
      if (a < 0.4) continue;
      const i = (py * w + px) * 3;
      sky[i] += a * tint[0]; sky[i + 1] += a * tint[1]; sky[i + 2] += a * tint[2];
    }
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const d = (x - cx) * -sa + (y - cy) * ca; // расстояние до оси полосы
    const along = (x - cx) * ca + (y - cy) * sa;
    const band = Math.exp(-(d * d) / (2 * (h * 0.22) ** 2));
    const wob = 0.55 + 0.45 * Math.sin(along * 0.011 + 1.3) * Math.cos(along * 0.0047);
    const k = band * wob * 22;
    const i = (y * w + x) * 3;
    sky[i] += k * 0.8; sky[i + 1] += k * 0.95; sky[i + 2] += k * 1.2;
  }
  // звезды: больше вверху и в полосе Млечного Пути, у горизонта редеют
  const N = Math.round(w * h / 260);
  for (let n = 0; n < N; n++) {
    const x = rand() * w, y = Math.pow(rand(), 0.8) * h * 0.92;
    const d = (x - cx) * -sa + (y - cy) * ca;
    const inBand = Math.exp(-(d * d) / (2 * (h * 0.26) ** 2));
    if (rand() > 0.35 + 0.65 * inBand) continue;
    const fade = 1 - Math.pow(y / h, 1.6) * 0.85;
    const bright = (0.25 + 0.75 * Math.pow(rand(), 3)) * 190 * fade;
    const warm = rand();
    const tint = warm < 0.2 ? [1, 0.88, 0.7] : warm < 0.5 ? [0.8, 0.9, 1] : [1, 1, 1];
    addStar(x, y, 0.55 + rand() * 0.45, bright, tint);
  }
  for (let n = 0; n < Math.round(w / 55); n++) {
    const x = rand() * w, y = rand() * h * 0.6;
    addStar(x, y, 1.1 + rand() * 0.5, 210, [0.9, 0.95, 1]);
    addStar(x, y, 3.2, 38, [0.6, 0.8, 1]);
  }
  // горы: исходное фото в лунном свете
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      const i = (y * w + x) * 3;
      const edge = (y - (line[x] + 3)) / 2.2; // мягкая кромка
      const m = Math.min(1, Math.max(0, edge + 0.5));
      const lum = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
      const moon = Math.pow(lum, 1.35);
      const lr = 8 + moon * 105, lg = 17 + moon * 150, lb = 32 + moon * 200;
      // у горизонта склон теряется в свечении льда
      const mix = m;
      out[i] = Math.min(255, sky[i] * (1 - mix) + lr * mix);
      out[i + 1] = Math.min(255, sky[i + 1] * (1 - mix) + lg * mix);
      out[i + 2] = Math.min(255, sky[i + 2] * (1 - mix) + lb * mix);
    }
  }
  return { data: out, w, h };
}

function dayBand(band) {
  const { data, w, h } = band;
  const out = Buffer.alloc(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    // немного прохладнее и темнее, чтобы горы сидели в одной гамме со льдом
    const s = 0.82;
    out[i * 3] = Math.min(255, (lum + (r - lum) * s) * 0.86 + 2);
    out[i * 3 + 1] = Math.min(255, (lum + (g - lum) * s) * 0.9 + 6);
    out[i * 3 + 2] = Math.min(255, (lum + (b - lum) * s) * 1.0 + 14);
  }
  return { data: out, w, h };
}

async function compose(name, v, band, iceTint) {
  const base = sharp(path.join(SRC, v.base));
  const bm = await base.metadata();
  const iceH = bm.height - v.horizon;
  const totalH = band.h - OVERLAP + iceH;
  // полоса с плавным растворением в нижней части
  const rgba = Buffer.alloc(band.w * band.h * 4);
  for (let y = 0; y < band.h; y++) {
    const a = Math.round(Math.min(y < band.h - OVERLAP ? 255 : 255 * (band.h - y) / OVERLAP, 255 * Math.min(1, y / 26)));
    for (let x = 0; x < band.w; x++) {
      const i = y * band.w + x;
      rgba[i * 4] = band.data[i * 3]; rgba[i * 4 + 1] = band.data[i * 3 + 1]; rgba[i * 4 + 2] = band.data[i * 3 + 2]; rgba[i * 4 + 3] = a;
    }
  }
  let ice = await sharp(path.join(SRC, v.base)).extract({ left: 0, top: v.horizon, width: bm.width, height: iceH }).toBuffer();
  if (iceTint) ice = await sharp(ice).modulate(iceTint).toBuffer();
  const img = sharp({ create: { width: band.w, height: totalH, channels: 3, background: { r: 4, g: 14, b: 24 } } })
    .composite([{ input: ice, top: band.h - OVERLAP, left: 0 }, { input: rgba, raw: { width: band.w, height: band.h, channels: 4 }, top: 0, left: 0 }]);
  const png = await img.png().toBuffer();
  if (PREVIEW) { await sharp(png).jpeg({ quality: 85 }).toFile(path.join(TMP, `hero-${name}.jpg`)); return; }
  const pipe = () => sharp(png);
  await pipe().webp({ quality: 80, effort: 5 }).toFile(path.join(OUT, `${name}.webp`));
  if (name.endsWith('-d')) await pipe().avif({ quality: 55, effort: 5 }).toFile(path.join(OUT, `${name}.avif`));
  console.log(name, band.w + 'x' + totalH);
}

(async () => {
  if (!PHOTO) throw new Error('Укажите путь к фото гор');
  for (const key of ['d', 'm']) {
    const v = VARIANTS[key];
    const band = await loadBand(v);
    const line = skyline(band, v);
    if (PREVIEW) {
      // карта границы неба и гор
      const dbg = Buffer.from(band.data);
      for (let x = 0; x < band.w; x++) { const i = (line[x] * band.w + x) * 3; dbg[i] = 255; dbg[i + 1] = 0; dbg[i + 2] = 0; }
      await sharp(dbg, { raw: { width: band.w, height: band.h, channels: 3 } }).jpeg({ quality: 80 }).toFile(path.join(TMP, `skyline-${key}.jpg`));
    }
    await compose(`day-${key}`, v, dayBand(band), null);
    await compose(`night-${key}`, v, nightBand(band, line), { brightness: 0.8, saturation: 0.9 });
  }
})();
