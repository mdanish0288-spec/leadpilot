import { useState, type FormEvent } from 'react';
import { LockKeyhole } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PREVIEW } from '../lib/data';
import { Button, Field, Input, Notice } from '../components/ui';

export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-svh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2.5">
          <img src="/favicon.svg" alt="" width={32} height={32} />
          <span className="text-lg font-semibold tracking-tight">LeadPilot</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1.5 mb-6 text-[15px] text-muted">{subtitle}</p>
        {children}
      </div>
    </main>
  );
}

export function Login({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (PREVIEW) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) return setError(error.message === 'Invalid login credentials' ? 'Email or password is wrong.' : error.message);
    onDone();
  }

  return (
    <AuthCard title="Sign in" subtitle="Private dashboard. Only the owner's account can sign in.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email" htmlFor="email">
          <Input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error && <Notice tone="danger">{error}</Notice>}
        <Button type="submit" className="w-full" disabled={busy}>
          <LockKeyhole size={18} aria-hidden /> {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthCard>
  );
}
