# LeadPilot design playbook

Every demo and final website MUST follow this file. The goal of every demo: the owner of the business opens it on their phone and is excited enough to reply.

Checklist at the end — a site is not sent until every box passes.

---

## 1. Start from the business, not a template

1. Read the analysis: real store colours, photos, reviews, neighbourhood, price level, business score.
2. Pick a layout from `templates/` that matches the business type and tier (see §9).
3. Write a short plan before code:
   - **Colour**: 4–6 named hex values, taken from the real store (§2).
   - **Type**: 1–2 typefaces and their roles (§3).
   - **Layout**: which library layout + what changes for this business.
   - **Main goal**: calls, orders, bookings, or visits. Exactly one.
   - **The one memorable thing**: the single bold element (a huge signature dish photo, a colour-swatch hero, a gold monogram). Everything else stays quiet.
4. Review the plan: if a part reads like what we would produce for *any* cafe, change it and note why.
5. No two demos may share the same palette + font pair + hero arrangement.

## 2. Colour

### Build the palette from the real store
- Pull colours from the sign, walls, furniture, logo, uniforms and packaging in the photos.
- **Brand colour** = the most recognisable store colour (usually the sign/logo).
- **Base** = a light or dark neutral that fits the interior (white walls → warm white; dark wood → espresso).
- **Accent** = the second store colour, or a complementary tone, used sparingly.
- Make a 12-step scale per hue (the Radix Colors method): steps 1–2 backgrounds, 3–5 component fills, 6–8 borders, 9–10 solid brand fills, 11–12 text. This keeps every shade in the family.

### 60-30-10 rule
- 60% base (backgrounds), 30% secondary (cards, sections, large type), 10% accent (buttons, prices, key links).
- The main action button is always the accent colour, and nothing else on the screen competes with it.

### Contrast (WCAG AA — mandatory)
- Body text: contrast ratio ≥ 4.5 : 1. Large text (≥ 24px, or ≥ 19px bold): ≥ 3 : 1. Buttons/icons/borders that matter: ≥ 3 : 1.
- Text on photos always sits on a scrim (dark gradient) or solid panel. Never rely on the photo.
- Check every text/background pair with a contrast checker before sending.

### Colour psychology by business type
| Business | Feels right | Use | Avoid |
|---|---|---|---|
| Restaurant / cafe / bakery | Appetite, warmth, comfort | Warm reds, oranges, saffron, caramel, browns, olive | Cold blues and purples as the main colour (suppress appetite) |
| Fine dining | Calm luxury | Deep charcoal, wine, brass, ivory | Bright saturated primaries |
| Painter / builder / plumber / electrician | Trust, reliability, cleanliness | Navy, steel blue, slate grey, white, one safety-orange or yellow accent | Pastels, neon |
| Cleaner | Fresh, hygienic, calm | Teal, sky blue, fresh green, crisp white | Muddy browns, heavy dark themes |
| Salon / spa / beauty | Elegance, softness, care | Soft neutrals (stone, blush, taupe) + gold/champagne; deep plum or black for high-end | Primary red/blue, harsh contrast blocks |
| Barber | Craft, confidence | Charcoal, oxblood, cream, brass | Pink pastels (unless that is the brand) |

The real store colours always win over this table. The table only guides the base and accent choice.

## 3. Typography

### Font pairings by business type (all free Google Fonts)
| Business | Display (headings) | Body | Feel |
|---|---|---|---|
| Specialty cafe | Fraunces | Figtree | Crafted, warm |
| Casual cafe / bakery | Bricolage Grotesque | Figtree | Friendly, modern |
| Indian / spice restaurant | Gloock or Yeseva One | Manrope | Rich, confident |
| Modern restaurant / bistro | Instrument Serif | Inter Tight | Editorial, calm |
| Painter / builder | Archivo (wide weights) | Inter | Solid, trustworthy |
| Cleaner | Plus Jakarta Sans (bold) | Plus Jakarta Sans | Clean, fresh |
| Luxury salon / spa | Cormorant Garamond | Jost | Elegant, airy |
| Nail / beauty studio | DM Serif Display | DM Sans | Soft, chic |
| Barber | Big Shoulders Display | Work Sans | Bold, crafted |

Never use the same pair on two demos in the same city.

### Size hierarchy (mobile → desktop, with `clamp()`)
- H1: 40–44px → 72–96px, line-height 1.0–1.1, slight negative letter-spacing.
- H2: 28–32px → 44–56px, line-height 1.1.
- H3: 20px → 24px.
- Body: 16–17px → 18px, line-height 1.55 (sans) / 1.65 (serif).
- Small/meta: 14px minimum. Never smaller on mobile.
- Max line length ~65 characters (max 75).

### Readability rules
- Sentence case for headings and buttons. No ALL-CAPS labels above every heading.
- Don't italicise or recolour a single word in a headline as decoration.
- Two weights per family at most (e.g. 400 + 700). Load only those.
- `font-display: swap` and preload the heading font.

## 4. Layout psychology

- **Visual hierarchy**: size → colour → position. The business name or the promise is the biggest thing; the main action is the most colourful.
- **Scanning patterns**:
  - *Z-pattern* for the hero and simple sections: logo top-left → contact top-right → headline → button bottom-left/centre.
  - *F-pattern* for menus, services and price lists: strong left-aligned item names, prices aligned on the right.
- **White space**: generous section padding (64–96px mobile, 120–160px desktop). Empty space reads as premium; crowding reads as cheap.
- **One clear main action per section**. Secondary actions are text links or outline buttons.
- **Fitts's law (thumb reach)**: on mobile, a sticky bottom bar with **Call** and **WhatsApp** (and Order/Book if relevant), 48px+ tall, full-width tap targets. Never put the main action only in the top-left corner.
- **Hick's law**: max 3–5 choices per section. Menus show the 6–8 signature items first, "Full menu" after.
- Left-align body text. Centre only short headings or single lines.
- Section order (default): Hero → proof (rating + best review) → menu/services → about/story with photos → more reviews → hours + map + contact → footer.

## 5. Conversion

- **5-second test**: in five seconds a visitor must know *what* this is, *where* it is, and *what to do*. Headline = what + where ("Wood-fired pizza on Ossington"), not a slogan.
- **Above the fold** (first phone screen): name, one-line promise, rating with review count, main button.
- **Real social proof**: Google rating (e.g. 4.7) + review count (e.g. 312 reviews) + 3–6 real review quotes with first name and "Google review". Never invent, edit the meaning of, or "improve" a review. Short trims with "…" are fine.
- **Trust signals**: full address, opening hours (with "Open now" logic in local time), map, real photos, phone number in local format, years in business only if verified.
- **Order/booking**: verified delivery-app links only. No verified link → WhatsApp or Call. Never guessed links.
- **Friction**: one tap to call, one tap to WhatsApp with a pre-filled message, no forms unless the client asks (then Netlify Forms + honeypot spam protection).

## 6. Motion

- One orchestrated moment on load (the hero headline/photo reveal). Subtle reveals on a few key blocks while scrolling — not every element.
- Hover/press feedback on buttons and cards (lift 2–4px, 150–250ms).
- Subtle parallax on the hero photo only (≤ 8% movement).
- Animate only `transform` and `opacity` (smooth on cheap phones). No layout-shifting animations.
- `prefers-reduced-motion`: turn off parallax, smooth scroll and reveals; show content immediately.
- Content must be visible if JavaScript fails (reveal classes only added by JS).

## 7. Local feel

| | Canada | UK | USA | India |
|---|---|---|---|---|
| Spelling | colour, neighbourhood, centre | colour, neighbourhood, centre | color, neighborhood, center | colour, neighbourhood, centre |
| Currency | $ (CAD) | £ | $ (USD) | ₹ |
| Phone | (416) 555-0142 | 020 7946 0958 | (212) 555-0142 | +91 98765 43210 |
| Time | 9:00 a.m. – 5:00 p.m. | 09:00–17:00 | 9:00 AM – 5:00 PM | 9:00 AM – 5:00 PM |
| Date | 15 Nov 2026 / Nov 15, 2026 | 15 November 2026 | November 15, 2026 | 15 Nov 2026 |
| Delivery apps | Uber Eats, DoorDash, SkipTheDishes | Deliveroo, Uber Eats, Just Eat | Uber Eats, DoorDash, Grubhub | Zomato, Swiggy |

- Write like a local copywriter: mention the neighbourhood and a real landmark naturally once or twice.
- Never mention India or the owner's location on client websites.

## 8. Cheap vs premium

| Looks cheap | Looks premium |
|---|---|
| Stock photos of smiling models | The business's real photos, consistently cropped and colour-matched |
| 4+ fonts, centred everything | 1–2 fonts, strong left alignment, a clear type scale |
| Every section a different bright colour | A restrained palette from the real store, 60-30-10 |
| Text on busy photos with no scrim | Text on solid panels or dark gradients |
| Tiny text, crowded sections | Large type, generous white space |
| Carousels/sliders that auto-rotate | One strong hero image, then a calm gallery |
| "Welcome to our website!" | "Hand-pulled noodles on Spadina since 2014" (verified facts only) |
| Lorem ipsum, fake reviews, made-up prices | Real reviews, real hours, prices only if visible in menu photos |
| Pixelated logo, stretched images | Clean vector/wordmark, `object-fit: cover`, sharp WebP/AVIF |
| Identical rounded cards with the same grey shadow everywhere | Varied structure that matches the content (lists for menus, big image for story) |
| Popups, autoplay music, flashing effects | Quiet motion that answers the visitor's actions |

## 9. Layout library (`templates/`)

| # | Name | Business | Tier | Main action | The one memorable thing |
|---|---|---|---|---|---|
| 1 | Ember | Cafe / coffee house | Premium | Visit / order | Full-bleed dark espresso hero with a large caramel-lit cup photo |
| 2 | Masala | Indian / spice restaurant | Premium–Luxury | Order (delivery apps) | Saffron-on-deep-red menu with per-dish Order buttons |
| 3 | Coat | Painter | Standard–Premium | Call for a quote | Colour-swatch strip hero + before/after slider |
| 4 | Fresh | Cleaner | Standard | WhatsApp for a quote | Crisp teal checklist of what's included, service-area map |
| 5 | Atelier | Luxury hair salon / spa | Luxury | Book (WhatsApp/call) | Airy editorial layout, large serif, champagne-gold hairlines |
| 6 | Bloom | Nail / beauty studio | Premium | Book | Blush and plum palette, staggered photo gallery |

## 10. Speed, SEO and security (every site)

- Static HTML on a CDN. Images WebP/AVIF, `srcset`, `loading="lazy"` below the fold, explicit width/height (no layout shift). Hero image `fetchpriority="high"`.
- Max ~40 KB JavaScript total. Fonts: 2 families, preconnect + `display=swap`.
- Lighthouse ≥ 90 for performance, accessibility, best practices, SEO.
- `<title>`, meta description, Open Graph image, LocalBusiness JSON-LD (verified fields only).
- Demos: `<meta name="robots" content="noindex, nofollow">` + `X-Robots-Tag: noindex` header.
- Headers: HTTPS only, HSTS, CSP, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin.
- No secrets in website code, ever.

## 11. Quality check before sending (all must pass)

- [ ] Playwright screenshots at 390×844 (phone) and 1440×900 (desktop) reviewed against this playbook.
- [ ] Business name, phone, address, hours, prices match the verified data exactly.
- [ ] Every link and button works: Call (`tel:`), WhatsApp (`wa.me`), map, delivery-app links open the right business at the right address.
- [ ] No broken images, no overlapping or cut-off text, no horizontal scroll on phone.
- [ ] Spelling checked in the lead's local English (or language).
- [ ] Contrast passes WCAG AA; keyboard focus visible; reduced-motion respected.
- [ ] Lighthouse ≥ 90 in all four categories.
- [ ] Demo banner + "Photos: Google Maps" credit present (demos), `noindex` present (demos).
- [ ] Doesn't look like any other demo already sent in this city.
- If anything fails or looks generic → fix → check again. Send only when it passes.
