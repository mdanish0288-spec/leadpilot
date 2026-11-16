// FREE BACKUP SOURCE: OpenStreetMap (Nominatim for the city, Overpass for businesses). Official public APIs, no key.
// Used only when Google Places is unavailable. Data is thinner: no ratings, reviews or photos, and a missing
// website in OpenStreetMap does NOT prove the business has none — so every lead is flagged "verify before contacting".
// Data © OpenStreetMap contributors, ODbL licence.
import { HttpError } from './http';
import { computeScore, tierFromScore } from './score';
import { classifyListingWebsite, leadTypeFor, normaliseInstagram } from './website';
import type { SearchContext } from './places';

const UA = 'LeadPilot/1.0 (private lead research tool)';
export const OSM_ATTRIBUTION = 'Data © OpenStreetMap contributors (ODbL)';

/** Business type (English, plural) → OpenStreetMap tags. Unknown types fall back to a name search. */
const TAGS: [RegExp, string[]][] = [
  [/caf[eé]|coffee|tea/, ['amenity=cafe']],
  [/restaurant|dhaba|diner|eatery|biryani|pizza|food/, ['amenity=restaurant', 'amenity=fast_food']],
  [/bakery|bakeries|cake|pastry|sweet|mithai/, ['shop=bakery', 'shop=pastry', 'shop=confectionery']],
  [/bar|pub/, ['amenity=bar', 'amenity=pub']],
  [/salon|hair|barber/, ['shop=hairdresser']],
  [/beauty|nail|spa|parlou?r|makeup/, ['shop=beauty', 'leisure=spa']],
  [/painter|painting/, ['craft=painter']],
  [/clean|maid|laundry/, ['craft=cleaning', 'shop=laundry', 'shop=dry_cleaning']],
  [/plumb/, ['craft=plumber']],
  [/electric/, ['craft=electrician']],
  [/carpent|furniture/, ['craft=carpenter', 'shop=furniture']],
  [/tailor|boutique/, ['craft=tailor', 'shop=tailor', 'shop=boutique']],
  [/gym|fitness|yoga/, ['leisure=fitness_centre', 'sport=yoga']],
  [/dentist|dental/, ['amenity=dentist']],
  [/clinic|doctor/, ['amenity=clinic', 'amenity=doctors']],
  [/florist|flower/, ['shop=florist']],
  [/jewel/, ['shop=jewelry']],
  [/optician|optical/, ['shop=optician']],
  [/hotel|guest ?house|homestay/, ['tourism=hotel', 'tourism=guest_house']],
];

export function osmTagsFor(businessType: string): string[] | null {
  const t = businessType.toLowerCase();
  return TAGS.find(([re]) => re.test(t))?.[1] ?? null;
}

/** Asks only for named places that list a phone or email (smaller and faster than fetching everything). */
export function buildOverpassQuery(businessType: string, bbox: [number, number, number, number], limit = 100): string {
  const [s, w, n, e] = bbox;
  const box = `(${s},${w},${n},${e})`;
  const tags = osmTagsFor(businessType);
  const word = businessType.replace(/s$/, '').replace(/[^\p{L}\p{N} ]/gu, '');
  const selectors = tags
    ? tags.map((t) => { const [k, v] = t.split('='); return `["${k}"="${v}"]`; })
    : [`["name"~"${word}",i]["shop"]`, `["name"~"${word}",i]["craft"]`];
  const contact = ['phone', 'contact:phone', 'email', 'contact:email'];
  const parts = selectors.flatMap((sel) => contact.map((c) => `nwr${sel}["name"]["${c}"]${box};`));
  return `[out:json][timeout:30];(${parts.join('')});out center tags ${limit};`;
}

export async function geocodeCity(city: string, country: string, fetcher: typeof fetch = (i, o) => fetch(i, o)): Promise<[number, number, number, number]> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(`${city}, ${country}`)}&format=jsonv2&limit=1`;
  const r = await fetcher(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!r.ok) throw new HttpError(502, 'The free backup map (OpenStreetMap) could not find that city.', 'osm_error');
  const [hit] = (await r.json()) as { boundingbox?: string[] }[];
  if (!hit?.boundingbox) throw new HttpError(404, `OpenStreetMap does not know "${city}, ${country}".`, 'osm_no_city');
  const [south, north, west, east] = hit.boundingbox.map(Number);
  return [south, west, north, east];
}

export interface OsmElement { type: 'node' | 'way' | 'relation'; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }

export async function searchOsm(businessType: string, city: string, country: string, fetcher: typeof fetch = (i, o) => fetch(i, o)): Promise<OsmElement[]> {
  const bbox = await geocodeCity(city, country, fetcher);
  const body = new URLSearchParams({ data: buildOverpassQuery(businessType, bbox) });
  // One try with a hard 45-second limit, so a slow volunteer server can never leave a search stuck.
  let r: Response | null = null;
  try {
    r = await fetcher('https://overpass-api.de/api/interpreter', { method: 'POST', headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' }, body, signal: AbortSignal.timeout(45_000) });
  } catch {
    r = null;
  }
  if (!r || !r.ok) throw new HttpError(502, 'The free backup map (OpenStreetMap) is busy or too slow right now. Try again in a few minutes.', 'osm_error');
  return ((await r.json()) as { elements?: OsmElement[] }).elements ?? [];
}

const NOT_A_SMALL_BUSINESS = /cafeteria|canteen|mess|cyber|internet|kiosk|food court|vending/i;

const pick = (t: Record<string, string>, ...keys: string[]) => keys.map((k) => t[k]).find((v) => v && v.trim())?.trim() ?? null;

/**
 * OpenStreetMap results → lead rows. Keeps only businesses you can actually contact (phone or email), skips big
 * chains/brands (they don't buy a small-business website) and canteens/internet cafes/kiosks. Nothing is invented.
 */
export function osmToLeads(elements: OsmElement[], ctx: SearchContext) {
  return elements
    .filter((e) => e.tags?.name && !e.tags.brand && !e.tags['brand:wikidata'] && !e.tags.disused && !e.tags['disused:amenity'])
    .map((e) => {
      const t = e.tags!;
      const phone = pick(t, 'phone', 'contact:phone', 'contact:mobile', 'mobile');
      const email = pick(t, 'email', 'contact:email');
      const website = pick(t, 'website', 'contact:website', 'url');
      const street = [pick(t, 'addr:housenumber'), pick(t, 'addr:street')].filter(Boolean).join(' ');
      const address = [street || null, pick(t, 'addr:suburb', 'addr:neighbourhood'), pick(t, 'addr:city') ?? ctx.city, pick(t, 'addr:postcode')].filter(Boolean).join(', ');
      return { e, t, phone, email, website, street, address };
    })
    // Must be reachable without visiting (phone or email), and not an office canteen / internet cafe / kiosk.
    .filter((x) => (x.phone || x.email) && !NOT_A_SMALL_BUSINESS.test(x.t.name) && !x.t.operator?.match(/university|college|hospital|railway|airport|government|ltd|limited/i))
    .map(({ e, t, phone, email, website, address }) => {
      const site = classifyListingWebsite(website);
      const { score, reasons } = computeScore({ rating: null, reviewCount: null, priceLevel: null, photoCount: 0, premiumArea: null, branchCount: 1 });
      const lat = e.lat ?? e.center?.lat ?? null;
      const lon = e.lon ?? e.center?.lon ?? null;
      return {
        search_id: ctx.searchId,
        place_id: `osm:${e.type}/${e.id}`,
        name: t.name,
        business_type: ctx.businessType,
        primary_type: t.amenity ?? t.shop ?? t.craft ?? t.leisure ?? null,
        full_address: address || null,
        neighbourhood: pick(t, 'addr:suburb', 'addr:neighbourhood'),
        city: pick(t, 'addr:city') ?? ctx.city,
        country: ctx.country,
        country_code: ctx.countryCode,
        phone,
        phone_intl: phone && phone.startsWith('+') ? phone : null,
        email,
        instagram: normaliseInstagram(pick(t, 'contact:instagram', 'instagram') ?? '') ?? site.instagram,
        rating: null,
        review_count: null,
        price_level: null,
        opening_hours: t.opening_hours ? { weekdayDescriptions: [t.opening_hours] } : null,
        utc_offset_minutes: null,
        maps_url: `https://www.openstreetmap.org/${e.type}/${e.id}`,
        latitude: lat,
        longitude: lon,
        website,
        website_status: site.status,
        lead_type: leadTypeFor(site.status),
        score,
        score_reasons: [...reasons, { label: 'Data source', points: 0, max: 0, detail: 'OpenStreetMap backup — no Google ratings, reviews or photos' }],
        pricing_tier: tierFromScore(score),
        photo_refs: [],
        photo_count: 0,
        top_reviews: [],
        notes: 'OpenStreetMap backup data: no ratings/reviews. Verify the business has no website before contacting.',
        data_source: 'openstreetmap' as const,
        needs_verification: true,
      };
    });
}
