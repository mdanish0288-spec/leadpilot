// Pure validation rules for Settings. The database enforces the same hard limits;
// these give clear messages before saving. Covered by validate.test.ts.
import type { PriceTier, Settings } from './types';

export type Errors = Record<string, string>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const E164 = /^\+[1-9]\d{7,14}$/;
const UPI = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/;
const INSTAGRAM = /^[a-zA-Z0-9._]{1,30}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

export const HARD_MAX_DAILY_EMAILS = 25;

const intIn = (v: number, min: number, max: number) => Number.isInteger(v) && v >= min && v <= max;

/** Price tier rules: both prices positive, lowest never above start. */
export function validatePriceTier(t: Pick<PriceTier, 'start_price' | 'lowest_price' | 'currency'>): string | null {
  if (!/^[A-Z]{3}$/.test(t.currency)) return 'Currency must be a 3-letter code like INR or USD.';
  if (!(t.start_price > 0) || !(t.lowest_price > 0)) return 'Prices must be more than zero.';
  if (t.lowest_price > t.start_price) return 'Lowest price cannot be higher than the starting price.';
  return null;
}

/**
 * The launch-offer price is start × (1 − discount). If that lands below the tier's lowest price,
 * the hard floor wins, so the advertised discount would not be true. Returns every tier that clashes.
 */
export function launchOfferClashes(tiers: PriceTier[], percent: number) {
  return tiers
    .map((t) => ({ ...t, offerPrice: roundMoney(t.start_price * (1 - percent / 100)) }))
    .filter((t) => t.offerPrice < t.lowest_price);
}

export function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

export function validateSettings(s: Settings): Errors {
  const e: Errors = {};
  if (s.business_email && !EMAIL.test(s.business_email)) e.business_email = 'Enter a valid email address.';
  if (s.whatsapp_number && !E164.test(s.whatsapp_number)) e.whatsapp_number = 'Use international format with country code, e.g. +919876543210.';
  const ig = s.instagram_handle.replace(/^@/, '');
  if (ig && !INSTAGRAM.test(ig)) e.instagram_handle = 'Only letters, numbers, dots and underscores (max 30).';

  if (!(s.launch_offer_percent >= 0 && s.launch_offer_percent <= 50)) e.launch_offer_percent = 'Between 0 and 50%.';
  if (!intIn(s.launch_offer_deals_per_city, 0, 100)) e.launch_offer_deals_per_city = 'Whole number between 0 and 100.';
  if (!intIn(s.delivery_days, 1, 90)) e.delivery_days = 'Whole number of days between 1 and 90.';
  if (!intIn(s.advance_percent, 10, 90)) e.advance_percent = 'Advance must be between 10% and 90%.';
  if (!intIn(s.free_change_rounds, 0, 10)) e.free_change_rounds = 'Whole number between 0 and 10.';
  if (!intIn(s.paid_change_rounds, 0, 10)) e.paid_change_rounds = 'Whole number between 0 and 10.';
  if (!intIn(s.daily_email_limit, 0, HARD_MAX_DAILY_EMAILS)) e.daily_email_limit = `Whole number between 0 and ${HARD_MAX_DAILY_EMAILS}.`;
  if (!(s.domain_alert_usd > 0)) e.domain_alert_usd = 'Must be more than zero.';

  if (!TIME.test(s.meeting_start)) e.meeting_start = 'Pick a start time.';
  if (!TIME.test(s.meeting_end)) e.meeting_end = 'Pick an end time.';
  if (!e.meeting_start && !e.meeting_end && s.meeting_end.slice(0, 5) <= s.meeting_start.slice(0, 5)) e.meeting_end = 'End time must be after start time.';
  if (s.meeting_days.length === 0) e.meeting_days = 'Pick at least one day.';
  if (!isValidTimeZone(s.timezone)) e.timezone = 'Unknown time zone.';

  if (s.upi_id && !UPI.test(s.upi_id)) e.upi_id = 'UPI IDs look like name@bank.';
  if (s.paypal_link && !/^https:\/\/(www\.)?paypal\.(me|com)\//i.test(s.paypal_link)) e.paypal_link = 'Must start with https://paypal.me/ or https://www.paypal.com/.';
  if (s.usdt_address && !isPlausibleUsdtAddress(s.usdt_address, s.usdt_network)) e.usdt_address = `This does not look like a ${s.usdt_network} address. Check it carefully — a wrong address loses money.`;
  return e;
}

/** Format check only (not a guarantee). Catches the most common mistake: an address from the wrong network. */
export function isPlausibleUsdtAddress(address: string, network: Settings['usdt_network']): boolean {
  const a = address.trim();
  switch (network) {
    case 'TRC20': return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(a);
    case 'ERC20':
    case 'BEP20':
    case 'Polygon': return /^0x[0-9a-fA-F]{40}$/.test(a);
    case 'Solana': return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a);
    case 'TON': return /^(EQ|UQ)[A-Za-z0-9_-]{46}$/.test(a);
    default: return false;
  }
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return tz.length > 0;
  } catch {
    return false;
  }
}

export function formatMoney(amount: number, currency: string): string {
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: amount % 1 === 0 ? 0 : 2 }).format(amount);
}
