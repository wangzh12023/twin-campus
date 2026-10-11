// Headless capture of the running site.  node tools/shoot.mjs <outDir> state[:wait[:lang]] ...
// Extra: "seq:from>to:t1,t2,..." captures frames at given seconds during a transition.
import { chromium } from '../web/node_modules/playwright-core/index.mjs';
// Uses the locally installed Google Chrome (or CHROME_PATH) with GPU enabled.
const chrome = () => (process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' });
const ANGLE = process.platform === 'win32' ? ['--use-angle=d3d11'] : [];
import fs from 'fs';
import path from 'path';

const out = process.argv[2];
const specs = process.argv.slice(3);
const URL = process.env.SITE_URL || 'http://127.0.0.1:5183/';
const W = Number(process.env.W || 1536), H = Number(process.env.H || 820);
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  ...chrome(), headless: true,
  args: [...ANGLE, '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl', '--hide-scrollbars', '--force-device-scale-factor=1'],
});
const page = await browser.newPage({ viewport: { width: W, height: H } });
const logs = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => logs.push('[pageerror] ' + e.message));

async function open(state, lang) {
  await page.goto(`${URL}?capture=1&state=${state}${lang ? '&lang=' + lang : ''}&pr=1`, { waitUntil: 'load' });
  await page.waitForFunction('window.__ready === true || window.__error', null, { timeout: 90000 });
  const err = await page.evaluate('window.__error || null');
  if (err) throw new Error(err);
}

for (const spec of specs) {
  const parts = spec.split(':');
  if (parts[0] === 'seq') {
    const [from, to] = parts[1].split('>');
    const times = parts[2].split(',').map(Number);
    await open(from);
    await page.waitForTimeout(1200);
    await page.evaluate((t) => window.__app.go(t), to);
    const t0 = Date.now();
    for (const t of times) {
      const wait = t * 1000 - (Date.now() - t0);
      if (wait > 0) await page.waitForTimeout(wait);
      await page.screenshot({ path: path.join(out, `seq_${from}_${to}_${String(t).replace('.', '_')}.png`) });
    }
    continue;
  }
  const [state, wait = '1500', lang = ''] = parts;
  await open(state, lang);
  await page.waitForTimeout(Number(wait));
  await page.screenshot({ path: path.join(out, `${state}${lang ? '_' + lang : ''}.png`) });
  console.log('shot', state);
}
const info = await page.evaluate(() => {
  const r = window.__app.renderer.info;
  const gl = window.__app.renderer.getContext();
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  return { calls: r.render.calls, tris: r.render.triangles, gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'n/a' };
});
console.log('INFO', JSON.stringify(info));
if (logs.length) console.log('LOGS\n' + [...new Set(logs)].slice(0, 30).join('\n'));
await browser.close();
