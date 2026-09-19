import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://baikalresearch.ru',
  trailingSlash: 'ignore',
  integrations: [sitemap({ filter: (page) => !page.includes('/privacy') })],
});
