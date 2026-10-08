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
