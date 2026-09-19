# Приём заявок в Telegram (Cloudflare Worker)

Сайт на GitHub Pages сам заявки принять не может. Форма отправляет данные в эту функцию, а она пересылает их вам в Telegram. Токен бота хранится только в функции, в коде сайта его нет.

## 1. Бот в Telegram

1. В Telegram откройте `@BotFather`, отправьте `/newbot`, задайте имя и username. Получите **токен**. Он секретный: никому не показывайте и не кладите в репозиторий.
2. Откройте своего нового бота и нажмите **Start** (бот не может писать тому, кто его не запускал).
3. Узнайте свой **chat id**: напишите боту `@userinfobot`, он ответит вашим `Id`.

## 2. Функция в Cloudflare

1. Зарегистрируйтесь на cloudflare.com (бесплатно).
2. Workers & Pages → Create → Worker → назовите `baikal-lead` → Deploy.
3. Edit code → замените содержимое файлом `worker/lead-worker.js` → Deploy.
4. Settings → Variables and Secrets, добавьте:
   - `TELEGRAM_BOT_TOKEN` — тип **Secret**, токен из BotFather
   - `TELEGRAM_CHAT_ID` — тип **Secret**, ваш Id
   - `ALLOWED_ORIGINS` — тип Text: `https://baikalresearch.ru,https://www.baikalresearch.ru,http://localhost:4321`
5. Скопируйте адрес функции вида `https://baikal-lead.<ваш-поддомен>.workers.dev`.

## 3. Подключить к сайту

В файле `src/config.js` впишите адрес в `FORM_ENDPOINT`, сделайте коммит и `git push`. Сайт пересоберётся сам.

## 4. Проверка

```bash
curl -X POST https://baikal-lead.<ваш-поддомен>.workers.dev \
  -H "Origin: http://localhost:4321" -H "Content-Type: application/json" \
  -d '{"name":"Тест","email":"test@example.com","message":"проверка","consent":true}'
```

В Telegram должно прийти сообщение, в ответе будет `{"ok":true}`.

## Защита и ограничения

- Токен только в секретах функции. Если он попал в чат, репозиторий или скриншот, перевыпустите его в BotFather (`/revoke`).
- Что делает функция: принимает запросы только с адресов из `ALLOWED_ORIGINS`, только `application/json` и не больше 10 КБ, обрезает поля, убирает управляющие символы, молча отбрасывает ботов (заполнено скрытое поле или форма отправлена быстрее 2 секунд). Это базовая защита, от целенаправленного спама она не спасёт.
- Лимит частоты (необязательно): в настройках Worker'а → Bindings → Add → **Rate Limiting**, имя привязки `RATE_LIMITER`, лимит например 3 запроса за 60 секунд. Если привязки нет, функция работает без лимита.
- Если спам всё же пойдёт, следующий шаг — капча Cloudflare Turnstile.
- Функция ничего не хранит: заявка живёт только в вашем Telegram-чате. Если чат удалить, история пропадёт.
- Email-копию можно добавить отдельным шагом (через сервис отправки писем, нужны SPF/DKIM-записи домена).
