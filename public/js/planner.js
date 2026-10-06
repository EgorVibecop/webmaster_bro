// Планировщик выборки для тех, кто не знает статистику. Всё считается в браузере.
(function () {
  var Z = 1.96;            // доверительная вероятность 95%
  var Z_POWER = 0.8416;    // мощность 80%
  var RESERVE = 0.1;       // запас на анкеты, которые придётся отбросить
  var nf = new Intl.NumberFormat('ru-RU');

  var state = {
    mode: 'groups',
    groups: [{ name: 'Группа 1', sub: 0 }, { name: 'Группа 2', sub: 0 }, { name: 'Группа 3', sub: 0 }],
    cut: 1,
    err: 5,
    compare: false,
    diff: 10
  };

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function plural(n, f) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return f[0];
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return f[1];
    return f[2];
  }
  function nPrecision(errPct) {
    var e = errPct / 100;
    return Math.ceil(Z * Z * 0.25 / (e * e));
  }
  function nCompare(diffPct) {
    var d = diffPct / 100;
    return Math.ceil((Z + Z_POWER) * (Z + Z_POWER) * 0.5 / (d * d));
  }
  function round10(n) { return Math.ceil(n / 10) * 10; }

  function cellsOf(g) { return (g.sub > 1 ? g.sub : 1) * state.cut; }

  function renderGroups() {
    var box = $('pl-groups');
    box.textContent = '';
    state.groups.forEach(function (g, i) {
      var row = el('div', 'pl-group');
      var nameWrap = el('div');
      var lab = el('label', 'field-label', 'Название группы ' + (i + 1));
      lab.setAttribute('for', 'pl-g-name-' + i);
      var inp = el('input', 'field');
      inp.id = 'pl-g-name-' + i; inp.type = 'text'; inp.maxLength = 60; inp.value = g.name; inp.autocomplete = 'off';
      inp.addEventListener('input', function () { g.name = inp.value; renderResult(); });
      nameWrap.appendChild(lab); nameWrap.appendChild(inp);

      var subWrap = el('div');
      var lab2 = el('label', 'field-label', 'Делим ещё на подгруппы?');
      lab2.setAttribute('for', 'pl-g-sub-' + i);
      var sel = el('select', 'field');
      sel.id = 'pl-g-sub-' + i;
      [[0, 'Нет'], [2, 'Да, на 2'], [3, 'Да, на 3'], [4, 'Да, на 4']].forEach(function (o) {
        var op = el('option', '', o[1]); op.value = o[0]; if (g.sub === o[0]) op.selected = true; sel.appendChild(op);
      });
      sel.addEventListener('change', function () { g.sub = Number(sel.value); renderResult(); });
      subWrap.appendChild(lab2); subWrap.appendChild(sel);

      row.appendChild(nameWrap); row.appendChild(subWrap);
      if (state.groups.length > 1) {
        var rm = el('button', 'pl-remove', 'Убрать');
        rm.type = 'button';
        rm.setAttribute('aria-label', 'Убрать группу ' + (g.name || (i + 1)));
        rm.addEventListener('click', function () { state.groups.splice(i, 1); renderGroups(); renderResult(); });
        row.appendChild(rm);
      }
      box.appendChild(row);
    });
  }

  function summaryText(r) {
    var lines = [];
    lines.push('Расчёт из планировщика выборки: ' + nf.format(r.total) + ' респондентов (с запасом ' + nf.format(r.withReserve) + ').');
    lines.push('Точность ±' + state.err + ' п.п. при 95%, ' + nf.format(r.perCell) + ' на каждую группу' + (state.compare ? ', с учётом сравнения групп (разница от ' + state.diff + ' п.п.)' : '') + '.');
    r.rows.forEach(function (row) { lines.push('— ' + row.label + ': ' + nf.format(row.n)); });
    return lines.join('\n');
  }

  function compute() {
    var perPrec = nPrecision(state.err);
    var perCmp = state.compare ? nCompare(state.diff) : 0;
    var perCell = Math.max(perPrec, perCmp);
    var rows = [];
    var cells = 0;
    if (state.mode === 'all') {
      rows.push({ label: 'Вся аудитория', n: perCell, cells: 1 });
      cells = 1;
    } else {
      state.groups.forEach(function (g, i) {
        var c = cellsOf(g);
        var name = (g.name || '').trim() || ('Группа ' + (i + 1));
        var detail = [];
        if (g.sub > 1) detail.push(g.sub + ' ' + plural(g.sub, ['подгруппа', 'подгруппы', 'подгрупп']));
        if (state.cut > 1) detail.push(state.cut + ' ' + plural(state.cut, ['часть', 'части', 'частей']) + ' по разрезу');
        var label = name + (detail.length ? ' (' + detail.join(' × ') + ')' : '');
        rows.push({ label: label, n: c * perCell, cells: c });
        cells += c;
      });
    }
    var total = cells * perCell;
    return { perPrec: perPrec, perCmp: perCmp, perCell: perCell, rows: rows, cells: cells, total: total, withReserve: round10(total * (1 + RESERVE)) };
  }

  function renderResult() {
    var r = compute();
    var out = $('pl-out');
    out.textContent = '';

    var head = el('div', 'pl-head');
    head.appendChild(el('div', 'calc-sub', 'Нужно опросить около'));
    head.appendChild(el('div', 'calc-big', nf.format(r.withReserve) + ' ' + plural(r.withReserve, ['человека', 'человек', 'человек'])));
    head.appendChild(el('div', 'calc-sub', r.total === r.withReserve ? '' : nf.format(r.total) + ' по расчёту и около 10% запаса на анкеты, которые придётся отбросить'));
    out.appendChild(head);

    var table = el('table', 'pl-table');
    var cap = el('caption', 'sr-only', 'Сколько человек опросить в каждой группе');
    table.appendChild(cap);
    var thead = el('thead'); var trh = el('tr');
    trh.appendChild(el('th', '', 'Группа')); trh.appendChild(el('th', 'num', 'Человек'));
    thead.appendChild(trh); table.appendChild(thead);
    var tb = el('tbody');
    r.rows.forEach(function (row) {
      var tr = el('tr'); tr.appendChild(el('td', '', row.label)); tr.appendChild(el('td', 'num', nf.format(row.n))); tb.appendChild(tr);
    });
    var trt = el('tr', 'pl-total'); trt.appendChild(el('td', '', 'Всего по расчёту')); trt.appendChild(el('td', 'num', nf.format(r.total))); tb.appendChild(trt);
    table.appendChild(tb);
    out.appendChild(table);

    out.appendChild(el('h3', 'pl-why', 'Почему так'));
    var ol = el('ol', 'pl-steps');
    var li1 = el('li');
    li1.appendChild(el('b', '', 'Точность. '));
    li1.appendChild(document.createTextNode('Чтобы доля ответов была точна до ±' + state.err + ' п.п. (например, «40% выбрали этот вариант» значит от ' + (40 - state.err) + ' до ' + (40 + state.err) + '% во всей аудитории), нужно ' + nf.format(r.perPrec) + ' человек. Это число не зависит от размера аудитории, пока в ней больше нескольких тысяч человек.'));
    ol.appendChild(li1);

    if (state.mode === 'groups') {
      var li2 = el('li');
      li2.appendChild(el('b', '', 'Считаем по группам, а не по всему опросу. '));
      li2.appendChild(document.createTextNode('Вы хотите делать выводы отдельно по каждой группе, значит точность нужна внутри каждой из них. У вас получается ' + r.cells + ' ' + plural(r.cells, ['группа', 'группы', 'групп']) + ' с отдельными выводами, и в каждую нужно набрать ' + nf.format(r.perCell) + ' человек. Если опросить 400 человек и потом разбить их на группы, в каждой окажется слишком мало ответов для выводов.'));
      ol.appendChild(li2);
    }
    if (state.compare) {
      var li3 = el('li');
      li3.appendChild(el('b', '', 'Сравнение групп. '));
      li3.appendChild(document.createTextNode('Чтобы с хорошим шансом (около 80%) заметить разницу от ' + state.diff + ' п.п. между двумя группами, нужно ' + nf.format(r.perCmp) + ' человек в каждой. ' + (r.perCmp > r.perPrec ? 'Это больше, чем нужно для точности, поэтому берём это число.' : 'Это меньше, чем нужно для точности, поэтому берём число из первого пункта.')));
      ol.appendChild(li3);
    }
    var li4 = el('li');
    li4.appendChild(el('b', '', 'Типы вопросов. '));
    li4.appendChild(document.createTextNode('Одиночный и множественный выбор считаются одинаково: у каждого варианта доля тех, кто его выбрал, и точность та же. Открытые вопросы число респондентов не увеличивают: ответы нужно прочитать и разложить по темам, это добавляет работы, но не людей.'));
    ol.appendChild(li4);
    var li5 = el('li');
    li5.appendChild(el('b', '', 'Запас. '));
    li5.appendChild(document.createTextNode('Часть анкет обычно приходится отбросить (слишком быстрые, шаблонные ответы), поэтому добавляем около 10%.'));
    ol.appendChild(li5);
    out.appendChild(ol);

    if (state.mode === 'groups' && state.err < 10 && r.cells > 1) {
      var rough = round10(r.cells * nPrecision(10) * (1 + RESERVE));
      var tip = el('p', 'calc-note');
      tip.textContent = 'Как сэкономить: если по группам нужен только ориентир (±10 п.п.), хватит около ' + nf.format(rough) + ' человек вместо ' + nf.format(r.withReserve) + '. Общие цифры по всем группам вместе при этом всё равно будут точными.';
      out.appendChild(tip);
    }

    var actions = el('div', 'pl-actions');
    var send = el('button', 'btn btn-primary', 'Отправить этот расчёт нам');
    send.type = 'button';
    send.addEventListener('click', function () {
      var msg = $('f-message'); var sv = $('f-service');
      if (msg) msg.value = summaryText(r);
      if (sv) { for (var i = 0; i < sv.options.length; i++) { if (sv.options[i].text.indexOf('CATI') !== -1) { sv.selectedIndex = i; break; } } }
      var c = $('contact'); if (c) c.scrollIntoView({ behavior: 'smooth' });
      var nm = $('f-name'); if (nm) setTimeout(function () { nm.focus({ preventScroll: true }); }, 400);
    });
    actions.appendChild(send);
    actions.appendChild(el('span', 'calc-hint', 'Мы посмотрим расчёт и подскажем, как уложиться в бюджет.'));
    out.appendChild(actions);
  }

  function syncVisibility() {
    var g = state.mode === 'groups';
    $('pl-step-groups').hidden = !g;
    $('pl-step-compare').hidden = !g;
    $('pl-diff-wrap').hidden = !(g && state.compare);
  }

  function bind() {
    document.querySelectorAll('input[name="pl-mode"]').forEach(function (r) {
      r.addEventListener('change', function () { state.mode = r.value; syncVisibility(); renderResult(); });
    });
    document.querySelectorAll('input[name="pl-err"]').forEach(function (r) {
      r.addEventListener('change', function () { state.err = Number(r.value); renderResult(); });
    });
    document.querySelectorAll('input[name="pl-compare"]').forEach(function (r) {
      r.addEventListener('change', function () { state.compare = r.value === 'yes'; syncVisibility(); renderResult(); });
    });
    $('pl-cut').addEventListener('change', function () { state.cut = Number($('pl-cut').value); renderResult(); });
    $('pl-diff').addEventListener('change', function () { state.diff = Number($('pl-diff').value); renderResult(); });
    $('pl-add').addEventListener('click', function () {
      if (state.groups.length >= 10) return;
      state.groups.push({ name: 'Группа ' + (state.groups.length + 1), sub: 0 });
      renderGroups(); renderResult();
    });
  }

  bind(); syncVisibility(); renderGroups(); renderResult();
})();
