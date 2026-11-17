// Комната наблюдения: убираем желтый оттенок света за стеклом (только яркие места внутри окна), остальное не трогаем.
const sharp = require('sharp');
(async () => {
  const src = 'scripts/hero-src/observation-room-orig.webp';
  const { data, info } = await sharp(src).raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, C = info.channels;
  const X0 = 100, X1 = 972, Y0 = 84, Y1 = 500, F = 10;
  const mul = [0.86, 1.0, 1.45];
  for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
    const i = (y * W + x) * C;
    const edge = Math.min(1, (x - X0) / F, (X1 - x) / F, (y - Y0) / F, (Y1 - y) / F);
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const w = edge * Math.min(1, Math.max(0, (lum - 50) / 70));
    for (let k = 0; k < 3; k++) data[i + k] = Math.min(255, Math.round(data[i + k] * (1 + (mul[k] - 1) * w)));
  }
  await sharp(data, { raw: { width: W, height: H, channels: C } }).webp({ quality: 82 }).toFile('public/observation-room-v2.webp');
})();
