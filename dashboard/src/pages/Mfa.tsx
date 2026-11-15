import { useEffect, useState, type FormEvent } from 'react';
import { ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PREVIEW } from '../lib/data';
import { Button, Field, Input, Notice } from '../components/ui';
import { AuthCard } from './Login';
import { signOut } from '../auth';

function CodeForm({ onSubmit, busy, error, cta }: { onSubmit: (code: string) => void; busy: boolean; error: string; cta: string }) {
  const [code, setCode] = useState('');
  function submit(e: FormEvent) {
    e.preventDefault();
    onSubmit(code.replace(/\s/g, ''));
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="6-digit code from your authenticator app" htmlFor="code">
        <Input id="code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} className="text-center text-xl tracking-[0.4em]" />
      </Field>
      {error && <Notice tone="danger">{error}</Notice>}
      <Button type="submit" className="w-full" disabled={busy || code.length !== 6}>
        <ShieldCheck size={18} aria-hidden /> {busy ? 'Checking…' : cta}
      </Button>
      <button type="button" onClick={() => signOut()} className="w-full text-sm text-muted hover:text-ink">Sign out</button>
    </form>
  );
}

export function EnrollMfa({ onDone }: { onDone: () => void }) {
  const [factor, setFactor] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (PREVIEW) return setFactor({ id: 'preview', qr: '', secret: 'PREVIEWSECRETABCDEFGHIJK' });
      // Remove any half-finished setup from earlier attempts, then start fresh.
      const { data: list } = await supabase.auth.mfa.listFactors();
      for (const f of list?.all ?? []) if (f.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: f.id });
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `LeadPilot ${new Date().toISOString().slice(0, 10)}` });
      if (error) return setError(error.message);
      setFactor({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    })();
  }, []);

  async function verify(code: string) {
    if (!factor || PREVIEW) return;
    setBusy(true); setError('');
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
    setBusy(false);
    if (error) return setError('That code did not work. Check the time on your phone is automatic and try the newest code.');
    onDone();
  }

  return (
    <AuthCard title="Turn on two-factor login" subtitle="Required once. After this, every sign-in asks for a code from your phone.">
      <ol className="mb-5 list-decimal space-y-1.5 pl-5 text-[15px] text-muted">
        <li>Open Google Authenticator or Microsoft Authenticator on your phone.</li>
        <li>Tap <b className="text-ink">+</b> and scan this QR code.</li>
        <li>Type the 6-digit code it shows.</li>
      </ol>
      <div className="mb-5 grid place-items-center rounded-2xl border border-line bg-white p-4">
        {factor?.qr ? <img src={factor.qr} alt="QR code for your authenticator app" width={184} height={184} /> : <div className="grid h-[184px] w-[184px] place-items-center rounded-lg bg-canvas text-sm text-muted">QR code</div>}
        {factor && <p className="mt-3 text-center text-xs break-all text-muted">Can't scan? Enter this key: <span className="font-mono text-ink">{factor.secret}</span></p>}
      </div>
      <CodeForm onSubmit={verify} busy={busy} error={error} cta="Turn on and continue" />
    </AuthCard>
  );
}

export function VerifyMfa({ onDone }: { onDone: () => void }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function verify(code: string) {
    if (PREVIEW) return;
    setBusy(true); setError('');
    const { data } = await supabase.auth.mfa.listFactors();
    const totp = data?.totp?.[0];
    if (!totp) { setBusy(false); return setError('No authenticator is set up on this account.'); }
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: totp.id, code });
    setBusy(false);
    if (error) return setError('That code did not work. Try the newest code.');
    onDone();
  }

  return (
    <AuthCard title="Enter your code" subtitle="Open your authenticator app and type the 6-digit code for LeadPilot.">
      <CodeForm onSubmit={verify} busy={busy} error={error} cta="Verify" />
    </AuthCard>
  );
}
