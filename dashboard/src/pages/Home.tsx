import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { ArrowRight, CalendarCheck, Flame, Globe, Handshake, Loader2, Mail, MessageSquareReply, Mic, Search, Square, Sun, Users, Wallet } from 'lucide-react';
import { Button, Card, Notice, PageHeader, cx } from '../components/ui';
import { api, ApiError, runWebsiteChecks, type ParsedCommand, type SearchResult, type Status } from '../lib/api';
import { homeStats } from '../lib/data';

type Phase =
  | { kind: 'idle' }
  | { kind: 'thinking' }
  | { kind: 'confirm'; cmd: ParsedCommand }
  | { kind: 'question'; cmd: ParsedCommand }
  | { kind: 'searching'; cmd: ParsedCommand }
  | { kind: 'done'; cmd: ParsedCommand; result: SearchResult; checked: number; checking: boolean; sheetProblem: string | null };

export function HomePage() {
  const [text, setText] = useState('');
  const [history, setHistory] = useState<string[]>([]); // earlier parts of a conversation ("cafe dhundo" → "Tokyo")
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [error, setError] = useState('');
  const [viaVoice, setViaVoice] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [stats, setStats] = useState({ leads: 0, hot: 0, warm: 0, pending: 0 });
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const refreshStats = () => homeStats().then(setStats).catch(() => {});
  useEffect(() => {
    api.status().then(setStatus).catch(() => {});
    refreshStats();
  }, []);

  // Resume any website checks left unfinished (e.g. the page was closed mid-search).
  useEffect(() => {
    if (stats.pending > 0 && phase.kind === 'idle') runWebsiteChecks().then(refreshStats).catch(() => {});
  }, [stats.pending]); // eslint-disable-line react-hooks/exhaustive-deps

  async function understand(e?: FormEvent) {
    e?.preventDefault();
    const t = text.trim();
    if (!t) return;
    setError('');
    setPhase({ kind: 'thinking' });
    const full = [...history, t].join('. ');
    try {
      const cmd = await api.command(full);
      if (cmd.status === 'ready') setPhase({ kind: 'confirm', cmd });
      else {
        setHistory([...history, t]);
        setText('');
        setPhase({ kind: 'question', cmd });
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    } catch (x) {
      setError((x as Error).message);
      setPhase({ kind: 'idle' });
    }
  }

  async function runSearch(cmd: ParsedCommand, searchId?: string) {
    setError('');
    setPhase({ kind: 'searching', cmd });
    try {
      const result = searchId
        ? await api.search({ search_id: searchId })
        : await api.search({ command_text: [...history, text].filter(Boolean).join('. '), via_voice: viaVoice, business_type: cmd.business_type, city: cmd.city, country: cmd.country, country_code: cmd.country_code });
      setPhase({ kind: 'done', cmd, result, checked: 0, checking: result.checking > 0, sheetProblem: result.sheet.ok ? null : result.sheet.reason ?? null });
      setHistory([]);
      setText('');
      setViaVoice(false);
      refreshStats();
      if (result.checking > 0) {
        const r = await runWebsiteChecks((n) => setPhase((p) => (p.kind === 'done' ? { ...p, checked: n } : p)));
        setPhase((p) => (p.kind === 'done' ? { ...p, checking: false, checked: r.checked, sheetProblem: p.sheetProblem ?? r.sheetProblem } : p));
        refreshStats();
      }
    } catch (x) {
      setError(x instanceof ApiError ? x.message : 'Search failed. Nothing was sent to anyone.');
      setPhase({ kind: 'confirm', cmd });
    }
  }

  function reset() {
    setHistory([]);
    setText('');
    setPhase({ kind: 'idle' });
    setError('');
    setViaVoice(false);
  }

  const missing = status ? [!status.claude && 'Claude API key', !status.places && 'Google Places key', !status.voice && 'ElevenLabs key (voice)', !(status.sheet_key && status.sheet_link) && 'Google Sheet'].filter(Boolean) : [];
  const busy = phase.kind === 'thinking' || phase.kind === 'searching';

  const STATS = [
    { label: 'Leads', value: String(stats.leads), icon: Users },
    { label: 'Hot (no website)', value: String(stats.hot), icon: Flame },
    { label: 'Warm (weak website)', value: String(stats.warm), icon: Sun },
    { label: 'Demos', value: '0', icon: Globe },
    { label: 'Messages sent', value: '0', icon: Mail },
    { label: 'Replies', value: '0', icon: MessageSquareReply },
    { label: 'Meetings', value: '0', icon: CalendarCheck },
    { label: 'Deals', value: '0', icon: Handshake },
    { label: 'Money earned', value: '₹0 · $0', icon: Wallet },
  ];

  return (
    <>
      <PageHeader title="Home" subtitle="Tell LeadPilot where to look and what to find." />

      {missing.length > 0 && (
        <div className="mb-4"><Notice tone="warn">
          Not connected yet: {missing.join(', ')}.{' '}
          {status && (!status.claude || !status.places) ? 'Search starts working once the Claude and Google Places keys are added.' : 'Search still works; this part switches on once it is connected.'}
        </Notice></div>
      )}

      <Card className="mb-6">
        <form onSubmit={understand}>
          <label htmlFor="command" className="mb-3 block text-sm font-medium">
            {phase.kind === 'question' ? 'Your answer' : 'Command'}
          </label>

          {phase.kind === 'question' && (
            <div className="mb-3 rounded-xl bg-accent-soft px-4 py-3 text-[15px] text-accent-ink" role="status">{phase.cmd.question}</div>
          )}

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={18} className="pointer-events-none absolute top-3.5 left-3.5 text-zinc-400" aria-hidden />
              <textarea
                id="command" ref={inputRef} rows={1} value={text} disabled={busy}
                onChange={(e) => { setText(e.target.value); if (phase.kind === 'confirm') setPhase({ kind: 'idle' }); }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); understand(); } }}
                placeholder={phase.kind === 'question' ? 'Type your answer' : 'Find painters in Vancouver · Toronto mein cafe dhundo'}
                className="block min-h-12 w-full resize-none rounded-xl border border-line bg-white py-3 pr-3 pl-10 text-[15px] placeholder:text-zinc-400 focus:border-accent focus:ring-4 focus:ring-accent-soft focus:outline-none disabled:bg-canvas"
              />
            </div>
            <VoiceButton disabled={busy} onText={(t) => { setText(t); setViaVoice(true); setPhase((p) => (p.kind === 'confirm' ? { kind: 'idle' } : p)); inputRef.current?.focus(); }} onError={setError} />
            <Button type="submit" disabled={busy || !text.trim()} aria-label="Understand command" className="!h-12 !w-12 !px-0 sm:!w-auto sm:!px-5">
              {phase.kind === 'thinking' ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}<span className="hidden sm:inline">Go</span>
            </Button>
          </div>
          {viaVoice && text && phase.kind !== 'confirm' && <p className="mt-2 text-sm text-muted">Heard this from your voice. Fix anything that's wrong, then press Go.</p>}
          {phase.kind === 'idle' && !viaVoice && <p className="mt-3 text-sm text-muted">Type or speak in English, Hindi or Hinglish. Nothing runs until you confirm.</p>}
        </form>

        {error && <div className="mt-4"><Notice tone="danger">{error}</Notice></div>}

        {phase.kind === 'confirm' && (
          <div className="mt-4 rounded-2xl border border-accent/30 bg-accent-soft/60 p-4">
            <p className="text-sm text-muted">LeadPilot will search Google Maps for</p>
            <p className="mt-0.5 text-lg font-semibold">{phase.cmd.summary}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={() => runSearch(phase.cmd)}><Search size={18} aria-hidden /> Search now</Button>
              <Button variant="secondary" onClick={reset}>Cancel</Button>
            </div>
          </div>
        )}

        {phase.kind === 'searching' && (
          <div className="mt-4 flex items-center gap-3 text-[15px] text-muted" role="status"><Loader2 size={18} className="animate-spin text-accent" /> Searching Google Maps for {phase.cmd.summary}…</div>
        )}

        {phase.kind === 'done' && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Mini label="Found" value={phase.result.found} />
              <Mini label="New leads" value={phase.result.new_leads} />
              <Mini label="Already had" value={phase.result.duplicates} />
              <Mini label="Hot so far" value={phase.result.hot} tone="hot" />
            </div>
            {phase.checking ? (
              <p className="flex items-center gap-2 text-[15px] text-muted" role="status"><Loader2 size={16} className="animate-spin text-accent" /> Checking {phase.result.checking} websites ({phase.checked} done)…</p>
            ) : phase.result.checking > 0 ? (
              <p className="text-[15px] text-muted">All {phase.result.checking} websites checked.</p>
            ) : null}
            {phase.sheetProblem && <Notice tone="warn">Leads are saved, but the Google Sheet was not updated: {phase.sheetProblem}</Notice>}
            <div className="flex flex-wrap gap-2">
              <Link to={`/leads?search=${phase.result.search_id}`} className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-4 text-[15px] font-medium text-white hover:bg-accent-ink">See these leads <ArrowRight size={16} /></Link>
              {phase.result.more_available && <Button variant="secondary" onClick={() => runSearch(phase.cmd, phase.result.search_id)}>Find 20 more</Button>}
              <Button variant="ghost" onClick={reset}>New search</Button>
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {STATS.map(({ label, value, icon: Icon }, i) => (
          <Card key={label} className={cx('!p-4 sm:!p-5', i === STATS.length - 1 && 'col-span-2 sm:col-span-1')}>
            <div className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-accent-soft text-accent"><Icon size={18} aria-hidden /></div>
            <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
            <p className="text-sm text-muted">{label}</p>
          </Card>
        ))}
      </div>
    </>
  );
}

function Mini({ label, value, tone }: { label: string; value: number; tone?: 'hot' }) {
  return (
    <div className={cx('rounded-xl border px-3 py-2.5', tone === 'hot' ? 'border-orange-200 bg-orange-50' : 'border-line bg-white')}>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

/** Records up to 60 seconds, sends it to ElevenLabs Scribe, and puts the text in the box to confirm. */
function VoiceButton({ onText, onError, disabled }: { onText: (t: string) => void; onError: (m: string) => void; disabled?: boolean }) {
  const [state, setState] = useState<'idle' | 'recording' | 'working'>('idle');
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<number | undefined>(undefined);

  async function start() {
    onError('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return onError('This browser cannot record audio. Please type the command.');
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return onError('Microphone permission was blocked. Allow the microphone for this site, or type the command.');
    }
    const chunks: Blob[] = [];
    const rec = new MediaRecorder(stream);
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      window.clearTimeout(timer.current);
      setState('working');
      try {
        const { text } = await api.transcribe(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }));
        if (!text) onError("Didn't catch that. Try again a little closer to the microphone.");
        else onText(text);
      } catch (x) {
        onError((x as Error).message);
      } finally {
        setState('idle');
      }
    };
    recorder.current = rec;
    rec.start();
    setState('recording');
    timer.current = window.setTimeout(() => rec.state === 'recording' && rec.stop(), 60_000);
  }

  const stop = () => recorder.current?.state === 'recording' && recorder.current.stop();

  return (
    <button type="button" disabled={disabled || state === 'working'} onClick={state === 'recording' ? stop : start}
      aria-label={state === 'recording' ? 'Stop recording' : 'Speak a command'} aria-pressed={state === 'recording'}
      className={cx('grid h-12 w-12 shrink-0 place-items-center rounded-xl transition-colors disabled:opacity-50',
        state === 'recording' ? 'animate-pulse bg-danger text-white' : 'bg-accent-soft text-accent hover:bg-accent hover:text-white')}>
      {state === 'working' ? <Loader2 size={20} className="animate-spin" /> : state === 'recording' ? <Square size={18} fill="currentColor" /> : <Mic size={20} />}
    </button>
  );
}
