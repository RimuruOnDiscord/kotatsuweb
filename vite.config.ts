import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { imageProxyPlugin } from './src/lib/vite-plugins/image-proxy';
import { hlsProxyPlugin } from './src/lib/vite-plugins/hls-proxy';

export default defineConfig({
  plugins: [react(), imageProxyPlugin(), hlsProxyPlugin()],
  server: {
    proxy: {
      '/manga-scrapers': {
        target: 'https://manga-scrapers-xi.vercel.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/manga-scrapers/, ''),
      },
      '/api': {
        target: 'https://miruoapi.vercel.app',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy) => {
          proxy.on('error', (err) => console.error('proxy error', err));
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader(
              'User-Agent',
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            );
          });
        },
      },
    },
  },
});
