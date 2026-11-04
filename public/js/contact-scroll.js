// Кнопки «Связаться с нами» плавно прокручивают к форме, но не добавляют #contact в адрес:
// иначе после обновления страницы браузер снова прыгает вниз.
(function () {
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href="#contact"]');
    if (!a) return;
    var target = document.getElementById('contact');
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  // Если страницу открыли по старой ссылке с #contact, убираем хвост из адреса.
  if (location.hash === '#contact' && history.replaceState) {
    history.replaceState(null, '', location.pathname + location.search);
  }
})();
