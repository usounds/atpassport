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
      manifest: getManifest,
      browser: process.env.BROWSER || 'chrome',
    }),
  ],
});
