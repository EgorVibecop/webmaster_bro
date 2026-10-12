// Счёт цифры при прокрутке до блока: быстро «накручивается» от начального значения к итоговому.
// Без JS и при prefers-reduced-motion остаётся итоговое значение из разметки.
(function () {
  var els = document.querySelectorAll('[data-count-to]');
  if (!els.length) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;

  function fmt(el, v) { return (el.getAttribute('data-prefix') || '') + Math.round(v); }

  els.forEach(function (el) {
    var from = Number(el.getAttribute('data-count-from'));
    var to = Number(el.getAttribute('data-count-to'));
    var dur = Number(el.getAttribute('data-count-ms')) || 1500;
    el.textContent = fmt(el, from);

    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      var t0 = null;
      function step(ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min(1, (ts - t0) / dur);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(el, from + (to - from) * eased);
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }, { threshold: 0.6 });
    io.observe(el);
  });
})();
