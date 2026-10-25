// Адрес приема заявок: скрипт на нашем хостинге в России (server/api/lead.php).
// Он проверяет данные и пересылает заявку в Telegram и на почту. Токен бота лежит в файле lead.config.php
// на сервере вне папки сайта (см. MIGRATION-RU.md), в репозитории его нет.
export const FORM_ENDPOINT_RU = '/api/lead.php';
