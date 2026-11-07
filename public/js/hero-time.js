// Фото первого экрана зависит от времени суток у посетителя: с 20:00 до 6:00 показываем ночное небо со звездами.
// Скрипт стоит в <head> и работает до отрисовки, чтобы не было мигания. Он же подгружает нужную картинку заранее.
(function () {
  var h = new Date().getHours();
  var night = h >= 20 || h < 6;
  var root = document.documentElement;
  root.setAttribute('data-hero', night ? 'night' : 'day');
  var name = night ? 'night' : 'day';
  var mobile = window.matchMedia && window.matchMedia('(max-width: 700px)').matches;
  var link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = '/hero/' + name + (mobile ? '-m-v2.webp' : '-d-v2.avif');
  link.type = mobile ? 'image/webp' : 'image/avif';
  link.setAttribute('fetchpriority', 'high');
  document.head.appendChild(link);
})();
