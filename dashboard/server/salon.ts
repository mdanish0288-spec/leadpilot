// Premium demo design for every industry (started as the salon design). Pure CSS motion + 3D (no JavaScript: the host blocks scripts).
// Salon psychology: calm luxury spacing, serif elegance, social proof in the first screen, one clear action (Book),
// thumb-reach booking bar on phones. Facts come only from the lead; service descriptions are generic category
// descriptions (no prices, no invented reviews, awards or years).
import { esc, type DemoLead, type DemoOwner } from './demo';
import { pickServices, profileFor, type Profile } from './profiles';

export interface Palette { ink: string; accent: string; soft: string; paper: string }

const DEFAULT_PALETTES: Palette[] = [
  { ink: '#1b1614', accent: '#9a5b3c', soft: '#efe4da', paper: '#fbf8f5' },
  { ink: '#2a1824', accent: '#b0657a', soft: '#f3e3e6', paper: '#fdf8f8' },
  { ink: '#14211d', accent: '#3f7a63', soft: '#e3eee8', paper: '#f8fbf9' },
  { ink: '#17151f', accent: '#a07c3b', soft: '#efe8da', paper: '#fbf9f4' },
];

/** "#1b1614,#9a5b3c,#fbf8f5" (dark, accent, light) → palette. Falls back to a preset. */
export function paletteFor(storeColors: string | null | undefined, seed: number, presets: Palette[] = DEFAULT_PALETTES): Palette {
  const hex = (storeColors ?? '').match(/#[0-9a-f]{6}/gi) ?? [];
  if (hex.length >= 2) {
    const [ink, accent, paper = '#fbf8f5'] = hex as [string, string, string?];
    return { ink, accent, paper, soft: mix(accent, paper, 0.84) };
  }
  return presets[seed % presets.length];
}

function mix(a: string, b: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

const img = (id: string, w: number, h: number) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&q=72&w=${w}&h=${h}`;

/** The premium demo design, used for every industry. Words, photos, fonts and preset colours come from the profile. */
export function renderPremium(lead: DemoLead & { store_colors?: string | null }, owner: DemoOwner, seed: number, p: Profile = profileFor(lead)): string {
  const c = paletteFor(lead.store_colors, seed, p.palettes);
  const PH = p.photos;
  const city = lead.city ?? '';
  const phone = lead.phone_intl ?? lead.phone;
  const tel = phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : null;
  const wa = (lead.phone_intl ?? '').replace(/\D/g, '').length >= 10 ? `https://wa.me/${lead.phone_intl!.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${lead.name}, ${p.waText}`)}` : null;
  const hours = lead.opening_hours?.weekdayDescriptions ?? [];
  const daysOpen = hours.filter((h) => !/closed/i.test(h)).length;
  const services = pickServices(p, lead.services, lead.name);
  const credit = owner.businessName?.trim() ? `${owner.name} (${owner.businessName.trim()})` : owner.name;
  const split = lead.name.match(/^(.*?)\s+(by\s+.+)$/i);
  const titleA = split ? split[1] : lead.name;
  const titleB = split ? split[2] : '';
  const unisex = p.id === 'salon' && /unisex/i.test(lead.name + lead.services.join(' '));
  const rating = lead.rating != null ? lead.rating.toFixed(1) : null;
  const reviews = lead.review_count ? lead.review_count.toLocaleString('en-IN') : null;
  const typical = hours[0]?.split(':').slice(1).join(':').trim();
  const book = wa ?? tel;
  const a = (href: string | null, label: string, cls: string) => (href ? `<a class="${cls}" href="${esc(href)}"${href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${label}</a>` : '');
  const marquee = [...lead.services, ...services.map((s) => s.title)].filter((v, i, arr) => arr.findIndex((x) => x.toLowerCase() === v.toLowerCase()) === i).slice(0, 10);
  const stars = rating ? '★★★★★'.slice(0, Math.round(Number(rating))) : '';

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow"><title>${esc(lead.name)}${city ? ` — ${esc(city)}` : ''}</title>
<meta name="description" content="${esc(`${lead.name}${city ? `, ${city}` : ''}. ${rating ? `Rated ${rating} by ${reviews} ${p.people} on Google.` : ''}`)}">
<meta name="theme-color" content="${c.ink}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="preconnect" href="https://images.unsplash.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${p.font.google}&display=swap">
<style>
:root{--ink:${c.ink};--acc:${c.accent};--soft:${c.soft};--paper:${c.paper};--d:${p.font.display};--b:${p.font.body};--dw:${p.font.weight};--ease:cubic-bezier(.22,1,.36,1)}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:var(--ink);font:400 1.05rem/1.65 var(--b);-webkit-font-smoothing:antialiased;overflow-x:hidden;padding-bottom:84px}
h1,h2,h3,p,ul,figure{margin:0}ul{padding:0;list-style:none}a{color:inherit;text-decoration:none}img{display:block;max-width:100%}
.serif{font-family:var(--d);font-weight:var(--dw);letter-spacing:-.02em}
.wrap{max-width:1180px;margin:0 auto;padding:0 22px}
.banner{background:var(--ink);color:var(--paper);font:500 .78rem/1.4 var(--b);text-align:center;padding:8px 14px;opacity:.96}
nav.top{position:sticky;top:0;z-index:20;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 22px;background:color-mix(in srgb,var(--paper) 82%,transparent);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom:1px solid color-mix(in srgb,var(--ink) 8%,transparent)}
.logo{font-family:var(--d);font-size:1.3rem;line-height:1}.logo small{display:block;font:500 .68rem/1.6 var(--b);letter-spacing:.14em;opacity:.6;text-transform:uppercase}
.pill{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:52px;padding:0 26px;border-radius:999px;font-weight:700;font-size:.98rem;transition:transform .35s var(--ease),box-shadow .35s var(--ease),background .35s}
.pill:hover{transform:translateY(-3px);box-shadow:0 18px 34px -16px color-mix(in srgb,var(--acc) 70%,transparent)}
.solid{background:var(--ink);color:var(--paper)}.acc{background:var(--acc);color:#fff}.line{border:1.5px solid color-mix(in srgb,var(--ink) 25%,transparent)}
.sm{min-height:42px;padding:0 18px;font-size:.9rem}
/* HERO */
.hero{position:relative;padding:56px 0 40px;overflow:hidden;isolation:isolate}
.blob{position:absolute;border-radius:50%;filter:blur(60px);opacity:.55;z-index:-1;animation:drift 18s ease-in-out infinite alternate}
.b1{width:520px;height:520px;background:var(--soft);top:-160px;right:-120px}.b2{width:380px;height:380px;background:color-mix(in srgb,var(--acc) 35%,var(--paper));bottom:-160px;left:-120px;animation-duration:22s}
.hero .wrap{display:grid;gap:48px;align-items:center}
.kicker{display:inline-flex;align-items:center;gap:10px;font-weight:700;font-size:.82rem;letter-spacing:.12em;text-transform:uppercase;color:var(--acc)}
.kicker:before{content:"";width:28px;height:1.5px;background:currentColor}
h1{font-family:var(--d);font-weight:var(--dw);font-size:clamp(3rem,10.5vw,6.6rem);line-height:.96;letter-spacing:-.035em;margin-top:18px}
h1 em{display:block;font-style:italic;color:var(--acc);font-size:.62em;letter-spacing:-.02em;margin-top:6px}
.lead{margin-top:22px;max-width:46ch;font-size:1.12rem;color:color-mix(in srgb,var(--ink) 72%,transparent)}
.ctas{display:flex;flex-wrap:wrap;gap:12px;margin-top:30px}
.proof{display:flex;align-items:center;gap:14px;margin-top:30px;font-size:.95rem}
.proof b{font-family:var(--d);font-size:1.9rem;font-weight:500;line-height:1}.stars{color:#e0a83b;letter-spacing:2px}
/* 3D stack */
.stage{position:relative;height:440px;perspective:1300px}
.stack{position:absolute;inset:0;transform-style:preserve-3d;transform:rotateY(-16deg) rotateX(8deg);animation:float 9s ease-in-out infinite}
.card{position:absolute;border-radius:26px;overflow:hidden;box-shadow:0 40px 70px -30px rgba(0,0,0,.45);transform-style:preserve-3d}
.card img{width:100%;height:100%;object-fit:cover;animation:kb 26s ease-in-out infinite alternate}
.c1{width:62%;height:84%;left:6%;top:6%;transform:translateZ(0)}
.c2{width:44%;height:52%;right:0;top:0;transform:translateZ(90px)}
.c3{width:42%;height:44%;right:6%;bottom:0;transform:translateZ(150px)}
.glass{position:absolute;left:0;bottom:18px;transform:translateZ(200px);padding:16px 18px;border-radius:20px;background:color-mix(in srgb,var(--paper) 72%,transparent);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.6);box-shadow:0 24px 50px -24px rgba(0,0,0,.35);font-size:.86rem;min-width:190px}
.glass b{display:block;font-family:var(--d);font-size:2rem;font-weight:500;line-height:1.05}
.tag{position:absolute;right:-4px;top:46%;transform:translateZ(230px);background:var(--ink);color:var(--paper);border-radius:999px;padding:10px 16px;font-size:.82rem;font-weight:700;box-shadow:0 18px 30px -16px rgba(0,0,0,.5)}
/* marquee */
.marquee{border-block:1px solid color-mix(in srgb,var(--ink) 10%,transparent);overflow:hidden;padding:18px 0;background:var(--paper)}
.track{display:flex;gap:44px;width:max-content;animation:scroll 32s linear infinite}
.track span{font-family:var(--d);font-size:clamp(1.4rem,3.4vw,2.2rem);white-space:nowrap;display:inline-flex;align-items:center;gap:44px}
.track span:after{content:"✦";font-size:.6em;color:var(--acc)}
/* stats */
.stats{display:grid;grid-template-columns:repeat(2,1fr);gap:1px;background:color-mix(in srgb,var(--ink) 10%,transparent);border-radius:28px;overflow:hidden;margin-top:84px}
.stats div{background:var(--paper);padding:28px 22px}.stats b{display:block;font-family:var(--d);font-size:clamp(2.2rem,6vw,3.4rem);font-weight:500;line-height:1}
.stats span{color:color-mix(in srgb,var(--ink) 62%,transparent);font-size:.92rem}
section{padding:96px 0}
h2{font-family:var(--d);font-weight:var(--dw);font-size:clamp(2.3rem,6vw,4rem);line-height:1.02;letter-spacing:-.03em}
.intro{max-width:48ch;margin-top:16px;color:color-mix(in srgb,var(--ink) 70%,transparent)}
/* services */
.svc{display:grid;gap:16px;margin-top:44px;perspective:1100px}
.svc li{position:relative;padding:30px 26px 28px;border-radius:26px;background:#fff;border:1px solid color-mix(in srgb,var(--ink) 8%,transparent);transition:transform .5s var(--ease),box-shadow .5s var(--ease);transform-style:preserve-3d;overflow:hidden}
.svc li:before{content:"";position:absolute;inset:auto -40% -60% auto;width:220px;height:220px;border-radius:50%;background:var(--soft);transition:transform .6s var(--ease);z-index:0}
.svc li:hover{transform:rotateX(5deg) rotateY(-7deg) translateY(-6px);box-shadow:0 34px 60px -34px rgba(0,0,0,.4)}.svc li:hover:before{transform:scale(1.35)}
.svc li>*{position:relative;z-index:1}
.svc svg{width:44px;height:44px;padding:10px;border-radius:14px;background:var(--ink);color:var(--paper);fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.svc h3{font-family:var(--d);font-weight:var(--dw);font-size:1.65rem;margin:22px 0 8px}
.svc p{color:color-mix(in srgb,var(--ink) 68%,transparent)}
.note{margin-top:22px;font-size:.92rem;color:color-mix(in srgb,var(--ink) 60%,transparent)}
/* experience */
.exp{position:relative;border-radius:34px;overflow:hidden;min-height:560px;display:grid;align-items:end;color:#fff;margin:0 12px;isolation:isolate}
.exp img{position:absolute;inset:-12% 0;width:100%;height:124%;object-fit:cover;z-index:-2}
@supports (animation-timeline:view()){.exp img{animation:para linear both;animation-timeline:view()}}
.exp:after{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.72))}
.exp .in{padding:40px 26px;max-width:720px}.exp h2{color:#fff}.exp p{margin-top:14px;opacity:.9;max-width:44ch}
/* gallery */
.gal{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:40px;perspective:1200px}
.gal figure{border-radius:22px;overflow:hidden;transition:transform .6s var(--ease)}
.gal figure:nth-child(odd){transform:rotateY(5deg)}.gal figure:nth-child(even){transform:rotateY(-5deg) translateY(28px)}
.gal figure:hover{transform:rotateY(0) scale(1.03)}
.gal img{width:100%;aspect-ratio:4/5;object-fit:cover}
.cap{margin-top:40px;font-size:.82rem;color:color-mix(in srgb,var(--ink) 55%,transparent)}
/* steps */
.steps{display:grid;gap:14px;margin-top:40px;counter-reset:s}
.steps li{display:flex;gap:18px;align-items:flex-start;padding:24px;border-radius:22px;background:var(--soft)}
.steps li:before{counter-increment:s;content:counter(s);flex:none;display:grid;place-items:center;width:44px;height:44px;border-radius:50%;background:var(--ink);color:var(--paper);font-family:var(--d);font-size:1.3rem}
.steps b{display:block;font-size:1.08rem}.steps span{color:color-mix(in srgb,var(--ink) 66%,transparent);font-size:.95rem}
/* visit */
.visit{display:grid;gap:22px;margin-top:40px}
.box{border-radius:26px;background:#fff;border:1px solid color-mix(in srgb,var(--ink) 8%,transparent);padding:26px}
.box dt{font-size:.78rem;letter-spacing:.12em;text-transform:uppercase;color:var(--acc);font-weight:700;margin-top:16px}.box dt:first-child{margin-top:0}.box dd{margin:4px 0 0}
table{width:100%;border-collapse:collapse;margin-top:6px;font-size:.95rem}td{padding:8px 0;border-bottom:1px solid color-mix(in srgb,var(--ink) 8%,transparent)}td+td{text-align:right;color:color-mix(in srgb,var(--ink) 66%,transparent)}
.map{border-radius:26px;overflow:hidden;min-height:360px;background:var(--soft)}.map iframe{border:0;width:100%;height:100%;min-height:360px;filter:grayscale(.35) contrast(1.05)}
/* final */
.final{margin:0 12px 24px;border-radius:34px;background:var(--ink);color:var(--paper);text-align:center;padding:84px 24px;position:relative;overflow:hidden;isolation:isolate}
.final:before{content:"";position:absolute;width:520px;height:520px;border-radius:50%;background:var(--acc);filter:blur(90px);opacity:.45;top:-260px;left:50%;transform:translateX(-50%);z-index:-1;animation:pulse 8s ease-in-out infinite}
.final h2{color:var(--paper)}.final p{opacity:.8;margin:14px auto 0;max-width:40ch}
.final .ctas{justify-content:center}.final .line{border-color:rgba(255,255,255,.35)}
footer{text-align:center;padding:28px 22px 40px;font-size:.88rem;color:color-mix(in srgb,var(--ink) 60%,transparent)}
.bar{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:30;display:flex;gap:8px;padding:8px;border-radius:22px;background:color-mix(in srgb,var(--paper) 85%,transparent);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-shadow:0 20px 40px -18px rgba(0,0,0,.35)}
.bar a{flex:1;min-height:52px;border-radius:16px}
.float{display:none}
/* motion */
.r{animation:rise 1s var(--ease) both}.r1{animation-delay:.08s}.r2{animation-delay:.18s}.r3{animation-delay:.28s}.r4{animation-delay:.38s}.r5{animation-delay:.5s}
@supports (animation-timeline:view()){.in-view{animation:rise linear both;animation-timeline:view();animation-range:entry 5% cover 30%}}
@keyframes rise{from{opacity:0;transform:translateY(34px)}to{opacity:1;transform:none}}
@keyframes float{0%,100%{transform:rotateY(-16deg) rotateX(8deg) translateY(0)}50%{transform:rotateY(-10deg) rotateX(4deg) translateY(-14px)}}
@keyframes kb{from{transform:scale(1.08)}to{transform:scale(1.18)}}
@keyframes drift{from{transform:translate(0,0) scale(1)}to{transform:translate(-60px,40px) scale(1.15)}}
@keyframes scroll{to{transform:translateX(-50%)}}
@keyframes para{from{transform:translateY(-6%)}to{transform:translateY(6%)}}
@keyframes pulse{0%,100%{opacity:.35}50%{opacity:.6}}
@media (min-width:900px){
 body{padding-bottom:0}.bar{display:none}
 .float{display:flex;position:fixed;right:24px;bottom:24px;z-index:30;width:62px;height:62px;border-radius:50%;background:var(--acc);color:#fff;align-items:center;justify-content:center;box-shadow:0 18px 34px -12px color-mix(in srgb,var(--acc) 80%,transparent);animation:pulse2 2.6s ease-in-out infinite}
 .float svg{width:28px;height:28px}
 @keyframes pulse2{0%,100%{box-shadow:0 0 0 0 color-mix(in srgb,var(--acc) 45%,transparent)}50%{box-shadow:0 0 0 14px transparent}}
 .hero{padding:80px 0 70px}.hero .wrap{grid-template-columns:1.05fr 1fr;gap:56px}.stage{height:560px}
 .stats{grid-template-columns:repeat(4,1fr)}.svc{grid-template-columns:repeat(4,1fr)}
 .exp{margin:0 24px}.exp .in{padding:72px}.gal{grid-template-columns:repeat(4,1fr);gap:18px}
 .steps{grid-template-columns:repeat(3,1fr)}.visit{grid-template-columns:1fr 1.2fr}.final{margin:0 24px 32px;padding:120px 24px}
 section{padding:130px 0}
}
@media (prefers-reduced-motion:reduce){*,*:before,*:after{animation:none!important;transition:none!important}html{scroll-behavior:auto}}
</style></head><body>
<div class="banner" role="note">Free demo designed for ${esc(lead.name)} by ${esc(credit)}</div>
<nav class="top"><a class="logo" href="#top">${esc(titleA)}${titleB ? `<small>${esc(titleB)}</small>` : ''}</a>${a(book, esc(p.navCta), 'pill solid sm')}</nav>
<main id="top">
<header class="hero"><span class="blob b1"></span><span class="blob b2"></span>
<div class="wrap">
 <div>
  <p class="kicker r r1">${unisex ? 'Unisex salon' : esc(p.kicker)}${city ? ` · ${esc(city)}` : ''}</p>
  <h1 class="r r2">${esc(titleA)}${titleB ? `<em>${esc(titleB)}</em>` : ''}</h1>
  <p class="lead r r3">${esc(p.lead(city))}</p>
  <div class="ctas r r4">${a(wa, esc(p.primary), 'pill acc')}${a(tel, esc(p.callLabel), 'pill line')}</div>
  ${rating ? `<p class="proof r r5"><b>${rating}</b><span><span class="stars">${stars}</span><br>${reviews} Google reviews</span></p>` : ''}
 </div>
 <div class="stage r r3" aria-hidden="true"><div class="stack">
  <div class="card c1"><img src="${img(PH.hero, 900, 1100)}" alt="" fetchpriority="high"></div>
  <div class="card c2"><img src="${img(PH.side, 700, 800)}" alt=""></div>
  <div class="card c3"><img src="${img(PH.small, 700, 700)}" alt=""></div>
  ${rating ? `<div class="glass"><b>${rating} <span class="stars" style="font-size:.5em">★</span></b>Loved by ${reviews} ${p.people}</div>` : ''}
  ${typical ? `<div class="tag">Open ${daysOpen === 7 ? 'all week' : `${daysOpen} days`} · ${esc(typical)}</div>` : ''}
 </div></div>
</div></header>
<div class="marquee" aria-hidden="true"><div class="track">${[...marquee, ...marquee].map((m) => `<span>${esc(m)}</span>`).join('')}</div></div>
<div class="wrap"><div class="stats in-view">
 ${rating ? `<div><b>${rating}</b><span>Google rating</span></div>` : ''}
 ${reviews ? `<div><b>${reviews}</b><span>Google reviews</span></div>` : ''}
 ${daysOpen ? `<div><b>${daysOpen === 7 ? '7 days' : `${daysOpen} days`}</b><span>Open every week</span></div>` : ''}
 ${p.id === 'salon' ? `<div><b>${unisex ? 'Unisex' : 'All'}</b><span>${unisex ? 'For women and men' : 'Beauty services'}</span></div>` : `<div><b>Local</b><span>${city ? `Right here in ${esc(city)}` : 'Right in your area'}</span></div>`}
</div></div>
<section><div class="wrap">
 <p class="kicker in-view">What we do</p>
 <h2 class="in-view" style="margin-top:14px">${p.servicesTitle}</h2>
 <ul class="svc">${services.map((s) => `<li class="in-view"><svg viewBox="0 0 24 24" aria-hidden="true">${s.icon}</svg><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></li>`).join('')}</ul>
 <p class="note in-view">${esc(p.note)}</p>
</div></section>
<div class="exp"><img src="${img(PH.exp, 1800, 1300)}" alt="" loading="lazy"><div class="in">
 <p class="kicker" style="color:#fff">${esc(p.expKicker)}</p>
 <h2 style="margin-top:14px">${esc(p.expTitle)}</h2>
 <p>${esc(p.expText)}</p>
</div></div>
<section><div class="wrap">
 <p class="kicker in-view">Gallery</p><h2 class="in-view" style="margin-top:14px">${esc(p.galleryTitle)}</h2>
 <div class="gal">${PH.gallery.map((g) => `<figure class="in-view"><img src="${img(g, 700, 875)}" alt="" loading="lazy"></figure>`).join('')}</div>
 <p class="cap">Sample photos. ${esc(lead.name)}’s own photos will appear here.</p>
</div></section>
<section style="padding-top:0"><div class="wrap">
 <p class="kicker in-view">How it works</p><h2 class="in-view" style="margin-top:14px">${esc(p.stepsTitle)}</h2>
 <ol class="steps" style="padding:0;list-style:none">
  ${p.steps.map(([t, d]) => `<li class="in-view"><div><b>${esc(t)}</b><span>${esc(d)}</span></div></li>`).join('')}
 </ol>
</div></section>
<section style="padding-top:0"><div class="wrap">
 <p class="kicker in-view">Visit</p><h2 class="in-view" style="margin-top:14px">Find us${city ? ` in ${esc(city)}` : ''}</h2>
 <div class="visit">
  <dl class="box in-view" style="margin:0">
   ${lead.full_address ? `<dt>Address</dt><dd>${esc(lead.full_address)}</dd>` : ''}
   ${phone ? `<dt>Phone</dt><dd><a href="${esc(tel!)}">${esc(phone)}</a></dd>` : ''}
   ${lead.instagram ? `<dt>Instagram</dt><dd><a href="${esc(lead.instagram)}" target="_blank" rel="noopener">${esc(lead.instagram.replace(/^https?:\/\/(www\.)?/, ''))}</a></dd>` : ''}
   ${hours.length ? `<dt>Opening hours</dt><dd><table><tbody>${hours.map((h) => { const [d, ...r] = h.split(':'); return `<tr><td>${esc(d)}</td><td>${esc(r.join(':').trim())}</td></tr>`; }).join('')}</tbody></table></dd>` : ''}
  </dl>
  <div class="map in-view"><iframe title="Map" src="https://www.google.com/maps?q=${encodeURIComponent(`${lead.name}, ${lead.full_address ?? city}`)}&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>
 </div>
</div></section>
<div class="final"><h2>${esc(p.finalTitle)}</h2><p>${rating ? `Join the ${reviews} ${p.people} who rate us ${rating} on Google.` : 'We’d love to see you.'}</p>
<div class="ctas">${a(wa, esc(p.primary), 'pill acc')}${a(tel, 'Call now', 'pill line')}${lead.maps_url ? a(lead.maps_url, 'Read our reviews', 'pill line') : ''}</div></div>
</main>
<footer><p class="logo" style="color:var(--ink)">${esc(lead.name)}</p>${lead.full_address ? `<p style="margin-top:8px">${esc(lead.full_address)}</p>` : ''}<p style="margin-top:8px">Website demo by ${esc(credit)}</p></footer>
${wa ? `<a class="float" href="${esc(wa)}" target="_blank" rel="noopener" aria-label="${esc(p.primary)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg></a>` : ''}
<nav class="bar" aria-label="Contact">${a(tel, 'Call', 'pill line')}${a(wa, esc(p.navCta), 'pill acc')}</nav>
</body></html>`;
}
