// POST /api/import  { rows, defaults, has_website_column }  (up to 200 rows per call)
// Turns the owner's sheet rows into leads: skips anything a lesson says to skip, skips businesses already in
// LeadPilot (same Google id or same phone number), scores the rest and adds them to the Google Sheet.
import type { Env } from '../../server/env';
import { Db, bearer, errorResponse, HttpError, json, requireOwner } from '../../server/http';
import { importRowToLead, type ImportDefaults, type ImportRow } from '../../server/importer';
import { applyLessons, REASON_TEXT, type FeedbackReason, type Lesson } from '../../server/lessons';
import { appendToSheet } from '../../server/sync';
import type { SheetLead } from '../../server/sheet';

const MAX_ROWS = 200;
const s = (v: unknown, max = 80) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : '');

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const db = new Db(bearer(request));
    await requireOwner(db, 'import', 60);
    const body = (await request.json().catch(() => ({}))) as { rows?: ImportRow[]; defaults?: Partial<ImportDefaults>; has_website_column?: boolean };
    const rows = Array.isArray(body.rows) ? body.rows.filter((r) => r && typeof r.name === 'string' && r.name.trim()) : [];
    if (!rows.length) throw new HttpError(400, 'No rows to import.', 'empty');
    if (rows.length > MAX_ROWS) throw new HttpError(400, `Send at most ${MAX_ROWS} rows at a time.`, 'too_many');
    const defaults: ImportDefaults = {
      businessType: s(body.defaults?.businessType) || 'business', city: s(body.defaults?.city), country: s(body.defaults?.country),
      countryCode: s(body.defaults?.countryCode, 2).toUpperCase(),
    };
    if (!defaults.country || !/^[A-Z]{2}$/.test(defaults.countryCode)) throw new HttpError(400, 'Choose the country these businesses are in.', 'missing_country');

    const leads = rows.map((r) => importRowToLead(r, defaults, body.has_website_column === true, null));

    // 1. Lessons learned from earlier mistakes.
    const lessons = await db.select<Lesson>('lessons?select=id,kind,value,reason');
    const { kept, blocked } = applyLessons(leads, lessons);

    // 2. Already in LeadPilot (same phone number as an existing lead, from any source).
    const keys = [...new Set(kept.map((l) => (l.phone_intl ?? l.phone ?? '').replace(/\D/g, '').slice(-10)).filter((k) => k.length >= 7))];
    const existing = keys.length ? await db.select<{ phone_key: string }>(`leads?select=phone_key&phone_key=in.(${keys.join(',')})`) : [];
    const known = new Set(existing.map((e) => e.phone_key));
    const fresh = kept.filter((l) => !known.has((l.phone_intl ?? l.phone ?? '').replace(/\D/g, '').slice(-10)));

    // 3. Save (same Google/import id = duplicate, skipped by the database).
    const inserted = fresh.length
      ? await db.insert<SheetLead & { id: string; lead_type: string; name: string; score: number }>('leads', fresh, '?on_conflict=place_id&columns=' + Object.keys(fresh[0]).join(','), true)
      : [];
    if (blocked.length) await db.rpc('bump_lessons', { p_ids: [...new Set(blocked.map((b) => b.lesson.id))] });

    const sheet = await appendToSheet(db, env, inserted);
    return json({
      received: rows.length,
      imported: inserted.length,
      duplicates: kept.length - inserted.length,
      blocked: blocked.map((b) => ({ name: b.lead.name, reason: REASON_TEXT[b.lesson.reason as FeedbackReason] ?? b.lesson.reason })),
      hot: inserted.filter((l) => l.lead_type === 'hot').length,
      checking: inserted.filter((l) => l.lead_type === 'pending').length,
      sheet,
    });
  } catch (e) {
    return errorResponse(e);
  }
};
