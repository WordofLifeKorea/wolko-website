import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://wolko.org',
  redirects: {
    '/camp-progress': '/campstaff',
    '/camp-progress/': '/campstaff/',
  },
});
