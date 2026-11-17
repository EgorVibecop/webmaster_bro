// Контакты: по нажатию на телефон или почту значение копируется, рядом на секунду появляется «Скопировано».
(function () {
  function legacy(text) {
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
      ok ? resolve() : reject();
    });
  }
  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).catch(function () { return legacy(text); });
    return legacy(text);
  }
  Array.prototype.forEach.call(document.querySelectorAll('.copy-btn'), function (btn) {
    var state = btn.parentNode.querySelector('.copy-state');
    var idle = state ? state.textContent : '';
    var timer = null;
    btn.addEventListener('click', function () {
      copy(btn.getAttribute('data-copy')).then(function () {
        if (window.baikalGoal) window.baikalGoal('contact_copy');
        if (!state) return;
        state.textContent = 'Скопировано';
        btn.parentNode.classList.add('copied');
        clearTimeout(timer);
        timer = setTimeout(function () { state.textContent = idle; btn.parentNode.classList.remove('copied'); }, 1800);
      }, function () { if (state) state.textContent = 'Не удалось, выделите вручную'; });
    });
  });
})();
