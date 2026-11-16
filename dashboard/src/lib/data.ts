// Data access for the dashboard. All reads/writes go through Supabase and are protected by
// Row Level Security (owner + 2FA). In local preview mode (dev only) it uses sample defaults.
import { supabase } from './supabase';
import type { PriceTier, Settings } from './types';

export const PREVIEW = import.meta.env.DEV && new URLSearchParams(location.search).has('preview');

const DEFAULT_SETTINGS: Settings = {
  owner_name: '', business_name: '', business_email: '', whatsapp_number: '', instagram_handle: '', logo_path: null,
  services_included: 'Custom website design, mobile-friendly build, domain for the first year, setup and launch.',
  launch_offer_percent: 10, launch_offer_deals_per_city: 10, delivery_days: 7, advance_percent: 50,
  free_change_rounds: 1, paid_change_rounds: 2, meeting_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
  meeting_start: '10:00', meeting_end: '19:00', timezone: 'Asia/Kolkata', upi_id: '', upi_qr_path: null,
  paypal_link: '', paypal_qr_path: null, usdt_address: '', usdt_network: 'TRC20', daily_email_limit: 25,
  auto_reply: false, domain_alert_usd: 20,
};
const DEFAULT_TIERS: PriceTier[] = [
  { region: 'IN', tier: 'standard', currency: 'INR', start_price: 5500, lowest_price: 5000 },
  { region: 'IN', tier: 'premium', currency: 'INR', start_price: 9000, lowest_price: 8000 },
  { region: 'IN', tier: 'luxury', currency: 'INR', start_price: 15000, lowest_price: 13000 },
  { region: 'INTL', tier: 'standard', currency: 'USD', start_price: 350, lowest_price: 300 },
  { region: 'INTL', tier: 'premium', currency: 'USD', start_price: 600, lowest_price: 500 },
  { region: 'INTL', tier: 'luxury', currency: 'USD', start_price: 1000, lowest_price: 850 },
];
let previewSettings = structuredClone(DEFAULT_SETTINGS);
let previewTiers = structuredClone(DEFAULT_TIERS);

const SETTINGS_COLUMNS = Object.keys(DEFAULT_SETTINGS).join(',');

export async function loadSettings(): Promise<Settings> {
  if (PREVIEW) return structuredClone(previewSettings);
  const { data, error } = await supabase.from('settings').select(SETTINGS_COLUMNS).eq('id', 1).single();
  if (error) throw new Error(`Could not load settings: ${error.message}`);
  const s = data as unknown as Settings;
  return { ...s, meeting_start: s.meeting_start.slice(0, 5), meeting_end: s.meeting_end.slice(0, 5), launch_offer_percent: Number(s.launch_offer_percent), domain_alert_usd: Number(s.domain_alert_usd) };
}

export async function saveSettings(s: Settings): Promise<void> {
  if (PREVIEW) { previewSettings = structuredClone(s); return; }
  const { error } = await supabase.from('settings').update({ ...s, instagram_handle: s.instagram_handle.replace(/^@/, '') }).eq('id', 1);
  if (error) throw new Error(`Could not save settings: ${error.message}`);
}

export async function loadTiers(): Promise<PriceTier[]> {
  if (PREVIEW) return structuredClone(previewTiers);
  const { data, error } = await supabase.from('price_tiers').select('region,tier,currency,start_price,lowest_price').order('region').order('tier');
  if (error) throw new Error(`Could not load prices: ${error.message}`);
  return (data ?? []).map((t) => ({ ...t, start_price: Number(t.start_price), lowest_price: Number(t.lowest_price) })) as PriceTier[];
}

export async function saveTiers(tiers: PriceTier[]): Promise<void> {
  if (PREVIEW) { previewTiers = structuredClone(tiers); return; }
  const { error } = await supabase.from('price_tiers').upsert(tiers, { onConflict: 'region,tier' });
  if (error) throw new Error(`Could not save prices: ${error.message}`);
}

/** Upload an image (logo / QR) to the private bucket; returns its storage path. */
export async function uploadOwnerFile(kind: 'logo' | 'upi-qr' | 'paypal-qr', file: File): Promise<string> {
  if (file.size > 2 * 1024 * 1024) throw new Error('Image must be under 2 MB.');
  if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) throw new Error('Use a PNG, JPG, WebP or SVG image.');
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
  const path = `${kind}-${Date.now()}.${ext}`;
  if (PREVIEW) return path;
  const { error } = await supabase.storage.from('owner-files').upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return path;
}

export async function signedFileUrl(path: string | null): Promise<string | null> {
  if (!path || PREVIEW) return null;
  const { data } = await supabase.storage.from('owner-files').createSignedUrl(path, 600);
  return data?.signedUrl ?? null;
}

// ---------------- Leads (Phase 2) ----------------
export interface Lead {
  id: string; created_at: string; name: string; business_type: string; full_address: string | null; neighbourhood: string | null;
  city: string | null; country: string | null; country_code: string | null; phone: string | null; phone_intl: string | null;
  email: string | null; instagram: string | null; rating: number | null; review_count: number | null; price_level: string | null;
  opening_hours: { weekdayDescriptions?: string[] } | null; maps_url: string | null; website: string | null;
  website_status: 'none' | 'social_only' | 'pending' | 'broken' | 'weak' | 'good'; website_issues: string[];
  lead_type: 'hot' | 'warm' | 'skip' | 'pending'; score: number | null;
  score_reasons: { label: string; points: number; max: number; detail: string }[];
  pricing_tier: 'standard' | 'premium' | 'luxury' | null; stage: string; photo_count: number;
  top_reviews: { rating: number | null; text: string; author: string | null; when: string | null }[];
  sheet_row: number | null; notes: string | null; data_source: 'google' | 'openstreetmap'; needs_verification: boolean;
}

const LEAD_COLUMNS = 'id,created_at,name,business_type,full_address,neighbourhood,city,country,country_code,phone,phone_intl,email,instagram,rating,review_count,price_level,opening_hours,maps_url,website,website_status,website_issues,lead_type,score,score_reasons,pricing_tier,stage,photo_count,top_reviews,sheet_row,notes,data_source,needs_verification';

export async function loadLeads(): Promise<Lead[]> {
  if (PREVIEW) return PREVIEW_LEADS;
  const { data, error } = await supabase.from('leads').select(LEAD_COLUMNS).order('created_at', { ascending: false }).limit(500);
  if (error) throw new Error(`Could not load leads: ${error.message}`);
  return (data ?? []) as unknown as Lead[];
}

export async function loadLead(id: string): Promise<Lead | null> {
  if (PREVIEW) return PREVIEW_LEADS.find((l) => l.id === id) ?? null;
  const { data, error } = await supabase.from('leads').select(LEAD_COLUMNS).eq('id', id).maybeSingle();
  if (error) throw new Error(`Could not load this lead: ${error.message}`);
  return data as unknown as Lead | null;
}

export async function homeStats(): Promise<{ leads: number; hot: number; warm: number; pending: number }> {
  if (PREVIEW) return { leads: 17, hot: 9, warm: 5, pending: 0 };
  const count = async (filter?: [string, string]) => {
    let q = supabase.from('leads').select('id', { count: 'exact', head: true });
    if (filter) q = q.eq(filter[0], filter[1]);
    const { count: n } = await q;
    return n ?? 0;
  };
  const [leads, hot, warm, pending] = await Promise.all([count(), count(['lead_type', 'hot']), count(['lead_type', 'warm']), count(['website_status', 'pending'])]);
  return { leads, hot, warm, pending };
}

export async function saveSheetLink(sheetId: string): Promise<void> {
  if (PREVIEW) { previewSettings = { ...previewSettings }; return; }
  const { error } = await supabase.from('settings').update({ google_sheet_id: sheetId }).eq('id', 1);
  if (error) throw new Error(`Could not save the sheet link: ${error.message}`);
}

export async function loadSheetLink(): Promise<string> {
  if (PREVIEW) return '';
  const { data } = await supabase.from('settings').select('google_sheet_id').eq('id', 1).single();
  return (data as { google_sheet_id: string } | null)?.google_sheet_id ?? '';
}

/** Accepts a full Google Sheets link or a bare ID. Returns the ID, or null if it doesn't look right. */
export function sheetIdFromInput(input: string): string | null {
  const m = /\/spreadsheets\/d\/([A-Za-z0-9_-]{20,100})/.exec(input) ?? /^([A-Za-z0-9_-]{20,100})$/.exec(input.trim());
  return m ? m[1] : null;
}

const sampleReasons = (s: number) => [
  { label: 'Google rating', points: 21, max: 25, detail: '4.6 stars' }, { label: 'Number of reviews', points: 20, max: 25, detail: '312 reviews' },
  { label: 'Google price level', points: 10, max: 20, detail: 'Moderate ($$)' }, { label: 'Photos on Google', points: 10, max: 10, detail: '10 photos (quality checked in deep analysis)' },
  { label: 'Premium area', points: 0, max: 10, detail: 'Not analysed yet (deep analysis)' }, { label: 'Multiple branches', points: s > 60 ? 10 : 0, max: 10, detail: s > 60 ? '2 locations found' : 'Single location' },
];
const PREVIEW_LEADS: Lead[] = [
  { id: 'p1', created_at: '2026-11-16T09:00:00Z', name: 'Sample: Komorebi Coffee', business_type: 'cafes', full_address: '1-2-3 Jingumae, Shibuya City, Tokyo', neighbourhood: 'Jingumae', city: 'Tokyo', country: 'Japan', country_code: 'JP', phone: '03-0000-0000', phone_intl: null, email: null, instagram: 'https://www.instagram.com/sample', rating: 4.6, review_count: 312, price_level: 'MODERATE', opening_hours: { weekdayDescriptions: ['Monday: 8:00 AM – 6:00 PM', 'Tuesday: 8:00 AM – 6:00 PM'] }, maps_url: 'https://maps.google.com', website: 'https://www.instagram.com/sample', website_status: 'social_only', website_issues: [], lead_type: 'hot', score: 71, score_reasons: sampleReasons(71), pricing_tier: 'luxury', stage: 'New', photo_count: 10, top_reviews: [{ rating: 5, text: 'Beautiful pour-over and the matcha latte is perfect.', author: 'Sample reviewer', when: '2 weeks ago' }], sheet_row: 2, notes: null, data_source: 'google', needs_verification: false },
  { id: 'p2', created_at: '2026-11-16T09:00:00Z', name: 'Sample: Sakura Bakery Cafe', business_type: 'cafes', full_address: '4-5 Nakameguro, Meguro City, Tokyo', neighbourhood: 'Nakameguro', city: 'Tokyo', country: 'Japan', country_code: 'JP', phone: '03-1111-1111', phone_intl: null, email: 'hello@example.jp', instagram: null, rating: 4.3, review_count: 95, price_level: null, opening_hours: null, maps_url: 'https://maps.google.com', website: 'http://sakura-sample.jp', website_status: 'weak', website_issues: ['No HTTPS (shows "Not secure" in browsers)', 'Not built for phones (no mobile viewport)', 'Copyright year 2017 — looks unmaintained'], lead_type: 'warm', score: 52, score_reasons: sampleReasons(52), pricing_tier: 'premium', stage: 'New', photo_count: 6, top_reviews: [], sheet_row: 3, notes: null, data_source: 'google', needs_verification: false },
  { id: 'p3', created_at: '2026-11-16T09:00:00Z', name: 'Sample: Modern Roasters', business_type: 'cafes', full_address: 'Shinjuku City, Tokyo', neighbourhood: null, city: 'Tokyo', country: 'Japan', country_code: 'JP', phone: null, phone_intl: null, email: null, instagram: null, rating: 4.1, review_count: 40, price_level: 'MODERATE', opening_hours: null, maps_url: null, website: 'https://modern-sample.jp', website_status: 'good', website_issues: [], lead_type: 'skip', score: 38, score_reasons: sampleReasons(38), pricing_tier: 'standard', stage: 'New', photo_count: 3, top_reviews: [], sheet_row: 4, notes: null, data_source: 'openstreetmap', needs_verification: true },
];

/** How many paid calls were made since the 1st of this month (for the Hosting page). */
export async function usageThisMonth(): Promise<Record<'command' | 'search' | 'transcribe' | 'website_check', number>> {
  const empty = { command: 0, search: 0, transcribe: 0, website_check: 0 };
  if (PREVIEW) return { command: 14, search: 6, transcribe: 3, website_check: 41 };
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const kinds = Object.keys(empty) as (keyof typeof empty)[];
  const counts = await Promise.all(kinds.map(async (k) => {
    const { count } = await supabase.from('api_usage').select('id', { count: 'exact', head: true }).eq('kind', k).gte('at', start.toISOString());
    return count ?? 0;
  }));
  return Object.fromEntries(kinds.map((k, i) => [k, counts[i]])) as typeof empty;
}
