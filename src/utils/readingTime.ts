// Время чтения статьи. Для делового текста на русском с таблицами и списками берем
// 130 слов в минуту (внимательное чтение, а не беглый просмотр). Разметку markdown
// и адреса ссылок в подсчет не включаем.
const WORDS_PER_MINUTE = 130;

export function readingMinutes(body: string): number {
  const words = body
    .replace(/\(\/[^)]*\)/g, ' ')
    .replace(/[|#*>\-\[\]()]/g, ' ')
    .split(/\s+/)
    .filter((w) => /[A-Za-zА-Яа-яЕе0-9]/.test(w)).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}
