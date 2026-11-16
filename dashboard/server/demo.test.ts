import { describe, expect, it } from 'vitest';
import { esc, familyOf, pickTheme, renderDemo, slugFor, type DemoLead } from './demo';
import { allPass, checkFirstMessage, emailMessage, whatsappLink, whatsappMessage } from './outreach';

const lead: DemoLead = {
  id: '3f2a9c10-0000', name: 'Unisex Salon By Nidhi', business_type: 'beauty parlour', services: ['Beauty Parlour', 'Make-up artist'],
  full_address: '34-A Raghu Vihar, Jaipur, Rajasthan 302020', city: 'Jaipur', country_code: 'IN', phone: '098871 81819', phone_intl: '+91 98871 81819',
  rating: 4.8, review_count: 1404, maps_url: 'https://www.google.com/maps?cid=1', opening_hours: { weekdayDescriptions: ['Monday: 10 am–9:30 pm'] }, instagram: null,
};
const owner = { name: 'Abuzar', businessName: 'prowedsite' };

describe('demo website', () => {
  const { html } = renderDemo(lead, owner);
  it('shows only real data and the required parts', () => {
    expect(html).toContain('Unisex Salon By Nidhi');
    expect(html).toContain('Free demo designed for Unisex Salon By Nidhi by Abuzar (prowedsite)');
    expect(html).toContain('noindex');
    expect(html).toContain('tel:+919887181819');
    expect(html).toContain('https://wa.me/919887181819');
    expect(html).toContain('1,404 Google reviews');
    expect(html).toContain('Make-up artist');
    expect(html).toContain('Monday');
    expect(html).toContain('Men’s grooming');
    expect(html).toContain('Make-up');
    expect(html).toContain('output=embed');
    expect(html).toContain('Sample photos');
    expect(html).not.toMatch(/₹|price list|lorem/i);
  });
  it('has no JavaScript at all', () => {
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/on(click|load|error)=/i);
  });
  it('escapes anything dangerous in the business data', () => {
    const evil = renderDemo({ ...lead, name: '<img src=x onerror=alert(1)>', full_address: '"><script>x</script>' }, owner).html;
    expect(evil).not.toContain('<img src=x');
    expect(evil).not.toContain('<script>x');
    expect(esc('<a href="x">')).toBe('&lt;a href=&quot;x&quot;&gt;');
  });
  it('leaves sections out instead of inventing data', () => {
    const bare = renderDemo({ ...lead, rating: null, review_count: null, opening_hours: null, phone_intl: null, phone: null }, owner).html;
    expect(bare).not.toContain('Google reviews');
    expect(bare).not.toContain('Opening hours</dt>');
    expect(bare).not.toContain('wa.me');
  });
  it('picks different designs for different businesses, the same design every time for one business', () => {
    expect(familyOf('hair salon')).toBe('beauty');
    expect(familyOf('cafes')).toBe('food');
    expect(familyOf('house painters')).toBe('trades');
    expect(pickTheme(lead).id).toBe(pickTheme(lead).id);
    expect(renderDemo({ ...lead, store_colors: '#1b1614,#8b4a2b,#faf7f3' }, owner).html).toContain('--acc:#8b4a2b');
    const ids = new Set(['a1', 'b2', 'c3', 'd4', 'e5', 'f6', 'g7', 'h8'].map((id) => pickTheme({ id, business_type: 'salon' }).id));
    expect(ids.size).toBeGreaterThan(1);
  });
  it('makes clean web addresses', () => {
    expect(slugFor("Saalim'S Beauty Salon", 'ab12-cd')).toBe('saalim-s-beauty-salon-ab12');
    expect(slugFor('Lushé Salon', 'zz99')).toBe('lushe-salon-zz99');
  });
});

describe('first message', () => {
  const s = { name: 'Abuzar', businessName: 'prowedsite', whatsapp: '+91 90000 00000', email: '' };
  const url = 'https://prowedsite.pages.dev/d/unisex-salon-by-nidhi-3f2a';
  const ol = { name: lead.name, rating: 4.8, review_count: 1404, website_status: 'none', email: null, phone_intl: '+91 98871 81819', instagram: null };
  it('passes every check: name, link, real sender, no price, no fake urgency', () => {
    const m = whatsappMessage(ol, s, url);
    expect(m).toContain('4.8★ from 1,404 Google reviews');
    expect(allPass(checkFirstMessage(m, ol, s, url, 'whatsapp'))).toBe(true);
    expect(whatsappLink(ol.phone_intl, 'hi')).toBe('https://wa.me/919887181819?text=hi');
  });
  it('blocks a message with a price, payment details or fake urgency', () => {
    for (const bad of ['Only ₹5,500!', 'Pay by UPI', 'Offer ends today, hurry', 'Price: $350']) {
      expect(allPass(checkFirstMessage(`${whatsappMessage(ol, s, url)}\n${bad}`, ol, s, url, 'whatsapp'))).toBe(false);
    }
  });
  it('blocks a message with the wrong link or wrong business name', () => {
    expect(allPass(checkFirstMessage(whatsappMessage(ol, s, 'https://other.link'), ol, s, url, 'whatsapp'))).toBe(false);
    expect(allPass(checkFirstMessage(whatsappMessage({ ...ol, name: 'Other Salon' }, s, url), ol, s, url, 'whatsapp'))).toBe(false);
  });
  it('emails need a public email and the STOP line', () => {
    const e = emailMessage(ol, s, url);
    expect(e.body).toContain("reply STOP");
    expect(allPass(checkFirstMessage(e.body, ol, s, url, 'email'))).toBe(false); // no public email
    expect(allPass(checkFirstMessage(e.body, { ...ol, email: 'nidhi@salon.in' }, s, url, 'email'))).toBe(true);
  });
  it('mentions the right situation without false claims', () => {
    expect(whatsappMessage({ ...ol, website_status: 'social_only' }, s, url)).toContain("don't have your own website yet");
    expect(whatsappMessage({ ...ol, rating: null, review_count: null }, s, url)).not.toContain('★');
  });
});

import { checkReply } from './reply';
describe('reply safety check', () => {
  it('allows the listed price, blocks other amounts, payment details and urgency', () => {
    expect(checkReply('The price is ₹5,500 including the domain.', [5500]).ok).toBe(true);
    expect(checkReply('For you, only ₹4,000!', [5500]).ok).toBe(false);
    expect(checkReply('Pay on UPI abuzar@okhdfc', [5500]).ok).toBe(false);
    expect(checkReply('Hurry, offer ends today', [5500]).ok).toBe(false);
    expect(checkReply('Sure! Please send your photos.', [5500]).ok).toBe(true);
  });
});

describe('WhatsApp links', () => {
  it('opens the right place on phone, desktop app and WhatsApp Web', () => {
    expect(whatsappLink('+91 98871 81819', 'Hi there', 'app')).toBe('whatsapp://send?phone=919887181819&text=Hi%20there');
    expect(whatsappLink('+91 98871 81819', 'Hi', 'web')).toBe('https://web.whatsapp.com/send?phone=919887181819&text=Hi');
    expect(whatsappLink('+91 98871 81819', 'Hi')).toBe('https://wa.me/919887181819?text=Hi');
  });
});
