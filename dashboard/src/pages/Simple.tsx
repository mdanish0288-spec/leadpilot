import { Bell, CalendarDays, Users } from 'lucide-react';
import { Card, EmptyState, PageHeader } from '../components/ui';
import { LEAD_STAGES } from '../lib/types';

export function LeadsPage() {
  return (
    <>
      <PageHeader title="Leads" subtitle="Every business LeadPilot finds, from first contact to delivery." />
      <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {LEAD_STAGES.map((s, i) => (
          <span key={s} className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm ${i === 0 ? 'border-accent bg-accent-soft text-accent-ink' : 'border-line bg-white text-muted'}`}>
            {s} <span className="tabular-nums opacity-70">0</span>
          </span>
        ))}
      </div>
      <Card className="!p-0">
        <EmptyState icon={<Users size={22} />} title="No leads yet" text="Leads appear here after you run a search from Home (Phase 2). Click a lead to see its demo, chats, score and notes." />
      </Card>
    </>
  );
}

export function AlertsPage() {
  return (
    <>
      <PageHeader title="Alerts" subtitle="Anything that needs your decision. Approve, edit or reject with one tap." />
      <Card className="!p-0">
        <EmptyState icon={<Bell size={22} />} title="Nothing needs you right now" text="Angry clients, unusual questions, payment claims and anything LeadPilot is unsure about will show up here with a suggested reply." />
      </Card>
    </>
  );
}

export function CalendarPage() {
  return (
    <>
      <PageHeader title="Calendar" subtitle="Upcoming client meetings, shown in your time (IST)." />
      <Card className="!p-0">
        <EmptyState icon={<CalendarDays size={22} />} title="No meetings booked" text="When a client picks a time, the meeting appears here with its Google Meet link (Phase 6)." />
      </Card>
    </>
  );
}
