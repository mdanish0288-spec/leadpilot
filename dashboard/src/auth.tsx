import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { supabase } from './lib/supabase';
import { PREVIEW } from './lib/data';
import { Login } from './pages/Login';
import { EnrollMfa, VerifyMfa } from './pages/Mfa';

type Gate = 'loading' | 'signedOut' | 'enroll' | 'verify' | 'ready';

/** Nothing inside the app renders until the owner has signed in AND passed two-factor (aal2). */
export function AuthGate({ children }: { children: ReactNode }) {
  const [gate, setGate] = useState<Gate>('loading');

  const evaluate = useCallback(async () => {
    if (PREVIEW) {
      const screen = new URLSearchParams(location.search).get('screen');
      setGate(screen === 'login' ? 'signedOut' : screen === 'enroll' ? 'enroll' : screen === 'verify' ? 'verify' : 'ready');
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return setGate('signedOut');
    const { data: aal, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) return setGate('signedOut');
    if (aal.currentLevel === 'aal2') return setGate('ready');
    setGate(aal.nextLevel === 'aal2' ? 'verify' : 'enroll');
  }, []);

  useEffect(() => {
    evaluate();
    if (PREVIEW) return;
    const { data } = supabase.auth.onAuthStateChange(() => { evaluate(); });
    return () => data.subscription.unsubscribe();
  }, [evaluate]);

  if (gate === 'loading') return <div className="grid min-h-svh place-items-center text-muted">Loading…</div>;
  if (gate === 'signedOut') return <Login onDone={evaluate} />;
  if (gate === 'enroll') return <EnrollMfa onDone={evaluate} />;
  if (gate === 'verify') return <VerifyMfa onDone={evaluate} />;
  return <>{children}</>;
}

export async function signOut() {
  if (PREVIEW) return;
  await supabase.auth.signOut();
}
