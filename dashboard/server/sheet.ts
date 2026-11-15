// Google Sheet "LeadPilot Leads" — kept in sync by a Google service account (works 24/7, no browser needed).
import { HttpError, fetchRetryOnce } from './http';

export const SHEET_COLUMNS = [
  'Date', 'Business Name', 'Business Type', 'Full Address', 'City', 'Country', 'Phone', 'WhatsApp', 'Email', 'Instagram',
  'Rating', 'Review Count', 'Business Score', 'Pricing Tier', 'Lead Type', 'Store Colors', 'Delivery App Links', 'Demo Link',
  'Contacted By', 'Stage', 'Client Requirements', 'Meeting Time', 'Quoted Price', 'Agreed Price', 'Launch Offer Used', 'Currency',
  'Domain', 'Payment Method', 'Advance Status', 'Final Payment Status', 'Final Website Link', 'Domain Renewal Date', 'Notes',
] as const;
export const LAST_COLUMN = 'AG'; // 33 columns

const LEAD_TYPE_TEXT: Record<string, string> = { hot: 'Hot (no website)', warm: 'Warm (weak/old website)', skip: 'Skip (good website)', pending: 'Checking website…' };
const TIER_TEXT: Record<string, string> = { standard: 'Standard', premium: 'Premium', luxury: 'Luxury' };

export interface SheetLead {
  created_at: string; name: string; business_type: string; full_address: string | null; city: string | null; country: string | null;
  phone: string | null; whatsapp: string | null; email: string | null; instagram: string | null; rating: number | null; review_count: number | null;
  score: number | null; pricing_tier: string | null; lead_type: string; store_colors: string | null; delivery_links: Record<string, string> | null;
  demo_link: string | null; contacted_by: string | null; stage: string; client_requirements: string | null; meeting_time: string | null;
  quoted_price: number | null; agreed_price: number | null; launch_offer_used: boolean; currency: string | null; domain: string | null;
  payment_method: string | null; advance_status: string; final_payment_status: string; final_website_link: string | null;
  domain_renewal_date: string | null; notes: string | null;
}

const s = (v: unknown) => (v == null ? '' : String(v));

/** One sheet row, in the exact column order. Values are written as plain text (RAW), so nothing is run as a formula. */
export function leadToRow(l: SheetLead): string[] {
  return [
    l.created_at.slice(0, 10), l.name, l.business_type, s(l.full_address), s(l.city), s(l.country), s(l.phone), s(l.whatsapp), s(l.email), s(l.instagram),
    s(l.rating), s(l.review_count), s(l.score), l.pricing_tier ? TIER_TEXT[l.pricing_tier] ?? l.pricing_tier : '', LEAD_TYPE_TEXT[l.lead_type] ?? l.lead_type,
    s(l.store_colors), Object.entries(l.delivery_links ?? {}).map(([k, v]) => `${k}: ${v}`).join(' | '), s(l.demo_link), s(l.contacted_by), l.stage,
    s(l.client_requirements), s(l.meeting_time), s(l.quoted_price), s(l.agreed_price), l.launch_offer_used ? 'Yes' : 'No', s(l.currency), s(l.domain),
    s(l.payment_method), l.advance_status, l.final_payment_status, s(l.final_website_link), s(l.domain_renewal_date), s(l.notes),
  ];
}

/** "Sheet1!A5:AG7" → 5 */
export function firstRowOfRange(range: string): number | null {
  const m = /![A-Z]+(\d+)/.exec(range);
  return m ? Number(m[1]) : null;
}

// ---------- Google auth (service account → short-lived access token) ----------

const b64url = (data: ArrayBuffer | string) => {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export function parseServiceAccount(json: string | undefined): { client_email: string; private_key: string } | null {
  if (!json) return null;
  try {
    const k = JSON.parse(json);
    return typeof k.client_email === 'string' && typeof k.private_key === 'string' ? k : null;
  } catch {
    return null;
  }
}

export async function googleAccessToken(sa: { client_email: string; private_key: string }, fetcher: typeof fetch = fetch): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/spreadsheets', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${claims}`));
  const r = await fetchRetryOnce('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${header}.${claims}.${b64url(sig)}` }),
  }, fetcher);
  if (!r.ok) throw new HttpError(502, 'Google refused the sheet service account key.', 'sheet_auth');
  return ((await r.json()) as { access_token: string }).access_token;
}

const API = 'https://sheets.googleapis.com/v4/spreadsheets';

/** Appends rows (adding the header row first if the sheet is empty). Returns the sheet row number of each appended lead. */
export async function appendLeads(token: string, sheetId: string, rows: string[][], fetcher: typeof fetch = fetch): Promise<number[]> {
  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const head = await fetchRetryOnce(`${API}/${sheetId}/values/A1:${LAST_COLUMN}1`, { headers: auth }, fetcher);
  if (head.status === 403 || head.status === 404) throw new HttpError(502, 'LeadPilot cannot open the Google Sheet. Share it with the service account email (Editor).', 'sheet_access');
  if (!head.ok) throw new HttpError(502, 'Could not read the Google Sheet.', 'sheet_error');
  const hasHeader = (((await head.json()) as { values?: string[][] }).values?.[0]?.[0] ?? '') !== '';
  const values = hasHeader ? rows : [[...SHEET_COLUMNS], ...rows];
  const r = await fetchRetryOnce(`${API}/${sheetId}/values/A1:${LAST_COLUMN}1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    method: 'POST', headers: auth, body: JSON.stringify({ values }),
  }, fetcher);
  if (!r.ok) throw new HttpError(502, 'Could not add rows to the Google Sheet.', 'sheet_error');
  const first = firstRowOfRange(((await r.json()) as { updates?: { updatedRange?: string } }).updates?.updatedRange ?? '');
  if (first == null) return [];
  const start = hasHeader ? first : first + 1;
  return rows.map((_, i) => start + i);
}

/** Rewrites existing rows in place (e.g. after the website check changes the lead type). */
export async function updateRows(token: string, sheetId: string, updates: { row: number; values: string[] }[], fetcher: typeof fetch = fetch) {
  if (!updates.length) return;
  const r = await fetchRetryOnce(`${API}/${sheetId}/values:batchUpdate`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ valueInputOption: 'RAW', data: updates.map((u) => ({ range: `A${u.row}:${LAST_COLUMN}${u.row}`, values: [u.values] })) }),
  }, fetcher);
  if (!r.ok) throw new HttpError(502, 'Could not update the Google Sheet.', 'sheet_error');
}
