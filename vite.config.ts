import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';

// Skriver sw.js med listen over alt appen består af, så den kan bruges
// uden net. Navnet på cachen følger indholdet, så en ny version rydder
// den gamle. KaTeX' .ttf og .woff springes over; woff2 er nok.
function serviceWorker(): Plugin {
  return {
    name: 'matematik-service-worker',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const built = Object.keys(bundle).filter((f) => !/\.(ttf|woff|map)$/.test(f));
      const extra = readdirSync('public').filter((f) => f !== 'sw.js');
      const files = [...new Set(['./', ...built, ...extra].map((f) => (f === './' ? f : `./${f}`)))].sort();
      const version = createHash('sha256').update(files.join('|')).digest('hex').slice(0, 12);
      const source = readFileSync('scripts/sw-template.js', 'utf8')
        .replace('__VERSION__', version)
        .replace('__FILES__', JSON.stringify(files, null, 2));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig({
  plugins: [react(), serviceWorker()],
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
