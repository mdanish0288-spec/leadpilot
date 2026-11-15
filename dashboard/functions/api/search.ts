// POST /api/search
//   New search:  { command_text, via_voice, business_type, city, country, country_code }
//   More results: { search_id }   (next page of the same search, up to Google's 60-result limit)
// Saves every new lead (duplicates are skipped by the database) and adds it to the Google Sheet right away.
import type { Env } from '../../server/env';
import { Db, bearer, errorResponse, HttpError, json, requireOwner } from '../../server/http';
import { buildPlacesQuery } from '../../server/command';
import { placesToLeads, searchPlaces } from '../../server/places';
import { appendToSheet } from '../../server/sync';
import type { SheetLead } from '../../server/sheet';

interface SearchRow { id: string; command_text: string; business_type: string; city: string; country: string; country_code: string; query: string; next_page_token: string | null; results_found: number; new_leads: number; duplicates: number }

const str = (v: unknown, max = 80) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const db = new Db(bearer(request));
    await requireOwner(db, 'search', 30);
    if (!env.GOOGLE_PLACES_API_KEY) throw new HttpError(503, 'Google Places key is not set up yet.', 'not_configured');
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    let search: SearchRow;
    let pageToken: string | null = null;
    if (str(body.search_id)) {
      const [existing] = await db.select<SearchRow>(`searches?id=eq.${encodeURIComponent(str(body.search_id)!)}&select=*`);
      if (!existing) throw new HttpError(404, 'That search was not found.', 'not_found');
      if (!existing.next_page_token) throw new HttpError(400, 'Google has no more results for this search.', 'no_more');
      search = existing;
      pageToken = existing.next_page_token;
    } else {
      const business_type = str(body.business_type)?.toLowerCase();
      const city = str(body.city);
      const country = str(body.country);
      const country_code = str(body.country_code, 2)?.toUpperCase();
      if (!business_type || !city || !country || !country_code || !/^[A-Z]{2}$/.test(country_code)) {
        throw new HttpError(400, 'Business type, city and country are all needed.', 'missing_fields');
      }
      const query = buildPlacesQuery({ business_type, city, country });
      [search] = await db.insert<SearchRow>('searches', [{
        command_text: str(body.command_text, 500) ?? query, via_voice: body.via_voice === true, business_type, city, country, country_code, query,
      }]);
    }

    let page;
    try {
      page = await searchPlaces(env.GOOGLE_PLACES_API_KEY, search.query, search.country_code, pageToken);
    } catch (e) {
      await db.update('searches', `id=eq.${search.id}`, { status: 'failed', error: e instanceof Error ? e.message : 'Places failed' });
      throw e;
    }

    const rows = placesToLeads(page.places, { businessType: search.business_type, city: search.city, country: search.country, countryCode: search.country_code, searchId: search.id });
    // Duplicates (already found in an earlier search) are skipped by the unique place_id rule.
    const inserted = rows.length
      ? await db.insert<SheetLead & { id: string; lead_type: string }>('leads', rows, '?on_conflict=place_id&columns=' + Object.keys(rows[0]).join(','), true)
      : [];
    const duplicates = rows.length - inserted.length;

    await db.update('searches', `id=eq.${search.id}`, {
      status: 'done', results_found: search.results_found + page.places.length, new_leads: search.new_leads + inserted.length,
      duplicates: search.duplicates + duplicates, next_page_token: page.nextPageToken, error: null,
    });

    const sheet = await appendToSheet(db, env, inserted);

    return json({
      search_id: search.id,
      found: page.places.length,
      new_leads: inserted.length,
      duplicates,
      hot: inserted.filter((l) => l.lead_type === 'hot').length,
      checking: inserted.filter((l) => l.lead_type === 'pending').length,
      more_available: !!page.nextPageToken,
      sheet,
    });
  } catch (e) {
    return errorResponse(e);
  }
};
