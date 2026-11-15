import { describe, expect, it } from 'vitest';
import { formatMoney, isPlausibleUsdtAddress, launchOfferClashes, validatePriceTier, validateSettings } from './validate';
import type { PriceTier, Settings } from './types';

const DEFAULT_TIERS: PriceTier[] = [
  { region: 'IN', tier: 'standard', currency: 'INR', start_price: 5500, lowest_price: 5000 },
  { region: 'IN', tier: 'premium', currency: 'INR', start_price: 9000, lowest_price: 8000 },
  { region: 'IN', tier: 'luxury', currency: 'INR', start_price: 15000, lowest_price: 13000 },
  { region: 'INTL', tier: 'standard', currency: 'USD', start_price: 350, lowest_price: 300 },
  { region: 'INTL', tier: 'premium', currency: 'USD', start_price: 600, lowest_price: 500 },
  { region: 'INTL', tier: 'luxury', currency: 'USD', start_price: 1000, lowest_price: 850 },
];

const base: Settings = {
  owner_name: 'Owner', business_name: 'Studio', business_email: 'hello@example.com', whatsapp_number: '+919876543210',
  instagram_handle: '@studio', logo_path: null, services_included: 'Website', launch_offer_percent: 10,
  launch_offer_deals_per_city: 10, delivery_days: 7, advance_percent: 50, free_change_rounds: 1, paid_change_rounds: 2,
  meeting_days: ['mon', 'tue'], meeting_start: '10:00', meeting_end: '19:00', timezone: 'Asia/Kolkata',
  upi_id: 'studio@okhdfc', upi_qr_path: null, paypal_link: 'https://paypal.me/studio', paypal_qr_path: null,
  usdt_address: 'TXYZabcdefghijkmnopqrstuvwxyz12345', usdt_network: 'TRC20', daily_email_limit: 25, auto_reply: false, domain_alert_usd: 20,
};

describe('price tiers', () => {
  it('accepts every default tier', () => {
    for (const t of DEFAULT_TIERS) expect(validatePriceTier(t)).toBeNull();
  });
  it('rejects a lowest price above the starting price', () => {
    expect(validatePriceTier({ currency: 'INR', start_price: 5000, lowest_price: 5500 })).toMatch(/cannot be higher/);
  });
  it('rejects zero or negative prices', () => {
    expect(validatePriceTier({ currency: 'USD', start_price: 0, lowest_price: 0 })).toMatch(/more than zero/);
    expect(validatePriceTier({ currency: 'USD', start_price: 100, lowest_price: -1 })).toMatch(/more than zero/);
  });
  it('rejects a bad currency code', () => {
    expect(validatePriceTier({ currency: 'rs', start_price: 10, lowest_price: 5 })).toMatch(/3-letter/);
  });
});

describe('launch offer vs the lowest price', () => {
  it('finds the India Standard clash with the default 10% (5,500 → 4,950 is below 5,000)', () => {
    const clashes = launchOfferClashes(DEFAULT_TIERS, 10);
    expect(clashes.map((c) => `${c.region}-${c.tier}`)).toEqual(['IN-standard']);
    expect(clashes[0].offerPrice).toBe(4950);
  });
  it('has no clashes at 9%', () => {
    expect(launchOfferClashes(DEFAULT_TIERS, 9)).toEqual([]);
  });
  it('has no clashes at 0%', () => {
    expect(launchOfferClashes(DEFAULT_TIERS, 0)).toEqual([]);
  });
});

describe('settings', () => {
  it('accepts valid settings', () => {
    expect(validateSettings(base)).toEqual({});
  });
  it('never allows more than 25 emails a day', () => {
    expect(validateSettings({ ...base, daily_email_limit: 26 }).daily_email_limit).toBeDefined();
    expect(validateSettings({ ...base, daily_email_limit: 25 }).daily_email_limit).toBeUndefined();
  });
  it('requires WhatsApp in international format', () => {
    expect(validateSettings({ ...base, whatsapp_number: '9876543210' }).whatsapp_number).toBeDefined();
  });
  it('checks UPI ID shape', () => {
    expect(validateSettings({ ...base, upi_id: 'not-a-upi' }).upi_id).toBeDefined();
  });
  it('only accepts real PayPal links', () => {
    expect(validateSettings({ ...base, paypal_link: 'https://paypa1.me/scam' }).paypal_link).toBeDefined();
    expect(validateSettings({ ...base, paypal_link: 'http://paypal.me/studio' }).paypal_link).toBeDefined();
  });
  it('requires meeting end after start', () => {
    expect(validateSettings({ ...base, meeting_start: '18:00', meeting_end: '09:00' }).meeting_end).toBeDefined();
  });
  it('rejects an unknown time zone', () => {
    expect(validateSettings({ ...base, timezone: 'Mars/Base' }).timezone).toBeDefined();
  });
  it('keeps advance between 10% and 90%', () => {
    expect(validateSettings({ ...base, advance_percent: 100 }).advance_percent).toBeDefined();
    expect(validateSettings({ ...base, advance_percent: 5 }).advance_percent).toBeDefined();
  });
});

describe('USDT address must match its network', () => {
  it('accepts matching formats', () => {
    expect(isPlausibleUsdtAddress('TXYZabcdefghijkmnopqrstuvwxyz12345', 'TRC20')).toBe(true);
    expect(isPlausibleUsdtAddress('0x' + 'a'.repeat(40), 'ERC20')).toBe(true);
  });
  it('rejects an ERC20 address on TRC20 (a common, costly mistake)', () => {
    expect(isPlausibleUsdtAddress('0x' + 'a'.repeat(40), 'TRC20')).toBe(false);
    expect(validateSettings({ ...base, usdt_address: '0x' + 'a'.repeat(40), usdt_network: 'TRC20' }).usdt_address).toBeDefined();
  });
});

describe('money formatting', () => {
  it('uses Indian grouping for rupees and dollars for USD', () => {
    expect(formatMoney(15000, 'INR')).toBe('₹15,000');
    expect(formatMoney(1000, 'USD')).toBe('$1,000');
  });
});
