# LeadPilot — project rules (read at the start of every session)

## Who this is for
- One owner, who is NOT a coder and is the only user. Explain only what they must click, approve or paste, in simple words.
- Accuracy is the top priority. One wrong message, wrong price or broken website can lose a client.
- If unsure about anything, ASK the owner. Never guess.

## Project goal
LeadPilot is a private system that:
1. Finds local businesses (Google Places API, official only) from a typed or spoken command (English, Hindi, Hinglish).
2. Scores them and logs them to the Google Sheet "LeadPilot Leads".
3. Builds a premium free demo website for each Hot/Warm lead.
4. Sends a first message (email auto, WhatsApp/Instagram one-tap by the owner only).
5. Reads replies, customises the demo, books meetings, quotes prices inside fixed limits, collects 50% / 50% payments (owner confirms payments), and hands the final site to the client's own Netlify account.

## Tech stack
| Part | Where it runs |
|---|---|
| Owner dashboard | Cloudflare Pages at `app.[domain]` |
| Background jobs (lead finding, inbox checks, replies, scheduling) | Cloudflare Workers + Cron Triggers |
| Database, login (2FA), file storage | ONE Supabase project (free plan), Row Level Security on every table |
| Business email | `hello@[domain]` via Cloudflare Email Routing → owner's Gmail |
| AI brain | Google Gemini API (`gemini-3.5-flash-lite`, stable) — owner's choice 16 Nov 2026, replaced Claude API |
| Voice input | ElevenLabs Scribe (English, Hindi, Hinglish) |
| Leads | Google Places API (never scraping) |
| Sheet | Google Sheets API |
| Email sending/reading | Gmail API |
| WhatsApp | WhatsApp Business Cloud API (Meta) + signed webhooks |
| Instagram | Instagram Messaging API + signed webhooks |
| Meetings | Google Calendar API + Google Meet |
| Client demo sites | Static Astro sites on Netlify free plan at `[businessname].demo.[domain]`, `noindex` |
| Client final sites | Static Astro site on a Netlify account created with the CLIENT's email; domain in the CLIENT's name |

Client websites are plain static sites: NO Supabase, NO Workers, NO database, NO backend. Contact forms use Netlify Forms with spam protection only.
Client-site JavaScript stays minimal: vanilla Motion (`animate`, `inView`) + Lenis. No React islands unless a feature truly needs one.

## Repo layout
- `CLAUDE.md` — this file
- `docs/design-playbook.md` — rules every client website MUST follow
- `docs/design-resources.md` — vetted open-source libraries (stars, licence, purpose)
- `templates/` — Astro layout library (6+ premium layouts)
- `scripts/` — tooling (`screenshot.mjs` for client sites, `dashboard-shots.mjs` for the dashboard)
- `dashboard/` — owner dashboard (Vite + React + Tailwind). `npm test`, `npm run build`. Local preview with sample data: `npm run dev` then open `/?preview` (dev only, stripped from the live build)
- `supabase/migrations/` — every database change, in order. Supabase project ref `hqmhqrbmpxrksvnqmtlg` (Mumbai, free)

## Server (Phase 2)
- `dashboard/functions/api/*.ts` = Cloudflare Pages Functions (deploy automatically with the dashboard). Shared logic in `dashboard/server/` with tests (`npm test`).
- Endpoints: `status`, `command` (Gemini `gemini-3.5-flash-lite` via `@google/genai`, JSON schema output, re-validated with zod), `transcribe` (ElevenLabs `scribe_v2`), `search` (Google Places Text Search New, 20 per page, max 60), `check-websites` (4 per call), `sync-sheet`.
- Every endpoint first calls `public.use_quota` = owner + 2FA check + hourly rate limit. Server talks to Supabase with the OWNER's JWT so RLS always applies (no service-role key needed yet).
- Cloudflare free plan: 10 ms CPU and 50 outbound requests per call — keep batches small. Never store `fetch` as an object property (Workers "Illegal invocation"); wrap it in an arrow.
- Secrets (Cloudflare Pages → Settings → Variables and Secrets, type Secret): `GEMINI_API_KEY`, `GOOGLE_PLACES_API_KEY`, `ELEVENLABS_API_KEY`, `GOOGLE_SERVICE_ACCOUNT_JSON`.
- Search source: Google Places first; if Google is missing/refuses, automatic free backup = OpenStreetMap (Nominatim + Overpass, no key). Backup leads: phone/email required, chains/canteens skipped, no ratings, `data_source='openstreetmap'`, `needs_verification=true`, attribution "© OpenStreetMap contributors (ODbL)".
- Website checks run while the dashboard is open (resumed on next open). A Worker cron for fully unattended jobs comes with Phase 4/5.

## Security model (Phase 1)
- Database lets exactly ONE account exist (trigger on auth.users). RLS on every table calls `private.is_owner()`, which needs the owner's account AND `aal = aal2` (2FA passed).
- Price floors are enforced in the database (`lowest_price <= start_price`, > 0); daily email limit capped at 25 in the database.
- Every settings/price change is written to `audit_log`.
- The Supabase publishable key in `dashboard/src/lib/config.ts` is public by design. Secret/service keys never go in the repo.

## HARD SAFETY RULES — NEVER BREAK THESE
- Never send payment details in the first message or before the client clearly says yes.
- Never go below the tier's lowest price.
- Never promise a feature, deadline, refund or discount not in the owner's settings.
- Never make false claims ("I've never done this for anyone", fake deadlines, fake reviews, fake urgency, fake exclusivity).
- Never mark anything "Paid" by itself. Only the owner marks "Advance Paid" and "Fully Paid". If a client says "I paid" or sends a screenshot, reply "Thank you, I'm confirming the payment now" and alert the owner.
- Never buy a domain or spend money without the owner's approval.
- Never add unverified links, prices, phone numbers or addresses to a website.
- Never auto-send first messages on WhatsApp or Instagram.
- Never contact a lead with `needs_verification = true` (OpenStreetMap backup data) until the owner has confirmed on Google Maps that it has no website.
- STOP AND ALERT THE OWNER (no auto-reply) when: the client is angry or complaining, asks something not in settings, mentions legal issues or contracts, wants a big custom project, or the AI is not sure. Alert by WhatsApp + red dashboard badge, with a suggested reply approved by one tap.
- Before sending any message, run an automatic check: correct business name, price, currency, payment details, language, link. If anything fails, don't send; alert the owner.
- Log every message sent and received.
- If any API fails, retry once, then pause that task and alert the owner. Never send half-finished messages or websites.
- Never make the final site live or remove the demo banner / `noindex` before the owner marks "Fully Paid".
- Email: max 25 first emails per day (editable), only to publicly published emails, spaced inside the lead's local business hours, always with the STOP line. STOP = "Do Not Contact" forever.
- Never mention India or the owner's location on client websites.
- Client data is never shared with anyone except that client.

## Security rules
- NEVER put API keys, passwords or secrets in code or GitHub. Only in Cloudflare Worker secrets, Supabase secrets, or a local `.env` file listed in `.gitignore`.
- The GitHub repo `leadpilot` is PUBLIC (owner's decision, 16 Nov 2026). Anyone can read it, so NEVER commit: secrets, `.env` files, client data, lead data, real names/phones/emails, message logs, payment details (UPI ID, PayPal, wallet), or screenshots of real businesses. Those live only in Supabase / Cloudflare secrets.
- Dashboard: login with 2FA, only the owner's account, no sign-up page, RLS on every table.
- Webhooks verified with signatures (WhatsApp, Instagram). Rate limiting on all endpoints. Daily database backup.
- The deployed system must run 24/7 without Claude Code: use permanent credentials (API keys, OAuth clients, service accounts, webhook secrets) created for the system, never this session's connectors.

## How to work
1. Work phase by phase (BUILD ORDER). For each phase: plan and explain simply → build → test yourself → fix all errors → give the owner a simple non-coder test checklist.
2. Do NOT start the next phase until the owner types "next".
3. After each phase, commit and push to the public GitHub repo `leadpilot` (check `git diff --cached` for secrets and personal data first).
4. Automated tests for every critical function (pricing tiers, negotiation limits, launch-offer counter, payment messages, STOP handling, message checks). All tests must pass before a phase is done.
5. Use Playwright to open every website and dashboard page, take phone + desktop screenshots, and review them against `docs/design-playbook.md` before showing the owner.
6. When a step needs the owner (account, approval, payment, verification), stop and give exact click-by-click steps, then wait.

## BUILD ORDER
- Phase 0: connectors check, GitHub repo, CLAUDE.md, design research, design-playbook.md, layout library (6 layouts). ✅
- Phase 1: domain, Supabase, Cloudflare, business email, secure login with 2FA, dashboard design, settings page. ✅ (domain + business email still pending owner's choice)
- Phase 2: command box + voice + lead finder + business score + Google Sheet sync. ← current
- Phase 3: deep analysis + website builder + demo hosting on Netlify. 3 sample demos: Canadian restaurant, Indian cafe, painter.
- Phase 4: first message sending (email auto, WhatsApp and Instagram one-tap).
- Phase 5: WhatsApp + Instagram webhooks, Gmail hourly check, requirements, demo customisation.
- Phase 6: meeting booking (Google Calendar + Meet).
- Phase 7: smart pricing, negotiation, launch offer, domain check, 50% advance, final build, final 50%, delivery to client's own hosting, with all safety rules and tests.
- Phase 8: security audit, load test (10,000 simulated visitors on a demo), "How my system is hosted" page.

## Pricing defaults (editable in Settings later)
- India: Standard ₹5,500 start / ₹5,000 lowest; Premium ₹9,000 / ₹8,000; Luxury ₹15,000 / ₹13,000.
- Other countries (USD): Standard $350 / $300; Premium $600 / $500; Luxury $1,000 / $850.
- Prices include the first-year domain. Domain over $20/year → alert owner before quoting.
- Launch offer: real discount (default 10%) for the first 10 deals per city; counted and stopped automatically.

## Privacy note (AI)
- Use a Gemini key from a billing-enabled Google project: on Gemini's free tier Google may use prompts to improve its products, and later phases send client messages to the AI.
