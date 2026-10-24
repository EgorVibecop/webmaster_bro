<?php
// Приемник заявок для российского хостинга. Делает то же, что worker/lead-worker.js:
// проверяет данные и отправляет заявку в Telegram, а при сбое Telegram дублирует письмом на почту.
// Секреты лежат в файле lead.config.php ВНЕ папки сайта (см. server/lead.config.example.php и MIGRATION-RU.md).

declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

const MAX_BODY = 10000;
const MIN_FILL_MS = 2000;
const LIMITS = ['name' => 100, 'company' => 150, 'email' => 150, 'phone' => 50, 'service' => 100, 'message' => 2000];

function reply(array $body, int $status = 200): never {
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

// Убираем управляющие символы (в сообщении оставляем переводы строк), режем по длине.
function tidy($value, int $max, bool $keepNewlines = false): string {
    $text = is_scalar($value) ? (string)$value : '';
    $re = $keepNewlines ? '/[\x00-\x09\x0b-\x1f\x7f]/u' : '/[\x00-\x1f\x7f]/u';
    $text = preg_replace($re, ' ', $text) ?? '';
    return mb_substr(trim($text), 0, $max);
}

$configFile = __DIR__ . '/../../lead.config.php';
if (!is_file($configFile)) reply(['ok' => false, 'error' => 'config'], 500);
$cfg = require $configFile;

$allowed = $cfg['allowed_origins'] ?? ['https://baikalresearch.ru', 'https://www.baikalresearch.ru'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '') {
    if (!in_array($origin, $allowed, true)) reply(['ok' => false, 'error' => 'origin'], 403);
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}

$method = $_SERVER['REQUEST_METHOD'] ?? '';
if ($method === 'OPTIONS') {
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    http_response_code(204);
    exit;
}
if ($method !== 'POST') reply(['ok' => false, 'error' => 'method'], 405);
if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') === false) reply(['ok' => false, 'error' => 'content-type'], 415);

// Простой лимит частоты: не больше 5 заявок за 10 минут с одного адреса.
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rateFile = sys_get_temp_dir() . '/baikal-lead-' . md5($ip) . '.json';
$now = time();
$hits = [];
if (is_file($rateFile)) {
    $hits = json_decode((string)file_get_contents($rateFile), true) ?: [];
    $hits = array_values(array_filter($hits, fn($t) => $t > $now - 600));
}
if (count($hits) >= 5) reply(['ok' => false, 'error' => 'rate-limit'], 429);

$raw = file_get_contents('php://input', false, null, 0, MAX_BODY + 1);
if ($raw === false || strlen($raw) > MAX_BODY) reply(['ok' => false, 'error' => 'too-large'], 413);
$data = json_decode($raw, true);
if (!is_array($data)) reply(['ok' => false, 'error' => 'json'], 400);

// Скрытое поле-ловушка и слишком быстрая отправка: так ведут себя боты. Отвечаем «успехом».
if (!empty($data['website'])) reply(['ok' => true]);
if (!isset($data['elapsed']) || !is_numeric($data['elapsed']) || $data['elapsed'] < MIN_FILL_MS) reply(['ok' => true]);

$lead = [];
foreach (LIMITS as $key => $max) $lead[$key] = tidy($data[$key] ?? '', $max, $key === 'message');

if ($lead['name'] === '' || !filter_var($lead['email'], FILTER_VALIDATE_EMAIL)) reply(['ok' => false, 'error' => 'validation'], 400);
if (($data['consent'] ?? false) !== true) reply(['ok' => false, 'error' => 'consent'], 400);

$text = implode("\n", [
    'Новая заявка с baikalresearch.ru',
    '',
    'Имя: ' . $lead['name'],
    'Компания: ' . ($lead['company'] ?: '–'),
    'Email: ' . $lead['email'],
    'Телефон: ' . ($lead['phone'] ?: '–'),
    'Услуга: ' . ($lead['service'] ?: '–'),
    '',
    $lead['message'] ?: '(без комментария)',
]);

$sent = false;

// 1. Telegram
if (!empty($cfg['telegram_token']) && !empty($cfg['telegram_chat_id'])) {
    $ch = curl_init('https://api.telegram.org/bot' . $cfg['telegram_token'] . '/sendMessage');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode(['chat_id' => $cfg['telegram_chat_id'], 'text' => $text, 'disable_web_page_preview' => true], JSON_UNESCAPED_UNICODE),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 4,
        CURLOPT_TIMEOUT => 8,
    ]);
    $resp = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    $sent = $resp !== false && $code === 200;
}

// 2. Письмо на почту (запасной канал, срабатывает всегда, если Telegram недоступен)
if (!empty($cfg['mail_to'])) {
    $subject = '=?UTF-8?B?' . base64_encode('Заявка с сайта: ' . $lead['name']) . '?=';
    $from = $cfg['mail_from'] ?? ('noreply@' . ($_SERVER['HTTP_HOST'] ?? 'baikalresearch.ru'));
    $headers = "From: $from\r\nReply-To: {$lead['email']}\r\nContent-Type: text/plain; charset=UTF-8\r\n";
    $mailOk = @mail($cfg['mail_to'], $subject, $text, $headers);
    $sent = $sent || $mailOk;
}

if (!$sent) reply(['ok' => false, 'error' => 'delivery'], 502);

$hits[] = $now;
@file_put_contents($rateFile, json_encode($hits));
reply(['ok' => true]);
