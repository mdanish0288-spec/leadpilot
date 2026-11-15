import { Bell, CalendarDays } from 'lucide-react';
import { Card, EmptyState, PageHeader } from '../components/ui';

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
