// «Глубина погружения»: при прокрутке линия спускается вниз, шаги загораются, счетчик глубины растет.
// Текст виден сразу, без JS все шаги подсвечены.
// Для плавности: расстояния считаем один раз (при загрузке и смене размера), а при прокрутке читаем одну координату
// и работаем, только пока блок виден на экране. Линия и датчик двигаются через transform.
(function () {
  var sec = document.getElementById('process');
  if (!sec || !sec.classList.contains('dive')) return;
  var track = sec.querySelector('.dive-track');
  var rail = sec.querySelector('.dive-rail');
  var steps = Array.prototype.slice.call(sec.querySelectorAll('.dive-step'));
  var num = document.getElementById('dive-num');
  if (!track || !rail || !steps.length) return;

  var ticking = false;
  var visible = true;
  var dotOff = [];   // центр каждого кружка от верха линии, px
  var posFrac = [];  // то же в долях высоты линии
  var railH = 1;
  var lastText = '';
  var lastReached = -1;

  function center(el) {
    var r = el.getBoundingClientRect();
    return r.top + r.height / 2;
  }

  // Линия идет от центра первого кружка до центра последнего.
  function layout() {
    var dots = steps.map(function (s) { return center(s.querySelector('.dive-dot')); });
    var t = track.getBoundingClientRect().top;
    var first = dots[0] - t;
    railH = Math.max(dots[dots.length - 1] - dots[0], 1);
    rail.style.top = first + 'px';
    rail.style.bottom = 'auto';
    rail.style.height = railH + 'px';
    sec.style.setProperty('--rail-h', railH + 'px');
    dotOff = dots.map(function (d) { return d - dots[0]; });
    posFrac = dotOff.map(function (d) { return d / railH; });
  }

  // Глубина между шагами растет плавно: от значения одного шага к значению следующего.
  function depthAt(p) {
    for (var i = 1; i < steps.length; i++) {
      if (p <= posFrac[i] || i === steps.length - 1) {
        var a = +steps[i - 1].getAttribute('data-m');
        var b = +steps[i].getAttribute('data-m');
        var k = Math.min(1, Math.max(0, (p - posFrac[i - 1]) / ((posFrac[i] - posFrac[i - 1]) || 1)));
        return a + (b - a) * k;
      }
    }
    return 0;
  }

  function update() {
    ticking = false;
    var target = window.innerHeight * 0.6;
    var top = rail.getBoundingClientRect().top;
    var p = Math.min(1, Math.max(0, (target - top) / railH));
    sec.style.setProperty('--p', p.toFixed(4));
    var reached = 0;
    for (var i = 0; i < dotOff.length; i++) { if (top + dotOff[i] <= target + 1) reached = i + 1; }
    if (reached !== lastReached) {
      lastReached = reached;
      steps.forEach(function (s, i) { s.classList.toggle('reached', i < reached); });
    }
    if (num) {
      var text = Math.round(depthAt(p)).toLocaleString('ru-RU');
      if (text !== lastText) { lastText = text; num.textContent = text; }
    }
  }

  function request() {
    if (visible && !ticking) { ticking = true; requestAnimationFrame(update); }
  }

  sec.classList.add('dive-js');
  layout();
  update();
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', function () { layout(); request(); });
  window.addEventListener('load', function () { layout(); update(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { layout(); update(); });

  // Вне экрана ничего не считаем и ставим пузыри на паузу.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      sec.classList.toggle('off-screen', !visible);
      if (visible) { layout(); request(); }
    }, { rootMargin: '120px 0px' }).observe(sec);
  }
})();
