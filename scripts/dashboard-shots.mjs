// Usage: node scripts/dashboard-shots.mjs <baseUrl> <outDir>
// Screenshots every dashboard page (local preview mode with sample data) on phone + desktop.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const [base, out] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const pages = [['login', '/?preview&screen=login'], ['enroll', '/?preview&screen=enroll'], ['home', '/?preview'], ['leads', '/leads?preview'], ['alerts', '/alerts?preview'], ['calendar', '/calendar?preview'], ['settings', '/settings?preview'], ['hosting', '/hosting?preview'], ['lead-detail', '/leads/p2?preview'], ['import', '/leads/import?preview'], ['deleted', '/deleted?preview']];
const vps = { phone: { width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 }, desktop: { width: 1440, height: 900, deviceScaleFactor: 1 } };
const b = await chromium.launch(); let fails = 0;
for (const [name, path] of pages) for (const [vn, vp] of Object.entries(vps)) {
  const ctx = await b.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile, deviceScaleFactor: vp.deviceScaleFactor });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto(base + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(300);
  const h = await p.evaluate(() => [...document.querySelectorAll('body *')].some((el) => el.getBoundingClientRect().right > innerWidth + 1 && getComputedStyle(el).position !== 'fixed' && !el.closest('.overflow-x-auto')));
  await p.screenshot({ path: `${out}/${name}-${vn}.png`, fullPage: true });
  const probs = [...errs, ...(h ? ['horizontal scroll'] : [])];
  console.log(`${probs.length ? 'FAIL' : 'PASS'} ${name} ${vn}${probs.length ? ' — ' + probs.join(' | ') : ''}`); if (probs.length) fails++;
  await ctx.close();
}
// Command flow: type → Go → confirm → search → results
for (const [vn, vp] of Object.entries(vps)) {
  const ctx = await b.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile, deviceScaleFactor: vp.deviceScaleFactor });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(base + '/?preview', { waitUntil: 'networkidle' });
  await p.fill('#command', 'Tokyo mein cafe dhundo');
  await p.getByRole('button', { name: 'Understand command' }).click();
  await p.getByText('Cafes in Tokyo, Japan').waitFor();
  await p.screenshot({ path: `${out}/flow-confirm-${vn}.png` });
  await p.getByRole('button', { name: 'Search now' }).click();
  await p.getByText('See these leads').waitFor();
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}/flow-done-${vn}.png` });
  console.log(`${errs.length ? 'FAIL' : 'PASS'} command-flow ${vn}${errs.length ? ' — ' + errs.join(' | ') : ''}`); if (errs.length) fails++;
  await ctx.close();
}
// Import flow: link → preview → import → done
for (const [vn, vp] of Object.entries(vps)) {
  const ctx = await b.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile, deviceScaleFactor: vp.deviceScaleFactor });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(base + '/leads/import?preview', { waitUntil: 'networkidle' });
  await p.fill('#sheet_link', 'https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789/edit');
  await p.getByRole('button', { name: 'Read the sheet' }).click();
  await p.getByText('businesses ready').waitFor();
  await p.screenshot({ path: `${out}/import-preview-${vn}.png`, fullPage: true });
  await p.fill('#imp_city', 'Lucknow');
  await p.getByRole('button', { name: /Import \d+ businesses/ }).click();
  await p.getByText('Import finished').waitFor();
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}/import-done-${vn}.png`, fullPage: true });
  console.log(`${errs.length ? 'FAIL' : 'PASS'} import-flow ${vn}${errs.length ? ' — ' + errs.join(' | ') : ''}`); if (errs.length) fails++;
  await ctx.close();
}
await b.close(); process.exit(fails ? 1 : 0);
