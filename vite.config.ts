import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const imageProxyPlugin = () => ({
  name: 'manga-image-proxy',
  configureServer(server: any) {
    server.middlewares.use('/api/image', async (req: any, res: any, next: any) => {
      try {
        const requestUrl = new URL(req.url || '', 'http://localhost');
        const target = requestUrl.searchParams.get('url');

        if (!target) {
          res.statusCode = 400;
          res.end('Missing url');
          return;
        }

        const upstreamUrl = new URL(target);
        const isAllowedHost = (hostname: string) =>
          hostname === 'cdn.readdetectiveconan.com'
          || hostname === 'mangaread.org'
          || hostname === 'www.mangaread.org';

        if (!isAllowedHost(upstreamUrl.hostname)) {
          res.statusCode = 400;
          res.end('Invalid host');
          return;
        }

        const referer = upstreamUrl.hostname === 'cdn.readdetectiveconan.com'
          ? 'https://mangapill.com/'
          : 'https://asuracomic.net/';

        const upstream = await fetch(upstreamUrl.toString(), {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
            'Referer': referer,
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        });

        if (!upstream.ok) {
          res.statusCode = upstream.status;
          res.end(`Upstream image error: ${upstream.status}`);
          return;
        }

        res.statusCode = 200;
        res.setHeader('Content-Type', upstream.headers.get('content-type') || 'image/jpeg');
        res.setHeader('Cache-Control', upstream.headers.get('cache-control') || 'public, max-age=86400');
        res.end(Buffer.from(await upstream.arrayBuffer()));
      } catch (error) {
        next(error);
      }
    });
  },
});

export default defineConfig({
  plugins: [react(), imageProxyPlugin()],
  server: {
    proxy: {
      // Proxy for your manga scrapers
      '/manga-scrapers': {
        target: 'https://manga-scrapers-xi.vercel.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/manga-scrapers/, ''),
      },
      // Proxy for the Miruo API (This handles the CORS bypass for Anime/Streaming)
      '/api': {
        target: 'https://miruoapi.vercel.app',
        changeOrigin: true,
        secure: false, // Helps if there are SSL issues with Vercel
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Adds useful headers to mimic a browser request
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
          });
        },
      },
    },
  },
})