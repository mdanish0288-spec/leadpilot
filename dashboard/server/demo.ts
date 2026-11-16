// Demo website generator. Pure function: lead data in → one complete, static HTML page out.
// Rules (design-playbook.md): only real data from the lead (never invented reviews, prices or services),
// every value HTML-escaped, no JavaScript at all (pure-CSS motion; the host also blocks scripts),
// phone-first layout with Call/WhatsApp in thumb reach, "noindex", demo banner, sample-photo note.

export interface DemoLead {
  id: string; name: string; business_type: string; services: string[]; full_address: string | null; city: string | null; country_code: string | null;
  phone: string | null; phone_intl: string | null; rating: number | null; review_count: number | null; maps_url: string | null;
  opening_hours: { weekdayDescriptions?: string[] } | null; instagram: string | null;
}
export interface DemoOwner { name: string; businessName?: string }

interface Theme { id: string; bg: string; surface: string; fg: string; muted: string; accent: string; onAccent: string; line: string; display: string; body: string; fonts: string; dark: boolean }

const THEMES: Record<string, Theme[]> = {
  beauty: [
    { id: 'noir-gold', bg: '#141110', surface: '#1e1a17', fg: '#f3ece2', muted: '#b9ad9d', accent: '#c9a46a', onAccent: '#141110', line: 'rgba(243,236,226,.14)', display: "'Cormorant Garamond', Georgia, serif", body: "'Jost', system-ui, sans-serif", fonts: 'family=Cormorant+Garamond:wght@500;600&family=Jost:wght@400;500', dark: true },
    { id: 'blush-plum', bg: '#f7e8e4', surface: '#fdf6f3', fg: '#3b2232', muted: '#6e5262', accent: '#3b2232', onAccent: '#fdf6f3', line: '#e8cfc9', display: "'DM Serif Display', Georgia, serif", body: "'DM Sans', system-ui, sans-serif", fonts: 'family=DM+Serif+Display&family=DM+Sans:wght@400;600', dark: false },
    { id: 'sage-linen', bg: '#eef0ea', surface: '#f8f9f5', fg: '#1f2a24', muted: '#56635b', accent: '#3f5f4b', onAccent: '#f8f9f5', line: '#d5dbd2', display: "'Fraunces', Georgia, serif", body: "'Manrope', system-ui, sans-serif", fonts: 'family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Manrope:wght@400;600', dark: false },
    { id: 'ink-teal', bg: '#fbfaf8', surface: '#ffffff', fg: '#16232a', muted: '#4f5f66', accent: '#1f4e5a', onAccent: '#ffffff', line: '#e2e6e7', display: "'Playfair Display', Georgia, serif", body: "'Inter', system-ui, sans-serif", fonts: 'family=Playfair+Display:wght@500;600&family=Inter:wght@400;600', dark: false },
  ],
  food: [
    { id: 'espresso', bg: '#1e1410', surface: '#2a1d16', fg: '#f3e6d6', muted: '#c4ad97', accent: '#e09a52', onAccent: '#1e1410', line: 'rgba(243,230,214,.14)', display: "'Fraunces', Georgia, serif", body: "'Figtree', system-ui, sans-serif", fonts: 'family=Fraunces:opsz,wght@9..144,500&family=Figtree:wght@400;600', dark: true },
    { id: 'saffron', bg: '#ffffff', surface: '#fff7ec', fg: '#2a1410', muted: '#6b524b', accent: '#7a1a17', onAccent: '#fff6e9', line: '#eadfd8', display: "'Gloock', Georgia, serif", body: "'Manrope', system-ui, sans-serif", fonts: 'family=Gloock&family=Manrope:wght@400;600', dark: false },
  ],
  trades: [
    { id: 'navy', bg: '#ffffff', surface: '#eef2f6', fg: '#0f2236', muted: '#4a5d72', accent: '#12355b', onAccent: '#ffffff', line: '#dde4ec', display: "'Archivo', system-ui, sans-serif", body: "'Inter', system-ui, sans-serif", fonts: 'family=Archivo:wght@600;800&family=Inter:wght@400;600', dark: false },
    { id: 'fresh-teal', bg: '#ffffff', surface: '#e7f5f2', fg: '#0d2a30', muted: '#4b6469', accent: '#0b5d6b', onAccent: '#ffffff', line: '#dbe8ea', display: "'Plus Jakarta Sans', system-ui, sans-serif", body: "'Plus Jakarta Sans', system-ui, sans-serif", fonts: 'family=Plus+Jakarta+Sans:wght@400;600;800', dark: false },
  ],
};

// Licensed free stock photos (Unsplash licence), used only until the business sends its own.
const PHOTOS: Record<string, { hero: string[]; gallery: string[] }> = {
  beauty: { hero: ['1600948836101-f9ffda59d250', '1560066984-138dadb4c035', '1521590832167-7bcbfaa6381f'], gallery: ['1522337360788-8b13dee7a37e', '1595476108010-b4d1f102b1b1', '1604654894610-df63bc536371', '1487412947147-5cebf100ffc2', '1610992015732-2449b76344bc'] },
  food: { hero: ['1554118811-1e0d58224f24', '1517248135467-4c7edcad34c4', '1555396273-367ea4eb4db5'], gallery: ['1509042239860-f550ce710b93', '1495474472287-4d71bcdd2085', '1511920170033-f8396924c348', '1414235077428-338989a2e8c0'] },
  trades: { hero: ['1600585154340-be6161a56a0c', '1600607687939-ce8a6c25118c'], gallery: ['1562259949-e8e7689d7828', '1484154218962-a197022b5858', '1513694203232-719a280e022f'] },
};

export function familyOf(type: string): 'beauty' | 'food' | 'trades' {
  const t = type.toLowerCase();
  if (/salon|beauty|parlou?r|hair|barber|nail|spa|makeup|make-up|bridal|skin|lash|wax|mehndi/.test(t)) return 'beauty';
  if (/caf|restaurant|food|bakery|coffee|tea|dhaba|sweet|pizza|biryani|kitchen|bar\b/.test(t)) return 'food';
  return 'trades';
}

function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

export function esc(v: unknown): string {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export function slugFor(name: string, id: string): string {
  const base = name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'demo';
  return `${base}-${id.replace(/[^a-z0-9]/gi, '').slice(0, 4).toLowerCase()}`;
}

export function pickTheme(lead: Pick<DemoLead, 'id' | 'business_type'>): Theme {
  const list = THEMES[familyOf(lead.business_type)];
  return list[hash(lead.id) % list.length];
}

const img = (id: string, w: number, h: number) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&q=70&w=${w}&h=${h}`;
const digits = (p: string | null) => (p ?? '').replace(/\D/g, '');

export function renderDemo(lead: DemoLead, owner: DemoOwner): { html: string; theme: string } {
  const t = pickTheme(lead);
  const fam = familyOf(lead.business_type);
  const photos = PHOTOS[fam];
  const h = hash(lead.id);
  const hero = photos.hero[h % photos.hero.length];
  const gallery = [0, 1, 2].map((i) => photos.gallery[(h + i) % photos.gallery.length]);
  const phoneDial = lead.phone_intl ?? lead.phone;
  const tel = phoneDial ? `tel:${phoneDial.replace(/[^\d+]/g, '')}` : null;
  const waNum = digits(lead.phone_intl);
  const bookText = fam === 'beauty' ? `Hi ${lead.name}, I'd like to book an appointment.` : fam === 'food' ? `Hi ${lead.name}, I'd like to place an order.` : `Hi ${lead.name}, I'd like a quote.`;
  const wa = waNum.length >= 10 ? `https://wa.me/${waNum}?text=${encodeURIComponent(bookText)}` : null;
  const city = lead.city ?? '';
  const services = lead.services.length ? lead.services : [lead.business_type.replace(/\b\w/g, (c) => c.toUpperCase())];
  const tagline = services.slice(0, 3).join(' · ');
  const hours = lead.opening_hours?.weekdayDescriptions ?? [];
  const mapQuery = encodeURIComponent(`${lead.name}, ${lead.full_address ?? city}`);
  const ctaWord = fam === 'beauty' ? 'Book on WhatsApp' : fam === 'food' ? 'Order on WhatsApp' : 'Get a quote on WhatsApp';
  const credit = owner.businessName?.trim() ? `${owner.name} (${owner.businessName.trim()})` : owner.name;

  const stars = lead.rating != null ? `<span class="stars" aria-hidden="true">${'★'.repeat(Math.round(lead.rating))}${'☆'.repeat(5 - Math.round(lead.rating))}</span>` : '';
  const btn = (href: string | null, label: string, cls: string) => (href ? `<a class="btn ${cls}" href="${esc(href)}"${href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${esc(label)}</a>` : '');

  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>${esc(lead.name)}${city ? ` — ${esc(city)}` : ''}</title>
<meta name="description" content="${esc(`${lead.name}: ${tagline}${city ? ` in ${city}` : ''}.`)}">
<meta name="theme-color" content="${t.bg}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://images.unsplash.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${t.fonts}&display=swap">
<style>
:root{--bg:${t.bg};--surface:${t.surface};--fg:${t.fg};--muted:${t.muted};--accent:${t.accent};--on:${t.onAccent};--line:${t.line};--d:${t.display};--b:${t.body}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}body{margin:0;background:var(--bg);color:var(--fg);font:400 1.0625rem/1.6 var(--b);-webkit-font-smoothing:antialiased;padding-bottom:78px}
h1,h2,h3,p,ul{margin:0}ul{padding:0;list-style:none}a{color:inherit}img{display:block;max-width:100%}
h1,h2,h3,.mark{font-family:var(--d);font-weight:600;letter-spacing:-.01em;line-height:1.08}
.wrap{max-width:1140px;margin:0 auto;padding:0 20px}
.demo{background:#111;color:#f4f4f5;font:500 .8rem/1.4 system-ui,sans-serif;text-align:center;padding:8px 14px}
.top{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;max-width:1140px;margin:0 auto}
.mark{font-size:1.35rem;text-decoration:none}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:50px;padding:0 22px;border-radius:999px;font-weight:600;text-decoration:none;transition:transform .25s ease,box-shadow .25s ease}
.btn:hover{transform:translateY(-2px);box-shadow:0 10px 24px -14px rgba(0,0,0,.45)}
.solid{background:var(--accent);color:var(--on)}.ghost{border:1.5px solid currentColor}
.small{min-height:40px;padding:0 16px;font-size:.92rem}
.hero{position:relative;min-height:84svh;display:grid;align-items:end;overflow:hidden;margin:0 10px;border-radius:24px;color:#fff;isolation:isolate}
.hero img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-2;animation:zoom 22s ease-out both}
.hero:after{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(0,0,0,.12) 10%,rgba(0,0,0,.82)),linear-gradient(90deg,rgba(0,0,0,.45),rgba(0,0,0,0) 65%)}
.hero .in{padding:28px 22px 34px;max-width:860px}
.eyebrow{font-weight:500;opacity:.9;margin-bottom:12px}
.hero h1{font-size:clamp(2.6rem,9vw,6rem)}
.hero p.tag{margin-top:14px;font-size:1.1rem;opacity:.92;max-width:44ch}
.chip{display:inline-flex;gap:8px;align-items:center;margin-top:18px;padding:8px 14px;border-radius:999px;background:rgba(255,255,255,.14);backdrop-filter:blur(8px);font-size:.95rem}
.stars{color:#f5c451;letter-spacing:2px}
.cta{display:flex;flex-wrap:wrap;gap:10px;margin-top:24px}.hero .ghost{color:#fff}
.rise{animation:rise .9s cubic-bezier(.22,1,.36,1) both}.d1{animation-delay:.1s}.d2{animation-delay:.22s}.d3{animation-delay:.34s}.d4{animation-delay:.46s}
section{padding:84px 0}
.proof{text-align:center}.big{font-family:var(--d);font-size:clamp(3.5rem,12vw,6.5rem);line-height:1}
.proof p{color:var(--muted);margin-top:10px}
h2{font-size:clamp(2rem,5vw,3.2rem);margin-bottom:28px}
.svc{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px;perspective:900px}
.svc li{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:22px 20px;font-weight:600;transition:transform .35s ease,box-shadow .35s ease;transform-style:preserve-3d}
.svc li:hover{transform:rotateX(6deg) rotateY(-6deg) translateY(-4px);box-shadow:0 22px 40px -24px rgba(0,0,0,.45)}
.svc li span{display:block;width:28px;height:2px;background:var(--accent);margin-bottom:14px}
.note{color:var(--muted);margin-top:18px}
.gal{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.gal img{width:100%;height:100%;object-fit:cover;border-radius:16px;aspect-ratio:4/5}
.gal img:first-child{grid-row:span 2;aspect-ratio:auto}
.cap{color:var(--muted);font-size:.85rem;margin-top:10px}
.visit{display:grid;gap:28px}
.visit dl{display:grid;gap:12px;margin:0}.visit dt{color:var(--muted);font-size:.9rem}.visit dd{margin:0}
table{width:100%;border-collapse:collapse}td{padding:9px 0;border-bottom:1px solid var(--line)}td+td{text-align:right;color:var(--muted)}
.map{border-radius:18px;overflow:hidden;min-height:320px;background:var(--surface)}.map iframe{border:0;width:100%;height:100%;min-height:320px}
footer{border-top:1px solid var(--line);padding:34px 20px;text-align:center;color:var(--muted);font-size:.92rem;display:grid;gap:6px}
.bar{position:fixed;inset:auto 0 0 0;display:flex;gap:8px;padding:10px 12px calc(10px + env(safe-area-inset-bottom));background:var(--bg);border-top:1px solid var(--line);z-index:9}
.bar .btn{flex:1;min-height:52px;border-radius:14px}
@keyframes rise{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:none}}
@keyframes zoom{from{transform:scale(1.12)}to{transform:scale(1)}}
@supports (animation-timeline:view()){.reveal{animation:rise linear both;animation-timeline:view();animation-range:entry 0% cover 28%}}
@media (min-width:900px){body{padding-bottom:0}.bar{display:none}.hero{margin:0 24px;border-radius:32px}.hero .in{padding:64px}.visit{grid-template-columns:1fr 1.2fr;gap:56px}section{padding:120px 0}.gal{grid-template-columns:1.2fr 1fr 1fr}.gal img:first-child{grid-row:auto;aspect-ratio:4/5}}
@media (prefers-reduced-motion:reduce){*,*:before,*:after{animation:none!important;transition:none!important}}
</style></head>
<body>
<div class="demo" role="note">Free demo designed for ${esc(lead.name)} by ${esc(credit)}</div>
<header class="top"><a class="mark" href="#top">${esc(lead.name)}</a>${btn(tel, 'Call', 'solid small')}</header>
<main id="top">
<section class="hero" style="padding:0"><img src="${img(hero, 1800, 1200)}" alt="" fetchpriority="high">
<div class="in">
${city ? `<p class="eyebrow rise">${esc(city)}</p>` : ''}
<h1 class="rise d1">${esc(lead.name)}</h1>
<p class="tag rise d2">${esc(tagline)}</p>
${lead.rating != null ? `<p class="chip rise d3">${stars} ${esc(lead.rating.toFixed(1))}${lead.review_count ? ` · ${esc(lead.review_count.toLocaleString('en-IN'))} Google reviews` : ''}</p>` : ''}
<div class="cta rise d4">${btn(wa, ctaWord, 'solid')}${btn(tel, 'Call now', 'ghost')}</div>
</div></section>
${lead.rating != null && lead.review_count ? `<section class="proof"><div class="wrap reveal"><p class="big">${esc(lead.rating.toFixed(1))}<span class="stars" style="font-size:.35em;vertical-align:middle;margin-left:10px">${'★'.repeat(Math.round(lead.rating))}</span></p><p>Rated by ${esc(lead.review_count.toLocaleString('en-IN'))} customers on Google</p>${lead.maps_url ? `<p style="margin-top:18px">${btn(lead.maps_url, 'Read the reviews on Google', 'ghost small')}</p>` : ''}</div></section>` : ''}
<section style="padding-top:${lead.rating != null ? '0' : '84px'}"><div class="wrap"><h2 class="reveal">${fam === 'food' ? 'What we serve' : 'What we do'}</h2>
<ul class="svc">${services.map((s) => `<li class="reveal"><span></span>${esc(s)}</li>`).join('')}</ul>
<p class="note reveal">${fam === 'beauty' ? 'Ask us on WhatsApp for the full service menu and prices.' : fam === 'food' ? 'Ask us on WhatsApp for today’s menu.' : 'Message us for a free quote.'}</p></div></section>
<section style="padding-top:0"><div class="wrap"><div class="gal">${gallery.map((g, i) => `<img class="reveal" src="${img(g, 900, 1100)}" alt="" loading="lazy" width="900" height="1100"${i ? '' : ''}>`).join('')}</div>
<p class="cap">Sample photos. Your own photos will appear here.</p></div></section>
<section style="padding-top:0"><div class="wrap visit">
<div class="reveal"><h2>Visit us</h2><dl>
${lead.full_address ? `<div><dt>Address</dt><dd>${esc(lead.full_address)}</dd></div>` : ''}
${phoneDial ? `<div><dt>Phone</dt><dd><a href="${esc(tel!)}">${esc(phoneDial)}</a></dd></div>` : ''}
${lead.instagram ? `<div><dt>Instagram</dt><dd><a href="${esc(lead.instagram)}" target="_blank" rel="noopener">${esc(lead.instagram.replace(/^https?:\/\/(www\.)?/, ''))}</a></dd></div>` : ''}
</dl>${hours.length ? `<table style="margin-top:22px"><caption style="text-align:left;color:var(--muted);font-size:.9rem;padding-bottom:6px">Opening hours</caption><tbody>${hours.map((d) => { const [day, ...rest] = d.split(':'); return `<tr><td>${esc(day)}</td><td>${esc(rest.join(':').trim())}</td></tr>`; }).join('')}</tbody></table>` : ''}</div>
<div class="map reveal"><iframe title="Map" src="https://www.google.com/maps?q=${mapQuery}&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>
</div></section>
</main>
<footer><p class="mark" style="color:var(--fg)">${esc(lead.name)}</p>${lead.full_address ? `<p>${esc(lead.full_address)}</p>` : ''}<p>Website demo by ${esc(credit)}</p></footer>
<nav class="bar" aria-label="Contact">${btn(tel, 'Call', 'ghost')}${btn(wa, ctaWord.replace(' on WhatsApp', ''), 'solid')}</nav>
</body></html>`;
  return { html, theme: t.id };
}
