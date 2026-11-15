import { CalendarCheck, Globe, Handshake, Mail, MessageSquareReply, Mic, Search, Users, Wallet } from 'lucide-react';
import { Card, PageHeader } from '../components/ui';

// Real numbers arrive as each phase is built. Zero is the true value today.
const STATS = [
  { label: 'Leads', value: '0', icon: Users },
  { label: 'Demos', value: '0', icon: Globe },
  { label: 'Messages sent', value: '0', icon: Mail },
  { label: 'Replies', value: '0', icon: MessageSquareReply },
  { label: 'Meetings', value: '0', icon: CalendarCheck },
  { label: 'Deals', value: '0', icon: Handshake },
  { label: 'Money earned', value: '₹0 · $0', icon: Wallet },
];

export function HomePage() {
  return (
    <>
      <PageHeader title="Home" subtitle="Tell LeadPilot where to look and what to find." />

      <Card className="mb-6">
        <label htmlFor="command" className="mb-3 block text-sm font-medium">Command</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-zinc-400" aria-hidden />
            <input id="command" disabled placeholder="Find painters in Vancouver"
              className="h-12 w-full rounded-xl border border-line bg-canvas pr-3 pl-10 text-[15px] placeholder:text-zinc-400 disabled:cursor-not-allowed" />
          </div>
          <button disabled aria-label="Speak a command" className="grid h-12 w-12 place-items-center rounded-xl bg-accent-soft text-accent disabled:cursor-not-allowed disabled:opacity-60">
            <Mic size={20} />
          </button>
        </div>
        <p className="mt-3 text-sm text-muted">Lead search and voice commands switch on in Phase 2. Type or speak in English, Hindi or Hinglish — e.g. “Toronto mein cafe dhundo”.</p>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {STATS.map(({ label, value, icon: Icon }, i) => (
          <Card key={label} className={`!p-4 sm:!p-5 ${i === STATS.length - 1 ? 'col-span-2 sm:col-span-1' : ''}`}>
            <div className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-accent-soft text-accent"><Icon size={18} aria-hidden /></div>
            <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
            <p className="text-sm text-muted">{label}</p>
          </Card>
        ))}
      </div>
    </>
  );
}
