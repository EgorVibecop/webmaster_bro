// Фото первого экрана зависит от времени суток у посетителя: с 20:00 до 6:00 показываем ночное небо со звездами.
// Скрипт стоит в <head> и работает до отрисовки, чтобы не было мигания. Он же подгружает нужную картинку заранее.
(function () {
  var h = new Date().getHours();
  var night = h >= 20 || h < 6;
  var root = document.documentElement;
  root.setAttribute('data-hero', night ? 'night' : 'day');
  root.classList.add('hero-js');
  var name = night ? 'night' : 'day';
  var ver = (document.currentScript && document.currentScript.getAttribute('data-v')) || 'v5';
  var mobile = window.matchMedia && window.matchMedia('(max-width: 700px)').matches;
  var link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = '/hero/' + name + (mobile ? '-m-' + ver + '.webp' : '-d-' + ver + '.avif');
  link.type = mobile ? 'image/webp' : 'image/avif';
  link.setAttribute('fetchpriority', 'high');
  document.head.appendChild(link);
  // Главная картинка нужна сразу: нужной картинке снимаем lazy, как только она появится в разметке.
  if (window.MutationObserver) {
    var mo = new MutationObserver(function () {
      var img = document.querySelector('.hero-pic-' + name + ' img');
      if (!img) return;
      img.loading = 'eager';
      img.setAttribute('fetchpriority', 'high');
      mo.disconnect();
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener('DOMContentLoaded', function () { mo.disconnect(); });
  }
})();
