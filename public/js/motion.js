// Анимации: появление блоков при прокрутке, линия процесса, сжатие шапки.
// Без JS или при настройке «уменьшить движение» все блоки видны сразу.
(function () {
  var header = document.querySelector('.site-header');
  if (header) {
    var last = null;
    var onScroll = function () {
      var v = window.scrollY > 8 ? 'true' : 'false';
      if (v !== last) { last = v; header.setAttribute('data-scrolled', v); }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var SELECTORS = [
    '.section-head', '.svc-row', '.timeline-item', '.tool-card', '.approach > *',
    '.cases-grid > *', '.clients > *', '.contact-grid > *',
    '.page > h2', '.page .steps li', '.page .callout', '.glossary-item'
  ].join(',');
  var els = document.querySelectorAll(SELECTORS);
  if (!els.length) return;

  document.documentElement.classList.add('motion');

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

  Array.prototype.forEach.call(els, function (el) {
    var idx = Array.prototype.indexOf.call(el.parentNode.children, el);
    el.style.setProperty('--d', (idx % 4) * 0.09 + 's');
    el.setAttribute('data-reveal', '');
    io.observe(el);
  });

  var timeline = document.querySelector('.timeline');
  if (timeline) {
    var tio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          timeline.classList.add('drawn');
          tio.disconnect();
        }
      });
    }, { threshold: 0.35 });
    tio.observe(timeline);
  }

  // Страховка: что уже в зоне видимости, но не проявилось, показываем через пару секунд.
  window.addEventListener('load', function () {
    setTimeout(function () {
      Array.prototype.forEach.call(els, function (el) {
        if (!el.classList.contains('in') && el.getBoundingClientRect().top < window.innerHeight) el.classList.add('in');
      });
      if (timeline && timeline.getBoundingClientRect().top < window.innerHeight * 0.8) timeline.classList.add('drawn');
    }, 2500);
  });
})();
