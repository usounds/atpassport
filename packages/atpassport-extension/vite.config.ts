import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import webExtension, { readJsonFile } from 'vite-plugin-web-extension';
import path from 'path';

function getManifest() {
  return readJsonFile('src/manifest.json');
}

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    react(),
    webExtension({
      manifest: () => {
        const manifest = getManifest();
        if (process.env.BROWSER === 'firefox') {
          delete manifest.background.service_worker;
        } else {
          delete manifest.background.scripts;
        }
        return manifest;
      },
      browser: process.env.BROWSER || 'chrome',
    }),
  ],
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
});
