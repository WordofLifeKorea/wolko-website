import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://wolko.org',
  redirects: {
    '/admin': '/admin/index.html',
  },
});
