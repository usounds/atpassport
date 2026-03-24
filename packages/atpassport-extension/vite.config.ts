import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import webExtension, { readJsonFile } from 'vite-plugin-web-extension';

function getManifest() {
  return readJsonFile('src/manifest.json');
}

export default defineConfig({
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
});
