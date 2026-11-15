// End-to-end test of /api/search and /api/check-websites with every outside service simulated.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { onRequestPost as search } from '../functions/api/search';
import { onRequestPost as checkWebsites } from '../functions/api/check-websites';
import { onRequestPost as command } from '../functions/api/command';

let serviceAccountJson = '';
beforeAll(async () => {
  const kp = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const der = new Uint8Array(await crypto.subtle.exportKey('pkcs8', kp.privateKey));
  const pem = `-----BEGIN PRIVATE KEY-----\n${btoa(String.fromCharCode(...der))}\n-----END PRIVATE KEY-----\n`;
  serviceAccountJson = JSON.stringify({ client_email: 'leadpilot@test.iam.gserviceaccount.com', private_key: pem });
});
afterEach(() => vi.unstubAllGlobals());

const places = [
  { id: 'A', displayName: { text: 'No Site Cafe' }, rating: 4.7, userRatingCount: 410, businessStatus: 'OPERATIONAL', addressComponents: [{ longText: 'Japan', shortText: 'JP', types: ['country'] }] },
  { id: 'B', displayName: { text: 'Old Site Cafe' }, websiteUri: 'http://oldsite.example.jp/', rating: 4.2, userRatingCount: 80, businessStatus: 'OPERATIONAL' },
  { id: 'C', displayName: { text: 'Insta Cafe' }, websiteUri: 'https://instagram.com/instacafe', businessStatus: 'OPERATIONAL' },
  { id: 'D', displayName: { text: 'Already Known Cafe' }, businessStatus: 'OPERATIONAL' },
];

function fakeServices(opts: { quota?: string; sheetLinked?: boolean } = {}) {
  const calls: string[] = [];
  const leads: Record<string, unknown>[] = [];
  const fake = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    calls.push(`${method} ${url.replace(/\?.*/, '')}`);
    const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
    if (url.includes('/rpc/use_quota')) return ok(opts.quota ?? 'ok');
    if (url.includes('/rpc/set_sheet_rows') || url.includes('/rpc/apply_website_checks')) return ok(1);
    if (url.includes('/rest/v1/searches') && method === 'POST') return ok([{ id: 's1', query: 'cafes in Tokyo, Japan', business_type: 'cafes', city: 'Tokyo', country: 'Japan', country_code: 'JP', results_found: 0, new_leads: 0, duplicates: 0, next_page_token: null }]);
    if (url.includes('/rest/v1/searches') && method === 'PATCH') return new Response(null, { status: 204 });
    if (url.includes('/rest/v1/leads') && method === 'POST') {
      const rows = JSON.parse(String(init!.body)) as Record<string, unknown>[];
      const fresh = rows.filter((r) => r.place_id !== 'D').map((r, i) => ({ ...r, id: `lead-${i}`, created_at: '2026-11-16T00:00:00Z', stage: 'New', advance_status: 'Not requested', final_payment_status: 'Not requested', launch_offer_used: false, delivery_links: {} }));
      leads.push(...fresh);
      return ok(fresh);
    }
    if (url.includes('/rest/v1/leads?website_status=eq.pending&order')) return ok(leads.filter((l) => l.website_status === 'pending').map((l) => ({ ...l, sheet_row: 3 })));
    if (url.includes('/rest/v1/leads?website_status=eq.pending&select=id')) return ok([]);
    if (url.includes('/rest/v1/settings')) return ok([{ google_sheet_id: opts.sheetLinked === false ? '' : '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789' }]);
    if (url.includes('places.googleapis.com')) return ok({ places });
    if (url.includes('oauth2.googleapis.com/token')) return ok({ access_token: 'goog-token' });
    if (url.includes('sheets.googleapis.com') && url.includes(':append')) return ok({ updates: { updatedRange: 'Sheet1!A2:AG4' } });
    if (url.includes('sheets.googleapis.com') && url.includes('batchUpdate')) return ok({});
    if (url.includes('sheets.googleapis.com')) return ok({ values: [['Date']] });
    if (url.startsWith('http://oldsite.example.jp')) return new Response('<html><body><font>Welcome</font> © 2015</body></html>', { status: 200, headers: { 'content-type': 'text/html' } });
    return new Response('not found', { status: 404 });
  });
  vi.stubGlobal('fetch', fake);
  return { calls, leads };
}

const env = () => ({ GOOGLE_PLACES_API_KEY: 'places-key', GOOGLE_SERVICE_ACCOUNT_JSON: serviceAccountJson });
const req = (path: string, body: unknown, auth = 'Bearer owner-token') =>
  new Request(`https://leadpilot-app.pages.dev${path}`, { method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const run = (fn: typeof search, request: Request, e: Record<string, string> = env()) => fn({ request, env: e } as unknown as Parameters<typeof search>[0]);

describe('search flow', () => {
  it('finds, classifies, skips duplicates and fills the sheet', async () => {
    const s = fakeServices();
    const res = await run(search, req('/api/search', { command_text: 'Tokyo mein cafe dhundo', business_type: 'cafes', city: 'Tokyo', country: 'Japan', country_code: 'JP' }));
    const body = (await res.json()) as Record<string, unknown>;
    expect(res.status).toBe(200);
    expect(body.found).toBe(4);
    expect(body.new_leads).toBe(3);
    expect(body.duplicates).toBe(1);
    expect(body.hot).toBe(2); // no website + Instagram-only
    expect(body.checking).toBe(1); // has a real website
    expect(body.sheet).toEqual({ ok: true, rows: 3 });
    expect(s.calls.some((c) => c.includes(':append'))).toBe(true);
  });

  it('then checks the website and marks the old site Warm', async () => {
    const s = fakeServices();
    await run(search, req('/api/search', { business_type: 'cafes', city: 'Tokyo', country: 'Japan', country_code: 'JP' }));
    const res = await run(checkWebsites, req('/api/check-websites', {}));
    const body = (await res.json()) as { checked: number; results: { lead_type: string }[]; sheet: { ok: boolean } };
    expect(body.checked).toBe(1);
    expect(body.results[0].lead_type).toBe('warm');
    expect(body.sheet.ok).toBe(true);
    expect(s.calls.some((c) => c.includes('batchUpdate'))).toBe(true);
  });

  it('still saves leads when the sheet is not linked, and says so', async () => {
    fakeServices({ sheetLinked: false });
    const body = (await (await run(search, req('/api/search', { business_type: 'cafes', city: 'Tokyo', country: 'Japan', country_code: 'JP' }))).json()) as { new_leads: number; sheet: { ok: boolean; reason: string } };
    expect(body.new_leads).toBe(3);
    expect(body.sheet.ok).toBe(false);
    expect(body.sheet.reason).toMatch(/Settings/);
  });

  it('refuses without sign-in', async () => {
    fakeServices();
    const res = await run(search, req('/api/search', {}, ''));
    expect(res.status).toBe(401);
  });

  it('refuses anyone who is not the owner with 2FA, before calling Google', async () => {
    const s = fakeServices({ quota: 'not_owner' });
    const res = await run(search, req('/api/search', { business_type: 'cafes', city: 'Tokyo', country: 'Japan', country_code: 'JP' }));
    expect(res.status).toBe(403);
    expect(s.calls.some((c) => c.includes('places.googleapis.com'))).toBe(false);
  });

  it('refuses a search with a missing city', async () => {
    fakeServices();
    const res = await run(search, req('/api/search', { business_type: 'cafes', country: 'Japan', country_code: 'JP' }));
    expect(res.status).toBe(400);
  });

  it('says clearly when the Gemini key is not set up', async () => {
    fakeServices();
    const res = await run(command, req('/api/command', { text: 'find cafes in Tokyo' }), {});
    expect(res.status).toBe(503);
    expect(((await res.json()) as { error: string }).error).toMatch(/Gemini/);
  });
});
