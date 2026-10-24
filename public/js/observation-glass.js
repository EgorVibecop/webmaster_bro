// Стекло темнеет и светлеет вслед за прокруткой, в обе стороны и каждый раз.
// Считаем только пока блок рядом с экраном: вне экрана прокрутка эту работу не вызывает.
(function () {
  var room = document.getElementById('observation-room');
  var glass = document.getElementById('observation-glass');
  if (!room || !glass) return;

  var MIN_OPACITY = 0.2;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var queued = false;
  var active = true;

  function update() {
    queued = false;
    var vh = window.innerHeight;
    var top = room.getBoundingClientRect().top;
    var p = (vh * 0.9 - top) / (vh * 0.65);
    p = Math.min(1, Math.max(0, p));
    p = p * p * (3 - 2 * p);
    var opacity = 1 - (1 - MIN_OPACITY) * (reduceMotion ? 1 : p);
    glass.style.setProperty('--glass', String(opacity));
  }

  function schedule() {
    if (active && !queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      active = entries[0].isIntersecting;
      if (active) schedule();
    }, { rootMargin: '200px 0px' }).observe(room);
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  schedule();
})();
