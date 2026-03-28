import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'firebase-messaging-sw.ts',
      registerType: 'autoUpdate',
      manifest: false,
      injectManifest: {
        injectionPoint: 'self.__WB_MANIFEST',
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  build: {
    sourcemap: false,
  },
  server: {
    port: 5173,
    open: true,
  },
});
