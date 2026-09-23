// Отправка заявки в облачную функцию (она пересылает её в Telegram).
(function () {
  var form = document.getElementById('lead-form');
  var statusEl = document.getElementById('form-status');
  if (!form || !statusEl) return;

  var button = form.querySelector('button[type="submit"]');
  var openedAt = Date.now();
  var FALLBACK = 'Не удалось отправить заявку. Позвоните нам: +7 977 443-75-88 или напишите на baikalresearch@yandex.ru.';

  function setStatus(text, kind) {
    statusEl.textContent = text;
    statusEl.className = 'full form-status' + (kind ? ' is-' + kind : '');
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var endpoint = form.dataset.endpoint;
    if (!endpoint) {
      setStatus(FALLBACK, 'error');
      return;
    }

    var fd = new FormData(form);
    var payload = {
      name: fd.get('name'),
      company: fd.get('company'),
      email: fd.get('email'),
      phone: fd.get('phone'),
      service: fd.get('service'),
      message: fd.get('message'),
      website: fd.get('website'),
      consent: form.elements.consent.checked,
      elapsed: Date.now() - openedAt,
    };

    button.disabled = true;
    setStatus('Отправляем…', '');

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          return { ok: res.ok && data.ok };
        });
      })
      .then(function (result) {
        if (result.ok) {
          form.reset();
          setStatus('Спасибо! Заявка отправлена, мы ответим в течение рабочего дня.', 'ok');
        } else {
          setStatus(FALLBACK, 'error');
        }
      })
      .catch(function () {
        setStatus(FALLBACK, 'error');
      })
      .then(function () {
        button.disabled = false;
      });
  });
})();
