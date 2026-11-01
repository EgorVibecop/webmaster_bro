// «Глубина погружения»: при прокрутке линия спускается вниз, шаги загораются, счетчик глубины растет.
// Текст виден сразу, без JS все шаги подсвечены.
(function () {
  var sec = document.getElementById('process');
  if (!sec || !sec.classList.contains('dive')) return;
  var track = sec.querySelector('.dive-track');
  var rail = sec.querySelector('.dive-rail');
  var steps = Array.prototype.slice.call(sec.querySelectorAll('.dive-step'));
  var num = document.getElementById('dive-num');
  if (!track || !rail || !steps.length) return;

  var ticking = false;

  function center(el) {
    var r = el.getBoundingClientRect();
    return r.top + r.height / 2;
  }

  // Линия идет от центра первого кружка до центра последнего.
  function layout() {
    var t = track.getBoundingClientRect().top;
    var first = center(steps[0].querySelector('.dive-dot')) - t;
    var last = center(steps[steps.length - 1].querySelector('.dive-dot')) - t;
    rail.style.top = first + 'px';
    rail.style.bottom = 'auto';
    rail.style.height = Math.max(last - first, 1) + 'px';
  }

  // Глубина между шагами растет плавно: от значения одного шага к значению следующего.
  function depthAt(p) {
    var pos = steps.map(function (s) { return (center(s.querySelector('.dive-dot')) - rail.getBoundingClientRect().top) / (rail.getBoundingClientRect().height || 1); });
    for (var i = 1; i < steps.length; i++) {
      if (p <= pos[i] || i === steps.length - 1) {
        var a = +steps[i - 1].getAttribute('data-m');
        var b = +steps[i].getAttribute('data-m');
        var k = Math.min(1, Math.max(0, (p - pos[i - 1]) / ((pos[i] - pos[i - 1]) || 1)));
        return a + (b - a) * k;
      }
    }
    return 0;
  }

  function update() {
    ticking = false;
    var target = window.innerHeight * 0.6;
    var r = rail.getBoundingClientRect();
    var p = Math.min(1, Math.max(0, (target - r.top) / (r.height || 1)));
    sec.style.setProperty('--p', p.toFixed(4));
    steps.forEach(function (s) {
      s.classList.toggle('reached', center(s.querySelector('.dive-dot')) <= target + 1);
    });
    if (num) num.textContent = Math.round(depthAt(p)).toLocaleString('ru-RU');
  }

  function request() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }

  sec.classList.add('dive-js');
  layout();
  update();
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', function () { layout(); request(); });
  window.addEventListener('load', function () { layout(); update(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { layout(); update(); });
})();
