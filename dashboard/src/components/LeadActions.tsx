import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Copy, ExternalLink, Globe, Loader2, Mail, MessageCircle, Send, Sparkles, XCircle } from 'lucide-react';
import { Button, Card, Notice, Textarea, cx } from './ui';
import { api } from '../lib/api';
import { loadMessages, loadSettings, logOutgoing, publishDemo, saveStoreColors, type Lead, type Message } from '../lib/data';
import { allPass, checkFirstMessage, emailMessage, mailtoLink, whatsappLink, whatsappMessage, type Sender, type WaMode } from '../../server/outreach';

const isPhone = () => /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
function useWaMode(): [WaMode, (m: WaMode) => void] {
  const [mode, setMode] = useState<WaMode>(() => {
    if (isPhone()) return 'phone';
    try { return (localStorage.getItem('lp-wa-mode') as WaMode) || 'app'; } catch { return 'app'; }
  });
  return [mode, (m) => { setMode(m); try { localStorage.setItem('lp-wa-mode', m); } catch { /* ignore */ } }];
}
function WaModePicker({ mode, setMode }: { mode: WaMode; setMode: (m: WaMode) => void }) {
  if (isPhone()) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
      On this computer open:
      {([['app', 'WhatsApp app'], ['web', 'WhatsApp Web']] as const).map(([m, label]) => (
        <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}
          className={cx('rounded-full border px-3 py-1', mode === m ? 'border-accent bg-accent-soft text-accent-ink' : 'border-line bg-white')}>{label}</button>
      ))}
    </div>
  );
}

/** Phase 3: build / rebuild / open the demo website. */
export function DemoCard({ lead, onChange }: { lead: Lead; onChange: (l: Lead) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const initial = (lead.store_colors ?? '').match(/#[0-9a-f]{6}/gi) ?? [];
  const [cols, setCols] = useState<string[]>([initial[0] ?? '#1b1614', initial[1] ?? '#9a5b3c', initial[2] ?? '#fbf8f5']);
  async function make() {
    setBusy(true); setErr('');
    try {
      const store_colors = cols.join(',');
      if (store_colors !== lead.store_colors) await saveStoreColors(lead.id, store_colors);
      onChange(await publishDemo({ ...lead, store_colors }));
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  const colourPicker = (
    <div className="mb-4 rounded-xl border border-line p-3">
      <p className="mb-2 text-sm font-medium">Business colours</p>
      <p className="mb-3 text-xs text-muted">Open their Google Maps photos once and match the sign, walls or furniture.</p>
      <div className="flex flex-wrap gap-3">
        {['Dark', 'Main colour', 'Light'].map((label, i) => (
          <label key={label} className="flex items-center gap-2 text-sm">
            <input type="color" value={cols[i]} onChange={(e) => setCols(cols.map((c, j) => (j === i ? e.target.value : c)))} className="h-9 w-9 cursor-pointer rounded-lg border border-line" />{label}
          </label>
        ))}
      </div>
      {lead.maps_url && <a href={lead.maps_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm text-accent-ink underline">See their photos on Google Maps</a>}
    </div>
  );
  return (
    <Card>
      <h2 className="mb-1 flex items-center gap-2 font-semibold"><Globe size={17} className="text-accent" /> Demo website</h2>
      {lead.demo_link ? (
        <>
          <p className="mb-3 text-sm text-muted">Live and ready to send. Open it on your phone and check it before sending.</p>
          {colourPicker}
          <a href={lead.demo_link} target="_blank" rel="noopener noreferrer" className="mb-3 block truncate rounded-lg bg-canvas px-3 py-2 text-sm text-accent-ink underline">{lead.demo_link}</a>
          <div className="flex flex-wrap gap-2">
            <a href={lead.demo_link} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-4 text-[15px] font-medium text-white hover:bg-accent-ink"><ExternalLink size={16} /> Open demo</a>
            <Button variant="secondary" onClick={make} disabled={busy}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Rebuild</Button>
          </div>
        </>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted">A premium one-page website made from this business's real details, with sample photos until they send their own.</p>
          {colourPicker}
          <Button onClick={make} disabled={busy}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} {busy ? 'Building…' : 'Make demo website'}</Button>
        </>
      )}
      {err && <div className="mt-3"><Notice tone="danger">{err}</Notice></div>}
    </Card>
  );
}

/** Phase 4: first message, checked automatically, sent by the owner with one tap. */
export function SendCard({ lead, onChange }: { lead: Lead; onChange: (l: Lead) => void }) {
  const [sender, setSender] = useState<Sender | null>(null);
  const [text, setText] = useState('');
  const [channel, setChannel] = useState<'whatsapp' | 'email' | 'instagram'>(lead.phone_intl ? 'whatsapp' : lead.email ? 'email' : 'instagram');
  const [msg, setMsg] = useState('');
  const [waMode, setWaMode] = useWaMode();
  useEffect(() => { loadSettings().then((s) => setSender({ name: s.owner_name, businessName: s.business_name, whatsapp: s.whatsapp_number, email: s.business_email })).catch(() => {}); }, []);
  const ol = { name: lead.name, rating: lead.rating, review_count: lead.review_count, website_status: lead.website_status, email: lead.email, phone_intl: lead.phone_intl, instagram: lead.instagram };
  const email = useMemo(() => (sender && lead.demo_link ? emailMessage(ol, sender, lead.demo_link) : null), [sender, lead.demo_link]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!sender || !lead.demo_link) return;
    setText(channel === 'email' ? email!.body : whatsappMessage(ol, sender, lead.demo_link));
  }, [sender, lead.demo_link, channel]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!lead.demo_link) return null;
  if (!sender) return <Card><p className="text-sm text-muted">Loading…</p></Card>;
  const checks = checkFirstMessage(text, ol, sender, lead.demo_link, channel);
  const ok = allPass(checks);
  const blocked = lead.stage === 'Do Not Contact' || (lead.needs_verification && lead.data_source !== 'import');

  async function send() {
    if (!ok || blocked) return;
    if (channel === 'whatsapp') { const url = whatsappLink(lead.phone_intl!, text, waMode); if (waMode === 'app') window.location.href = url; else window.open(url, '_blank', 'noopener'); }
    if (channel === 'email') window.open(mailtoLink(lead.email!, email!.subject, text), '_self');
    if (channel === 'instagram') { await navigator.clipboard?.writeText(text); window.open(lead.instagram!, '_blank', 'noopener'); }
    await logOutgoing(lead, channel, text, checks, true);
    onChange({ ...lead, stage: ['New', 'Demo Ready'].includes(lead.stage) ? 'Contacted' : lead.stage, contacted_by: channel });
    setMsg(channel === 'instagram' ? 'Message copied. Paste it in the Instagram chat that just opened and press Send.' : 'Opened. Press Send there. LeadPilot logged the message and moved the lead to “Contacted”.');
  }

  const tab = (c: typeof channel, label: string, icon: React.ReactNode, available: boolean) => (
    <button type="button" disabled={!available} onClick={() => setChannel(c)} aria-pressed={channel === c}
      className={cx('inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm disabled:opacity-40', channel === c ? 'border-accent bg-accent-soft text-accent-ink' : 'border-line bg-white text-muted')}>{icon}{label}</button>
  );

  return (
    <Card>
      <h2 className="mb-3 flex items-center gap-2 font-semibold"><Send size={17} className="text-accent" /> Send the demo</h2>
      <div className="mb-3 flex flex-wrap gap-2">
        {tab('whatsapp', 'WhatsApp', <MessageCircle size={14} />, !!lead.phone_intl)}
        {tab('email', 'Email', <Mail size={14} />, !!lead.email)}
        {tab('instagram', 'Instagram', <Copy size={14} />, !!lead.instagram)}
      </div>
      <Textarea aria-label="Message" value={text} onChange={(e) => setText(e.target.value)} className="!min-h-56 text-[15px]" />
      <ul className="mt-3 space-y-1 text-sm">
        {checks.map((c) => <li key={c.label} className={cx('flex items-center gap-2', c.ok ? 'text-ok' : 'text-danger')}>{c.ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />}{c.label}</li>)}
      </ul>
      {blocked && <div className="mt-3"><Notice tone="warn">{lead.stage === 'Do Not Contact' ? 'This business asked not to be contacted.' : 'Verify this lead on Google Maps first (backup data).'}</Notice></div>}
      <Button className="mt-4 w-full" onClick={send} disabled={!ok || blocked}>
        {channel === 'whatsapp' ? <MessageCircle size={16} /> : channel === 'email' ? <Mail size={16} /> : <Copy size={16} />}
        {channel === 'whatsapp' ? 'Open WhatsApp with this message' : channel === 'email' ? 'Open email with this message' : 'Copy and open Instagram'}
      </Button>
      {channel === 'whatsapp' && <WaModePicker mode={waMode} setMode={setWaMode} />}
      <p className="mt-2 text-xs text-muted">You press Send yourself — first messages are never sent automatically.</p>
      {msg && <div className="mt-3"><Notice tone="ok">{msg}</Notice></div>}
    </Card>
  );
}

/** Replies: paste what the business wrote → AI suggests a safe answer → owner sends with one tap. */
export function ConversationCard({ lead, onChange }: { lead: Lead; onChange: (l: Lead) => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [incoming, setIncoming] = useState('');
  const [draft, setDraft] = useState<{ reply: string; needs_owner: boolean; reason: string; warnings: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [waMode, setWaMode] = useWaMode();
  const refresh = () => loadMessages(lead.id).then(setMessages).catch(() => {});
  useEffect(() => { refresh(); }, [lead.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function suggest() {
    setBusy(true); setErr(''); setDraft(null);
    try {
      setDraft(await api.suggestReply(lead.id, incoming));
      setIncoming('');
      refresh();
      if (['Contacted', 'Demo Ready'].includes(lead.stage)) onChange({ ...lead, stage: 'Replied' });
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  async function sendDraft() {
    if (!draft || !lead.phone_intl) return;
    const url = whatsappLink(lead.phone_intl, draft.reply, waMode);
    if (waMode === 'app') window.location.href = url; else window.open(url, '_blank', 'noopener');
    await logOutgoing(lead, 'whatsapp', draft.reply, draft.warnings, false);
    setDraft(null);
    refresh();
  }

  return (
    <Card>
      <h2 className="mb-3 flex items-center gap-2 font-semibold"><MessageCircle size={17} className="text-accent" /> Conversation</h2>
      {messages.length > 0 && (
        <ul className="mb-4 max-h-80 space-y-2 overflow-y-auto">
          {messages.map((m) => (
            <li key={m.id} className={cx('max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap', m.direction === 'out' ? 'ml-auto bg-accent-soft text-ink' : 'bg-canvas')}>
              {m.body}<span className="mt-1 block text-[11px] text-muted">{m.direction === 'out' ? 'You' : lead.name} · {new Date(m.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
            </li>
          ))}
        </ul>
      )}
      <Textarea aria-label="Their reply" placeholder="When they reply on WhatsApp, paste their message here…" value={incoming} onChange={(e) => setIncoming(e.target.value)} className="!min-h-20" />
      <Button className="mt-3" onClick={suggest} disabled={busy || !incoming.trim()}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Suggest my answer</Button>
      {err && <div className="mt-3"><Notice tone="danger">{err}</Notice></div>}
      {draft && (
        <div className="mt-4 space-y-3">
          {draft.needs_owner && <Notice tone="danger"><b>Handle this yourself:</b> {draft.reason}{draft.warnings.length ? ` — ${draft.warnings.join(' ')}` : ''}</Notice>}
          {!draft.needs_owner && <p className="text-sm text-muted">{draft.reason}</p>}
          <Textarea aria-label="Suggested answer" value={draft.reply} onChange={(e) => setDraft({ ...draft, reply: e.target.value })} className="!min-h-28" />
          <Button onClick={sendDraft} disabled={!lead.phone_intl}><MessageCircle size={16} /> Send on WhatsApp</Button>
          <WaModePicker mode={waMode} setMode={setWaMode} />
        </div>
      )}
    </Card>
  );
}
