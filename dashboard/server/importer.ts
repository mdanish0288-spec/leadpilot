// Import leads from the owner's own Google Sheet or CSV file. Pure functions — covered by importer.test.ts.
// Runs in the browser (reading + preview) and on the server (checking + saving). Nothing is invented:
// empty cells stay empty, and a lead without a phone, email or Instagram is skipped (you can't contact it).
import { branchKey, computeScore, tierFromScore } from './score';
import { classifyListingWebsite, leadTypeFor, normaliseInstagram } from './website';

/** RFC-4180 style CSV reader: quotes, commas and line breaks inside quotes, and a leading BOM. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const t = text.replace(/^﻿/, '');
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (quoted) {
      if (ch === '"' && t[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',' || ch === '\t') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && t[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

export type Field = 'name' | 'type' | 'address' | 'city' | 'country' | 'phone' | 'whatsapp' | 'email' | 'website' | 'instagram' | 'rating' | 'reviews' | 'maps' | 'notes';
export const FIELD_LABEL: Record<Field, string> = {
  name: 'Business name', type: 'Business type', address: 'Address', city: 'City', country: 'Country', phone: 'Phone', whatsapp: 'WhatsApp',
  email: 'Email', website: 'Website', instagram: 'Instagram', rating: 'Rating', reviews: 'Review count', maps: 'Google Maps link', notes: 'Notes',
};

// Header words → field. Checked in order, so more specific patterns come first.
const HEADER_RULES: [Field, RegExp][] = [
  ['maps', /map|google.*link|location link|gmb|listing/],
  ['reviews', /review|ratings? count|no\.? of rating|total rating|votes/],
  ['rating', /rating|stars?|score/],
  ['whatsapp', /whats ?app|wa\b/],
  ['phone', /phone|mobile|contact (no|number)|\bcell\b|\btel\b|number/],
  ['email', /e[- ]?mail/],
  ['instagram', /insta|\big\b/],
  ['website', /web|site|url|domain/],
  ['type', /type|category|categories|industry|niche|business kind/],
  ['city', /city|town|area|locality/],
  ['country', /country/],
  ['address', /address|street|location/],
  ['notes', /note|comment|remark/],
  ['name', /name|business|shop|company|store|title/],
];

// A column titled exactly like a field always wins (e.g. "Website" beats "Review URL").
const EXACT: Partial<Record<Field, string[]>> = {
  name: ['name', 'business name', 'business', 'shop name', 'company', 'title'],
  website: ['website', 'web site', 'website url', 'site', 'homepage', 'url'],
  phone: ['phone', 'phone number', 'mobile', 'contact', 'contact number'],
  address: ['address', 'full address', 'fulladdress', 'location'],
  rating: ['rating', 'average rating', 'stars'],
  reviews: ['reviews', 'review count', 'reviews count', 'total reviews'],
  maps: ['google maps url', 'google maps link', 'maps link', 'map link', 'maps url'],
  email: ['email', 'e mail', 'email address'],
  instagram: ['instagram'],
  city: ['city', 'municipality'],
  type: ['category', 'categories', 'type', 'business type'],
};
// Columns that only LOOK like a field: review links, images, ids, social pages.
const NOT_A_FIELD = /review url|reviews? link|image|photo|thumbnail|\bcid\b|place id|kgmid|plus code|knowledge|latitude|longitude|claimed|facebook|twitter|yelp|social/;

export function detectColumns(header: string[]): Partial<Record<Field, number>> {
  const map: Partial<Record<Field, number>> = {};
  const keys = header.map((h) => h.toLowerCase().replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ').trim());
  // Pass 1: exact titles.
  keys.forEach((key, i) => {
    const hit = (Object.keys(EXACT) as Field[]).find((f) => map[f] === undefined && EXACT[f]!.includes(key));
    if (hit) map[hit] = i;
  });
  // Pass 2: looser patterns for anything still missing.
  keys.forEach((key, i) => {
    if (!key || Object.values(map).includes(i) || NOT_A_FIELD.test(key)) return;
    const rule = HEADER_RULES.find(([f, re]) => re.test(key) && map[f] === undefined);
    if (rule) map[rule[0]] = i;
  });
  return map;
}

export interface ImportDefaults { businessType: string; city: string; country: string; countryCode: string }
export interface ImportRow {
  name: string; type: string | null; address: string | null; city: string | null; country: string | null; phone: string | null; whatsapp: string | null;
  email: string | null; website: string | null; instagram: string | null; rating: number | null; reviews: number | null; maps: string | null; notes: string | null;
}

// Empty-looking cells, including the locked placeholders some export tools write (e.g. \"*** Visible after upgrade ***\").
const EMPTY = /^(n\/?a|none|null|-|—|no|nil|undefined)$|visible after upgrade|upgrade to (see|view|unlock)|^\*+[^*]*\*+$/i;
const clean = (v: string | undefined) => (v && v.trim() && !EMPTY.test(v.trim()) ? v.trim().slice(0, 500) : null);

export function phoneKey(phone: string | null): string | null {
  const d = (phone ?? '').replace(/\D/g, '');
  return d.length >= 7 ? d.slice(-10) : null;
}

export function parseRating(v: string | null): number | null {
  const m = /(\d(?:[.,]\d)?)/.exec(v ?? '');
  const n = m ? Number(m[1].replace(',', '.')) : NaN;
  return n >= 1 && n <= 5 ? n : null;
}

export function parseCount(v: string | null): number | null {
  if (!v) return null;
  const m = /(\d[\d,.\s]*)\s*([kK])?/.exec(v.replace(/[()]/g, ''));
  if (!m) return null;
  const n = Number(m[1].replace(/[,\s]/g, ''));
  if (!Number.isFinite(n)) return null;
  return Math.round(m[2] ? n * 1000 : n);
}

/** Reads the sheet rows using the detected columns. Returns rows plus what was skipped and why. */
export function readRows(table: string[][], map: Partial<Record<Field, number>>) {
  const get = (r: string[], f: Field) => (map[f] === undefined ? null : clean(r[map[f]!]));
  const rows: ImportRow[] = [];
  const skipped: { line: number; reason: string }[] = [];
  const seen = new Set<string>();
  table.slice(1).forEach((r, i) => {
    const line = i + 2;
    const name = get(r, 'name');
    if (!name) return skipped.push({ line, reason: 'No business name' });
    const phone = get(r, 'phone');
    const whatsapp = get(r, 'whatsapp');
    const email = get(r, 'email');
    const instagram = get(r, 'instagram');
    if (!phone && !whatsapp && !email && !instagram) return skipped.push({ line, reason: `${name}: no phone, WhatsApp, email or Instagram` });
    const key = phoneKey(phone ?? whatsapp) ?? `${branchKey(name)}|${(get(r, 'address') ?? '').toLowerCase()}`;
    if (seen.has(key)) return skipped.push({ line, reason: `${name}: appears twice in this sheet` });
    seen.add(key);
    rows.push({
      name, type: get(r, 'type'), address: get(r, 'address'), city: get(r, 'city'), country: get(r, 'country'), phone, whatsapp, email: email?.toLowerCase() ?? null,
      website: get(r, 'website'), instagram, rating: parseRating(get(r, 'rating')), reviews: parseCount(get(r, 'reviews')), maps: get(r, 'maps'), notes: get(r, 'notes'),
    });
  });
  return { rows, skipped };
}

/** "099280 87404" in India → "+91 99280 87404". Only fills in what is certain; other countries need a + in the sheet. */
export function toInternational(phone: string | null, countryCode: string): string | null {
  if (!phone) return null;
  const p = phone.trim();
  if (p.startsWith('+')) return p;
  const digits = p.replace(/\D/g, '');
  if (countryCode === 'IN') {
    const local = digits.replace(/^(0091|91(?=\d{10}$)|0)/, '');
    if (/^[6-9]\d{9}$/.test(local)) return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
    if (/^[1-5]\d{7,9}$/.test(local)) return `+91 ${local}`;
  }
  return null;
}

/** djb2 hash → stable id for a business without a Google place id. */
function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/**
 * Imported row → lead. "Website" column present but empty = no website (Hot). If the sheet has NO website column at
 * all, LeadPilot can't know, so the lead is marked "verify before contacting".
 */
export function importRowToLead(r: ImportRow, d: ImportDefaults, hasWebsiteColumn: boolean, searchId: string | null) {
  const websiteUrl = r.website ? (/^https?:\/\//i.test(r.website) ? r.website : `https://${r.website}`) : null;
  const site = classifyListingWebsite(websiteUrl);
  const ig = r.instagram ? normaliseInstagram(/instagram\.com/i.test(r.instagram) ? r.instagram : `https://www.instagram.com/${r.instagram.replace(/^@/, '')}`) : null;
  const { score, reasons } = computeScore({ rating: r.rating, reviewCount: r.reviews, priceLevel: null, photoCount: 0, premiumArea: null, branchCount: 1 });
  const phone = r.phone ?? r.whatsapp;
  return {
    search_id: searchId,
    place_id: `import:${phoneKey(phone) ?? hash(`${branchKey(r.name)}|${(r.address ?? '').toLowerCase()}`)}`,
    name: r.name,
    business_type: (r.type?.split(',')[0].trim() || d.businessType).toLowerCase().slice(0, 80),
    full_address: r.address,
    city: r.city ?? d.city,
    country: r.country ?? d.country,
    country_code: d.countryCode,
    phone,
    phone_intl: toInternational(phone, d.countryCode),
    whatsapp: r.whatsapp,
    email: r.email && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(r.email) ? r.email : null,
    instagram: ig ?? site.instagram,
    rating: r.rating,
    review_count: r.reviews,
    maps_url: r.maps && /^https?:\/\//i.test(r.maps) ? r.maps : null,
    website: websiteUrl,
    website_status: site.status,
    lead_type: leadTypeFor(site.status),
    score,
    score_reasons: [...reasons, { label: 'Data source', points: 0, max: 0, detail: 'Imported from your sheet' }],
    pricing_tier: tierFromScore(score),
    notes: r.notes,
    data_source: 'import' as const,
    needs_verification: !hasWebsiteColumn && site.status === 'none',
  };
}

/** Best first: Hot before Warm before checking before Skip; then by score. */
export function rankLeads<T extends { lead_type: string; score: number | null }>(leads: T[]): T[] {
  const order: Record<string, number> = { hot: 0, warm: 1, pending: 2, skip: 3 };
  return [...leads].sort((a, b) => (order[a.lead_type] ?? 9) - (order[b.lead_type] ?? 9) || (b.score ?? 0) - (a.score ?? 0));
}
