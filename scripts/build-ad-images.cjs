// Картинки для объявлений Яндекс Директа: фон — байкальский лёд с сайта, поверх текст и знак бренда.
// Запуск: node scripts/build-ad-images.cjs  →  docs/ad-images/*.jpg
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'public', 'hero', 'night-d-v3.webp');
const OUT = path.join(__dirname, '..', 'docs', 'ad-images');
fs.mkdirSync(OUT, { recursive: true });

const FONT = "'Segoe UI', 'Inter', Arial, sans-serif";
// знак бренда (из favicon.svg), рисуется в своих координатах 32x32
const mark = (x, y, s) => `
  <g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="#4DB8E8" stroke-linecap="round">
    <path d="M2 9 Q9 4 16 9 T30 9" stroke-width="1.8"/>
    <path d="M2 16 Q9 11 16 16 T30 16" stroke-width="1.8" opacity="0.65"/>
    <path d="M2 23 Q9 18 16 23 T30 23" stroke-width="1.8" opacity="0.35"/>
    <circle cx="9" cy="10" r="6" fill="#0A1722" stroke-width="1.8"/>
    <circle cx="9" cy="10" r="2" stroke-width="1.5"/>
  </g>`;

const badge = (x, y, w, h, text, size) => `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="#0A7AB5"/>
  <text x="${x + w / 2}" y="${y + h / 2 + size * 0.35}" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="${size}" fill="#fff">${text}</text>`;

async function make(name, W, H, cropBox, svgBody) {
  const bg = await sharp(SRC)
    .extract(cropBox)
    .resize(W, H)
    .modulate({ brightness: 0.8 })
    .toBuffer();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="${W > H ? 1 : 0}" y2="${W > H ? 0 : 1}">
        <stop offset="0" stop-color="#050E16" stop-opacity="0.88"/>
        <stop offset="0.65" stop-color="#050E16" stop-opacity="0.45"/>
        <stop offset="1" stop-color="#050E16" stop-opacity="0.1"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/>
    ${svgBody}
  </svg>`;
  await sharp(bg).composite([{ input: Buffer.from(svg) }]).jpeg({ quality: 90 }).toFile(path.join(OUT, name));
  console.log('ok', name);
}

(async () => {
  // 1. Квадрат 1080x1080: что делаем + скидка
  await make('ad-1-kvadrat-issledovaniya.jpg', 1080, 1080, { left: 300, top: 0, width: 992, height: 992 }, `
    ${mark(80, 80, 3)}
    <text x="80" y="420" font-family="${FONT}" font-weight="700" font-size="96" fill="#fff">Маркетинговые</text>
    <text x="80" y="530" font-family="${FONT}" font-weight="700" font-size="96" fill="#fff">исследования</text>
    <text x="80" y="640" font-family="${FONT}" font-weight="700" font-size="96" fill="#fff">для бизнеса</text>
    <text x="80" y="740" font-family="${FONT}" font-weight="400" font-size="44" fill="#BFE3F5">Опросы, кастдев, юзабилити-тесты</text>
    ${badge(80, 840, 740, 100, 'Скидка 20% для новых клиентов', 40)}
  `);

  // 2. Горизонталь 1600x900: заказать
  await make('ad-2-gorizontal-zakazat.jpg', 1600, 900, { left: 0, top: 90, width: 1585, height: 891 }, `
    ${mark(100, 90, 3.2)}
    <text x="100" y="400" font-family="${FONT}" font-weight="700" font-size="104" fill="#fff">Закажите маркетинговое</text>
    <text x="100" y="520" font-family="${FONT}" font-weight="700" font-size="104" fill="#fff">исследование</text>
    <text x="100" y="620" font-family="${FONT}" font-weight="400" font-size="46" fill="#BFE3F5">Ответ в течение рабочего дня</text>
    ${badge(100, 700, 780, 100, 'Скидка 20% для новых клиентов', 42)}
  `);

  // 3. Квадрат 1080x1080: бренд
  await make('ad-3-kvadrat-brend.jpg', 1080, 1080, { left: 500, top: 100, width: 880, height: 880 }, `
    ${mark(390, 300, 10)}
    <text x="540" y="720" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="104" fill="#fff">Baikal Research</text>
    <text x="540" y="810" text-anchor="middle" font-family="${FONT}" font-weight="400" font-size="52" fill="#4DB8E8">Видим глубже</text>
  `);
})();
