import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // KaTeX og React ændrer sig næsten aldrig, mens pensum og
        // brugerfladen gør. Ved at holde dem adskilt beholder eleven en
        // cachet kopi af det tunge, når appen opdateres.
        manualChunks: {
          katex: ['katex'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
