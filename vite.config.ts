import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
      manifest: {
        name: '수박 게임',
        short_name: '수박 게임',
        description: '과일을 합쳐 수박을 만드는 게임',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        start_url: '.',
        display: 'standalone',
        icons: [
          {
            src: 'fruits/10_watermelon.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'fruits/10_watermelon.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
});
