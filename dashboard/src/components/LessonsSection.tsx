import { useEffect, useState } from 'react';
import { GraduationCap, Trash2 } from 'lucide-react';
import { Card, Notice } from './ui';
import { deleteLesson, loadLessons, type LessonRow } from '../lib/data';
import { REASON_TEXT, type FeedbackReason } from '../../server/lessons';

const KIND_TEXT: Record<string, string> = { skip_name: 'Skip every business named', skip_phone: 'Skip phone ending', skip_place: 'Skip this exact business' };

/** Everything the owner has taught LeadPilot. Each rule can be undone. */
export function LessonsSection() {
  const [rows, setRows] = useState<LessonRow[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { loadLessons().then(setRows).catch((e) => setError(e.message)); }, []);

  async function remove(id: string) {
    try {
      await deleteLesson(id);
      setRows((r) => r?.filter((x) => x.id !== id) ?? null);
    } catch (e) { setError((e as Error).message); }
  }

  return (
    <Card className="mb-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight"><GraduationCap size={18} className="text-accent" /> What LeadPilot has learned</h2>
      <p className="mt-1 mb-4 text-[15px] text-muted">When you report a mistake on a lead, it becomes a rule here. New searches and imports skip anything that matches.</p>
      {error && <Notice tone="danger">{error}</Notice>}
      {rows === null ? <p className="text-sm text-muted">Loading…</p> : rows.length === 0 ? (
        <p className="text-sm text-muted">Nothing yet. Open any lead and use “Report a mistake”.</p>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1 text-[15px]">
                <p className="truncate">{KIND_TEXT[r.kind] ?? r.kind}: <b>{r.kind === 'skip_name' ? r.value : r.kind === 'skip_phone' ? `…${r.value.slice(-4)}` : r.example ?? r.value}</b></p>
                <p className="text-xs text-muted">{REASON_TEXT[r.reason as FeedbackReason] ?? r.reason}{r.example && r.kind !== 'skip_place' ? ` · from “${r.example}”` : ''} · stopped {r.times_applied} repeat{r.times_applied === 1 ? '' : 's'}</p>
              </div>
              <button onClick={() => remove(r.id)} aria-label="Undo this lesson" className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger"><Trash2 size={16} /></button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
