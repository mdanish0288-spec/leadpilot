import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cx('rounded-2xl border border-line bg-white p-5 sm:p-6', className)}>{children}</section>;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3 sm:mb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 text-[15px] text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' };
export function Button({ variant = 'primary', className, ...p }: BtnProps) {
  const styles = {
    primary: 'bg-accent text-white hover:bg-accent-ink',
    secondary: 'border border-line bg-white text-ink hover:bg-canvas',
    ghost: 'text-muted hover:bg-canvas hover:text-ink',
    danger: 'bg-danger text-white hover:opacity-90',
  }[variant];
  return (
    <button
      {...p}
      className={cx('inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-[15px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50', styles, className)}
    />
  );
}

export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: string; error?: string; children: ReactNode; htmlFor: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium">{label}</label>
      {children}
      {error ? <p className="text-sm text-danger" role="alert">{error}</p> : hint ? <p className="text-sm text-muted">{hint}</p> : null}
    </div>
  );
}

const inputBase = 'block w-full rounded-xl border bg-white px-3.5 text-[15px] text-ink placeholder:text-zinc-400 transition-colors focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent-soft';

export function Input({ invalid, className, ...p }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input {...p} aria-invalid={invalid || undefined} className={cx(inputBase, 'h-11', invalid ? 'border-danger' : 'border-line', className)} />;
}

export function Select({ invalid, className, ...p }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return <select {...p} className={cx(inputBase, 'h-11', invalid ? 'border-danger' : 'border-line', className)} />;
}

export function Textarea({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...p} className={cx(inputBase, 'min-h-24 border-line py-2.5', className)} />;
}

export function Toggle({ checked, onChange, label, id }: { checked: boolean; onChange: (v: boolean) => void; label: string; id: string }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx('relative h-7 w-12 shrink-0 rounded-full transition-colors', checked ? 'bg-accent' : 'bg-zinc-300')}
    >
      <span className={cx('absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform', checked && 'translate-x-5')} />
    </button>
  );
}

export function EmptyState({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-accent-soft text-accent">{icon}</div>
      <p className="font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-[15px] text-muted">{text}</p>
    </div>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'danger' | 'ok'; children: ReactNode }) {
  const t = { info: 'bg-accent-soft text-accent-ink', warn: 'bg-warn-soft text-warn', danger: 'bg-danger-soft text-danger', ok: 'bg-ok-soft text-ok' }[tone];
  return <div className={cx('rounded-xl px-4 py-3 text-[15px]', t)}>{children}</div>;
}
