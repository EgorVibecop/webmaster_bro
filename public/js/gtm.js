// Google Tag Manager, контейнер GTM-TTGMQCPB.
// Сам GTM ничего не измеряет — он подгружает теги, настроенные в панели
// tagmanager.google.com. При добавлении там нового тега (GA4, Google Ads
// и т.п.) может понадобиться открыть его домен в CSP (BaseLayout.astro).
(function (w, d, s, l, i) {
  w[l] = w[l] || [];
  w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
  var f = d.getElementsByTagName(s)[0],
    j = d.createElement(s),
    dl = l !== 'dataLayer' ? '&l=' + l : '';
  j.async = true;
  j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl;
  f.parentNode.insertBefore(j, f);
})(window, document, 'script', 'dataLayer', 'GTM-TTGMQCPB');
