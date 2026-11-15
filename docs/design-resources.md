# Design resources (vetted 15 Nov 2026)

Rule for adding a resource: popular (high stars), updated in the last 6 months, and a licence that allows commercial use. Numbers below were read from the GitHub API on 15 Nov 2026.

## Used directly in client websites

| Resource | Stars | Licence | Last update | What we use it for |
|---|---|---|---|---|
| [Astro](https://github.com/withastro/astro) | 64.0k | MIT | Nov 2026 | Builds every client site as plain static HTML. Fast and needs no server. |
| [Motion](https://github.com/motiondivision/motion) (motion.dev) | 35.2k | MIT | Nov 2026 | Smooth animations. We use the tiny vanilla-JS version (`animate`, `inView`), not React. |
| [Lenis](https://github.com/darkroomengineering/lenis) | 17.3k | MIT | Nov 2026 | Smooth scrolling. Turned off for people who ask their phone for reduced motion. |
| [Lucide icons](https://github.com/lucide-icons/lucide) | 25.8k | ISC (like MIT) | Nov 2026 | Clean line icons (phone, clock, map pin, WhatsApp-style chat). Copied in as inline SVG. |
| [Google Fonts](https://github.com/google/fonts) | 20.8k | SIL Open Font Licence per font | Nov 2026 | All typefaces. Free for commercial use. |
| [Fontsource](https://github.com/fontsource/fontsource) | 6.3k | MIT | Nov 2026 | Self-hosting Google Fonts on final sites (faster, no third-party request). |
| [Radix Colors](https://github.com/radix-ui/colors) | 1.7k | MIT | Dec 2025 ⚠️ | Accessible colour-scale method (12 steps per hue). Last code update is 11 months old, but it is a finished colour system, not code that breaks. We use its method, not its package. |

## Used as design reference (patterns re-written in light vanilla code, no React shipped to clients)

| Resource | Stars | Licence | Last update | What we use it for |
|---|---|---|---|---|
| [shadcn/ui](https://github.com/shadcn-ui/ui) | 128.2k | MIT | Nov 2026 | Component patterns + the dashboard UI (Phase 1). |
| [Magic UI](https://github.com/magicuidesign/magicui) | 23.3k | MIT | Nov 2026 | Ideas for animated sections (marquees, number tickers, reveal effects). |
| [React Bits](https://github.com/DavidHDev/react-bits) | 52.0k | MIT + Commons Clause ⚠️ | Nov 2026 | Ideas for text and background animations. Allowed inside a client's website (even paid). NOT allowed: selling the components themselves as a pack. We never do that, so we are fine. |
| [Motion Primitives](https://github.com/ibelick/motion-primitives) | 7.0k | MIT | Sep 2026 | Extra animation patterns (text effects, carousels). |
| [Anthropic skills — frontend-design](https://github.com/anthropics/skills/tree/main/skills/frontend-design) | 195.2k | Apache-2.0 | Nov 2026 | Design method: make deliberate, subject-specific choices; avoid "AI-generated look" defaults. Built into the playbook. |
| [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss) | 98.6k | MIT | Nov 2026 | Dashboard styling (Phase 1). Client sites use small hand-written CSS instead, for speed. |

## Quality and speed tools

| Resource | Stars | Licence | Last update | What we use it for |
|---|---|---|---|---|
| [Playwright](https://github.com/microsoft/playwright) | 100.2k | Apache-2.0 | Nov 2026 | Opens every site on phone + desktop sizes, takes screenshots, clicks every button. |
| [Lighthouse](https://github.com/GoogleChrome/lighthouse) | 31.1k | Apache-2.0 | Nov 2026 | Speed / accessibility / SEO scores (target 90+). |
| [sharp](https://github.com/lovell/sharp) | 32.9k | Apache-2.0 | Nov 2026 | Converts photos to small WebP/AVIF files. |

## Why not React components on client sites?
Magic UI, React Bits and shadcn/ui are React libraries. Shipping React to every client site adds JavaScript and slows cheap phones. We copy the *look and motion* of their best patterns into plain CSS + vanilla Motion, which keeps pages fast (Lighthouse 90+) and keeps the same premium feel.

## Photos
Client sites use only the business's real photos (Google Maps, credited "Photos: Google Maps") or photos the client sends. The layout-library previews use Unsplash stock photos (free for commercial use under the Unsplash licence) purely as sample images.
