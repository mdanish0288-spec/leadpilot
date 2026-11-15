import { NavLink, Outlet } from 'react-router';
import { Bell, CalendarDays, Home, LogOut, Server, Settings, Users } from 'lucide-react';
import { signOut } from '../auth';
import { cx } from './ui';

const NAV = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/leads', label: 'Leads', icon: Users },
  { to: '/alerts', label: 'Alerts', icon: Bell },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/hosting', label: 'Hosting', icon: Server },
];

export function Shell() {
  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[248px_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-svh flex-col border-r border-line bg-white px-4 py-6 lg:flex">
        <div className="mb-8 flex items-center gap-2.5 px-2">
          <img src="/favicon.svg" alt="" width={28} height={28} />
          <span className="text-[17px] font-semibold tracking-tight">LeadPilot</span>
        </div>
        <nav aria-label="Main" className="flex flex-1 flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) => cx('flex h-10 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors', isActive ? 'bg-accent-soft text-accent-ink' : 'text-muted hover:bg-canvas hover:text-ink')}>
              <Icon size={18} aria-hidden /> {label}
            </NavLink>
          ))}
        </nav>
        <button onClick={() => signOut()} className="flex h-10 items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-muted hover:bg-canvas hover:text-ink">
          <LogOut size={18} aria-hidden /> Sign out
        </button>
      </aside>

      {/* Phone top bar */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-white/90 px-4 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2"><img src="/favicon.svg" alt="" width={24} height={24} /><span className="font-semibold tracking-tight">LeadPilot</span></div>
        <button onClick={() => signOut()} aria-label="Sign out" className="grid h-10 w-10 place-items-center rounded-xl text-muted hover:bg-canvas"><LogOut size={18} /></button>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pt-10 lg:pb-16">
        <Outlet />
      </main>

      {/* Phone bottom nav (thumb reach) */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-6 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) => cx('flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium', isActive ? 'text-accent' : 'text-muted')}>
            <Icon size={20} aria-hidden /> {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
