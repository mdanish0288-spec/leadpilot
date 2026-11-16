// GET /d/<slug> — serves a published demo website (stored in Supabase Storage, bucket "demos").
// Sandboxed: the page gets its own opaque origin and may not run scripts, so it can never touch the dashboard.
import { SUPABASE_URL } from '../../server/env';

const CSP = [
  "default-src 'none'", "img-src https://images.unsplash.com data:", "style-src 'unsafe-inline' https://fonts.googleapis.com",
  'font-src https://fonts.gstatic.com', 'frame-src https://www.google.com', "script-src 'none'", "base-uri 'none'", "form-action 'none'",
  'sandbox allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation',
].join('; ');

export const onRequestGet: PagesFunction = async ({ params }) => {
  const slug = String(params.slug ?? '');
  if (!/^[a-z0-9-]{3,80}$/.test(slug)) return new Response('Not found', { status: 404 });
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/public/demos/${slug}.html`, { cf: { cacheTtl: 60 } } as RequestInit);
  if (!r.ok) return new Response('This demo is not available.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  return new Response(await r.text(), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': CSP, 'X-Robots-Tag': 'noindex, nofollow',
      'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Cache-Control': 'public, max-age=60',
      'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
    },
  });
};
