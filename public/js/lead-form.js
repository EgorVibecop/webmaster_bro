// Отправка заявки в облачную функцию (она пересылает ее в Telegram).
// Проверка полей своя, на русском: встроенные сообщения браузера зависят от языка телефона.
(function () {
  var form = document.getElementById('lead-form');
  var statusEl = document.getElementById('form-status');
  if (!form || !statusEl) return;

  var button = form.querySelector('button[type="submit"]');
  var openedAt = Date.now();
  var EMAIL = 'baikalresearch@yandex.ru';
  var TIMEOUT_MS = 5000;

  function setStatus(text, kind) {
    statusEl.textContent = text;
    statusEl.className = 'full form-status' + (kind ? ' is-' + kind : '');
  }

  // Если отправить не вышло, предлагаем письмо с уже заполненным текстом: оно откроется в почтовом приложении.
  function setFallback(payload) {
    statusEl.textContent = '';
    statusEl.className = 'full form-status is-error';
    function text(t) { return document.createTextNode(t); }
    var tel = document.createElement('a');
    tel.href = 'tel:+79774437588';
    tel.textContent = 'позвоните нам';
    var body = ['Имя: ' + (payload.name || ''), 'Телефон: ' + (payload.phone || ''), 'Почта: ' + (payload.email || ''), 'Компания: ' + (payload.company || ''), '', payload.message || ''].join('\n');
    var mail = document.createElement('a');
    mail.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent('Заявка с сайта') + '&body=' + encodeURIComponent(body);
    mail.textContent = 'отправьте материалы на почту';
    statusEl.appendChild(text('Не удалось отправить заявку. Пожалуйста, '));
    statusEl.appendChild(tel);
    statusEl.appendChild(text(' или '));
    statusEl.appendChild(mail);
    statusEl.appendChild(text('.'));
  }

  function fieldOf(name) { return form.elements[name]; }
  function clearError(el) {
    if (!el) return;
    el.removeAttribute('aria-invalid');
    var wrap = el.closest('div');
    var msg = wrap && wrap.querySelector('.field-error');
    if (msg) msg.remove();
  }
  function showError(el, text) {
    clearError(el);
    el.setAttribute('aria-invalid', 'true');
    var msg = document.createElement('div');
    msg.className = 'field-error';
    msg.setAttribute('role', 'alert');
    msg.textContent = text;
    var host = el.closest('.consent') ? el.closest('.consent').parentNode : el.parentNode;
    host.appendChild(msg);
  }

  function validate() {
    var first = null;
    function bad(el, text) { showError(el, text); if (!first) first = el; }
    var name = fieldOf('name'), email = fieldOf('email'), consent = fieldOf('consent');
    [name, email, consent].forEach(clearError);
    if (!name.value.trim()) bad(name, 'Укажите, как к вам обращаться.');
    var em = email.value.trim();
    if (!em) bad(email, 'Укажите адрес почты, например name@company.ru.');
    else if (/[А-Яа-яЁё]/.test(em)) bad(email, 'Адрес почты нужно вводить латиницей, например name@company.ru.');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) bad(email, 'Проверьте адрес почты: например, name@company.ru.');
    if (!consent.checked) bad(consent, 'Подтвердите согласие на обработку персональных данных.');
    if (first) { first.focus(); }
    return !first;
  }

  ['name', 'email', 'consent'].forEach(function (n) {
    var el = fieldOf(n);
    el.addEventListener('input', function () { clearError(el); });
    el.addEventListener('change', function () { clearError(el); });
  });

  function post(endpoint, payload) {
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, TIMEOUT_MS);
    return fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl ? ctrl.signal : undefined,
    }).then(function (res) {
      clearTimeout(timer);
      return res.json().catch(function () { return {}; }).then(function (data) { return !!(res.ok && data.ok); });
    }, function () { clearTimeout(timer); return false; });
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (!validate()) return;

    var endpoints = [form.dataset.endpointRu, form.dataset.endpoint].filter(Boolean);
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
    if (!endpoints.length) { setFallback(payload); return; }

    button.disabled = true;
    setStatus('Отправляем…', '');

    (window.baikalSource || function (cb) { cb(''); })(function (src) {
      if (src) payload.message = String(payload.message || '').slice(0, 1700) + '\n\n– Источник –\n' + src;
      var chain = Promise.resolve(false);
      endpoints.forEach(function (ep) {
        chain = chain.then(function (done) { return done ? true : post(ep, payload); });
      });
      chain.then(function (ok) {
        if (ok) {
          if (window.baikalGoal) window.baikalGoal('lead_submit');
          form.reset();
          setStatus('Спасибо! Заявка отправлена, мы ответим в течение рабочего дня.', 'ok');
        } else {
          setFallback(payload);
        }
        button.disabled = false;
      });
    });
  });
})();
