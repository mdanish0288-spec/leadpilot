// Google Places API (New) — Text Search. Official API only, never scraping.
import { HttpError, fetchRetryOnce } from './http';
import { branchKey, computeScore, parsePriceLevel, tierFromScore } from './score';
import { classifyListingWebsite, leadTypeFor } from './website';

export const PLACES_FIELD_MASK = [
  'places.id', 'places.displayName', 'places.formattedAddress', 'places.addressComponents', 'places.nationalPhoneNumber',
  'places.internationalPhoneNumber', 'places.rating', 'places.userRatingCount', 'places.priceLevel', 'places.regularOpeningHours',
  'places.utcOffsetMinutes', 'places.googleMapsUri', 'places.websiteUri', 'places.photos', 'places.reviews', 'places.businessStatus',
  'places.location', 'places.primaryType', 'nextPageToken',
].join(',');

export interface Place {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  addressComponents?: { longText: string; shortText: string; types: string[] }[];
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[]; periods?: unknown[] };
  utcOffsetMinutes?: number;
  googleMapsUri?: string;
  websiteUri?: string;
  photos?: { name: string; widthPx?: number; heightPx?: number; authorAttributions?: { displayName?: string; uri?: string }[] }[];
  reviews?: { rating?: number; text?: { text: string }; originalText?: { text: string; languageCode?: string }; authorAttribution?: { displayName?: string }; relativePublishTimeDescription?: string; publishTime?: string }[];
  businessStatus?: string;
  location?: { latitude: number; longitude: number };
  primaryType?: string;
}

export async function searchPlaces(apiKey: string, textQuery: string, regionCode: string | null, pageToken?: string | null, fetcher: typeof fetch = fetch) {
  const body: Record<string, unknown> = { textQuery, pageSize: 20, languageCode: 'en' };
  if (regionCode) body.regionCode = regionCode.toLowerCase();
  if (pageToken) body.pageToken = pageToken;
  const r = await fetchRetryOnce('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': PLACES_FIELD_MASK },
    body: JSON.stringify(body),
  }, fetcher);
  if (!r.ok) {
    console.error('Places error', r.status, (await r.text()).slice(0, 500));
    throw new HttpError(502, r.status === 403 ? 'Google Places refused the key. Check the Places API is enabled and the key is correct.' : `Google Places search failed (${r.status}).`, 'places_error');
  }
  const data = (await r.json()) as { places?: Place[]; nextPageToken?: string };
  return { places: data.places ?? [], nextPageToken: data.nextPageToken ?? null };
}

function component(p: Place, ...types: string[]) {
  for (const t of types) {
    const c = p.addressComponents?.find((a) => a.types.includes(t));
    if (c) return c;
  }
  return undefined;
}

export interface SearchContext { businessType: string; city: string; country: string; countryCode: string | null; searchId: string }

/** Turns Google results into lead rows. Closed businesses are dropped. Nothing is invented: missing data stays empty. */
export function placesToLeads(places: Place[], ctx: SearchContext) {
  const open = places.filter((p) => p.businessStatus !== 'CLOSED_PERMANENTLY' && p.businessStatus !== 'CLOSED_TEMPORARILY' && p.displayName?.text);
  const branchCounts = new Map<string, number>();
  for (const p of open) branchCounts.set(branchKey(p.displayName!.text), (branchCounts.get(branchKey(p.displayName!.text)) ?? 0) + 1);

  return open.map((p) => {
    const name = p.displayName!.text;
    const priceLevel = parsePriceLevel(p.priceLevel);
    const photoCount = p.photos?.length ?? 0;
    const { score, reasons } = computeScore({
      rating: p.rating ?? null, reviewCount: p.userRatingCount ?? null, priceLevel, photoCount, premiumArea: null,
      branchCount: branchCounts.get(branchKey(name)) ?? 1,
    });
    const site = classifyListingWebsite(p.websiteUri);
    const country = component(p, 'country');
    const reviews = (p.reviews ?? [])
      .filter((r) => r.text?.text || r.originalText?.text)
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, 5)
      .map((r) => ({
        rating: r.rating ?? null,
        text: r.originalText?.text ?? r.text?.text ?? '',
        language: r.originalText?.languageCode ?? null,
        author: r.authorAttribution?.displayName ?? null,
        when: r.relativePublishTimeDescription ?? null,
      }));
    return {
      search_id: ctx.searchId,
      place_id: p.id,
      name,
      business_type: ctx.businessType,
      primary_type: p.primaryType ?? null,
      full_address: p.formattedAddress ?? null,
      neighbourhood: component(p, 'neighborhood', 'sublocality_level_1', 'sublocality')?.longText ?? null,
      city: component(p, 'locality', 'postal_town', 'administrative_area_level_2')?.longText ?? ctx.city,
      country: country?.longText ?? ctx.country,
      country_code: country?.shortText && /^[A-Z]{2}$/.test(country.shortText) ? country.shortText : ctx.countryCode,
      phone: p.nationalPhoneNumber ?? null,
      phone_intl: p.internationalPhoneNumber ?? null,
      rating: p.rating ?? null,
      review_count: p.userRatingCount ?? null,
      price_level: priceLevel,
      opening_hours: p.regularOpeningHours ?? null,
      utc_offset_minutes: p.utcOffsetMinutes ?? null,
      maps_url: p.googleMapsUri ?? null,
      latitude: p.location?.latitude ?? null,
      longitude: p.location?.longitude ?? null,
      website: p.websiteUri ?? null,
      website_status: site.status,
      instagram: site.instagram,
      lead_type: leadTypeFor(site.status),
      score,
      score_reasons: reasons,
      pricing_tier: tierFromScore(score),
      photo_refs: (p.photos ?? []).slice(0, 10).map((ph) => ({ name: ph.name, w: ph.widthPx ?? null, h: ph.heightPx ?? null, by: ph.authorAttributions?.[0]?.displayName ?? null })),
      photo_count: photoCount,
      top_reviews: reviews,
    };
  });
}

export type LeadRow = ReturnType<typeof placesToLeads>[number];
