// node tools/dbg.mjs state "<async js body; app, THREE and snap(path) available>" [out.png]
import { chromium } from '../web/node_modules/playwright-core/index.mjs';
// Uses the locally installed Google Chrome (or CHROME_PATH) with GPU enabled.
const chrome = () => (process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' });
const ANGLE = process.platform === 'win32' ? ['--use-angle=d3d11'] : [];
const [state, expr, shot] = process.argv.slice(2);
const W = Number(process.env.W || 960), H = Number(process.env.H || 512);
const browser = await chromium.launch({ ...chrome(), headless: true,
  args: [...ANGLE, '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars', '--force-device-scale-factor=1'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const logs = [];
page.on('console', (m) => { if (m.type() === 'log' || m.type() === 'error') logs.push(m.text()); });
page.on('pageerror', (e) => logs.push('[pageerror] ' + e.message));
await page.exposeFunction('__snap', async (p) => { await page.screenshot({ path: p }); return p; });
await page.goto(`http://127.0.0.1:5183/?capture=1&state=${state}&pr=1${process.env.Q || ''}`, { waitUntil: 'load' });
await page.waitForFunction('window.__ready === true || window.__error', null, { timeout: 90000 });
await page.waitForTimeout(Number(process.env.WAIT || 1500));
const r = await page.evaluate(`(async()=>{ const app=window.__app; const THREE=app.THREE;
  const snap=async(p)=>{ app.renderer.setAnimationLoop(null); for(let i=0;i<3;i++) app.frame(0.016); await new Promise(r=>setTimeout(r,60)); await window.__snap(p); app.renderer.setAnimationLoop(()=>app.frame()); };
  ${expr} })()`);
console.log(typeof r === 'string' ? r : JSON.stringify(r, null, 1));
if (shot) { await page.waitForTimeout(400); await page.screenshot({ path: shot }); }
if (logs.length) console.log('LOGS\n' + [...new Set(logs)].filter(l => !l.includes('404')).slice(0, 20).join('\n'));
await browser.close();
