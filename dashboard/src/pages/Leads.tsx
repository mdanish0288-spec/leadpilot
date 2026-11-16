import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { AlertTriangle, ArrowLeft, Camera, Download, ExternalLink, Flame, Globe, Mail, MapPin, Phone, Star, Sun, Upload, Users } from 'lucide-react';
import { Button, Card, EmptyState, Notice, PageHeader, Textarea, cx } from '../components/ui';
import { leadsCsv, loadLead, loadLeads, publishDemo, reportMistake, type Lead } from '../lib/data';
import { ConversationCard, DemoCard, SendCard } from '../components/LeadActions';
import { rankLeads } from '../../server/importer';
import { REASON_TEXT, type FeedbackReason } from '../../server/lessons';
import { LEAD_STAGES } from '../lib/types';

const TYPE_LABEL: Record<Lead['lead_type'], string> = { hot: 'Hot', warm: 'Warm', skip: 'Skip', pending: 'Checking…' };
const TYPE_STYLE: Record<Lead['lead_type'], string> = {
  hot: 'bg-orange-50 text-orange-700 border-orange-200', warm: 'bg-amber-50 text-amber-800 border-amber-200',
  skip: 'bg-zinc-100 text-zinc-600 border-zinc-200', pending: 'bg-accent-soft text-accent-ink border-accent/20',
};
const TIER_LABEL = { standard: 'Standard', premium: 'Premium', luxury: 'Luxury' } as const;
const SITE_LABEL: Record<Lead['website_status'], string> = {
  none: 'No website', social_only: 'Only a social / listing page', pending: 'Being checked', broken: "Website doesn't load", weak: 'Weak or old website', good: 'Good website',
};

export function TypeBadge({ t }: { t: Lead['lead_type'] }) {
  return <span className={cx('inline-flex h-6 items-center gap-1 rounded-full border px-2.5 text-xs font-medium', TYPE_STYLE[t])}>{t === 'hot' && <Flame size={12} />}{t === 'warm' && <Sun size={12} />}{TYPE_LABEL[t]}</span>;
}

export function LeadsPage() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState('');
  const [params, setParams] = useSearchParams();
  const stage = params.get('stage');
  const type = params.get('type');

  useEffect(() => { loadLeads().then(setLeads).catch((e) => setError(e.message)); }, []);

  const stageCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of leads ?? []) m.set(l.stage, (m.get(l.stage) ?? 0) + 1);
    return m;
  }, [leads]);

  const sort = params.get('sort') ?? 'best';
  const filtered = (leads ?? []).filter((l) => (!stage || l.stage === stage) && (!type || l.lead_type === type));
  const shown = sort === 'best' ? rankLeads(filtered) : filtered;
  const [downloading, setDownloading] = useState(false);
  const [bulk, setBulk] = useState<{ done: number; total: number; error: string } | null>(null);
  async function makeAllDemos() {
    const todo = (leads ?? []).filter((l) => l.lead_type === 'hot' && l.stage !== 'Do Not Contact');
    setBulk({ done: 0, total: todo.length, error: '' });
    const updated = new Map<string, Lead>();
    for (let i = 0; i < todo.length; i++) {
      try { updated.set(todo[i].id, await publishDemo(todo[i])); }
      catch (e) { setBulk({ done: i, total: todo.length, error: `${todo[i].name}: ${(e as Error).message}` }); break; }
      setBulk((b) => (b ? { ...b, done: i + 1 } : b));
    }
    setLeads((ls) => ls?.map((l) => updated.get(l.id) ?? l) ?? null);
  }
  async function download() {
    setDownloading(true);
    try {
      const blob = new Blob(['﻿' + (await leadsCsv())], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `leadpilot-leads-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) { setError((e as Error).message); } finally { setDownloading(false); }
  }
  const setFilter = (k: string, v: string | null) => { const p = new URLSearchParams(params); if (v) p.set(k, v); else p.delete(k); p.delete('search'); setParams(p); };

  return (
    <>
      <PageHeader title="Leads" subtitle="Every business LeadPilot finds, from first contact to delivery."
        action={<div className="flex flex-wrap gap-2">
          <Link to="/leads/import" className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-4 text-[15px] font-medium text-white hover:bg-accent-ink"><Upload size={16} /> Import leads</Link>
          <Button variant="secondary" onClick={makeAllDemos} disabled={!!bulk && bulk.done < bulk.total && !bulk.error || !(leads ?? []).some((l) => l.lead_type === 'hot')}>Make / update demos for Hot leads</Button>
          <Button variant="secondary" onClick={download} disabled={downloading || !leads?.length}><Download size={16} /> {downloading ? 'Preparing…' : 'Download CSV'}</Button>
        </div>} />
      {error && <Notice tone="danger">{error}</Notice>}
      {bulk && <div className="mb-4"><Notice tone={bulk.error ? 'danger' : bulk.done === bulk.total ? 'ok' : 'info'}>{bulk.error ? `Stopped: ${bulk.error}` : bulk.done === bulk.total ? `Done: ${bulk.total} demo websites built in each salon's own colours. Open each lead to check its demo and send it.` : `Building demo websites… ${bulk.done} of ${bulk.total}`}</Notice></div>}

      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <Chip on={!stage} onClick={() => setFilter('stage', null)}>All <span className="opacity-70">{leads?.length ?? 0}</span></Chip>
        {LEAD_STAGES.map((s) => <Chip key={s} on={stage === s} onClick={() => setFilter('stage', s)}>{s} <span className="tabular-nums opacity-70">{stageCounts.get(s) ?? 0}</span></Chip>)}
      </div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <select aria-label="Sort leads" value={sort} onChange={(e) => setFilter('sort', e.target.value)} className="h-8 rounded-full border border-line bg-white px-3 text-sm text-muted">
          <option value="best">Best first</option><option value="new">Newest first</option>
        </select>
        {([null, 'hot', 'warm', 'skip', 'pending'] as const).map((t) => (
          <Chip key={t ?? 'all'} small on={type === t} onClick={() => setFilter('type', t)}>{t ? TYPE_LABEL[t] : 'Any type'}</Chip>
        ))}
      </div>

      {leads === null ? <p className="text-muted">Loading leads…</p> : shown.length === 0 ? (
        <Card className="!p-0"><EmptyState icon={<Users size={22} />} title={leads.length ? 'No leads match this filter' : 'No leads yet'} text={leads.length ? 'Pick another stage or type above.' : 'Run a search from Home, for example "Find painters in Vancouver".'} /></Card>
      ) : (
        <ul className="grid grid-cols-1 gap-3">
          {shown.map((l) => (
            <li key={l.id} className="min-w-0">
              <Link to={`/leads/${l.id}`} className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4 transition-colors hover:border-accent/40 sm:p-5">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-canvas text-lg font-semibold tabular-nums" title="Business score">{l.score ?? '–'}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">{l.name}</p>
                    <TypeBadge t={l.lead_type} />
                    {l.demo_link && <span className="inline-flex h-6 items-center rounded-full bg-ok-soft px-2.5 text-xs font-medium text-ok">Demo ready</span>}
                    {l.needs_verification && <span className="inline-flex h-6 items-center rounded-full border border-line bg-white px-2.5 text-xs font-medium text-muted">Verify</span>}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-muted">
                    {[l.neighbourhood, l.city, l.country].filter(Boolean).join(', ')} · {l.business_type}
                    {l.rating != null && <> · <Star size={12} className="inline -translate-y-px fill-amber-400 text-amber-400" /> {l.rating} ({l.review_count})</>}
                  </p>
                </div>
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-medium">{l.pricing_tier ? TIER_LABEL[l.pricing_tier] : '—'}</p>
                  <p className="text-xs text-muted">{l.stage}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Chip({ on, onClick, children, small }: { on: boolean; onClick: () => void; children: React.ReactNode; small?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
      className={cx('inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm', small ? 'h-8' : 'h-9', on ? 'border-accent bg-accent-soft text-accent-ink' : 'border-line bg-white text-muted hover:text-ink')}>
      {children}
    </button>
  );
}

export function LeadDetailPage() {
  const { id } = useParams();
  const [lead, setLead] = useState<Lead | null | undefined>(undefined);
  const [error, setError] = useState('');
  useEffect(() => { if (id) loadLead(id).then(setLead).catch((e) => setError(e.message)); }, [id]);

  if (error) return <Notice tone="danger">{error}</Notice>;
  if (lead === undefined) return <p className="text-muted">Loading…</p>;
  if (lead === null) return <Notice tone="warn">This lead was not found.</Notice>;

  return (
    <>
      <Link to="/leads" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft size={16} /> All leads</Link>
      <PageHeader title={lead.name} subtitle={`${lead.business_type} · ${[lead.city, lead.country].filter(Boolean).join(', ')}`}
        action={<div className="flex gap-2"><TypeBadge t={lead.lead_type} /><span className="inline-flex h-6 items-center rounded-full border border-line bg-white px-2.5 text-xs font-medium">{lead.stage}</span></div>} />

      {lead.needs_verification && (
        <div className="mb-5"><Notice tone="warn">
          <b>Verify before contacting.</b> This lead came from the free OpenStreetMap backup: no Google rating or reviews, and OpenStreetMap
          sometimes misses a business's website. Search the name on Google Maps to confirm it has no website before sending a demo.
        </Notice></div>
      )}
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <DemoCard lead={lead} onChange={setLead} />
          <SendCard lead={lead} onChange={setLead} />
          <ConversationCard lead={lead} onChange={setLead} />
          <Card>
            <h2 className="mb-4 font-semibold">Business details</h2>
            <dl className="grid gap-3 text-[15px]">
              <Row icon={<MapPin size={16} />} label="Address">{lead.full_address ?? '—'}</Row>
              <Row icon={<Phone size={16} />} label="Phone">{lead.phone_intl ?? lead.phone ?? '—'}</Row>
              <Row icon={<Mail size={16} />} label="Public email">{lead.email ?? 'None published'}</Row>
              <Row icon={<Camera size={16} />} label="Instagram">{lead.instagram ? <a className="text-accent-ink underline" href={lead.instagram} target="_blank" rel="noopener noreferrer">{lead.instagram.replace('https://www.', '')}</a> : 'Not found'}</Row>
              <Row icon={<Globe size={16} />} label="Website">{lead.website ? <a className="break-all text-accent-ink underline" href={lead.website} target="_blank" rel="noopener noreferrer">{lead.website}</a> : 'None'} <span className="text-muted">— {SITE_LABEL[lead.website_status]}</span></Row>
              {lead.maps_url && <Row icon={<ExternalLink size={16} />} label={lead.data_source === 'openstreetmap' ? 'Map' : 'Google Maps'}><a className="text-accent-ink underline" href={lead.maps_url} target="_blank" rel="noopener noreferrer">Open listing</a></Row>}
              {lead.data_source === 'openstreetmap' && <Row icon={<ExternalLink size={16} />} label="Check on Google"><a className="text-accent-ink underline" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lead.name} ${lead.city ?? ''}`)}`} target="_blank" rel="noopener noreferrer">Search this business on Google Maps</a></Row>}
            </dl>
            {lead.website_issues.length > 0 && (
              <div className="mt-4 rounded-xl bg-amber-50 p-4 text-[15px] text-amber-900">
                <p className="mb-1.5 font-medium">Website problems found</p>
                <ul className="list-disc space-y-1 pl-5">{lead.website_issues.map((i) => <li key={i}>{i}</li>)}</ul>
              </div>
            )}
          </Card>

          {lead.top_reviews.length > 0 && (
            <Card>
              <h2 className="mb-4 font-semibold">Top Google reviews</h2>
              <ul className="space-y-4">
                {lead.top_reviews.map((r, i) => (
                  <li key={i} className="border-l-2 border-accent/30 pl-4">
                    <p className="text-[15px]">“{r.text}”</p>
                    <p className="mt-1 text-sm text-muted">{r.rating != null && `${r.rating}★ · `}{r.author ?? 'Google reviewer'}{r.when && ` · ${r.when}`}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {lead.opening_hours?.weekdayDescriptions && (
            <Card>
              <h2 className="mb-3 font-semibold">Opening hours</h2>
              <ul className="grid gap-1 text-[15px]">{lead.opening_hours.weekdayDescriptions.map((d) => <li key={d}>{d}</li>)}</ul>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <Card>
            <div className="flex items-end justify-between">
              <div><p className="text-sm text-muted">Business score</p><p className="text-4xl font-semibold tracking-tight tabular-nums">{lead.score ?? '–'}<span className="text-lg text-muted">/100</span></p></div>
              <div className="text-right"><p className="text-sm text-muted">Pricing tier</p><p className="text-lg font-semibold">{lead.pricing_tier ? TIER_LABEL[lead.pricing_tier] : '—'}</p></div>
            </div>
            <ul className="mt-5 space-y-3">
              {lead.score_reasons.map((r) => r.max === 0 ? (
                <li key={r.label}><p className="text-xs text-muted">{r.detail}</p></li>
              ) : (
                <li key={r.label}>
                  <div className="flex justify-between text-sm"><span className="font-medium">{r.label}</span><span className="tabular-nums text-muted">{r.points}/{r.max}</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-canvas"><div className="h-1.5 rounded-full bg-accent" style={{ width: `${(r.points / r.max) * 100}%` }} /></div>
                  <p className="mt-1 text-xs text-muted">{r.detail}</p>
                </li>
              ))}
            </ul>
          </Card>
          <ReportMistake lead={lead} onDone={(l) => setLead(l)} />
          <Card>
            <h2 className="mb-2 font-semibold">Coming in later phases</h2>
            <p className="text-sm text-muted">Demo website, chats (email, WhatsApp, Instagram), client requirements, deep photo analysis and AI notes appear here as each phase is built.</p>
            {lead.sheet_row && <p className="mt-3 text-sm text-muted">In Google Sheet: row {lead.sheet_row}</p>}
            {lead.data_source === 'import' && <p className="mt-3 text-xs text-muted">Imported from your sheet</p>}
            {lead.data_source === 'openstreetmap' && <p className="mt-3 text-xs text-muted">Data © OpenStreetMap contributors (ODbL)</p>}
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[20px_110px_1fr] items-start gap-2">
      <span className="mt-0.5 text-muted">{icon}</span><dt className="text-muted">{label}</dt><dd className="min-w-0">{children}</dd>
    </div>
  );
}

/** Learning loop: the owner marks what was wrong; LeadPilot remembers and never repeats it. */
function ReportMistake({ lead, onDone }: { lead: Lead; onDone: (l: Lead) => void }) {
  const [reason, setReason] = useState<FeedbackReason | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'danger'; text: string } | null>(null);
  async function save() {
    if (!reason) return;
    setBusy(true);
    try {
      await reportMistake(lead, reason, note);
      setMsg({ tone: 'ok', text: 'Saved. LeadPilot will skip this business (and others like it) in future searches and imports.' });
      onDone({ ...lead, lead_type: 'skip', stage: ['closed', 'not_target', 'chain'].includes(reason) ? 'Not Interested' : lead.stage });
      setReason(null);
      setNote('');
    } catch (e) {
      setMsg({ tone: 'danger', text: (e as Error).message });
    } finally { setBusy(false); }
  }
  return (
    <Card>
      <h2 className="mb-1 flex items-center gap-2 font-semibold"><AlertTriangle size={16} className="text-warn" /> Report a mistake</h2>
      <p className="mb-3 text-sm text-muted">Wrong lead? Tell LeadPilot why — it learns and won't repeat it.</p>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(REASON_TEXT) as FeedbackReason[]).map((r) => (
          <button key={r} type="button" aria-pressed={reason === r} onClick={() => { setReason(r); setMsg(null); }}
            className={cx('rounded-full border px-3 py-1.5 text-sm', reason === r ? 'border-accent bg-accent-soft text-accent-ink' : 'border-line bg-white text-muted hover:text-ink')}>{REASON_TEXT[r]}</button>
        ))}
      </div>
      {reason && (
        <div className="mt-3 space-y-3">
          <Textarea aria-label="Optional note" placeholder="Optional note, e.g. their website is example.com" value={note} onChange={(e) => setNote(e.target.value)} className="!min-h-16" />
          <Button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save and learn'}</Button>
        </div>
      )}
      {msg && <div className="mt-3"><Notice tone={msg.tone}>{msg.text}</Notice></div>}
    </Card>
  );
}
