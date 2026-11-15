// Decides: NO WEBSITE (Hot) / WEAK or OLD WEBSITE (Warm) / GOOD WEBSITE (Skip).
// Pure functions — covered by website.test.ts.

export type WebsiteStatus = 'none' | 'social_only' | 'pending' | 'broken' | 'weak' | 'good';
export type LeadType = 'hot' | 'warm' | 'skip' | 'pending';

// A link to one of these is not a real website of the business's own.
const SOCIAL_OR_LISTING = [
  'facebook.com', 'fb.com', 'instagram.com', 'linktr.ee', 'linktree.com', 'wa.me', 'whatsapp.com', 'tiktok.com', 'x.com', 'twitter.com',
  'youtube.com', 'yelp.com', 'tripadvisor.', 'zomato.com', 'swiggy.com', 'ubereats.com', 'doordash.com', 'skipthedishes.com', 'grubhub.com',
  'deliveroo.', 'just-eat.', 'justeat.', 'booksy.com', 'fresha.com', 'vagaro.com', 'justdial.com', 'sulekha.com', 'g.page', 'maps.app.goo.gl',
  'business.site', 'linkedin.com', 'pinterest.com', 'magicpin.in', 'dineout.co.in', 'eazydiner.com', 'opentable.', 'thefork.',
];

// Cheap/free builder subdomains usually mean a basic or outdated site.
const FREE_BUILDER_HOSTS = ['wixsite.com', 'weebly.com', 'godaddysites.com', 'blogspot.com', 'wordpress.com', 'jimdosite.com', 'webnode.', 'site123.me', 'yolasite.com', 'strikingly.com', 'business.site', 'mystrikingly.com', 'carrd.co', 'sites.google.com'];

export function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

const hostMatches = (host: string, list: string[]) => list.some((d) => (d.endsWith('.') ? host.includes(d) : host === d || host.endsWith(`.${d}`)));

/** First pass from the Google listing alone (no network). */
export function classifyListingWebsite(websiteUri: string | null | undefined): { status: WebsiteStatus; instagram: string | null } {
  if (!websiteUri) return { status: 'none', instagram: null };
  const host = hostOf(websiteUri);
  if (!host) return { status: 'none', instagram: null };
  if (hostMatches(host, SOCIAL_OR_LISTING)) {
    return { status: 'social_only', instagram: host === 'instagram.com' ? normaliseInstagram(websiteUri) : null };
  }
  return { status: 'pending', instagram: null };
}

export function leadTypeFor(status: WebsiteStatus): LeadType {
  switch (status) {
    case 'none':
    case 'social_only':
    case 'broken': return 'hot';
    case 'weak': return 'warm';
    case 'good': return 'skip';
    default: return 'pending';
  }
}

export function normaliseInstagram(url: string): string | null {
  const m = /instagram\.com\/([A-Za-z0-9._]{1,30})\/?(?:[?#].*)?$/i.exec(url.trim());
  if (!m || ['p', 'reel', 'explore', 'stories', 'accounts'].includes(m[1].toLowerCase())) return null;
  return `https://www.instagram.com/${m[1]}`;
}

export interface SiteAnalysis { status: 'weak' | 'good'; issues: string[]; email: string | null; instagram: string | null }

/**
 * Looks at the homepage HTML and lists concrete problems. 3+ "weak points" = Weak/Old (Warm lead).
 * Only publicly published emails are captured (mailto: links on the business's own site).
 */
export function analyseHomepage(html: string, finalUrl: string, currentYear: number): SiteAnalysis {
  const h = html.slice(0, 200_000);
  const lower = h.toLowerCase();
  const issues: { text: string; weight: number }[] = [];
  const host = hostOf(finalUrl) ?? '';

  if (finalUrl.startsWith('http://')) issues.push({ text: 'No HTTPS (shows "Not secure" in browsers)', weight: 2 });
  if (!/<meta[^>]+name=["']?viewport/i.test(h)) issues.push({ text: 'Not built for phones (no mobile viewport)', weight: 3 });
  if (hostMatches(host, FREE_BUILDER_HOSTS)) issues.push({ text: `Free site-builder address (${host})`, weight: 2 });

  const years = [...h.matchAll(/(?:©|&copy;|copyright)\s*(?:\d{4}\s*[-–]\s*)?(\d{4})/gi)].map((m) => Number(m[1])).filter((y) => y > 1995 && y <= currentYear);
  if (years.length && Math.max(...years) <= currentYear - 4) issues.push({ text: `Copyright year ${Math.max(...years)} — looks unmaintained`, weight: 2 });

  if (/<font[\s>]|<marquee|<center>|\.swf["']|<frameset/i.test(h)) issues.push({ text: 'Very old web code (font/marquee/frames/Flash)', weight: 2 });
  const tables = (lower.match(/<table/g) ?? []).length;
  if (tables >= 5 && !lower.includes('<main') && !lower.includes('<section')) issues.push({ text: 'Old table-based layout', weight: 1 });
  if (/jquery[.-]?1\.\d+(\.\d+)?(\.min)?\.js/i.test(h)) issues.push({ text: 'Outdated jQuery 1.x', weight: 1 });
  const text = h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/gi, ' ').replace(/\s+/g, ' ').trim();
  if (text.length < 400) issues.push({ text: 'Very little content on the homepage', weight: 1 });
  if (/(domain|this site) (is )?(for sale|parked|coming soon|under construction)/i.test(text)) issues.push({ text: 'Parked / "coming soon" page', weight: 4 });

  const weight = issues.reduce((s, i) => s + i.weight, 0);

  const emails = [...h.matchAll(/mailto:([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/gi)].map((m) => m[1].toLowerCase());
  const email = emails.find((e) => !/example\.|sentry|wixpress|domain\.com|email\.com/.test(e)) ?? null;
  const igLinks = [...h.matchAll(/https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9._]{1,30}\/?/gi)].map((m) => normaliseInstagram(m[0])).filter(Boolean) as string[];

  return { status: weight >= 3 ? 'weak' : 'good', issues: issues.map((i) => i.text), email, instagram: igLinks[0] ?? null };
}

/** True only for public http(s) URLs (never internal addresses). */
export function isFetchableUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    const h = u.hostname;
    return !(h === 'localhost' || /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.)/.test(h) || h.endsWith('.local') || h.endsWith('.internal') || !h.includes('.'));
  } catch {
    return false;
  }
}
