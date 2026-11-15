// POST /api/sync-sheet — adds any leads that are not in the Google Sheet yet (e.g. found before the sheet was connected).
import type { Env } from '../../server/env';
import { Db, bearer, errorResponse, json, requireOwner } from '../../server/http';
import { appendToSheet } from '../../server/sync';
import type { SheetLead } from '../../server/sheet';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const db = new Db(bearer(request));
    await requireOwner(db, 'website_check', 600);
    const missing = await db.select<SheetLead & { id: string }>('leads?sheet_row=is.null&order=created_at.asc&limit=100&select=*');
    const sheet = await appendToSheet(db, env, missing);
    const more = await db.select<{ id: string }>('leads?sheet_row=is.null&select=id&limit=1');
    return json({ added: sheet.ok ? missing.length : 0, remaining: sheet.ok && more.length > 0, sheet });
  } catch (e) {
    return errorResponse(e);
  }
};
