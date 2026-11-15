// Usage: node scripts/screenshot.mjs <baseUrl> <outDir> page1 page2 ...
// Takes phone (390x844) and desktop (1440x900) full-page screenshots and runs basic quality checks:
// broken images, horizontal scroll, console errors, missing tel:/wa.me links, missing noindex.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const [base, out, ...pages] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const viewports = { phone: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, desktop: { width: 1440, height: 900, deviceScaleFactor: 1 } };
const browser = await chromium.launch();
let failures = 0;

for (const page of pages) {
  for (const [vpName, vp] of Object.entries(viewports)) {
    // Reduced motion so every section is visible in a full-page shot.
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile, hasTouch: vp.hasTouch, deviceScaleFactor: vp.deviceScaleFactor, reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    const errors = [];
    p.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    p.on('console', (m) => { if (m.type() === 'error' && !/maps|google|gstatic/i.test(m.text())) errors.push(`console: ${m.text()}`); });
    await p.goto(`${base}/${page}/`, { waitUntil: 'networkidle' });
    // Force lazy images to load.
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 80)); } window.scrollTo(0, 0); });
    await p.waitForLoadState('networkidle');
    await p.waitForTimeout(400);
    const report = await p.evaluate(() => ({
      broken: [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.currentSrc || i.src),
      hScroll: document.documentElement.scrollWidth > window.innerWidth + 1,
      tel: !!document.querySelector('a[href^="tel:"]'),
      wa: !!document.querySelector('a[href^="https://wa.me/"]'),
      noindex: !!document.querySelector('meta[name="robots"][content*="noindex"]'),
      banner: !!document.querySelector('.demo-banner'),
      h1: document.querySelectorAll('h1').length,
      imgsNoAlt: [...document.images].filter((i) => !i.hasAttribute('alt')).length,
    }));
    const problems = [];
    if (report.broken.length) problems.push(`broken images: ${report.broken.join(', ')}`);
    if (report.hScroll) problems.push('horizontal scroll');
    if (!report.tel) problems.push('no Call link');
    if (!report.wa) problems.push('no WhatsApp link');
    if (!report.noindex) problems.push('missing noindex');
    if (!report.banner) problems.push('missing demo banner');
    if (report.h1 !== 1) problems.push(`h1 count ${report.h1}`);
    if (report.imgsNoAlt) problems.push(`${report.imgsNoAlt} images without alt`);
    problems.push(...errors);
    await p.screenshot({ path: `${out}/${page}-${vpName}.png`, fullPage: true });
    await p.screenshot({ path: `${out}/${page}-${vpName}-fold.png` });
    console.log(`${problems.length ? 'FAIL' : 'PASS'} ${page} ${vpName}${problems.length ? ' — ' + problems.join(' | ') : ''}`);
    if (problems.length) failures++;
    await ctx.close();
  }
}
await browser.close();
process.exit(failures ? 1 : 0);
