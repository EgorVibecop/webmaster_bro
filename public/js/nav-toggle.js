// Бургер-меню в шапке на узких экранах.
(function () {
  var header = document.getElementById('site-header');
  var toggle = document.getElementById('nav-toggle');
  if (!header || !toggle) return;

  toggle.addEventListener('click', function () {
    var open = header.getAttribute('data-nav-open') === 'true';
    header.setAttribute('data-nav-open', String(!open));
    toggle.setAttribute('aria-expanded', String(!open));
  });

  // Клик по ссылке в открытом меню закрывает его.
  var nav = document.getElementById('main-nav');
  nav && nav.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') {
      header.setAttribute('data-nav-open', 'false');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
})();
