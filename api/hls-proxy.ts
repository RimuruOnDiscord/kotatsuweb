export const config = {
  runtime: 'edge', // Use Cloudflare Edge network instead of Vercel AWS Node datacenter to bypass IP blocks
};

export default async function handler(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('url');
    const referer = searchParams.get('referer') || 'https://kwik.cx/';

    if (!targetUrl) {
      return new Response('Missing url parameter', { status: 400 });
    }

    const upstreamHeaders = new Headers();
    upstreamHeaders.set('User-Agent', request.headers.get('user-agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36');
    upstreamHeaders.set('Accept', '*/*');
    upstreamHeaders.set('Accept-Language', 'en-US,en;q=0.9');
    upstreamHeaders.set('Origin', new URL(referer).origin);
    upstreamHeaders.set('Referer', referer);
    upstreamHeaders.set('X-Forwarded-For', request.headers.get('x-forwarded-for') || '8.8.8.8');
    upstreamHeaders.set('Sec-Fetch-Dest', 'empty');
    upstreamHeaders.set('Sec-Fetch-Mode', 'cors');
    upstreamHeaders.set('Sec-Fetch-Site', 'cross-site');

    if (request.headers.has('range')) {
      upstreamHeaders.set('Range', request.headers.get('range')!);
    }

    const upstream = await fetch(targetUrl, { headers: upstreamHeaders });

    if (!upstream.ok && upstream.status !== 206) {
      return new Response(`Stream error: ${upstream.status}`, { status: upstream.status });
    }

    const contentType = upstream.headers.get('content-type') || '';
    const isManifest = targetUrl.includes('.m3u8') ||
      contentType.includes('mpegurl') ||
      contentType.includes('x-mpegURL');

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method === 'HEAD') {
      const isM3u8 = targetUrl.includes('.m3u8');
      const headHeaders: Record<string, string> = {
        ...corsHeaders,
        'Content-Type': isM3u8 ? 'application/vnd.apple.mpegurl' : 'video/mp2t',
        'Accept-Ranges': 'bytes',
      };
      if (upstream.headers.has('content-length')) {
        headHeaders['Content-Length'] = upstream.headers.get('content-length')!;
      }
      return new Response(null, { status: 200, headers: headHeaders });
    }

    if (isManifest) {
      const text = await upstream.text();
      const encodedReferer = encodeURIComponent(referer);

      const rewritten = text
        .split('\n')
        .map(line => {
          const trimmed = line.trim();

          const tagLine = line.replace(/URI="([^"]+)"/g, (_, uri) => {
            const absolute = new URL(uri, targetUrl).toString();
            if (absolute.includes('.m3u8')) {
              return `URI="/api/hls-proxy?url=${encodeURIComponent(absolute)}&referer=${encodedReferer}"`;
            }
            return `URI="${absolute}"`;
          });
          if (tagLine !== line) return tagLine;

          if (!trimmed || trimmed.startsWith('#')) return line;

          const absolute = new URL(trimmed, targetUrl).toString();
          if (absolute.includes('.m3u8')) {
            return `/api/hls-proxy?url=${encodeURIComponent(absolute)}&referer=${encodedReferer}`;
          }
          return absolute;
        })
        .join('\n');

      return new Response(rewritten, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Cache-Control': 'no-cache',
        },
      });
    } else {
      const responseHeaders: Record<string, string> = {
        ...corsHeaders,
        'Content-Type': contentType || 'video/mp2t',
        'Cache-Control': 'public, max-age=3600',
        'Accept-Ranges': 'bytes',
      };
      
      if (upstream.headers.has('content-range')) {
        responseHeaders['Content-Range'] = upstream.headers.get('content-range')!;
      }
      if (upstream.headers.has('content-length')) {
        responseHeaders['Content-Length'] = upstream.headers.get('content-length')!;
      }

      // Edge runtime stream the body directly using native Web streams
      return new Response(upstream.body, {
        status: upstream.status,
        headers: responseHeaders,
      });
    }
  } catch (error: any) {
    return new Response(error.message || 'Internal Server Error', { status: 500 });
  }
}
