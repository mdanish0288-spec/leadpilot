import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildOverpassQuery, osmTagsFor, osmToLeads, type OsmElement } from './osm';

const ctx = { businessType: 'cafes', city: 'Delhi', country: 'India', countryCode: 'IN', searchId: 's1' };

describe('OpenStreetMap backup', () => {
  it('maps common business types to the right map tags', () => {
    expect(osmTagsFor('cafes')).toEqual(['amenity=cafe']);
    expect(osmTagsFor('hair salons')).toEqual(['shop=hairdresser']);
    expect(osmTagsFor('house painters')).toEqual(['craft=painter']);
    expect(osmTagsFor('bakeries')).toContain('shop=bakery');
    expect(osmTagsFor('aquarium shops')).toBeNull();
  });
  it('builds a bounded, named-places-only query', () => {
    const q = buildOverpassQuery('cafes', [28.4, 76.8, 28.9, 77.3]);
    expect(q).toContain('nwr["amenity"="cafe"]["name"]["phone"](28.4,76.8,28.9,77.3);');
    expect(q).toContain('["email"]');
    expect(q).toContain('[timeout:30]');
    expect(q).toMatch(/out center tags \d+;$/);
    expect(buildOverpassQuery('aquarium shops', [1, 2, 3, 4])).toContain('["name"~"aquarium shop",i]["shop"]');
  });
  it('keeps only businesses reachable by phone/email, skips chains, canteens and internet cafes, and flags them', () => {
    const els: OsmElement[] = [
      { type: 'node', id: 1, lat: 28.5, lon: 77.1, tags: { amenity: 'cafe', name: 'Chai Point Local', phone: '+91 98100 00000', 'addr:street': 'Hauz Khas Market' } },
      { type: 'node', id: 2, tags: { amenity: 'cafe', name: 'Cafe Coffee Day', brand: 'Cafe Coffee Day', phone: '+91 1' } },
      { type: 'node', id: 3, tags: { amenity: 'cafe', name: 'Name Only Cafe' } },
      { type: 'way', id: 4, center: { lat: 28.6, lon: 77.2 }, tags: { amenity: 'cafe', name: 'Old Site Cafe', website: 'http://oldsite.in', phone: '+91 11 2222 3333', 'addr:housenumber': '12', 'addr:street': 'Main Rd' } },
      { type: 'node', id: 6, tags: { amenity: 'cafe', name: 'Address Only Cafe', 'addr:street': 'Lane 3' } },
      { type: 'node', id: 7, tags: { amenity: 'cafe', name: 'PAR Tech. Cyber Cafe', phone: '+91 99' } },
      { type: 'node', id: 8, tags: { amenity: 'cafe', name: 'HCL cafeteria', phone: '+91 98' } },
      { type: 'node', id: 10, tags: { amenity: 'cafe', name: 'Campus Coffee', phone: '+91 97', operator: 'Delhi University' } },
      { type: 'node', id: 5, tags: { amenity: 'cafe', name: 'Insta Only', email: 'hi@insta.in', 'contact:instagram': 'https://instagram.com/instaonly' } },
    ];
    const leads = osmToLeads(els, ctx);
    expect(leads.map((l) => l.name)).toEqual(['Chai Point Local', 'Old Site Cafe', 'Insta Only']);
    const [a, b, c] = leads;
    expect(a.place_id).toBe('osm:node/1');
    expect(a.lead_type).toBe('hot');
    expect(a.needs_verification).toBe(true);
    expect(a.data_source).toBe('openstreetmap');
    expect(a.rating).toBeNull();
    expect(a.phone_intl).toBe('+91 98100 00000');
    expect(a.maps_url).toBe('https://www.openstreetmap.org/node/1');
    expect(b.website_status).toBe('pending');
    expect(b.full_address).toBe('12 Main Rd, Delhi');
    expect(b.latitude).toBe(28.6);
    expect(c.instagram).toBe('https://www.instagram.com/instaonly');
    expect(c.email).toBe('hi@insta.in');
  });
  it('never invents a rating, and says why the score is low', () => {
    const [l] = osmToLeads([{ type: 'node', id: 9, tags: { amenity: 'cafe', name: 'X', phone: '1' } }], ctx);
    expect(l.score_reasons.some((r) => /OpenStreetMap/.test(r.detail))).toBe(true);
    expect(l.pricing_tier).toBe('standard');
  });
});
