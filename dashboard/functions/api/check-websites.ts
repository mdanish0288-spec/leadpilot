// POST /api/check-websites — checks a few "pending" websites per call (small batches keep each run fast
// and inside Cloudflare's free limits). The dashboard calls it repeatedly until none are left.
import type { Env } from '../../server/env';
import { Db, bearer, errorResponse, json, requireOwner } from '../../server/http';
import { analyseHomepage, isFetchableUrl, leadTypeFor, type WebsiteStatus } from '../../server/website';
import { rewriteInSheet } from '../../server/sync';
import type { SheetLead } from '../../server/sheet';

const BATCH = 4;
type PendingLead = SheetLead & { id: string; website: string; sheet_row: number | null };

async function checkOne(url: string): Promise<{ website_status: WebsiteStatus; website_issues: string[]; email: string | null; instagram: string | null }> {
  if (!isFetchableUrl(url)) return { website_status: 'broken', website_issues: ['Website address is not valid'], email: null, instagram: null };
  try {
    const r = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LeadPilotSiteCheck/1.0)', Accept: 'text/html' },
    });
    if (!r.ok) return { website_status: 'broken', website_issues: [`Website returns an error (${r.status})`], email: null, instagram: null };
    if (!(r.headers.get('content-type') ?? '').includes('html')) return { website_status: 'broken', website_issues: ['Website does not show a web page'], email: null, instagram: null };
    const html = (await r.text()).slice(0, 200_000);
    const a = analyseHomepage(html, r.url || url, new Date().getUTCFullYear());
    return { website_status: a.status, website_issues: a.issues, email: a.email, instagram: a.instagram };
  } catch {
    return { website_status: 'broken', website_issues: ['Website does not load (timed out or unreachable)'], email: null, instagram: null };
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const db = new Db(bearer(request));
    await requireOwner(db, 'website_check', 600);
    const pending = await db.select<PendingLead>(`leads?website_status=eq.pending&order=created_at.asc&limit=${BATCH}&select=*`);
    if (!pending.length) return json({ checked: 0, remaining: false, sheet: { ok: true, rows: 0 } });

    const results = await Promise.all(pending.map((l) => checkOne(l.website)));
    const checks = pending.map((l, i) => ({ id: l.id, ...results[i], lead_type: leadTypeFor(results[i].website_status) }));
    await db.rpc('apply_website_checks', { p_checks: checks });

    const updated = pending.map((l, i) => ({
      ...l, lead_type: checks[i].lead_type, email: l.email ?? checks[i].email, instagram: l.instagram ?? checks[i].instagram,
    }));
    const sheet = await rewriteInSheet(db, env, updated);
    const more = await db.select<{ id: string }>('leads?website_status=eq.pending&select=id&limit=1');
    return json({ checked: pending.length, remaining: more.length > 0, results: checks.map((c) => ({ id: c.id, lead_type: c.lead_type })), sheet });
  } catch (e) {
    return errorResponse(e);
  }
};
