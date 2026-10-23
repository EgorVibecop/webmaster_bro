// Кнопки «Скопировать»: на телефоне ссылка mailto: открывает почтовое приложение по умолчанию (на iPhone это Mail),
// поэтому рядом с адресом почты даем возможность просто скопировать его.
(function () {
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-copy]');
    if (!btn) return;
    var text = btn.getAttribute('data-copy');
    var label = btn.getAttribute('data-label') || btn.textContent;
    if (!btn.getAttribute('data-label')) btn.setAttribute('data-label', label);
    function done() {
      btn.textContent = 'Скопировано';
      setTimeout(function () { btn.textContent = label; }, 1800);
    }
    function legacy() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (err) { /* ничего */ }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, legacy);
    else legacy();
  });
})();
