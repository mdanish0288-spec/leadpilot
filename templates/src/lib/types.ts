export type Day = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
/** Opening hours in 24h "HH:MM" local time. Missing day = closed. */
export type Hours = Partial<Record<Day, [string, string]>>;

export const DAY_LABELS: Record<Day, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};
export const DAYS: Day[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export type TimeStyle = 'ca' | 'uk' | 'us' | 'in';

/** Format "HH:MM" for the business's country (see playbook §7). */
export function fmtTime(t: string, style: TimeStyle): string {
  const [h, m] = t.split(':').map(Number);
  if (style === 'uk') return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const mm = String(m).padStart(2, '0');
  if (style === 'ca') return `${h12}:${mm} ${h < 12 ? 'a.m.' : 'p.m.'}`;
  return `${h12}:${mm} ${h < 12 ? 'AM' : 'PM'}`;
}

export const waLink = (intlNumber: string, text: string) =>
  `https://wa.me/${intlNumber.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
export const telLink = (intlNumber: string) => `tel:${intlNumber.replace(/[^\d+]/g, '')}`;
export const mapEmbed = (query: string) => `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
export const mapLink = (query: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
