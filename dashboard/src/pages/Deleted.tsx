// "Recently deleted" — like a phone's bin. Leads stay here 30 days (restorable), then a daily job deletes them forever.
import { useEffect, useState } from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';
import { Button, Card, EmptyState, Notice, PageHeader } from '../components/ui';
import { BIN_DAYS, daysLeft, deleteLeadForever, loadDeletedLeads, restoreLead, type Lead } from '../lib/data';

export function DeletedPage() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const reload = () => loadDeletedLeads().then(setLeads).catch((e) => setError(e.message));
  useEffect(() => { reload(); }, []);

  async function act(id: string, fn: (id: string) => Promise<void>) {
    setBusy(id); setError('');
    try { await fn(id); await reload(); } catch (e) { setError((e as Error).message); } finally { setBusy(''); }
  }
  function forever(l: Lead) {
    if (window.confirm(`Delete “${l.name}” forever?\n\nThis cannot be undone. Its messages stay in your log.`)) act(l.id, deleteLeadForever);
  }

  return (
    <>
      <PageHeader title="Recently deleted" subtitle={`Deleted leads stay here for ${BIN_DAYS} days. Restore them any time — after ${BIN_DAYS} days they are deleted forever.`} />
      {error && <div className="mb-4"><Notice tone="danger">{error}</Notice></div>}
      <Card className="p-0 sm:p-0">
        {leads === null ? <p className="p-6 text-muted">Loading…</p> : leads.length === 0 ? (
          <EmptyState icon={<Trash2 size={22} />} title="Nothing here" text="Leads you delete will wait here for 30 days." />
        ) : (
          <ul className="divide-y divide-line">
            {leads.map((l) => {
              const left = daysLeft(l.deleted_at!);
              return (
                <li key={l.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{l.name}</p>
                    <p className="text-sm text-muted">{l.business_type}{l.city ? ` · ${l.city}` : ''} · <span className={left <= 3 ? 'font-medium text-danger' : ''}>{left === 0 ? 'Deleted forever tonight' : `${left} day${left === 1 ? '' : 's'} left`}</span></p>
                  </div>
                  <Button variant="secondary" disabled={busy === l.id} onClick={() => act(l.id, restoreLead)}><RotateCcw size={16} /> Restore</Button>
                  <Button variant="ghost" disabled={busy === l.id} onClick={() => forever(l)} className="text-danger hover:text-danger"><Trash2 size={16} /> Delete forever</Button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
