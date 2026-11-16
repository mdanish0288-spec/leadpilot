import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, ArrowRight, FileSpreadsheet, Flame, Loader2, Upload } from 'lucide-react';
import { Button, Card, Field, Input, Notice, PageHeader, Select, cx } from '../components/ui';
import { api, runWebsiteChecks, type ImportResult } from '../lib/api';
import { detectColumns, FIELD_LABEL, parseCsv, readRows, type Field as Column } from '../../server/importer';

const COUNTRIES = [
  { code: 'IN', name: 'India' }, { code: 'CA', name: 'Canada' }, { code: 'US', name: 'United States' }, { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' }, { code: 'AE', name: 'United Arab Emirates' }, { code: 'NZ', name: 'New Zealand' }, { code: 'SG', name: 'Singapore' },
];
const BATCH = 100;

type Step = 'source' | 'preview' | 'importing' | 'done';

export function ImportPage() {
  const [step, setStep] = useState<Step>('source');
  const [link, setLink] = useState('');
  const [table, setTable] = useState<string[][] | null>(null);
  const [fileName, setFileName] = useState('');
  const [countryCode, setCountryCode] = useState('IN');
  const [city, setCity] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, checking: 0 });
  const [result, setResult] = useState<ImportResult | null>(null);
  const [sheetProblem, setSheetProblem] = useState<string | null>(null);
  const [checksDone, setChecksDone] = useState(false);

  const columns = useMemo(() => (table ? detectColumns(table[0]) : {}), [table]);
  const read = useMemo(() => (table ? readRows(table, columns) : null), [table, columns]);

  function load(csv: string, name: string) {
    const t = parseCsv(csv);
    if (t.length < 2) return setError('The sheet looks empty. The first row should be the column titles, with one business per row below.');
    const cols = detectColumns(t[0]);
    if (cols.name === undefined) return setError('Could not find a "Business name" column. Make sure the first row has titles like Name, Phone, Address, Website.');
    setTable(t);
    setFileName(name);
    setError('');
    setStep('preview');
  }

  async function fromLink() {
    setBusy(true);
    setError('');
    try {
      const { csv } = await api.fetchSheet(link.trim());
      load(csv, 'Google Sheet');
    } catch (e) {
      setError((e as Error).message);
    } finally { setBusy(false); }
  }

  async function fromFile(f: File | undefined) {
    if (!f) return;
    if (!/\.(csv|tsv|txt)$/i.test(f.name)) return setError('Please choose a .csv file. In Google Sheets: File → Download → Comma-separated values (.csv).');
    if (f.size > 3_000_000) return setError('This file is too big. Import up to about 2,000 rows at a time.');
    load(await f.text(), f.name);
  }

  async function runImport() {
    if (!read) return;
    const country = COUNTRIES.find((c) => c.code === countryCode)!;
    setStep('importing');
    setError('');
    const total: ImportResult = { received: 0, imported: 0, duplicates: 0, blocked: [], hot: 0, checking: 0, sheet: { ok: true } };
    setProgress({ done: 0, total: read.rows.length, checking: 0 });
    try {
      for (let i = 0; i < read.rows.length; i += BATCH) {
        const r = await api.importRows({
          rows: read.rows.slice(i, i + BATCH), has_website_column: columns.website !== undefined,
          defaults: { businessType: businessType.trim() || 'business', city: city.trim(), country: country.name, countryCode: country.code },
        });
        total.received += r.received; total.imported += r.imported; total.duplicates += r.duplicates; total.hot += r.hot; total.checking += r.checking;
        total.blocked.push(...r.blocked);
        if (!r.sheet.ok) total.sheet = r.sheet;
        setProgress((p) => ({ ...p, done: Math.min(p.total, i + BATCH) }));
      }
      setResult(total);
      setSheetProblem(total.sheet.ok ? null : total.sheet.reason ?? 'Google Sheet update failed.');
      setStep('done');
      if (total.checking) {
        const c = await runWebsiteChecks((n) => setProgress((p) => ({ ...p, checking: n })));
        if (c.sheetProblem) setSheetProblem(c.sheetProblem);
      }
      setChecksDone(true);
    } catch (e) {
      setError(`${(e as Error).message} Leads imported before this point are saved.`);
      setResult(total);
      setStep('done');
    }
  }

  const shown: Column[] = ['name', 'phone', 'whatsapp', 'email', 'instagram', 'website', 'rating', 'reviews', 'address', 'city', 'type', 'maps'];

  return (
    <>
      <Link to="/leads" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft size={16} /> All leads</Link>
      <PageHeader title="Import leads" subtitle="Give LeadPilot your own list. It removes duplicates, checks websites, scores every business and shows the best ones first." />

      {error && <div className="mb-5"><Notice tone="danger">{error}</Notice></div>}

      {step === 'source' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent"><FileSpreadsheet size={20} /></div>
            <h2 className="font-semibold">From a Google Sheet link</h2>
            <ol className="mt-2 mb-4 list-decimal space-y-1 pl-5 text-sm text-muted">
              <li>In your sheet, click <b>Share</b> → General access → <b>Anyone with the link</b> → Viewer.</li>
              <li>Copy the link from the browser and paste it here.</li>
            </ol>
            <Field label="Google Sheet link" htmlFor="sheet_link"><Input id="sheet_link" placeholder="https://docs.google.com/spreadsheets/d/…" value={link} onChange={(e) => setLink(e.target.value)} /></Field>
            <Button className="mt-4" onClick={fromLink} disabled={busy || !link.trim()}>{busy ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />} Read the sheet</Button>
          </Card>
          <Card>
            <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent"><Upload size={20} /></div>
            <h2 className="font-semibold">From a CSV file</h2>
            <p className="mt-2 mb-4 text-sm text-muted">In Google Sheets or Excel: <b>File → Download → CSV</b>, then choose the file here. Nothing is shared.</p>
            <label htmlFor="csv_file" className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-line bg-white px-4 text-[15px] font-medium hover:bg-canvas"><Upload size={16} /> Choose CSV file</label>
            <input id="csv_file" type="file" accept=".csv,.tsv,.txt,text/csv" className="sr-only" onChange={(e) => fromFile(e.target.files?.[0])} />
          </Card>
          <Card className="lg:col-span-2">
            <h2 className="mb-2 font-semibold">What to put in the sheet</h2>
            <p className="text-sm text-muted">First row = column titles. One business per row. Any order, any spelling — LeadPilot finds them. The more you fill, the better the score.</p>
            <div className="mt-3 overflow-x-auto"><table className="text-sm"><tbody><tr className="text-muted">
              {['Business Name', 'Phone', 'WhatsApp', 'Email', 'Instagram', 'Website (leave empty if none)', 'Rating', 'Reviews', 'Address', 'City', 'Category', 'Google Maps link', 'Notes'].map((h) => <td key={h} className="border border-line px-2.5 py-1.5 whitespace-nowrap">{h}</td>)}
            </tr></tbody></table></div>
            <p className="mt-3 text-sm text-muted"><b>Tip:</b> keep a <b>Website</b> column and leave it empty when Google Maps shows no website — those become 🔥 Hot leads. Every business needs a phone, WhatsApp, email or Instagram.</p>
          </Card>
        </div>
      )}

      {step === 'preview' && read && table && (
        <>
          <Card className="mb-5">
            <h2 className="font-semibold">{fileName}: {read.rows.length} businesses ready{read.skipped.length > 0 && `, ${read.skipped.length} skipped`}</h2>
            <p className="mt-1 mb-4 text-sm text-muted">Check the columns were matched correctly before importing.</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {shown.map((f) => (
                <span key={f} className={cx('inline-flex h-8 items-center rounded-full border px-3 text-sm', columns[f] !== undefined ? 'border-ok/30 bg-ok-soft text-ok' : 'border-line bg-canvas text-muted')}>
                  {FIELD_LABEL[f]}{columns[f] !== undefined ? ` ← "${table[0][columns[f]!]}"` : ': not in sheet'}
                </span>
              ))}
            </div>
            {columns.website === undefined && <div className="mb-4"><Notice tone="warn">No <b>Website</b> column, so LeadPilot can't tell which businesses have no website. They will be marked <b>Verify</b>. Add a Website column (empty = no website) for accurate Hot leads.</Notice></div>}
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-canvas text-muted"><tr>{['Name', 'Phone', 'Website', 'Rating', 'Reviews', 'Address'].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
                <tbody>{read.rows.slice(0, 8).map((r, i) => (
                  <tr key={i} className="border-t border-line"><td className="px-3 py-2 font-medium">{r.name}</td><td className="px-3 py-2">{r.phone ?? r.whatsapp ?? '—'}</td><td className="px-3 py-2">{r.website ?? <span className="text-orange-700">none</span>}</td><td className="px-3 py-2">{r.rating ?? '—'}</td><td className="px-3 py-2">{r.reviews ?? '—'}</td><td className="max-w-56 truncate px-3 py-2">{r.address ?? '—'}</td></tr>
                ))}</tbody>
              </table>
            </div>
            {read.rows.length > 8 && <p className="mt-2 text-sm text-muted">…and {read.rows.length - 8} more.</p>}
            {read.skipped.length > 0 && (
              <details className="mt-4 text-sm"><summary className="cursor-pointer text-muted">Show the {read.skipped.length} skipped rows</summary>
                <ul className="mt-2 list-disc space-y-0.5 pl-5 text-muted">{read.skipped.slice(0, 50).map((sk) => <li key={sk.line}>Row {sk.line}: {sk.reason}</li>)}</ul>
              </details>
            )}
          </Card>
          <Card className="mb-5">
            <h2 className="mb-4 font-semibold">For businesses where the sheet doesn't say</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Country" htmlFor="imp_country" hint="Sets the price list (India ₹ / other countries $)."><Select id="imp_country" value={countryCode} onChange={(e) => setCountryCode(e.target.value)}>{COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</Select></Field>
              <Field label="City" htmlFor="imp_city"><Input id="imp_city" placeholder="Lucknow" value={city} onChange={(e) => setCity(e.target.value)} /></Field>
              <Field label="Business type" htmlFor="imp_type"><Input id="imp_type" placeholder="cafes" value={businessType} onChange={(e) => setBusinessType(e.target.value)} /></Field>
            </div>
          </Card>
          <div className="flex flex-wrap gap-2">
            <Button onClick={runImport} disabled={!read.rows.length}><ArrowRight size={16} /> Import {read.rows.length} businesses</Button>
            <Button variant="secondary" onClick={() => { setStep('source'); setTable(null); }}>Choose another sheet</Button>
          </div>
        </>
      )}

      {step === 'importing' && (
        <Card><p className="flex items-center gap-3 text-[15px]" role="status"><Loader2 size={18} className="animate-spin text-accent" /> Importing {progress.done} of {progress.total}…</p></Card>
      )}

      {step === 'done' && result && (
        <Card>
          <h2 className="mb-4 font-semibold">Import finished</h2>
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Mini label="Imported" value={result.imported} />
            <Mini label="Hot (no website)" value={result.hot} hot />
            <Mini label="Already in LeadPilot" value={result.duplicates} />
            <Mini label="Skipped by lessons" value={result.blocked.length} />
          </div>
          {result.checking > 0 && (checksDone
            ? <p className="mb-3 text-[15px] text-muted">{result.checking === 1 ? 'The 1 website was checked.' : `All ${result.checking} websites checked.`} Weak or old ones are now Warm leads.</p>
            : <p className="mb-3 flex items-center gap-2 text-[15px] text-muted" role="status"><Loader2 size={16} className="animate-spin text-accent" /> Checking {result.checking} websites ({Math.min(progress.checking, result.checking)} done)…</p>)}
          {result.blocked.length > 0 && (
            <details className="mb-3 text-sm"><summary className="cursor-pointer text-muted">Why {result.blocked.length} were skipped (things you taught LeadPilot)</summary>
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-muted">{result.blocked.map((b, i) => <li key={i}>{b.name}: {b.reason}</li>)}</ul>
            </details>
          )}
          {sheetProblem && <div className="mb-3"><Notice tone="warn">Leads are saved, but the Google Sheet was not updated: {sheetProblem}</Notice></div>}
          <div className="flex flex-wrap gap-2">
            <Link to="/leads?sort=best&type=hot" className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-4 text-[15px] font-medium text-white hover:bg-accent-ink"><Flame size={16} /> See the best Hot leads</Link>
            <Button variant="secondary" onClick={() => { setStep('source'); setTable(null); setResult(null); setLink(''); }}>Import another sheet</Button>
          </div>
        </Card>
      )}
    </>
  );
}

function Mini({ label, value, hot }: { label: string; value: number; hot?: boolean }) {
  return (
    <div className={cx('rounded-xl border px-3 py-2.5', hot ? 'border-orange-200 bg-orange-50' : 'border-line bg-white')}>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
