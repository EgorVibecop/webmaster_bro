// Цели Яндекс.Метрики (счетчик 113551309). Идентификаторы целей типа «JavaScript-событие»
// должны быть заведены в кабинете Метрики: lead_submit, click_phone, click_email,
// calc_planner_used, calc_send_to_us, calc_pro_used.
(function () {
  var COUNTER = 113551309;
  var sent = {};
  window.baikalGoal = function (name, once) {
    if (once && sent[name]) return;
    sent[name] = true;
    try { if (typeof window.ym === 'function') window.ym(COUNTER, 'reachGoal', name); } catch (e) { /* аналитика не должна ломать страницу */ }
  };
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (href.indexOf('tel:') === 0) window.baikalGoal('click_phone');
    else if (href.indexOf('mailto:') === 0) window.baikalGoal('click_email');
  });
})();

// Источник визита для заявок: первая страница, откуда пришёл человек, метки UTM и ClientID Метрики.
// Хранится только в sessionStorage (до закрытия вкладки) и уходит вместе с заявкой в Telegram.
(function () {
  var KEY = 'baikal_src';
  function read() { try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function write(v) { try { sessionStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* хранилище недоступно */ } }
  if (!read()) {
    var q = new URLSearchParams(location.search);
    var utm = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].map(function (k) { return q.get(k) ? k.replace('utm_', '') + '=' + q.get(k) : ''; }).filter(Boolean).join(', ');
    write({ landing: location.pathname + location.search, ref: document.referrer || '', utm: utm });
  }
  // В заявку попадают только рекламные метки (если они есть): остальное в ней лишнее.
  window.baikalSource = function (cb) {
    var s = read();
    cb(s && s.utm ? 'Метки: ' + s.utm : '');
  };
})();
