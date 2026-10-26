<?php
// ПРИМЕР. Скопируйте файл на сервер под именем lead.config.php в папку НА УРОВЕНЬ ВЫШЕ папки сайта
// (то есть рядом с папкой www / public_html, вне доступа из интернета) и впишите свои значения.
// Реальный файл lead.config.php в репозиторий не кладем: в нем токен бота.
return [
    'telegram_token'   => 'ВСТАВЬТЕ_ТОКЕН_БОТА_ИЗ_BOTFATHER',
    'telegram_chat_id' => 'ВСТАВЬТЕ_ВАШ_CHAT_ID',
    // Запасной канал: письмо с заявкой. Можно оставить пустым, если не нужно.
    'mail_to'          => 'baikalresearch@yandex.ru',
    'mail_from'        => 'info@baikalresearch.ru',
    // Отправка через SMTP ящика (меньше риск спама). Без этих строк письма уходят обычным mail().
    // 'smtp_host'     => 'ИМЯ_СЕРВЕРА_ПОЧТЫ_ИЗ_ПАНЕЛИ_ХОСТИНГА',
    // 'smtp_port'     => 465,
    // 'smtp_user'     => 'info@baikalresearch.ru',
    // 'smtp_pass'     => 'ПАРОЛЬ_ЯЩИКА',
    'allowed_origins'  => ['https://baikalresearch.ru', 'https://www.baikalresearch.ru'],
];
