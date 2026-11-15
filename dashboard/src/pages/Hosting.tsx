import { Card, PageHeader } from '../components/ui';

// Plain-language map of where everything lives. Kept accurate as phases are added (full version in Phase 8).
const ROWS = [
  { what: 'This dashboard', where: 'Cloudflare Pages', cost: 'Free', status: 'Phase 1' },
  { what: 'Database, login, files', where: 'Supabase (Mumbai), free plan', cost: 'Free', status: 'Live' },
  { what: 'Background jobs (search, inbox, replies)', where: 'Cloudflare Workers', cost: 'Free up to 100,000 runs/day', status: 'Phase 2+' },
  { what: 'Business email hello@your-domain', where: 'Cloudflare Email Routing → your Gmail', cost: 'Free', status: 'Needs domain' },
  { what: 'Your domain', where: 'Cloudflare Registrar', cost: '≈ $10–12 per year', status: 'Needs domain' },
  { what: 'Client demo websites', where: 'Netlify free plan', cost: 'Free', status: 'Phase 3' },
  { what: 'Client final websites', where: "Client's own Netlify account", cost: 'Free (client owns it)', status: 'Phase 7' },
  { what: 'AI brain', where: 'Claude API', cost: 'Pay per use (estimate in Phase 2)', status: 'Phase 2' },
  { what: 'Business search', where: 'Google Places API', cost: 'Free monthly credit, then pay per use', status: 'Phase 2' },
  { what: 'Voice to text', where: 'ElevenLabs Scribe', cost: 'Pay per use', status: 'Phase 2' },
];

export function HostingPage() {
  return (
    <>
      <PageHeader title="How my system is hosted" subtitle="Where everything lives and what it costs, in plain words." />
      <Card className="overflow-x-auto !p-0">
        <table className="w-full min-w-[560px] text-left text-[15px]">
          <thead className="border-b border-line text-sm text-muted">
            <tr><th className="px-5 py-3 font-medium">What</th><th className="px-5 py-3 font-medium">Where it lives</th><th className="px-5 py-3 font-medium">Monthly cost</th><th className="px-5 py-3 font-medium">Status</th></tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.what} className="border-b border-line last:border-0">
                <td className="px-5 py-3.5 font-medium">{r.what}</td>
                <td className="px-5 py-3.5 text-muted">{r.where}</td>
                <td className="px-5 py-3.5">{r.cost}</td>
                <td className="px-5 py-3.5"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${r.status === 'Live' ? 'bg-ok-soft text-ok' : 'bg-canvas text-muted'}`}>{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <p className="mt-4 text-sm text-muted">Costs are estimates from each provider's public pricing and are re-checked in Phase 8.</p>
    </>
  );
}
