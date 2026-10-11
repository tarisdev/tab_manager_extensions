import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// All sources live in src/ and each extension page sits next to the React entry
// it loads (src/popup/popup.html, src/dashboard/dashboard.html), so Vite's root
// is src/ while the output paths stay exactly what public/manifest.json expects.
const projectRoot = import.meta.dirname;
const srcDir = `${projectRoot}/src`;

export default defineConfig({
  root: srcDir,
  publicDir: `${projectRoot}/public`,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': srcDir
    }
  },
  build: {
    outDir: `${projectRoot}/dist`,
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: {
        popup: `${srcDir}/popup/popup.html`,
        dashboard: `${srcDir}/dashboard/dashboard.html`,
        background: `${srcDir}/background/background.js`
      },
      output: {
        // The manifest cannot reference a hashed file, so the service worker
        // keeps a deterministic name; page assets stay hashed for caching.
        entryFileNames: (chunk) =>
          chunk.name === 'background'
            ? 'background/background.js'
            : 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  }
});