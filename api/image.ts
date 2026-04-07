export default async function handler(req: any, res: any) {
  try {
    const url = req.query?.url;

    if (!url || typeof url !== 'string') {
      res.status(400).send('Missing url');
      return;
    }

    const upstreamUrl = new URL(url);
    const allowedHosts = new Set(['cdn.readdetectiveconan.com']);

    if (!allowedHosts.has(upstreamUrl.hostname)) {
      res.status(400).send('Invalid host');
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
      res.status(upstream.status).send(`Upstream image error: ${upstream.status}`);
      return;
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    const cacheControl = upstream.headers.get('cache-control') || 'public, max-age=86400';
    const body = Buffer.from(await upstream.arrayBuffer());

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', cacheControl);
    res.status(200).send(body);
  } catch (error) {
    console.error('Image proxy error:', error);
    res.status(500).send('Image proxy failed');
  }
}
