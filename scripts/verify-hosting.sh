#!/usr/bin/env bash
# Проверка сайта на новом хостинге ДО переключения DNS.
# Запуск:  bash scripts/verify-hosting.sh IP_ХОСТИНГА [--lead]
#   --lead  отправляет тестовую заявку (она придет в Telegram и на почту, это нормально)
# Пример:  bash scripts/verify-hosting.sh 31.31.196.100
set -u
IP="${1:-}"
DOMAIN="baikalresearch.ru"
if [ -z "$IP" ]; then echo "Укажите IP хостинга: bash scripts/verify-hosting.sh 1.2.3.4 [--lead]"; exit 2; fi
R=(--resolve "$DOMAIN:443:$IP" --resolve "$DOMAIN:80:$IP" --resolve "www.$DOMAIN:443:$IP" --resolve "www.$DOMAIN:80:$IP")
ok=0; bad=0
pass() { echo "  [ок]    $1"; ok=$((ok+1)); }
fail() { echo "  [ОШИБКА] $1"; bad=$((bad+1)); }
code() { curl -s -o /dev/null -k -m 25 -w "%{http_code}" "${R[@]}" "$@"; }

echo "== Страницы из карты сайта (должны отвечать 200)"
URLS=$(curl -s -k -m 25 "${R[@]}" "https://$DOMAIN/sitemap-0.xml" | grep -o '<loc>[^<]*' | sed 's/<loc>//')
if [ -z "$URLS" ]; then fail "карта сайта /sitemap-0.xml не открылась"; else
  for u in $URLS; do c=$(code "$u"); [ "$c" = "200" ] && pass "$u" || fail "$u -> $c"; done
fi

echo "== Редиректы и ошибки"
c=$(curl -s -o /dev/null -k -m 25 -w "%{http_code} %{redirect_url}" "${R[@]}" "http://$DOMAIN/"); case "$c" in 301*https://$DOMAIN/*) pass "http -> https ($c)";; *) fail "http -> https: $c";; esac
c=$(curl -s -o /dev/null -k -m 25 -w "%{http_code} %{redirect_url}" "${R[@]}" "https://www.$DOMAIN/"); case "$c" in 301*https://$DOMAIN/*) pass "www -> без www ($c)";; *) fail "www -> без www: $c";; esac
c=$(code "https://$DOMAIN/net-takoy-stranicy/"); [ "$c" = "404" ] && pass "несуществующая страница отдает 404" || fail "404-страница: $c"
c=$(curl -s -k -m 25 "${R[@]}" "https://$DOMAIN/net-takoy-stranicy/" | grep -c "Страница не найдена"); [ "$c" -ge 1 ] && pass "на 404 показывается наша страница" || fail "на 404 нет нашей страницы"

echo "== Файлы и заголовки"
for f in robots.txt llms.txt sitemap-index.xml favicon.svg hero/ice.avif hero/ice.webp og-image-v2.jpg; do c=$(code "https://$DOMAIN/$f"); [ "$c" = "200" ] && pass "/$f" || fail "/$f -> $c"; done
h=$(curl -s -I -k -m 25 "${R[@]}" -H "Accept-Encoding: gzip" "https://$DOMAIN/")
echo "$h" | grep -qi "content-encoding: \(gzip\|br\)" && pass "сжатие включено" || fail "сжатие не включено (html без gzip/br)"
echo "$h" | grep -qi "x-content-type-options" && pass "заголовки безопасности (.htaccess работает)" || fail ".htaccess не применяется (нет заголовков)"
a=$(curl -s -I -k -m 25 "${R[@]}" "https://$DOMAIN/hero/ice.avif" | grep -i "content-type"); echo "$a" | grep -qi "image/avif" && pass "AVIF отдается с верным типом" || fail "AVIF отдается с неверным типом: $a"
cert=$(echo | openssl s_client -connect "$IP:443" -servername "$DOMAIN" 2>/dev/null | openssl x509 -noout -subject -enddate 2>/dev/null); [ -n "$cert" ] && pass "сертификат: $(echo "$cert" | tr '\n' ' ')" || fail "сертификат не выдан для $DOMAIN"

echo "== Приемник заявок"
c=$(curl -s -o /dev/null -k -m 25 -w "%{http_code}" "${R[@]}" -X OPTIONS -H "Origin: https://$DOMAIN" "https://$DOMAIN/api/lead.php"); [ "$c" = "204" ] && pass "/api/lead.php отвечает на предварительный запрос (204)" || fail "/api/lead.php OPTIONS -> $c (нужен 204; 404 значит файл не загружен, 500 значит нет lead.config.php)"
c=$(curl -s -k -m 25 "${R[@]}" -X POST -H "Origin: https://$DOMAIN" -H "Content-Type: application/json" -d '{"name":"","email":"x","consent":false,"elapsed":5000}' "https://$DOMAIN/api/lead.php"); echo "$c" | grep -q '"error":"validation"' && pass "проверка данных работает (ответ: $c)" || fail "ожидался ответ validation, получено: $c"
if [ "${2:-}" = "--lead" ]; then
  c=$(curl -s -k -m 30 "${R[@]}" -X POST -H "Origin: https://$DOMAIN" -H "Content-Type: application/json" -d '{"name":"Проверка переезда","company":"Baikal Research","email":"test@example.com","phone":"","service":"","message":"Тестовая заявка после переезда на хостинг. Если видите ее, форма работает.","consent":true,"elapsed":9000}' "https://$DOMAIN/api/lead.php")
  echo "$c" | grep -q '"ok":true' && pass "тестовая заявка принята: проверьте Telegram и почту" || fail "тестовая заявка не принята: $c"
fi

echo
echo "Итого: ок $ok, ошибок $bad"
[ "$bad" -eq 0 ]
