import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // Ensures relative assets work on GitHub Pages, Cloudflare Pages, Vercel, Netlify
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});
