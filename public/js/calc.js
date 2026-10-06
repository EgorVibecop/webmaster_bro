// Калькулятор выборки и значимости. Всё считается в браузере, данные никуда не отправляются.
(function () {
  var Z = { '90': 1.6449, '95': 1.96, '99': 2.5758 };
  var nf = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
  var nf1 = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1, minimumFractionDigits: 1 });

  function num(id) {
    var el = document.getElementById(id);
    if (!el) return NaN;
    var s = String(el.value).replace(/\s/g, '').replace(',', '.');
    if (s === '') return NaN;
    return Number(s);
  }
  function val(id) { return document.getElementById(id).value; }
  function out(id, html) { document.getElementById(id).innerHTML = html; }

  // Функция стандартного нормального распределения через erfc (Numerical Recipes, ошибка ~1e-7).
  function erfc(x) {
    var z = Math.abs(x);
    var t = 1 / (1 + 0.5 * z);
    var r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 +
      t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 +
      t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? r : 2 - r;
  }
  function normCdf(x) { return 0.5 * erfc(-x / Math.SQRT2); }

  // 1. Сколько респондентов нужно
  function calcSize() {
    var conf = val('s-conf');
    var e = num('s-err') / 100;
    var p = num('s-p') / 100;
    var N = num('s-pop');
    if (!(e > 0 && e < 1) || !(p > 0 && p < 1)) {
      out('s-out', '<span class="calc-hint">Введите погрешность и ожидаемую долю: числа от 0 до 100 (в процентах).</span>');
      return;
    }
    var z = Z[conf];
    var n0 = z * z * p * (1 - p) / (e * e);
    var n = n0;
    var note = '';
    if (N > 0) {
      n = n0 / (1 + (n0 - 1) / N);
      if (N <= n0) note = ' Генеральная совокупность небольшая: проще опросить всех.';
    }
    n = Math.min(Math.ceil(n), N > 0 ? N : Infinity);
    out('s-out', '<div class="calc-big">' + nf.format(n) + '</div><div class="calc-sub">респондентов нужно опросить</div>' +
      '<p class="calc-note">Чтобы с вероятностью ' + conf + '% доля в ответах отличалась от доли во всей аудитории не больше чем на ±' + nf.format(e * 100) + ' п.п.' + note + '</p>');
  }

  // 2. Погрешность при заданной выборке
  function calcError() {
    var conf = val('e-conf');
    var n = num('e-n');
    var p = num('e-p') / 100;
    var N = num('e-pop');
    if (!(n >= 2) || !(p > 0 && p < 1)) {
      out('e-out', '<span class="calc-hint">Введите число респондентов (от 2) и ожидаемую долю в процентах.</span>');
      return;
    }
    var fpc = (N > 0 && N > n) ? Math.sqrt((N - n) / (N - 1)) : 1;
    var e = Z[conf] * Math.sqrt(p * (1 - p) / n) * fpc * 100;
    out('e-out', '<div class="calc-big">±' + nf.format(e) + ' п.п.</div><div class="calc-sub">предельная погрешность</div>' +
      '<p class="calc-note">Если в опросе ' + nf.format(Math.round(p * 100)) + '% респондентов выбрали ответ, то во всей аудитории доля с вероятностью ' + conf +
      '% лежит между ' + nf1.format(Math.max(0, p * 100 - e)) + '% и ' + nf1.format(Math.min(100, p * 100 + e)) + '%.</p>');
  }

  // 3. Значимость различий двух долей
  function calcDiff() {
    var conf = val('d-conf');
    var n1 = num('d-n1'), n2 = num('d-n2');
    var p1 = num('d-p1') / 100, p2 = num('d-p2') / 100;
    if (!(n1 >= 2 && n2 >= 2) || !(p1 >= 0 && p1 <= 1) || !(p2 >= 0 && p2 <= 1) || isNaN(p1) || isNaN(p2)) {
      out('d-out', '<span class="calc-hint">Введите число респондентов в каждой группе (от 2) и доли в процентах (0–100).</span>');
      return;
    }
    var pp = (p1 * n1 + p2 * n2) / (n1 + n2);
    var se0 = Math.sqrt(pp * (1 - pp) * (1 / n1 + 1 / n2));
    var diff = (p1 - p2) * 100;
    var se1 = Math.sqrt(p1 * (1 - p1) / n1 + p2 * (1 - p2) / n2);
    var z = Z[conf];
    var lo = diff - z * se1 * 100, hi = diff + z * se1 * 100;
    var small = Math.min(n1 * p1, n1 * (1 - p1), n2 * p2, n2 * (1 - p2)) < 5;

    var html;
    if (se0 === 0) {
      html = '<div class="calc-big">—</div><div class="calc-sub">доли в обеих группах равны 0% или 100%, расчёт невозможен</div>';
    } else {
      var zs = (p1 - p2) / se0;
      var pv = 2 * (1 - normCdf(Math.abs(zs)));
      var signif = pv < (1 - Number(conf) / 100);
      html = '<div class="calc-big ' + (signif ? 'is-yes' : 'is-no') + '">' + (signif ? 'Различие значимо' : 'Различие не значимо') + '</div>' +
        '<div class="calc-sub">при доверительной вероятности ' + conf + '%</div>' +
        '<dl class="calc-dl"><div><dt>Разница</dt><dd>' + (diff > 0 ? '+' : '') + nf.format(diff) + ' п.п.</dd></div>' +
        '<div><dt>Интервал разницы</dt><dd>от ' + nf.format(lo) + ' до ' + nf.format(hi) + ' п.п.</dd></div>' +
        '<div><dt>p-значение</dt><dd>' + (pv < 0.0001 ? 'меньше 0,0001' : nf.format(Math.round(pv * 10000) / 10000)) + '</dd></div></dl>' +
        '<p class="calc-note">' + (signif
          ? 'Такая разница вряд ли возникла случайно из-за выборки. Это ещё не значит, что она важна для бизнеса.'
          : 'Разницу нельзя отличить от случайного разброса выборки. Чтобы её обнаружить, нужно больше респондентов.') + '</p>';
      if (small) html += '<p class="calc-note calc-warn">В одной из групп меньше 5 ответов в какой-то категории: расчёт приблизительный, лучше проверить точным критерием.</p>';
    }
    out('d-out', html);
  }

  var groups = [
    { ids: ['s-conf', 's-err', 's-p', 's-pop'], fn: calcSize },
    { ids: ['e-conf', 'e-n', 'e-p', 'e-pop'], fn: calcError },
    { ids: ['d-conf', 'd-n1', 'd-p1', 'd-n2', 'd-p2'], fn: calcDiff }
  ];
  groups.forEach(function (g) {
    g.ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) { el.addEventListener('input', g.fn); el.addEventListener('change', g.fn); }
    });
    g.fn();
  });
})();
