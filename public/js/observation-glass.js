// Стекло темнеет и светлеет вслед за прокруткой, в обе стороны и каждый раз.
(function () {
  var room = document.getElementById('observation-room');
  var glass = document.getElementById('observation-glass');
  if (!room || !glass) return;

  var MIN_OPACITY = 0.2;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var queued = false;

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
    if (!queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  update();
})();
