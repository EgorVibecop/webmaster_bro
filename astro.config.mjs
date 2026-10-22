import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { execSync } from 'node:child_process';

// Дата последнего изменения содержимого страницы: берем из git по файлам, из которых страница собрана.
// Общие правки шапки и стилей сюда не входят, иначе все страницы «обновлялись» бы при каждой выкладке.
function lastCommit(files) {
  try {
    const args = files.map((f) => `"${f}"`).join(' ');
    return execSync(`git log -1 --format=%cI -- ${args}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || undefined;
  } catch {
    return undefined;
  }
}

function sourcesFor(pathname) {
  const p = pathname.replace(/\/+$/, '');
  if (p === '') return ['src/pages/index.astro'];
  if (p === '/blog') return ['src/pages/blog/index.astro', 'src/content/blog'];
  if (p.startsWith('/blog/')) return [`src/content/blog/${p.slice('/blog/'.length)}.md`];
  if (p === '/uslugi') return ['src/pages/uslugi/index.astro', 'src/data/services.js'];
  if (p.startsWith('/uslugi/')) return ['src/data/services.js', 'src/pages/uslugi/[slug].astro'];
  if (p === '/instrumenty/kalkulyator-vyborki') return ['src/pages/instrumenty/kalkulyator-vyborki.astro', 'public/js/planner.js', 'public/js/calc.js'];
  if (p === '/glossariy') return ['src/pages/glossariy.astro', 'src/data/glossary.js'];
  return [`src/pages${p}.astro`];
}

export default defineConfig({
  site: 'https://baikalresearch.ru',
  trailingSlash: 'ignore',
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/privacy'),
      serialize(item) {
        const lastmod = lastCommit(sourcesFor(new URL(item.url).pathname));
        if (lastmod) item.lastmod = lastmod;
        return item;
      },
    }),
  ],
});
