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
