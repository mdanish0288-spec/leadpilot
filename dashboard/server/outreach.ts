// First messages (Phase 4) and the automatic check every message must pass before it can be sent.
// Hard rules: no price or payment details in a first message, no fake urgency or false claims,
// correct business name and demo link, our real name, STOP line in emails.

export interface OutreachLead { name: string; rating: number | null; review_count: number | null; website_status: string; email: string | null; phone_intl: string | null; instagram: string | null }
export interface Sender { name: string; businessName: string; whatsapp: string; email: string }

function compliment(l: OutreachLead): string {
  if (l.rating != null && l.review_count && l.rating >= 4) return `${l.rating.toFixed(1)}★ from ${l.review_count.toLocaleString('en-IN')} Google reviews — your customers clearly love you!`;
  return 'I really liked what I saw.';
}

function situation(l: OutreachLead): string {
  if (l.website_status === 'social_only') return "I noticed you don't have your own website yet, so I designed a free demo website for you:";
  if (l.website_status === 'weak' || l.website_status === 'broken') return 'I designed a free, modern demo website for you:';
  return "I couldn't find a website for you, so I designed a free demo website for you:";
}

const from = (s: Sender) => `${s.name}${s.businessName.trim() ? ` from ${s.businessName.trim()}` : ''}`;

export function whatsappMessage(l: OutreachLead, s: Sender, demoUrl: string): string {
  return [
    `Hi ${l.name} team 👋`,
    `I'm ${from(s)}. I came across your business on Google Maps — ${compliment(l)}`,
    situation(l),
    demoUrl,
    "It's just a demo, and I can change anything you like — colours, photos, text.",
    'Would you like me to customise it for you?',
  ].join('\n\n');
}

export function emailMessage(l: OutreachLead, s: Sender, demoUrl: string): { subject: string; body: string } {
  return {
    subject: `A free website demo for ${l.name}`,
    body: [
      `Hi ${l.name} team,`,
      `I'm ${from(s)}. I came across your business on Google Maps — ${compliment(l)}`,
      situation(l),
      demoUrl,
      "It's only a demo, and I can change anything you like — colours, photos, text, sections.",
      'If you like it, just reply to this email and I will customise it for you.',
      `Best regards,\n${s.name}${s.businessName.trim() ? `\n${s.businessName.trim()}` : ''}${s.whatsapp ? `\nWhatsApp: ${s.whatsapp}` : ''}${s.email ? `\nEmail: ${s.email}` : ''}`,
      "If you don't want to hear from me again, just reply STOP.",
    ].join('\n\n'),
  };
}

export interface Check { ok: boolean; label: string }

const PAYMENT = /₹|rs\.?\s?\d|\$\s?\d|inr|usd|upi|paypal|usdt|wallet|payment|pay now|advance|price|cost|fee|charges?\b|bank|account no/i;
const URGENCY = /only today|limited time|last chance|hurry|expires|offer ends|exclusive deal|only for you|act now/i;

/** Runs before every send. Any failed check blocks the send. */
export function checkFirstMessage(text: string, l: OutreachLead, s: Sender, demoUrl: string, channel: 'whatsapp' | 'email' | 'instagram'): Check[] {
  const checks: Check[] = [
    { ok: text.includes(l.name), label: `Uses the business name “${l.name}”` },
    { ok: !!demoUrl && text.includes(demoUrl), label: 'Includes the correct demo link' },
    { ok: !!s.name.trim() && text.includes(s.name.trim()), label: 'Says who you are (real name)' },
    { ok: !PAYMENT.test(text), label: 'No price or payment details (first message)' },
    { ok: !URGENCY.test(text), label: 'No fake urgency or false claims' },
    { ok: text.length <= 1500, label: 'Short enough to read on a phone' },
  ];
  if (channel === 'email') checks.push({ ok: /reply STOP/.test(text), label: 'Includes the “reply STOP” line' }, { ok: !!l.email, label: 'Business has a public email' });
  if (channel === 'whatsapp') checks.push({ ok: (l.phone_intl ?? '').replace(/\D/g, '').length >= 10, label: 'Has a full international phone number' });
  if (channel === 'instagram') checks.push({ ok: !!l.instagram, label: 'Business has an Instagram profile' });
  return checks;
}

export const allPass = (c: Check[]) => c.every((x) => x.ok);

export function whatsappLink(phoneIntl: string, text: string): string {
  return `https://wa.me/${phoneIntl.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
}
export function mailtoLink(to: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
