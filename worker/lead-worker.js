// Cloudflare Worker: принимает заявку с сайта и пересылает её в Telegram.
//
// Секреты (Settings → Variables and Secrets):
//   TELEGRAM_BOT_TOKEN  — токен бота от @BotFather
//   TELEGRAM_CHAT_ID    — ваш chat id
// Переменная:
//   ALLOWED_ORIGINS     — через запятую, например:
//                         https://baikalresearch.ru,https://www.baikalresearch.ru

const MAX = { name: 100, company: 150, email: 150, phone: 50, service: 100, message: 2000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function corsHeaders(origin, allowed) {
  return {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : (allowed[0] || ''),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function reply(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

export default {
  async fetch(request, env) {
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
    const origin = request.headers.get('Origin') || '';
    const headers = corsHeaders(origin, allowed);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return reply({ ok: false, error: 'method' }, 405, headers);
    if (!allowed.includes(origin)) return reply({ ok: false, error: 'origin' }, 403, headers);

    let data;
    try {
      data = await request.json();
    } catch {
      return reply({ ok: false, error: 'json' }, 400, headers);
    }

    // Скрытое поле-ловушка: человек его не видит, простые боты заполняют.
    if (data.website) return reply({ ok: true }, 200, headers);

    const clean = (key) => String(data[key] ?? '').trim().slice(0, MAX[key]);
    const lead = {
      name: clean('name'),
      company: clean('company'),
      email: clean('email'),
      phone: clean('phone'),
      service: clean('service'),
      message: clean('message'),
    };

    if (!lead.name || !EMAIL_RE.test(lead.email)) return reply({ ok: false, error: 'validation' }, 400, headers);
    if (data.consent !== true) return reply({ ok: false, error: 'consent' }, 400, headers);

    const text = [
      'Новая заявка с baikalresearch.ru',
      '',
      `Имя: ${lead.name}`,
      `Компания: ${lead.company || '—'}`,
      `Email: ${lead.email}`,
      `Телефон: ${lead.phone || '—'}`,
      `Услуга: ${lead.service || '—'}`,
      '',
      lead.message || '(без комментария)',
    ].join('\n');

    let res;
    try {
      res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, disable_web_page_preview: true }),
      });
    } catch {
      return reply({ ok: false, error: 'telegram' }, 502, headers);
    }
    if (!res.ok) return reply({ ok: false, error: 'telegram' }, 502, headers);

    return reply({ ok: true }, 200, headers);
  },
};
