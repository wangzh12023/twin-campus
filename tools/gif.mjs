// Deterministic frame capture of camera transitions (for the README demo).
// node tools/gif.mjs outDir fps state>next>next ...   (holds 1 s on each state)
import { chromium } from '../web/node_modules/playwright-core/index.mjs';
// Uses the locally installed Google Chrome (or CHROME_PATH) with GPU enabled.
const chrome = () => (process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' });
const ANGLE = process.platform === 'win32' ? ['--use-angle=d3d11'] : [];
import fs from 'fs';
import path from 'path';
const [out, fpsArg, route] = process.argv.slice(2);
const fps = Number(fpsArg || 12);
const stops = route.split('>');
const W = Number(process.env.W || 960), H = Number(process.env.H || 512);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ ...chrome(), headless: true,
  args: [...ANGLE, '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars', '--force-device-scale-factor=1'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.goto(`http://127.0.0.1:5183/?capture=1&manual=1&drift=1&pr=1&state=${stops[0]}`, { waitUntil: 'load' });
await page.waitForFunction('window.__ready === true || window.__error', null, { timeout: 90000 });
let n = 0;
const shot = async () => { await page.screenshot({ path: path.join(out, `f_${String(n++).padStart(4, '0')}.png`) }); };
const step = async (k) => { for (let i = 0; i < k; i++) { await page.evaluate((dt) => window.__app.frame(dt), 1 / fps); await shot(); } };
await page.evaluate(() => { for (let i = 0; i < 20; i++) window.__app.frame(1 / 30); });
await page.waitForTimeout(800);
await step(fps);
for (const s of stops.slice(1)) {
  await page.evaluate((st) => window.__app.go(st), s);
  let guard = 0;
  while (await page.evaluate(() => !!window.__app.director.anim) && guard++ < fps * 12) await step(1);
  await page.waitForTimeout(300);
  await step(Math.round(fps * 1.2));
}
console.log('frames', n);
await browser.close();
