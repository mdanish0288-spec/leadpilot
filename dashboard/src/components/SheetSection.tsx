import { useEffect, useState } from 'react';
import { Copy, RefreshCw, Save } from 'lucide-react';
import { Button, Card, Field, Input, Notice } from './ui';
import { api, type Status } from '../lib/api';
import { loadSheetLink, saveSheetLink, sheetIdFromInput } from '../lib/data';

/** Link the "LeadPilot Leads" Google Sheet and push any leads that are not in it yet. */
export function SheetSection() {
  const [input, setInput] = useState('');
  const [saved, setSaved] = useState('');
  const [status, setStatus] = useState<Status | null>(null);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'danger' | 'warn'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadSheetLink().then((id) => { setSaved(id); setInput(id ? `https://docs.google.com/spreadsheets/d/${id}/edit` : ''); }).catch(() => {});
    api.status().then(setStatus).catch(() => {});
  }, []);

  async function save() {
    const id = sheetIdFromInput(input);
    if (!id) return setMsg({ tone: 'danger', text: 'That does not look like a Google Sheets link. Copy it from the browser address bar while the sheet is open.' });
    setBusy(true);
    try {
      await saveSheetLink(id);
      setSaved(id);
      setMsg({ tone: 'ok', text: 'Sheet link saved.' });
    } catch (e) {
      setMsg({ tone: 'danger', text: (e as Error).message });
    } finally { setBusy(false); }
  }

  async function sync() {
    setBusy(true);
    setMsg(null);
    try {
      let added = 0;
      for (let i = 0; i < 20; i++) {
        const r = await api.syncSheet();
        if (!r.sheet.ok) { setMsg({ tone: 'danger', text: r.sheet.reason ?? 'Sheet sync failed.' }); return; }
        added += r.added;
        if (!r.remaining) break;
      }
      setMsg({ tone: 'ok', text: added ? `Added ${added} leads to the sheet.` : 'The sheet is already up to date.' });
    } catch (e) {
      setMsg({ tone: 'danger', text: (e as Error).message });
    } finally { setBusy(false); }
  }

  return (
    <Card className="mb-5">
      <h2 className="text-lg font-semibold tracking-tight">Google Sheet</h2>
      <p className="mt-1 mb-5 text-[15px] text-muted">Every lead is added to your “LeadPilot Leads” sheet as soon as it is found.</p>
      {status?.service_account_email ? (
        <div className="mb-4 rounded-xl border border-line bg-canvas p-3.5 text-[15px]">
          <p className="mb-1.5">Share your sheet (as <b>Editor</b>) with this address:</p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-white px-2.5 py-1.5 text-sm">{status.service_account_email}</code>
            <Button variant="secondary" className="!h-9 !px-3" onClick={() => navigator.clipboard?.writeText(status.service_account_email!)}><Copy size={15} /> Copy</Button>
          </div>
        </div>
      ) : (
        <div className="mb-4"><Notice tone="warn">The Google service account key is not added to Cloudflare yet, so the sheet can't be updated. Follow the setup steps.</Notice></div>
      )}
      <Field label="Sheet link" htmlFor="sheet_link" hint="Open the sheet in Google Sheets and copy the address from the browser.">
        <Input id="sheet_link" placeholder="https://docs.google.com/spreadsheets/d/…" value={input} onChange={(e) => { setInput(e.target.value); setMsg(null); }} />
      </Field>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={save} disabled={busy || !input.trim() || sheetIdFromInput(input) === saved}><Save size={16} /> Save link</Button>
        <Button variant="secondary" onClick={sync} disabled={busy || !saved}><RefreshCw size={16} className={busy ? 'animate-spin' : ''} /> Sync sheet now</Button>
      </div>
      {msg && <div className="mt-4"><Notice tone={msg.tone}>{msg.text}</Notice></div>}
    </Card>
  );
}
