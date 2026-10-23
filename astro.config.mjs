import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://wolko.org',
  redirects: {
    '/camp-progress': '/portal/campstaff',
    '/camp-progress/': '/portal/campstaff/',
  },
});
