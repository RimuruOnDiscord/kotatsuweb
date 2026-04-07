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
        const allowedHosts = new Set(['cdn.readdetectiveconan.com']);

        if (!allowedHosts.has(upstreamUrl.hostname)) {
          res.statusCode = 400;
          res.end('Invalid host');
          return;
        }

        const upstream = await fetch(upstreamUrl.toString(), {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
            'Referer': 'https://mangapill.com/',
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
      '/manga-scrapers': {
        target: 'https://manga-scrapers.onrender.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/manga-scrapers/, ''),
      },
    },
  },
})
