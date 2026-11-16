import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Bot, Database, FileSpreadsheet, Globe, LayoutDashboard, Mail, MapPinned, Mic, RefreshCw, Rocket, Server, Store } from 'lucide-react';
import { Card, PageHeader, cx } from '../components/ui';
import { api, type Status } from '../lib/api';
import { usageThisMonth } from '../lib/data';

type Tone = 'live' | 'setup' | 'later';
interface Row { icon: ReactNode; what: string; where: string; cost: string; status: string; tone: Tone; note?: string; usage?: string }

const PILL: Record<Tone, string> = {
  live: 'bg-ok-soft text-ok',
  setup: 'bg-warn-soft text-warn',
  later: 'bg-canvas text-muted border border-line',
};
const DOT: Record<Tone, string> = { live: 'bg-ok', setup: 'bg-amber-500', later: 'bg-zinc-300' };

export function HostingPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [usage, setUsage] = useState<Awaited<ReturnType<typeof usageThisMonth>> | null>(null);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const [s, u] = await Promise.all([api.status(), usageThisMonth()]);
      setStatus(s);
      setUsage(u);
      setCheckedAt(new Date());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { refresh(); }, []);

  const key = (ok: boolean | undefined): Pick<Row, 'status' | 'tone'> =>
    status == null ? { status: 'Checking…', tone: 'later' } : ok ? { status: 'Connected', tone: 'live' } : { status: 'Key missing', tone: 'setup' };
  const sheetOk = status ? status.sheet_key && status.sheet_link : undefined;
  const sheetStatus: Pick<Row, 'status' | 'tone'> = status == null ? { status: 'Checking…', tone: 'later' }
    : sheetOk ? { status: 'Connected', tone: 'live' }
    : { status: !status.sheet_key ? 'Key missing' : 'Link missing', tone: 'setup' };

  const n = (k: keyof NonNullable<typeof usage>, one: string, many = `${one}s`) => (usage ? `${usage[k]} ${usage[k] === 1 ? one : many} this month` : undefined);

  const running: Row[] = [
    { icon: <LayoutDashboard size={18} />, what: 'This dashboard', where: 'Cloudflare Pages', cost: 'Free', status: 'Live', tone: 'live', note: 'leadpilot-app.pages.dev · updates itself on every change' },
    { icon: <Database size={18} />, what: 'Database, login, files', where: 'Supabase (Mumbai), free plan', cost: 'Free', status: 'Live', tone: 'live', note: 'Owner-only, two-factor login' },
    { icon: <Server size={18} />, what: 'LeadPilot server (search, checks, sheet)', where: 'Cloudflare Pages Functions', cost: 'Free up to 100,000 requests/day', status: 'Live', tone: 'live', usage: n('website_check', 'website check'), note: 'Fully automatic background jobs arrive in Phase 4–5' },
  ];
  const services: Row[] = [
    { icon: <Bot size={18} />, what: 'AI brain', where: 'Google Gemini API (Gemini 3.5 Flash-Lite)', cost: 'Free tier, or a fraction of a cent per command on paid', ...key(status?.ai), usage: n('command', 'command'), note: 'Use a billing-enabled key so Google does not use client data to improve its products' },
    { icon: <MapPinned size={18} />, what: 'Business search', where: 'Google Places API', cost: 'Monthly free allowance, then pay per use', ...key(status?.places), usage: n('search', 'search', 'searches'), note: 'Set a $10 budget alert in Google Cloud Billing' },
    { icon: <MapPinned size={18} />, what: 'Backup business search', where: 'OpenStreetMap (used only if Google fails)', cost: 'Free, no key', status: 'Ready', tone: 'live', note: 'No ratings or reviews; leads are marked “verify before contacting”' },
    { icon: <Mic size={18} />, what: 'Voice to text', where: 'ElevenLabs Scribe', cost: 'Pay per minute of audio', ...key(status?.voice), usage: n('transcribe', 'voice clip') },
    { icon: <FileSpreadsheet size={18} />, what: 'Lead sheet', where: 'Google Sheets “LeadPilot Leads”', cost: 'Free', ...sheetStatus, note: sheetOk ? undefined : 'Add the key in Cloudflare, then the link in Settings' },
  ];
  const later: Row[] = [
    { icon: <Globe size={18} />, what: 'Your domain', where: 'Cloudflare Registrar', cost: '≈ $10–12 per year', status: 'Not bought yet', tone: 'setup', note: 'Bought only after you approve the price' },
    { icon: <Mail size={18} />, what: 'Business email hello@your-domain', where: 'Cloudflare Email Routing → your Gmail', cost: 'Free', status: 'Needs domain', tone: 'later' },
    { icon: <Store size={18} />, what: 'Client demo websites', where: 'Netlify free plan', cost: 'Free', status: 'Phase 3', tone: 'later' },
    { icon: <Rocket size={18} />, what: 'Client final websites', where: "Client's own Netlify account", cost: 'Free · the client owns it', status: 'Phase 7', tone: 'later' },
  ];

  const all = [...running, ...services, ...later];
  const liveCount = all.filter((r) => r.tone === 'live').length;
  const setupCount = all.filter((r) => r.tone === 'setup').length;

  return (
    <>
      <PageHeader
        title="How my system is hosted"
        subtitle="Where everything lives and what it costs, in plain words."
        action={
          <button onClick={refresh} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-white px-3.5 text-sm font-medium text-muted hover:text-ink disabled:opacity-60">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> {loading ? 'Checking…' : 'Check again'}
          </button>
        }
      />

      {error && <div className="mb-5 rounded-xl bg-danger-soft px-4 py-3 text-[15px] text-danger">{error}</div>}

      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Summary label="Fixed monthly cost" value="$0" hint="Everything running today is on a free plan" />
        <Summary label="Working now" value={`${liveCount} of ${all.length}`} hint={checkedAt ? `Checked ${checkedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Checking…'} tone="live" />
        <Summary label="Needs your setup" value={String(setupCount)} hint={setupCount ? 'See the amber items below' : 'Nothing waiting on you'} tone={setupCount ? 'setup' : 'live'} />
      </div>

      <Group title="Running now" rows={running} />
      <Group title="Paid services" text="You only pay for what you use. Costs are estimates from each provider's public pricing." rows={services}
        footer={!sheetOk && status ? <Link to="/settings" className="text-sm font-medium text-accent-ink hover:underline">Open Settings → Google Sheet</Link> : undefined} />
      <Group title="Coming next" rows={later} />
    </>
  );
}

function Summary({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: Tone }) {
  return (
    <Card className="!p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className={cx('mt-1 text-3xl font-semibold tracking-tight tabular-nums', tone === 'setup' && 'text-warn', tone === 'live' && 'text-ok')}>{value}</p>
      <p className="mt-1 text-sm text-muted">{hint}</p>
    </Card>
  );
}

function Group({ title, text, rows, footer }: { title: string; text?: string; rows: Row[]; footer?: ReactNode }) {
  return (
    <section className="mb-8">
      <div className="mb-3">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {text && <p className="text-sm text-muted">{text}</p>}
      </div>
      <Card className="!p-0">
        <ul className="divide-y divide-line">
          {rows.map((r) => (
            <li key={r.what} className="grid grid-cols-[40px_minmax(0,1fr)] gap-x-3.5 gap-y-1 p-4 sm:grid-cols-[40px_minmax(0,1.3fr)_minmax(0,1fr)_132px] sm:items-center sm:gap-x-5 sm:px-5">
              <div className="row-span-3 grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent sm:row-span-1">{r.icon}</div>
              <div className="min-w-0">
                <p className="font-medium">{r.what}</p>
                <p className="text-sm text-muted">{r.where}</p>
                {r.note && <p className="mt-0.5 text-xs text-muted">{r.note}</p>}
              </div>
              <div className="min-w-0 text-[15px]">
                <p>{r.cost}</p>
                {r.usage && <p className="text-xs text-muted">{r.usage}</p>}
              </div>
              <div className="sm:justify-self-end">
                <span className={cx('inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium whitespace-nowrap', PILL[r.tone])}>
                  <span className={cx('h-1.5 w-1.5 rounded-full', DOT[r.tone])} />{r.status}
                </span>
              </div>
            </li>
          ))}
        </ul>
        {footer && <div className="border-t border-line px-5 py-3">{footer}</div>}
      </Card>
    </section>
  );
}
