import { describe, expect, it } from 'vitest';
import { detectColumns, importRowToLead, parseCount, parseCsv, parseRating, phoneKey, rankLeads, readRows } from './importer';
import { applyLessons, lessonsFromFeedback } from './lessons';

const d = { businessType: 'cafes', city: 'Lucknow', country: 'India', countryCode: 'IN' };

describe('reading a sheet', () => {
  it('reads quotes, commas and line breaks inside cells', () => {
    expect(parseCsv('﻿Name,Address\n"Sharma, Tea","12 MG Road\nHazratganj"\n\nB,C\r\n')).toEqual([
      ['Name', 'Address'], ['Sharma, Tea', '12 MG Road\nHazratganj'], ['B', 'C'],
    ]);
    expect(parseCsv('a,"say ""hi""",c')).toEqual([['a', 'say "hi"', 'c']]);
  });

  it('finds columns whatever they are called', () => {
    const m = detectColumns(['Business Name', 'Category', 'Full Address', 'Phone Number', 'WhatsApp', 'E-mail', 'Website', 'Insta', 'Rating', 'Reviews', 'Google Maps Link', 'Area', 'Remarks']);
    expect(m).toEqual({ name: 0, type: 1, address: 2, phone: 3, whatsapp: 4, email: 5, website: 6, instagram: 7, rating: 8, reviews: 9, maps: 10, city: 11, notes: 12 });
    expect(detectColumns(['name', 'mobile', 'location'])).toEqual({ name: 0, phone: 1, address: 2 });
  });

  it('reads ratings and review counts written in different ways', () => {
    expect(parseRating('4.5')).toBe(4.5);
    expect(parseRating('4,3 stars')).toBe(4.3);
    expect(parseRating('★ 4')).toBe(4);
    expect(parseRating('9')).toBeNull();
    expect(parseCount('(1,234)')).toBe(1234);
    expect(parseCount('2.1k')).toBe(2100);
    expect(parseCount('')).toBeNull();
  });

  it('skips rows without a name, without any way to contact, and duplicates inside the sheet', () => {
    const table = parseCsv(['Name,Phone,Email,Website', 'Sharma Tea,+91 98390 11111,,', ',+91 1,,', 'No Contact Cafe,,,', 'Sharma Tea Stall,098390 11111,,', 'Mail Cafe,,mail@cafe.in,www.mailcafe.in'].join('\n'));
    const { rows, skipped } = readRows(table, detectColumns(table[0]));
    expect(rows.map((r) => r.name)).toEqual(['Sharma Tea', 'Mail Cafe']);
    expect(skipped.map((s) => s.reason)).toEqual(['No business name', 'No Contact Cafe: no phone, WhatsApp, email or Instagram', 'Sharma Tea Stall: appears twice in this sheet']);
  });

  it('treats N/A, -, none as empty', () => {
    const t = parseCsv('Name,Phone,Website\nA,+91 99999 00000,N/A');
    expect(readRows(t, detectColumns(t[0])).rows[0].website).toBeNull();
  });
});

describe('imported rows → leads', () => {
  const row = { name: 'Sharma Tea', type: null, address: 'Hazratganj', city: null, country: null, phone: '+91 98390 11111', whatsapp: null, email: null, website: null, instagram: '@sharmatea', rating: 4.6, reviews: 320, maps: 'https://maps.app.goo.gl/abc', notes: null };

  it('empty website cell = Hot, real data kept, ids stable', () => {
    const l = importRowToLead(row, d, true, null);
    expect(l.lead_type).toBe('hot');
    expect(l.needs_verification).toBe(false);
    expect(l.place_id).toBe('import:9839011111');
    expect(l.city).toBe('Lucknow');
    expect(l.country_code).toBe('IN');
    expect(l.instagram).toBe('https://www.instagram.com/sharmatea');
    expect(l.rating).toBe(4.6);
    expect(l.score).toBeGreaterThan(30);
    expect(importRowToLead(row, d, true, null).place_id).toBe(l.place_id);
  });
  it('no website column at all = must verify before contacting', () => {
    expect(importRowToLead(row, d, false, null).needs_verification).toBe(true);
  });
  it('a website without https:// is still checked', () => {
    const l = importRowToLead({ ...row, website: 'sharmatea.in' }, d, true, null);
    expect(l.website).toBe('https://sharmatea.in');
    expect(l.lead_type).toBe('pending');
  });
  it('an Instagram-only "website" = Hot', () => {
    expect(importRowToLead({ ...row, website: 'instagram.com/sharmatea' }, d, true, null).lead_type).toBe('hot');
  });
  it('ignores an invalid email instead of saving it', () => {
    expect(importRowToLead({ ...row, email: 'not-an-email' }, d, true, null).email).toBeNull();
  });
  it('ranks Hot first, then by score', () => {
    const ranked = rankLeads([{ lead_type: 'skip', score: 90 }, { lead_type: 'hot', score: 40 }, { lead_type: 'warm', score: 80 }, { lead_type: 'hot', score: 70 }]);
    expect(ranked.map((r) => `${r.lead_type}${r.score}`)).toEqual(['hot70', 'hot40', 'warm80', 'skip90']);
  });
  it('phone keys match the same number written differently', () => {
    expect(phoneKey('+91 98390-11111')).toBe(phoneKey('098390 11111'));
    expect(phoneKey('12')).toBeNull();
  });
});

describe('learning from mistakes', () => {
  it('a reported chain blocks every branch with that name', () => {
    const rules = lessonsFromFeedback('chain', { name: 'Cafe Coffee Day', place_id: 'p1', phone_key: '1111111111' });
    expect(rules.map((r) => r.kind)).toEqual(['skip_place', 'skip_name', 'skip_phone']);
    const lessons = rules.map((r, i) => ({ ...r, id: `l${i}` }));
    const { kept, blocked } = applyLessons([
      { name: 'CAFE COFFEE DAY!', place_id: 'p9', phone: '+91 2' },
      { name: 'Sharma Tea', place_id: 'p2', phone: '+91 98390 11111' },
    ], lessons);
    expect(blocked.map((b) => b.lead.name)).toEqual(['CAFE COFFEE DAY!']);
    expect(kept.map((k) => k.name)).toEqual(['Sharma Tea']);
  });
  it('"already has a website" never comes back, even from a different source', () => {
    const lessons = lessonsFromFeedback('has_website', { name: 'Royal Cafe', place_id: 'osm:node/5', phone_key: '9839022222' }).map((r, i) => ({ ...r, id: String(i) }));
    const { blocked } = applyLessons([{ name: 'Royal Cafe & Bakery', place_id: 'import:9839022222', phone_intl: '+91 98390 22222' }], lessons);
    expect(blocked).toHaveLength(1);
    expect(blocked[0].lesson.reason).toBe('has_website');
  });
  it('a wrong phone number does not block that phone number for others', () => {
    expect(lessonsFromFeedback('wrong_details', { name: 'X', place_id: 'p', phone_key: '1234567890' }).map((r) => r.kind)).toEqual(['skip_place']);
  });
});

describe('scraper-style exports (real layout from Maps-Scraper.net)', () => {
  const header = 'Name,Fulladdress,Street,Municipality,Categories,Phone,Phones,Claimed,Review Count,Average Rating,Review URL,Google Maps URL,Latitude,Longitude,Website,Domain,Opening hours,Featured image,Cid,Place Id,Kgmid,Plus code,Google Knowledge URL,Email,Social Medias,Facebook,Instagram,Twitter,Yelp';
  const locked = Array(9).fill('*** Visible after upgrade ***').join(',');
  const csv = [header,
    `Unisex Salon By Nidhi,"34-A Raghu Vihar, Jaipur",34-A,Patrkar Road,"Beauty Parlour,Hairdresser",098871 81819,"098871 81819, +91 98871 81819",YES,1404,4.8,https://search.google.com/local/reviews?placeid=X,https://www.google.com/maps?cid=1,26.8,75.7,,,"Mon",https://img,1,X,${locked}`,
    `Be U Natural,"Mall of Jaipur",3rd floor,301,Beauty Parlour,,,YES,281,4.6,https://search.google.com/x,https://www.google.com/maps?cid=2,26.9,75.7,https://www.beunatural.in/,beunatural.in,"Mon",https://img,2,Y,${locked}`,
  ].join('\n');

  it('uses the real Website column, not the Review URL, and ignores ids/images', () => {
    const t = parseCsv(csv);
    const m = detectColumns(t[0]);
    expect(t[0][m.website!]).toBe('Website');
    expect(t[0][m.maps!]).toBe('Google Maps URL');
    expect(t[0][m.rating!]).toBe('Average Rating');
    expect(t[0][m.reviews!]).toBe('Review Count');
    expect(t[0][m.address!]).toBe('Fulladdress');
  });
  it('treats "*** Visible after upgrade ***" as empty, so a row with no real contact is skipped', () => {
    const t = parseCsv(csv);
    const { rows, skipped } = readRows(t, detectColumns(t[0]));
    expect(rows.map((r) => r.name)).toEqual(['Unisex Salon By Nidhi']);
    expect(rows[0].email).toBeNull();
    expect(rows[0].instagram).toBeNull();
    expect(skipped[0].reason).toMatch(/Be U Natural: no phone/);
  });
  it('turns it into a clean Hot lead with an international phone and a simple type', () => {
    const t = parseCsv(csv);
    const cols = detectColumns(t[0]);
    const l = importRowToLead(readRows(t, cols).rows[0], d, cols.website !== undefined, null);
    expect(l.lead_type).toBe('hot');
    expect(l.phone_intl).toBe('+91 98871 81819');
    expect(l.business_type).toBe('beauty parlour');
    expect(l.rating).toBe(4.8);
    expect(l.review_count).toBe(1404);
    expect(l.maps_url).toBe('https://www.google.com/maps?cid=1');
  });
});
