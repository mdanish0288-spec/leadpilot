import { defineConfig } from 'astro/config';

// Static output only — client sites never have a server.
export default defineConfig({
  output: 'static',
  build: { format: 'directory' },
  compressHTML: true,
});
