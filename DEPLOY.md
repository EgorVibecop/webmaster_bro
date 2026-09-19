# Деплой Baikal Research — чек-лист

Два варианта. Начинаем с A (бесплатно), к B (VPS) переходим, если сайт плохо открывается из России.

## Вариант A: GitHub Pages (0 ₽ за хостинг)

Домен `baikalresearch.ru` уже куплен на Reg.ru. Файлы для деплоя готовы: `public/CNAME`, `.github/workflows/deploy.yml`, `.gitignore`.

1. **Госуслуги.** В личном кабинете Reg.ru пройдите идентификацию администратора домена (ссылка на странице «Идентификация данных администратора домена»). Пока она не пройдена, операции с доменом, включая смену DNS, могут быть недоступны.
2. **GitHub.** Создайте аккаунт (если нет) и **публичный** репозиторий, например `baikal-research`. На бесплатном тарифе Pages работает только с публичными репозиториями. Не кладите в репозиторий ключи и токены.
3. **Загрузка кода.** В папке проекта:
   ```bash
   git remote add origin https://github.com/EgorVibecop/webmaster_bro.git
   git add .
   git commit -m "Initial site"
   git push -u origin main
   ```
4. **Включить Pages.** Репозиторий → Settings → Pages → Source: **GitHub Actions**. Первый деплой запустится сам, после следующего `git push` тоже.
5. **Свой домен.** В Settings → Pages → Custom domain впишите `baikalresearch.ru`, затем включите **Enforce HTTPS**, когда станет доступно (сертификат выпускается до часа).
6. **DNS в Reg.ru** (Домены → baikalresearch.ru → DNS-серверы и управление зоной). Добавьте записи:
   ```
   @    A      185.199.108.153
   @    A      185.199.109.153
   @    A      185.199.110.153
   @    A      185.199.111.153
   www  CNAME  EgorVibecop.github.io.
   ```
   Актуальные IP сверьте в документации GitHub, раздел «Managing a custom domain for your GitHub Pages site». Обновление DNS занимает от 10 минут до нескольких часов.
7. **Проверка.** Откройте `https://baikalresearch.ru` с мобильного интернета и с домашнего Wi-Fi. Если у части провайдеров сайт не грузится, переходите к варианту B.

## Вариант B: VPS

Пошагово, когда купите сервер.

## 1. Домен

1. Зарегистрируйте `baikalresearch.ru` (и опционально `.com`, чтобы никто не перехватил) у выбранного регистратора.
2. Ничего не настраивайте в DNS домена, пока не будет готов сервер (IP-адрес).

## 2. Сервер (VPS)

Минимальные требования — 1 vCPU / 1 GB RAM / 15–20 GB NVMe, Ubuntu 22.04 LTS. Сайт статический, больше не нужно.

Подключитесь по SSH и выполните:

```bash
apt update && apt upgrade -y
apt install -y nginx certbot python3-certbot-nginx
```

## 3. DNS

В панели регистратора домена добавьте A-запись:

```
@    A    <IP-адрес вашего сервера>
www  A    <IP-адрес вашего сервера>
```

Подождите 10–60 минут, пока DNS обновится (проверить: `nslookup baikalresearch.ru`).

## 4. Сборка и заливка сайта

Локально (на этом компьютере):

```bash
cd C:\Users\Mi\Desktop\baikal-research
npm run build
```

Это создаст папку `dist/` — статические файлы сайта. Их нужно скопировать на сервер, например через `scp`:

```bash
scp -r dist/* root@<IP-адрес>:/var/www/baikalresearch/
```

(папку `/var/www/baikalresearch/` на сервере создать заранее: `mkdir -p /var/www/baikalresearch`)

## 5. Настройка Nginx

На сервере создайте `/etc/nginx/sites-available/baikalresearch`:

```nginx
server {
    listen 80;
    server_name baikalresearch.ru www.baikalresearch.ru;
    root /var/www/baikalresearch;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

Активируйте и перезапустите:

```bash
ln -s /etc/nginx/sites-available/baikalresearch /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

## 6. HTTPS (бесплатный сертификат)

```bash
certbot --nginx -d baikalresearch.ru -d www.baikalresearch.ru
```

Certbot сам пропишет редирект с http на https и настроит автопродление сертификата.

## 7. Проверка

Откройте `https://baikalresearch.ru` — должен открыться сайт с замком в адресной строке.

## 8. Что ещё нужно до полного запуска

- [ ] Заменить `[email@baikalresearch.ru]`, `[@username]`, `[Город]` в `src/pages/index.astro` на реальные данные
- [ ] Подключить приём заявок с формы (сейчас форма ничего никуда не отправляет)
- [ ] Почта на домене (обычно настраивается в той же панели хостинга — MX-записи)
- [ ] Google Search Console + Яндекс.Вебмастер — добавить сайт, отправить sitemap
- [ ] Яндекс.Метрика / GA4 — вставить код счётчика
