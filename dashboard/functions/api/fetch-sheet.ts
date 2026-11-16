// POST /api/fetch-sheet  { url } → { csv }
// Reads a Google Sheet the owner shared as "Anyone with the link can view" (no Google key needed).
import type { Env } from '../../server/env';
import { Db, bearer, errorResponse, HttpError, json, requireOwner } from '../../server/http';

export function sheetCsvUrl(link: string): string | null {
  const id = /\/spreadsheets\/d\/([A-Za-z0-9_-]{20,100})/.exec(link)?.[1];
  if (!id) return null;
  const gid = /[#&?]gid=(\d+)/.exec(link)?.[1];
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv${gid ? `&gid=${gid}` : ''}`;
}

export const onRequestPost: PagesFunction<Env> = async ({ request }) => {
  try {
    const db = new Db(bearer(request));
    await requireOwner(db, 'import', 60);
    const { url } = (await request.json().catch(() => ({}))) as { url?: string };
    const csvUrl = typeof url === 'string' ? sheetCsvUrl(url) : null;
    if (!csvUrl) throw new HttpError(400, 'That is not a Google Sheets link. Copy it from the address bar while the sheet is open.', 'bad_link');
    const r = await fetch(csvUrl, { redirect: 'follow', signal: AbortSignal.timeout(20_000) });
    const type = r.headers.get('content-type') ?? '';
    if (!r.ok || type.includes('text/html')) {
      throw new HttpError(403, 'LeadPilot cannot open this sheet. In Google Sheets click Share → General access → "Anyone with the link" → Viewer, then try again.', 'sheet_private');
    }
    const csv = await r.text();
    if (csv.length > 3_000_000) throw new HttpError(400, 'This sheet is too big. Import up to about 2,000 rows at a time.', 'too_big');
    return json({ csv });
  } catch (e) {
    return errorResponse(e);
  }
};
