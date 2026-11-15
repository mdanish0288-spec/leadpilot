import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ImageUp, Plus, Save } from 'lucide-react';
import { Button, Card, Field, Input, Notice, PageHeader, Select, Textarea, Toggle, cx } from '../components/ui';
import { loadSettings, loadTiers, saveSettings, saveTiers, signedFileUrl, uploadOwnerFile } from '../lib/data';
import { TIERS, USDT_NETWORKS, WEEKDAYS, type PriceTier, type Settings, type Weekday } from '../lib/types';
import { formatMoney, HARD_MAX_DAILY_EMAILS, launchOfferClashes, validatePriceTier, validateSettings, type Errors } from '../lib/validate';

const DAY_LABEL: Record<Weekday, string> = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
const REGION_LABEL = (r: string) => (r === 'INTL' ? 'All other countries' : r === 'IN' ? 'India' : r);
const TIME_ZONES = ['Asia/Kolkata', 'America/Toronto', 'America/Vancouver', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Dubai', 'Australia/Sydney'];

function Section({ title, text, children }: { title: string; text?: string; children: ReactNode }) {
  return (
    <Card className="mb-5">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {text && <p className="mt-1 mb-5 text-[15px] text-muted">{text}</p>}
      {!text && <div className="mb-5" />}
      {children}
    </Card>
  );
}

function FileField({ label, path, kind, onUploaded }: { label: string; path: string | null; kind: 'logo' | 'upi-qr' | 'paypal-qr'; onUploaded: (p: string) => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { signedFileUrl(path).then(setUrl); }, [path]);
  const id = `file-${kind}`;
  return (
    <div className="space-y-1.5">
      <span className="block text-sm font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-canvas">
          {url ? <img src={url} alt="" className="h-full w-full object-contain" /> : <ImageUp size={20} className="text-zinc-400" aria-hidden />}
        </div>
        <label htmlFor={id} className="inline-flex h-10 cursor-pointer items-center rounded-xl border border-line bg-white px-3.5 text-sm font-medium hover:bg-canvas">
          {path ? 'Replace image' : 'Upload image'}
        </label>
        <input id={id} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only"
          onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; setErr(''); try { onUploaded(await uploadOwnerFile(kind, f)); } catch (x) { setErr((x as Error).message); } }} />
      </div>
      {err && <p className="text-sm text-danger">{err}</p>}
    </div>
  );
}

export function SettingsPage() {
  const [s, setS] = useState<Settings | null>(null);
  const [tiers, setTiers] = useState<PriceTier[]>([]);
  const [loadError, setLoadError] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [tierErrors, setTierErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ tone: 'ok' | 'danger'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [newRegion, setNewRegion] = useState({ region: '', currency: '' });

  useEffect(() => {
    Promise.all([loadSettings(), loadTiers()]).then(([a, b]) => { setS(a); setTiers(b); }).catch((e) => setLoadError(e.message));
  }, []);

  const clashes = useMemo(() => (s ? launchOfferClashes(tiers, s.launch_offer_percent) : []), [s, tiers]);

  if (loadError) return <Notice tone="danger">{loadError}</Notice>;
  if (!s) return <p className="text-muted">Loading settings…</p>;

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => { setS({ ...s, [k]: v }); setDirty(true); setStatus(null); };
  const num = (k: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement>) => set(k, (e.target.value === '' ? NaN : Number(e.target.value)) as never);
  const txt = (k: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => set(k, e.target.value as never);
  const setTier = (i: number, k: 'start_price' | 'lowest_price', v: string) => {
    const next = [...tiers]; next[i] = { ...next[i], [k]: v === '' ? NaN : Number(v) }; setTiers(next); setDirty(true); setStatus(null);
  };
  const regions = [...new Set(tiers.map((t) => t.region))];

  function addRegion() {
    const region = newRegion.region.trim().toUpperCase();
    const currency = newRegion.currency.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(region) || regions.includes(region)) return setTierErrors({ _new: 'Use a new 2-letter country code, e.g. CA, GB, US, AE.' });
    if (!/^[A-Z]{3}$/.test(currency)) return setTierErrors({ _new: 'Use a 3-letter currency code, e.g. CAD, GBP, USD, AED.' });
    const base = tiers.filter((t) => t.region === 'INTL');
    setTiers([...tiers, ...TIERS.map((tier) => ({ region, tier, currency, start_price: base.find((b) => b.tier === tier)?.start_price ?? 1, lowest_price: base.find((b) => b.tier === tier)?.lowest_price ?? 1 }))]);
    setNewRegion({ region: '', currency: '' }); setTierErrors({}); setDirty(true);
  }

  async function save() {
    if (!s) return;
    const e = validateSettings(s);
    const te: Record<string, string> = {};
    tiers.forEach((t) => { const m = validatePriceTier(t); if (m) te[`${t.region}-${t.tier}`] = m; });
    setErrors(e); setTierErrors(te);
    const count = Object.keys(e).length + Object.keys(te).length;
    if (count) return setStatus({ tone: 'danger', text: `Fix ${count} field${count > 1 ? 's' : ''} marked in red, then save again. Nothing was saved.` });
    setSaving(true);
    try {
      await saveSettings(s);
      await saveTiers(tiers);
      setDirty(false);
      setStatus({ tone: 'ok', text: 'Saved. Every change is recorded in the audit log.' });
    } catch (x) {
      setStatus({ tone: 'danger', text: (x as Error).message });
    } finally { setSaving(false); }
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Everything LeadPilot is allowed to say and charge comes from this page." />

      <Section title="You and your business" text="Shown in messages and on the demo banner. Never use a fake name.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your name" htmlFor="owner_name"><Input id="owner_name" value={s.owner_name} onChange={txt('owner_name')} /></Field>
          <Field label="Business name" htmlFor="business_name" hint="Appears as “Free demo designed for … by [this name]”."><Input id="business_name" value={s.business_name} onChange={txt('business_name')} /></Field>
          <Field label="Business email" htmlFor="business_email" error={errors.business_email} hint="e.g. hello@your-domain (set up in this phase)."><Input id="business_email" type="email" invalid={!!errors.business_email} value={s.business_email} onChange={txt('business_email')} /></Field>
          <Field label="WhatsApp number" htmlFor="whatsapp_number" error={errors.whatsapp_number} hint="With country code, e.g. +919876543210."><Input id="whatsapp_number" inputMode="tel" invalid={!!errors.whatsapp_number} value={s.whatsapp_number} onChange={txt('whatsapp_number')} /></Field>
          <Field label="Instagram handle" htmlFor="instagram_handle" error={errors.instagram_handle}><Input id="instagram_handle" placeholder="@yourstudio" invalid={!!errors.instagram_handle} value={s.instagram_handle} onChange={txt('instagram_handle')} /></Field>
          <FileField label="Logo" kind="logo" path={s.logo_path} onUploaded={(p) => set('logo_path', p)} />
        </div>
      </Section>

      <Section title="What clients get" text="LeadPilot only promises what is written here.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Field label="Services and what's included" htmlFor="services_included"><Textarea id="services_included" value={s.services_included} onChange={txt('services_included')} /></Field></div>
          <Field label="Delivery time (days)" htmlFor="delivery_days" error={errors.delivery_days}><Input id="delivery_days" type="number" min={1} max={90} invalid={!!errors.delivery_days} value={Number.isNaN(s.delivery_days) ? '' : s.delivery_days} onChange={num('delivery_days')} /></Field>
          <Field label="Advance payment (%)" htmlFor="advance_percent" error={errors.advance_percent} hint={`Client pays ${s.advance_percent || 0}% to start and ${100 - (s.advance_percent || 0)}% when the site is ready.`}><Input id="advance_percent" type="number" min={10} max={90} invalid={!!errors.advance_percent} value={Number.isNaN(s.advance_percent) ? '' : s.advance_percent} onChange={num('advance_percent')} /></Field>
          <Field label="Free change rounds before payment" htmlFor="free_change_rounds" error={errors.free_change_rounds}><Input id="free_change_rounds" type="number" min={0} max={10} invalid={!!errors.free_change_rounds} value={Number.isNaN(s.free_change_rounds) ? '' : s.free_change_rounds} onChange={num('free_change_rounds')} /></Field>
          <Field label="Change rounds after payment" htmlFor="paid_change_rounds" error={errors.paid_change_rounds}><Input id="paid_change_rounds" type="number" min={0} max={10} invalid={!!errors.paid_change_rounds} value={Number.isNaN(s.paid_change_rounds) ? '' : s.paid_change_rounds} onChange={num('paid_change_rounds')} /></Field>
        </div>
      </Section>

      <Section title="Prices" text="Start price is quoted first. LeadPilot never goes below the lowest price — the database refuses it. Prices include the first-year domain.">
        <div className="space-y-5">
          {regions.map((region) => (
            <div key={region}>
              <p className="mb-2 text-sm font-medium">{REGION_LABEL(region)} <span className="text-muted">· {tiers.find((t) => t.region === region)?.currency}</span></p>
              <div className="grid gap-3 sm:grid-cols-3">
                {tiers.map((t, i) => t.region !== region ? null : (
                  <div key={t.tier} className={cx('rounded-xl border p-3.5', tierErrors[`${t.region}-${t.tier}`] ? 'border-danger' : 'border-line')}>
                    <p className="mb-2.5 text-sm font-medium capitalize">{t.tier}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Start" htmlFor={`${region}-${t.tier}-start`}><Input id={`${region}-${t.tier}-start`} type="number" min={1} value={Number.isNaN(t.start_price) ? '' : t.start_price} onChange={(e) => setTier(i, 'start_price', e.target.value)} /></Field>
                      <Field label="Lowest" htmlFor={`${region}-${t.tier}-low`}><Input id={`${region}-${t.tier}-low`} type="number" min={1} value={Number.isNaN(t.lowest_price) ? '' : t.lowest_price} onChange={(e) => setTier(i, 'lowest_price', e.target.value)} /></Field>
                    </div>
                    {tierErrors[`${t.region}-${t.tier}`] && <p className="mt-2 text-sm text-danger">{tierErrors[`${t.region}-${t.tier}`]}</p>}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="rounded-xl border border-dashed border-line p-3.5">
            <p className="mb-2.5 text-sm font-medium">Add prices for one country</p>
            <div className="flex flex-wrap items-end gap-2">
              <div className="w-28"><Field label="Country" htmlFor="new-region"><Input id="new-region" placeholder="CA" maxLength={2} value={newRegion.region} onChange={(e) => setNewRegion({ ...newRegion, region: e.target.value })} /></Field></div>
              <div className="w-28"><Field label="Currency" htmlFor="new-currency"><Input id="new-currency" placeholder="CAD" maxLength={3} value={newRegion.currency} onChange={(e) => setNewRegion({ ...newRegion, currency: e.target.value })} /></Field></div>
              <Button variant="secondary" type="button" onClick={addRegion}><Plus size={16} aria-hidden /> Add</Button>
            </div>
            {tierErrors._new && <p className="mt-2 text-sm text-danger">{tierErrors._new}</p>}
          </div>
        </div>
      </Section>

      <Section title="Launch offer" text="A real discount for the first deals in each city. LeadPilot counts deals and stops the offer automatically.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Discount (%)" htmlFor="launch_offer_percent" error={errors.launch_offer_percent}><Input id="launch_offer_percent" type="number" min={0} max={50} step="0.5" invalid={!!errors.launch_offer_percent} value={Number.isNaN(s.launch_offer_percent) ? '' : s.launch_offer_percent} onChange={num('launch_offer_percent')} /></Field>
          <Field label="Number of deals per city" htmlFor="launch_offer_deals_per_city" error={errors.launch_offer_deals_per_city}><Input id="launch_offer_deals_per_city" type="number" min={0} max={100} invalid={!!errors.launch_offer_deals_per_city} value={Number.isNaN(s.launch_offer_deals_per_city) ? '' : s.launch_offer_deals_per_city} onChange={num('launch_offer_deals_per_city')} /></Field>
        </div>
        {clashes.length > 0 && (
          <div className="mt-4"><Notice tone="warn">
            <b>Decision needed:</b> with a {s.launch_offer_percent}% launch offer, these prices would fall below your lowest price:
            <ul className="mt-1.5 list-disc pl-5">{clashes.map((c) => <li key={`${c.region}-${c.tier}`}>{REGION_LABEL(c.region)} {c.tier}: {formatMoney(c.start_price, c.currency)} → {formatMoney(c.offerPrice, c.currency)} (lowest is {formatMoney(c.lowest_price, c.currency)})</li>)}</ul>
            <p className="mt-1.5">Until you change the discount or the lowest price, LeadPilot will not offer the launch discount on these tiers — it would never go below the lowest price or advertise a discount that isn't real.</p>
          </Notice></div>
        )}
      </Section>

      <Section title="Meetings" text="LeadPilot offers clients 3 slots inside these hours, converted to their time zone.">
        <div className="space-y-4">
          <div>
            <span className="mb-1.5 block text-sm font-medium">Days</span>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((d) => {
                const on = s.meeting_days.includes(d);
                return <button key={d} type="button" aria-pressed={on} onClick={() => set('meeting_days', on ? s.meeting_days.filter((x) => x !== d) : WEEKDAYS.filter((x) => x === d || s.meeting_days.includes(x)))}
                  className={cx('h-10 min-w-14 rounded-xl border px-3 text-sm font-medium', on ? 'border-accent bg-accent-soft text-accent-ink' : 'border-line bg-white text-muted')}>{DAY_LABEL[d]}</button>;
              })}
            </div>
            {errors.meeting_days && <p className="mt-1.5 text-sm text-danger">{errors.meeting_days}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="From" htmlFor="meeting_start" error={errors.meeting_start}><Input id="meeting_start" type="time" value={s.meeting_start} onChange={txt('meeting_start')} /></Field>
            <Field label="Until" htmlFor="meeting_end" error={errors.meeting_end}><Input id="meeting_end" type="time" invalid={!!errors.meeting_end} value={s.meeting_end} onChange={txt('meeting_end')} /></Field>
            <Field label="Your time zone" htmlFor="timezone" error={errors.timezone}>
              <Select id="timezone" value={s.timezone} onChange={txt('timezone')}>{[...new Set([s.timezone, ...TIME_ZONES])].map((z) => <option key={z} value={z}>{z === 'Asia/Kolkata' ? 'India (IST)' : z}</option>)}</Select>
            </Field>
          </div>
        </div>
      </Section>

      <Section title="Payment details" text="Sent ONLY after a client clearly says yes. Never in a first message. Double-check every character.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="UPI ID (India)" htmlFor="upi_id" error={errors.upi_id}><Input id="upi_id" placeholder="name@okhdfcbank" invalid={!!errors.upi_id} value={s.upi_id} onChange={txt('upi_id')} /></Field>
          <FileField label="UPI QR code" kind="upi-qr" path={s.upi_qr_path} onUploaded={(p) => set('upi_qr_path', p)} />
          <Field label="PayPal link (other countries)" htmlFor="paypal_link" error={errors.paypal_link}><Input id="paypal_link" placeholder="https://paypal.me/yourname" invalid={!!errors.paypal_link} value={s.paypal_link} onChange={txt('paypal_link')} /></Field>
          <FileField label="PayPal QR code" kind="paypal-qr" path={s.paypal_qr_path} onUploaded={(p) => set('paypal_qr_path', p)} />
          <Field label="USDT network" htmlFor="usdt_network" hint="The network is always stated next to the address in messages.">
            <Select id="usdt_network" value={s.usdt_network} onChange={txt('usdt_network')}>{USDT_NETWORKS.map((n) => <option key={n}>{n}</option>)}</Select>
          </Field>
          <Field label="USDT wallet address" htmlFor="usdt_address" error={errors.usdt_address}><Input id="usdt_address" spellCheck={false} className="font-mono text-sm" invalid={!!errors.usdt_address} value={s.usdt_address} onChange={txt('usdt_address')} /></Field>
        </div>
      </Section>

      <Section title="Messages and safety">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First emails per day" htmlFor="daily_email_limit" error={errors.daily_email_limit} hint={`Maximum ${HARD_MAX_DAILY_EMAILS}. Sent only inside the lead's business hours.`}><Input id="daily_email_limit" type="number" min={0} max={HARD_MAX_DAILY_EMAILS} invalid={!!errors.daily_email_limit} value={Number.isNaN(s.daily_email_limit) ? '' : s.daily_email_limit} onChange={num('daily_email_limit')} /></Field>
          <Field label="Alert me if a domain costs more than (USD/year)" htmlFor="domain_alert_usd" error={errors.domain_alert_usd}><Input id="domain_alert_usd" type="number" min={1} invalid={!!errors.domain_alert_usd} value={Number.isNaN(s.domain_alert_usd) ? '' : s.domain_alert_usd} onChange={num('domain_alert_usd')} /></Field>
          <div className="flex items-start justify-between gap-4 rounded-xl border border-line p-4 sm:col-span-2">
            <div>
              <label htmlFor="auto_reply" className="font-medium">Auto-reply to clients</label>
              <p className="text-sm text-muted">When off, every reply waits for your approval in Alerts. Angry clients, legal questions and anything unusual always wait for you, even when on.</p>
            </div>
            <Toggle id="auto_reply" label="Auto-reply to clients" checked={s.auto_reply} onChange={(v) => set('auto_reply', v)} />
          </div>
        </div>
      </Section>

      <div className="sticky bottom-20 z-10 mt-2 lg:bottom-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white/95 p-3 pl-4 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.18)] backdrop-blur">
          <div className="min-w-0 flex-1 text-[15px]">
            {status ? <span className={status.tone === 'ok' ? 'text-ok' : 'text-danger'} role="status">{status.text}</span> : <span className="text-muted">{dirty ? 'You have unsaved changes.' : 'All changes saved.'}</span>}
          </div>
          <Button onClick={save} disabled={saving || !dirty}><Save size={18} aria-hidden /> {saving ? 'Saving…' : 'Save changes'}</Button>
        </div>
      </div>
    </>
  );
}
