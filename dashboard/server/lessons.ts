// Learning loop: every mistake the owner reports becomes a rule, and every new lead is checked against the rules
// before it is saved — so the same mistake is not made twice. Pure functions — covered by importer.test.ts.
import { branchKey } from './score';

export type FeedbackReason = 'has_website' | 'closed' | 'chain' | 'wrong_details' | 'not_target' | 'duplicate';
export interface Lesson { id: string; kind: 'skip_phone' | 'skip_name' | 'skip_place'; value: string; reason: string }

export const REASON_TEXT: Record<FeedbackReason, string> = {
  has_website: 'It already has a website',
  closed: 'Closed or does not exist',
  chain: 'Big chain / franchise',
  wrong_details: 'Wrong phone or details',
  not_target: 'Not my kind of client',
  duplicate: 'Duplicate of another lead',
};

/** Which rules a reported mistake creates. A chain blocks every branch by name; most others block that business. */
export function lessonsFromFeedback(reason: FeedbackReason, lead: { name: string; place_id: string; phone_key: string | null }) {
  const out: Omit<Lesson, 'id'>[] = [{ kind: 'skip_place', value: lead.place_id, reason }];
  if (reason === 'chain') out.push({ kind: 'skip_name', value: branchKey(lead.name), reason });
  if (lead.phone_key && reason !== 'wrong_details') out.push({ kind: 'skip_phone', value: lead.phone_key, reason });
  return out;
}

/** Splits new leads into kept and blocked-by-a-lesson. */
export function applyLessons<T extends { name: string; place_id: string; phone?: string | null; phone_intl?: string | null }>(leads: T[], lessons: Lesson[]) {
  const byKind = (k: Lesson['kind']) => new Map(lessons.filter((l) => l.kind === k).map((l) => [l.value, l]));
  const places = byKind('skip_place');
  const names = byKind('skip_name');
  const phones = byKind('skip_phone');
  const kept: T[] = [];
  const blocked: { lead: T; lesson: Lesson }[] = [];
  for (const lead of leads) {
    const digits = (lead.phone_intl ?? lead.phone ?? '').replace(/\D/g, '');
    const pk = digits.length >= 7 ? digits.slice(-10) : null;
    const hit = places.get(lead.place_id) ?? names.get(branchKey(lead.name)) ?? (pk ? phones.get(pk) : undefined);
    if (hit) blocked.push({ lead, lesson: hit });
    else kept.push(lead);
  }
  return { kept, blocked };
}
