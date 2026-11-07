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

  var heroIce = document.querySelector('.hero-ice');
  // Фото первого экрана: при сбое мобильной сети пробуем загрузить еще раз, а пока прячем значок «битой» картинки.
  var heroImgs = heroIce ? Array.prototype.slice.call(heroIce.querySelectorAll('.hero-ice-bg img')) : [];
  heroImgs.forEach(function (heroImg) {
    var tries = 0;
    var retry = function () {
      if (tries >= 3) { heroImg.style.visibility = 'hidden'; return; }
      tries += 1;
      heroImg.style.visibility = 'hidden';
      setTimeout(function () {
        var src = heroImg.getAttribute('src');
        heroImg.removeAttribute('src');
        heroImg.setAttribute('src', src);
      }, 1500 * tries);
    };
    heroImg.addEventListener('error', retry);
    heroImg.addEventListener('load', function () { heroImg.style.visibility = ''; });
    if (heroImg.complete && heroImg.naturalWidth === 0 && heroImg.currentSrc) retry();
  });

  // Поверхность с горами видна около 4 секунд, потом картинка уходит вниз так, чтобы горизонт скрылся полностью.
  // Высота линии горизонта в готовых картинках: 333 px (компьютер, 1585x1179) и 375 px (телефон, 700x1221).
  var heroBg = heroIce && heroIce.querySelector('.hero-ice-bg');
  if (heroBg) {
    var setLeave = function () {
      var mobile = window.matchMedia && window.matchMedia('(max-width: 700px)').matches;
      var nw = mobile ? 700 : 1585, nh = mobile ? 1221 : 1179, hz = mobile ? 375 : 333;
      var w = heroBg.clientWidth, h = heroBg.clientHeight;
      var room = h - heroIce.clientHeight - 4; // дальше картинку двигать нельзя: покажется край
      var scale = Math.max(w / nw, h / nh);
      var leave = Math.min(room, hz * scale + 36);
      var end = Math.min(room, leave + (room - leave) * 0.5);
      heroBg.style.setProperty('--leave', leave.toFixed(0) + 'px');
      heroBg.style.setProperty('--end', end.toFixed(0) + 'px');
    };
    setLeave();
    window.addEventListener('resize', setLeave);
  }
  if (heroIce && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      heroIce.classList.toggle('paused', !entries[0].isIntersecting);
    }).observe(heroIce);
  }

  // Бегущая строка клиентов стоит на паузе, пока ее не видно.
  var marquee = document.querySelector('.marquee');
  if (marquee && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      marquee.classList.toggle('off-screen', !entries[0].isIntersecting);
    }).observe(marquee);
  }

  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var SELECTORS = [
    '.section-head', '.svc-row',
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

  // Страховка: что уже в зоне видимости, но не проявилось, показываем через пару секунд.
  window.addEventListener('load', function () {
    setTimeout(function () {
      Array.prototype.forEach.call(els, function (el) {
        if (!el.classList.contains('in') && el.getBoundingClientRect().top < window.innerHeight) el.classList.add('in');
      });
    }, 2500);
  });
})();
