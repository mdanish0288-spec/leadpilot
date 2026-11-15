// Usage: node scripts/dashboard-shots.mjs <baseUrl> <outDir>
// Screenshots every dashboard page (local preview mode with sample data) on phone + desktop.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const [base, out] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const pages = [['login', '/?preview&screen=login'], ['enroll', '/?preview&screen=enroll'], ['home', '/?preview'], ['leads', '/leads?preview'], ['alerts', '/alerts?preview'], ['calendar', '/calendar?preview'], ['settings', '/settings?preview'], ['hosting', '/hosting?preview']];
const vps = { phone: { width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 }, desktop: { width: 1440, height: 900, deviceScaleFactor: 1 } };
const b = await chromium.launch(); let fails = 0;
for (const [name, path] of pages) for (const [vn, vp] of Object.entries(vps)) {
  const ctx = await b.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile, deviceScaleFactor: vp.deviceScaleFactor });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto(base + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(300);
  const h = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  await p.screenshot({ path: `${out}/${name}-${vn}.png`, fullPage: true });
  const probs = [...errs, ...(h ? ['horizontal scroll'] : [])];
  console.log(`${probs.length ? 'FAIL' : 'PASS'} ${name} ${vn}${probs.length ? ' — ' + probs.join(' | ') : ''}`); if (probs.length) fails++;
  await ctx.close();
}
await b.close(); process.exit(fails ? 1 : 0);
