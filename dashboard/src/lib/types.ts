export type Tier = 'standard' | 'premium' | 'luxury';
export const TIERS: Tier[] = ['standard', 'premium', 'luxury'];

export interface PriceTier {
  region: string; // ISO country code (e.g. "IN", "CA") or "INTL" for all other countries
  tier: Tier;
  currency: string; // ISO currency code
  start_price: number;
  lowest_price: number;
}

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export const WEEKDAYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const USDT_NETWORKS = ['TRC20', 'ERC20', 'BEP20', 'Polygon', 'Solana', 'TON'] as const;
export type UsdtNetwork = (typeof USDT_NETWORKS)[number];

export interface Settings {
  owner_name: string;
  business_name: string;
  business_email: string;
  whatsapp_number: string;
  instagram_handle: string;
  logo_path: string | null;
  services_included: string;
  launch_offer_percent: number;
  launch_offer_deals_per_city: number;
  delivery_days: number;
  advance_percent: number;
  free_change_rounds: number;
  paid_change_rounds: number;
  meeting_days: Weekday[];
  meeting_start: string; // "HH:MM" or "HH:MM:SS"
  meeting_end: string;
  timezone: string;
  upi_id: string;
  upi_qr_path: string | null;
  paypal_link: string;
  paypal_qr_path: string | null;
  usdt_address: string;
  usdt_network: UsdtNetwork;
  daily_email_limit: number;
  auto_reply: boolean;
  domain_alert_usd: number;
}

export const LEAD_STAGES = [
  'New', 'Demo Ready', 'Contacted', 'Replied', 'Customizing', 'Meeting Booked', 'Deal Agreed',
  'Advance Paid', 'Building Final', 'Final Review', 'Fully Paid', 'Delivered', 'Not Interested', 'Do Not Contact',
] as const;
