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

  // Первый экран: через 0,5 с картинка начинает уходить вниз с постоянной скоростью, горы уходят вместе со льдом, дальше лед идет бесконечной лентой с той же скоростью.
  // Лента собирается из той же картинки: берем ее часть ниже горизонта и ставим плитки одну за другой, каждую вторую зеркально.
  // Высота линии горизонта в готовых картинках: 146 px (компьютер, 1585x992) и 167 px (телефон, 700x1013).
  var heroBg = heroIce && heroIce.querySelector('.hero-ice-bg');
  var FLOW_SPEED = 15;    // скорость движения, px в секунду: и горы, и лед идут с одной скоростью
  var START = 500;        // мс до начала движения
  var born = Date.now();
  var flow = null;
  var builtW = 0;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function visibleHeroImg() {
    var name = document.documentElement.getAttribute('data-hero') === 'night' ? 'night' : 'day';
    return heroIce.querySelector('.hero-pic-' + name + ' img');
  }

  function buildFlow() {
    if (!heroBg || reduceMotion) return;
    var img = visibleHeroImg();
    if (!img || !img.currentSrc || !img.naturalWidth) return;
    var nw = img.naturalWidth, nh = img.naturalHeight;
    var hz = nw <= 800 ? 167 : 146;
    var r0 = hz + 45;                                  // строка картинки, с которой начинается лента
    var w = heroBg.clientWidth, h = heroBg.clientHeight, heroH = heroIce.clientHeight;
    var s = Math.max(w / nw, h / nh);                  // так картинку растягивает object-fit: cover
    var leave = r0 * s;
    if (leave > h - heroH - 2) return;                 // не хватает запаса, оставляем простую анимацию
    var tileH = (nh - r0) * s;
    if (flow && flow.parentNode) flow.parentNode.removeChild(flow);
    flow = document.createElement('div');
    flow.className = 'hero-flow';
    flow.setAttribute('aria-hidden', 'true');
    var dur = leave / FLOW_SPEED;                      // за это время горы уходят целиком
    var late = Date.now() - born > START + dur * 1000 - 100;
    if (late) flow.classList.add('late');
    var n = Math.max(3, Math.ceil(2 + heroH / tileH));
    for (var i = 0; i < n; i++) {
      var tile = document.createElement('div');
      tile.className = 'hero-flow-tile' + (i % 2 ? ' flip' : '');
      flow.appendChild(tile);
    }
    var st = flow.style;
    st.setProperty('--flow-img', 'url("' + img.currentSrc + '")');
    st.setProperty('--flow-h', tileH.toFixed(1) + 'px');
    st.setProperty('--flow-bg-w', (nw * s).toFixed(1) + 'px');
    st.setProperty('--flow-bg-h', (nh * s).toFixed(1) + 'px');
    st.setProperty('--flow-bg-x', ((w - nw * s) / 2).toFixed(1) + 'px');
    st.setProperty('--flow-bg-y', (-r0 * s).toFixed(1) + 'px');
    st.setProperty('--flow-delay', (START / 1000 + dur - 0.04).toFixed(2) + 's');
    st.setProperty('--flow-dur', ((2 * tileH) / FLOW_SPEED).toFixed(0) + 's');
    heroBg.style.setProperty('--leave', leave.toFixed(1) + 'px');
    heroBg.style.setProperty('--leave-dur', dur.toFixed(2) + 's');
    heroBg.insertAdjacentElement('afterend', flow);
    heroIce.classList.add('hero-flow-on');
    builtW = w;
  }

  // Запасной вариант без ленты: картинка уходит вниз и чуть дрейфует.
  function setLeave() {
    var mobile = window.matchMedia && window.matchMedia('(max-width: 700px)').matches;
    var nw = mobile ? 700 : 1585, nh = mobile ? 1013 : 992, hz = mobile ? 167 : 146;
    var w = heroBg.clientWidth, h = heroBg.clientHeight;
    var room = h - heroIce.clientHeight - 4;
    var scale = Math.max(w / nw, h / nh);
    var leave = Math.min(room, hz * scale + 36);
    heroBg.style.setProperty('--leave', leave.toFixed(0) + 'px');
    heroBg.style.setProperty('--end', Math.min(room, leave + (room - leave) * 0.5).toFixed(0) + 'px');
  }

  if (heroBg) {
    setLeave();
    var tryBuild = function () { buildFlow(); };
    var img0 = visibleHeroImg();
    if (img0) {
      if (img0.naturalWidth) tryBuild();
      else img0.addEventListener('load', tryBuild);
    }
    var rt = null;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        if (Math.abs(heroBg.clientWidth - builtW) > 2) { setLeave(); buildFlow(); }  // высоту не трогаем: на телефоне она меняется при прокрутке
      }, 200);
    });
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
