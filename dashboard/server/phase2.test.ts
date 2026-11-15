import { describe, expect, it, vi } from 'vitest';
import { computeScore, parsePriceLevel, ratingPoints, reviewPoints, tierFromScore } from './score';
import { analyseHomepage, classifyListingWebsite, isFetchableUrl, leadTypeFor, normaliseInstagram } from './website';
import { placesToLeads, type Place } from './places';
import { SHEET_COLUMNS, firstRowOfRange, leadToRow, type SheetLead } from './sheet';
import { buildPlacesQuery, normaliseCommand } from './command';
import { Db, HttpError, requireOwner } from './http';

describe('business score', () => {
  it('gives top marks to an excellent, busy, expensive multi-branch place', () => {
    const { score, reasons } = computeScore({ rating: 4.8, reviewCount: 2500, priceLevel: 'VERY_EXPENSIVE', photoCount: 10, premiumArea: true, branchCount: 3 });
    expect(score).toBe(100);
    expect(reasons).toHaveLength(6);
    expect(tierFromScore(score)).toBe('luxury');
  });
  it('scores a small new place low and never below 1', () => {
    expect(computeScore({ rating: null, reviewCount: 0, priceLevel: 'FREE', photoCount: 0, premiumArea: false, branchCount: 1 }).score).toBe(2);
    expect(computeScore({ rating: null, reviewCount: null, priceLevel: null, photoCount: 0, premiumArea: null, branchCount: 1 }).score).toBe(8);
  });
  it('never scores above 100', () => {
    expect(computeScore({ rating: 5, reviewCount: 10_000_000, priceLevel: 'VERY_EXPENSIVE', photoCount: 50, premiumArea: true, branchCount: 9 }).score).toBe(100);
  });
  it('maps scores to tiers at the right boundaries', () => {
    expect(tierFromScore(44)).toBe('standard');
    expect(tierFromScore(45)).toBe('premium');
    expect(tierFromScore(69)).toBe('premium');
    expect(tierFromScore(70)).toBe('luxury');
  });
  it('uses sensible rating and review steps', () => {
    expect(ratingPoints(4.7)).toBe(25);
    expect(ratingPoints(4.0)).toBe(12);
    expect(reviewPoints(9)).toBe(8);
    expect(reviewPoints(99)).toBe(16);
    expect(reviewPoints(999)).toBe(24);
  });
  it('reads Google price levels', () => {
    expect(parsePriceLevel('PRICE_LEVEL_EXPENSIVE')).toBe('EXPENSIVE');
    expect(parsePriceLevel('PRICE_LEVEL_UNSPECIFIED')).toBeNull();
    expect(parsePriceLevel(undefined)).toBeNull();
  });
  it('never guesses the premium area — it scores 0 until analysed', () => {
    const r = computeScore({ rating: 4, reviewCount: 10, priceLevel: null, photoCount: 1, premiumArea: null, branchCount: 1 }).reasons.find((x) => x.label === 'Premium area')!;
    expect(r.points).toBe(0);
    expect(r.detail).toMatch(/Not analysed/);
  });
});

describe('Hot / Warm / Skip classification', () => {
  it('no website = Hot', () => {
    expect(classifyListingWebsite(undefined).status).toBe('none');
    expect(leadTypeFor('none')).toBe('hot');
  });
  it('only a social or delivery page = Hot, and keeps the Instagram link', () => {
    const r = classifyListingWebsite('https://www.instagram.com/maple.bean/');
    expect(r.status).toBe('social_only');
    expect(r.instagram).toBe('https://www.instagram.com/maple.bean');
    expect(classifyListingWebsite('https://m.facebook.com/somecafe').status).toBe('social_only');
    expect(classifyListingWebsite('https://www.zomato.com/ncr/some-place').status).toBe('social_only');
    expect(leadTypeFor('social_only')).toBe('hot');
  });
  it('a real website is checked before deciding', () => {
    expect(classifyListingWebsite('https://www.realcafe.ca/').status).toBe('pending');
    expect(leadTypeFor('pending')).toBe('pending');
  });
  it('a site that does not load = Hot; weak = Warm; good = Skip', () => {
    expect(leadTypeFor('broken')).toBe('hot');
    expect(leadTypeFor('weak')).toBe('warm');
    expect(leadTypeFor('good')).toBe('skip');
  });
  it('flags an old, non-mobile site as weak and finds its public email', () => {
    const html = `<html><head><title>Joe</title></head><body><center><font size=3>Welcome to Joe's Painting</font></center>
      <a href="mailto:Joe@JoesPainting.ca">Email us</a> Copyright 2016 Joe's Painting</body></html>`;
    const a = analyseHomepage(html, 'http://joespainting.ca/', 2026);
    expect(a.status).toBe('weak');
    expect(a.issues.join(' ')).toMatch(/HTTPS/);
    expect(a.issues.join(' ')).toMatch(/phones/);
    expect(a.issues.join(' ')).toMatch(/2016/);
    expect(a.email).toBe('joe@joespainting.ca');
  });
  it('treats a modern, mobile, HTTPS site as good', () => {
    const body = '<p>' + 'Fresh coffee and pastries baked daily in Leslieville. '.repeat(20) + '</p>';
    const html = `<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><main><section>${body}</section></main>
      <a href="https://instagram.com/goodcafe">IG</a> © 2026 Good Cafe</body></html>`;
    const a = analyseHomepage(html, 'https://goodcafe.ca/', 2026);
    expect(a.status).toBe('good');
    expect(a.instagram).toBe('https://www.instagram.com/goodcafe');
  });
  it('flags free builder subdomains and parked pages', () => {
    const html = '<meta name="viewport" content="width=device-width"><p>This domain is for sale</p>';
    expect(analyseHomepage(html, 'https://joe.wixsite.com/cafe', 2026).status).toBe('weak');
  });
  it('ignores placeholder emails', () => {
    expect(analyseHomepage('<a href="mailto:you@example.com">x</a>', 'https://a.ca', 2026).email).toBeNull();
  });
  it('only fetches public web addresses', () => {
    expect(isFetchableUrl('https://cafe.ca')).toBe(true);
    expect(isFetchableUrl('http://localhost:3000')).toBe(false);
    expect(isFetchableUrl('http://192.168.1.1/admin')).toBe(false);
    expect(isFetchableUrl('ftp://cafe.ca')).toBe(false);
  });
  it('rejects non-profile Instagram links', () => {
    expect(normaliseInstagram('https://www.instagram.com/p/ABC123/')).toBeNull();
  });
});

describe('Google Places results → leads', () => {
  const base: Place = {
    id: 'p1', displayName: { text: 'Maple Bean' }, formattedAddress: '1 Queen St E, Toronto, ON, Canada', rating: 4.6, userRatingCount: 320,
    priceLevel: 'PRICE_LEVEL_MODERATE', photos: [{ name: 'photos/a' }, { name: 'photos/b' }],
    addressComponents: [
      { longText: 'Leslieville', shortText: 'Leslieville', types: ['neighborhood'] },
      { longText: 'Toronto', shortText: 'Toronto', types: ['locality'] },
      { longText: 'Canada', shortText: 'CA', types: ['country'] },
    ],
    reviews: [{ rating: 3, text: { text: 'ok' } }, { rating: 5, text: { text: 'Best flat white' }, authorAttribution: { displayName: 'Priya' } }],
    businessStatus: 'OPERATIONAL',
  };
  const ctx = { businessType: 'cafes', city: 'Toronto', country: 'Canada', countryCode: 'CA', searchId: 's1' };

  it('maps fields without inventing anything', () => {
    const [l] = placesToLeads([base], ctx);
    expect(l.name).toBe('Maple Bean');
    expect(l.neighbourhood).toBe('Leslieville');
    expect(l.country_code).toBe('CA');
    expect(l.website).toBeNull();
    expect(l.lead_type).toBe('hot');
    expect(l.phone).toBeNull();
    expect(l.email).toBeUndefined();
    expect(l.whatsapp).toBeUndefined();
    expect(l.top_reviews[0].text).toBe('Best flat white');
    expect(l.photo_count).toBe(2);
  });
  it('drops permanently closed businesses', () => {
    expect(placesToLeads([{ ...base, businessStatus: 'CLOSED_PERMANENTLY' }], ctx)).toHaveLength(0);
  });
  it('detects multiple branches of the same business', () => {
    const leads = placesToLeads([base, { ...base, id: 'p2', displayName: { text: 'MAPLE BEAN!' } }], ctx);
    expect(leads[0].score_reasons.find((r) => r.label === 'Multiple branches')!.points).toBe(10);
  });
});

describe('Google Sheet rows', () => {
  const lead: SheetLead = {
    created_at: '2026-11-16T08:00:00Z', name: '=HYPERLINK("x")', business_type: 'cafes', full_address: '1 Queen St', city: 'Toronto', country: 'Canada',
    phone: '(416) 555-0142', whatsapp: null, email: null, instagram: null, rating: 4.6, review_count: 320, score: 61, pricing_tier: 'premium',
    lead_type: 'hot', store_colors: null, delivery_links: { 'Uber Eats': 'https://ubereats.com/x' }, demo_link: null, contacted_by: null, stage: 'New',
    client_requirements: null, meeting_time: null, quoted_price: null, agreed_price: null, launch_offer_used: false, currency: null, domain: null,
    payment_method: null, advance_status: 'Not requested', final_payment_status: 'Not requested', final_website_link: null, domain_renewal_date: null, notes: null,
  };
  it('has exactly the 33 requested columns in order', () => {
    expect(SHEET_COLUMNS).toHaveLength(33);
    expect(SHEET_COLUMNS[0]).toBe('Date');
    expect(SHEET_COLUMNS[32]).toBe('Notes');
    expect(leadToRow(lead)).toHaveLength(33);
  });
  it('fills cells correctly', () => {
    const row = leadToRow(lead);
    expect(row[0]).toBe('2026-11-16');
    expect(row[13]).toBe('Premium');
    expect(row[14]).toBe('Hot (no website)');
    expect(row[16]).toBe('Uber Eats: https://ubereats.com/x');
    expect(row[24]).toBe('No');
  });
  it('reads the first row number from Google\'s reply', () => {
    expect(firstRowOfRange("'LeadPilot Leads'!A5:AG7")).toBe(5);
    expect(firstRowOfRange('Sheet1!A12:AG12')).toBe(12);
  });
});

describe('command understanding safety net', () => {
  it('never lets a search run with a missing city', () => {
    const c = normaliseCommand({ status: 'ready', business_type: 'Cafes', city: null, country: 'Japan', country_code: 'jp', language: 'hinglish', question: null, summary: 'Cafes' });
    expect(c.status).toBe('needs_info');
    expect(c.question).toMatch(/city/);
  });
  it('tidies values', () => {
    const c = normaliseCommand({ status: 'ready', business_type: ' Cafes ', city: 'Tokyo', country: 'Japan', country_code: 'jp', language: 'english', question: null, summary: 'Cafes in Tokyo, Japan' });
    expect(c.status).toBe('ready');
    expect(c.business_type).toBe('cafes');
    expect(c.country_code).toBe('JP');
    expect(buildPlacesQuery(c)).toBe('cafes in Tokyo, Japan');
  });
  it('rejects a broken country code', () => {
    const c = normaliseCommand({ status: 'ready', business_type: 'cafes', city: 'Tokyo', country: 'Japan', country_code: 'Japan', language: 'english', question: null, summary: '' });
    expect(c.status).toBe('needs_info');
  });
});

describe('owner check and rate limits', () => {
  const dbReturning = (value: string) => new Db('token', vi.fn(async () => new Response(JSON.stringify(value), { status: 200 })) as unknown as typeof fetch);
  it('lets the owner through', async () => {
    await expect(requireOwner(dbReturning('ok'), 'search', 30)).resolves.toBeUndefined();
  });
  it('blocks anyone who is not the owner with 2FA', async () => {
    await expect(requireOwner(dbReturning('not_owner'), 'search', 30)).rejects.toMatchObject({ status: 403 });
  });
  it('blocks when the hourly limit is reached', async () => {
    await expect(requireOwner(dbReturning('rate_limited'), 'search', 30)).rejects.toBeInstanceOf(HttpError);
    await expect(requireOwner(dbReturning('rate_limited'), 'search', 30)).rejects.toMatchObject({ status: 429 });
  });
});
