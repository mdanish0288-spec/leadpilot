// Keeps the Google Sheet in step with the database. A sheet problem never loses a lead:
// leads are saved first, and anything not yet in the sheet is retried by "Sync sheet".
import type { Env } from './env';
import { Db } from './http';
import { appendLeads, googleAccessToken, leadToRow, parseServiceAccount, updateRows, type SheetLead } from './sheet';

export type SheetResult = { ok: true; rows: number } | { ok: false; reason: string };

export async function sheetSetup(db: Db, env: Env): Promise<{ sheetId: string; sa: { client_email: string; private_key: string } } | string> {
  const sa = parseServiceAccount(env.GOOGLE_SERVICE_ACCOUNT_JSON);
  if (!sa) return 'Google Sheet is not connected yet (service account key missing).';
  const [settings] = await db.select<{ google_sheet_id: string }>('settings?select=google_sheet_id&id=eq.1');
  if (!settings?.google_sheet_id) return 'Google Sheet link is not set in Settings yet.';
  return { sheetId: settings.google_sheet_id, sa };
}

export async function appendToSheet(db: Db, env: Env, leads: (SheetLead & { id: string })[]): Promise<SheetResult> {
  if (!leads.length) return { ok: true, rows: 0 };
  try {
    const setup = await sheetSetup(db, env);
    if (typeof setup === 'string') return { ok: false, reason: setup };
    const token = await googleAccessToken(setup.sa);
    const rowNumbers = await appendLeads(token, setup.sheetId, leads.map(leadToRow));
    if (rowNumbers.length === leads.length) {
      await db.rpc('set_sheet_rows', { p_rows: leads.map((l, i) => ({ id: l.id, row: rowNumbers[i] })) });
    }
    return { ok: true, rows: leads.length };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : 'Google Sheet update failed.' };
  }
}

export async function rewriteInSheet(db: Db, env: Env, leads: (SheetLead & { sheet_row: number | null })[]): Promise<SheetResult> {
  const withRows = leads.filter((l) => l.sheet_row);
  if (!withRows.length) return { ok: true, rows: 0 };
  try {
    const setup = await sheetSetup(db, env);
    if (typeof setup === 'string') return { ok: false, reason: setup };
    const token = await googleAccessToken(setup.sa);
    await updateRows(token, setup.sheetId, withRows.map((l) => ({ row: l.sheet_row!, values: leadToRow(l) })));
    return { ok: true, rows: withRows.length };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : 'Google Sheet update failed.' };
  }
}
