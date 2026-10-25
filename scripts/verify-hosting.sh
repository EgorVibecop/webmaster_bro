#!/usr/bin/env bash
# Проверка сайта на новом хостинге ДО переключения DNS.
# Запуск:  bash scripts/verify-hosting.sh IP_ХОСТИНГА [--lead]
#   --lead  отправляет тестовую заявку (она придет в Telegram и на почту, это нормально)
# Пример:  bash scripts/verify-hosting.sh 31.31.197.39 --lead
# Обращаемся к серверу по IP и подставляем заголовок Host: так проверка не зависит от DNS и от VPN-клиентов.
set -u
IP="${1:-}"
DOMAIN="baikalresearch.ru"
if [ -z "$IP" ]; then echo "Укажите IP хостинга: bash scripts/verify-hosting.sh 1.2.3.4 [--lead]"; exit 2; fi
ok=0; bad=0
pass() { echo "  [ок]    $1"; ok=$((ok+1)); }
fail() { echo "  [ОШИБКА] $1"; bad=$((bad+1)); }
H() { curl -sk -m 25 -H "Host: ${HOSTH:-$DOMAIN}" "$@"; }
S() { echo "${1/https:\/\/$DOMAIN/https://$IP}"; }   # адрес с доменом -> адрес с IP

echo "== Страницы из карты сайта (должны отвечать 200)"
URLS=$(H "https://$IP/sitemap-0.xml" | grep -o '<loc>[^<]*' | sed 's/<loc>//')
if [ -z "$URLS" ]; then fail "карта сайта /sitemap-0.xml не открылась (сайт еще не выложен?)"; else
  for u in $URLS; do c=$(H -o /dev/null -w "%{http_code}" "$(S "$u")"); [ "$c" = "200" ] && pass "$u" || fail "$u -> $c"; done
fi

echo "== Редиректы и ошибки"
c=$(H -o /dev/null -w "%{http_code} %{redirect_url}" "http://$IP/"); case "$c" in 301*https://$DOMAIN/*) pass "http -> https ($c)";; *) fail "http -> https: $c";; esac
c=$(HOSTH="www.$DOMAIN" H -o /dev/null -w "%{http_code} %{redirect_url}" "https://$IP/"); case "$c" in 301*https://$DOMAIN/*) pass "www -> без www ($c)";; *) fail "www -> без www: $c";; esac
c=$(H -o /dev/null -w "%{http_code}" "https://$IP/net-takoy-stranicy/"); [ "$c" = "404" ] && pass "несуществующая страница отдает 404" || fail "404-страница: $c"
n=$(H "https://$IP/net-takoy-stranicy/" | grep -c "Страница не найдена"); [ "$n" -ge 1 ] && pass "на 404 показывается наша страница" || fail "на 404 нет нашей страницы"

echo "== Файлы и заголовки"
for f in robots.txt llms.txt sitemap-index.xml favicon.svg hero/ice.avif hero/ice.webp og-image-v2.jpg files/gaid-glubinnogo-intervyu-shablon.docx; do c=$(H -o /dev/null -w "%{http_code}" "https://$IP/$f"); [ "$c" = "200" ] && pass "/$f" || fail "/$f -> $c"; done
h=$(H -I -H "Accept-Encoding: gzip" "https://$IP/")
echo "$h" | grep -qi "content-encoding: \(gzip\|br\)" && pass "сжатие включено" || fail "сжатие не включено (html без gzip/br)"
echo "$h" | grep -qi "x-content-type-options" && pass "заголовки безопасности (.htaccess работает)" || fail ".htaccess не применяется (нет заголовков безопасности)"
a=$(H -I "https://$IP/hero/ice.avif" | grep -i "content-type"); echo "$a" | grep -qi "image/avif" && pass "AVIF отдается с верным типом" || fail "AVIF отдается с неверным типом: $a"
a=$(H -I "https://$IP/_astro/" | head -1); true
cc=$(H -I "https://$IP/hero/ice.avif" | grep -i "cache-control\|expires" | tr -d '\r' | tr '\n' ' '); [ -n "$cc" ] && pass "кэш для картинок задан: $cc" || fail "кэш для картинок не задан"

echo "== Сертификат"
c=$(echo | openssl s_client -connect "$IP:443" -servername "$DOMAIN" 2>/dev/null | openssl x509 -noout -subject -issuer -enddate 2>/dev/null | tr "
" " ")
if [ -n "$c" ]; then echo "$c" | grep -qi "CN *= *$DOMAIN" && pass "сертификат для $DOMAIN: $c" || fail "сертификат выдан не на $DOMAIN: $c"; else fail "сертификат не получен"; fi

echo "== Приемник заявок"
c=$(H -o /dev/null -w "%{http_code}" -X OPTIONS -H "Origin: https://$DOMAIN" "https://$IP/api/lead.php"); [ "$c" = "204" ] && pass "/api/lead.php отвечает на предварительный запрос (204)" || fail "/api/lead.php OPTIONS -> $c (404: файл не загружен; 500: нет lead.config.php; 405: не PHP-обработчик)"
c=$(H -X POST -H "Origin: https://$DOMAIN" -H "Content-Type: application/json" -d '{"name":"","email":"x","consent":false,"elapsed":5000}' "https://$IP/api/lead.php"); echo "$c" | grep -q '"error":"validation"' && pass "проверка данных работает (ответ: $c)" || fail "ожидался ответ validation, получено: $(echo "$c" | head -c 200)"
c=$(H -o /dev/null -w "%{http_code}" "https://$IP/lead.config.php"); [ "$c" = "404" ] || [ "$c" = "403" ] && pass "файл с токеном не доступен из интернета ($c)" || fail "файл lead.config.php открывается из интернета! (код $c)"
if [ "${2:-}" = "--lead" ]; then
  c=$(H -m 30 -X POST -H "Origin: https://$DOMAIN" -H "Content-Type: application/json" -d '{"name":"Проверка переезда","company":"Baikal Research","email":"test@example.com","phone":"","service":"","message":"Тестовая заявка после переезда на хостинг. Если видите ее, форма работает.","consent":true,"elapsed":9000}' "https://$IP/api/lead.php")
  echo "$c" | grep -q '"ok":true' && pass "тестовая заявка принята: $c (в "via" каналы доставки; проверьте Telegram и почту)" || fail "тестовая заявка не принята: $(echo "$c" | head -c 200)"
fi

echo
echo "Итого: ок $ok, ошибок $bad"
[ "$bad" -eq 0 ]
