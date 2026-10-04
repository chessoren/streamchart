// Records a real headed Chromium on Xvfb with ffmpeg x11grab (1920x1080, 30 fps, x264).
import { chromium } from '/home/user/streamchart/node_modules/@playwright/test/index.mjs';
import { spawn } from 'node:child_process';
export async function record(out, { dsf = 1.25, seconds, url, run, prep }) {
  const browser = await chromium.launch({
    headless: false, executablePath: process.env.CHROME,
    env: { ...process.env, DISPLAY: ':99' },
    args: ['--kiosk', '--start-fullscreen', '--window-position=0,0', `--window-size=${Math.round(1920 / dsf)},${Math.round(1080 / dsf)}`, `--force-device-scale-factor=${dsf}`, '--hide-scrollbars', '--disable-infobars', '--autoplay-policy=no-user-gesture-required', '--ignore-certificate-errors'],
  });
  const ctx = await browser.newContext({ viewport: null, ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await page.addInitScript(() => {
    // a visible cursor for the recording (synthetic mouse events do not move the X cursor)
    window.addEventListener('DOMContentLoaded', () => {
      const c = document.createElement('div');
      c.id = '__cursor';
      c.style.cssText = 'position:fixed;left:-50px;top:-50px;width:22px;height:22px;border-radius:50%;background:rgba(17,26,43,.78);border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.35);z-index:99999;pointer-events:none;transform:translate(-50%,-50%);transition:transform .15s';
      document.body.appendChild(c);
      addEventListener('mousemove', (e) => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px'; }, true);
      addEventListener('mousedown', () => { c.style.transform = 'translate(-50%,-50%) scale(.7)'; }, true);
      addEventListener('mouseup', () => { c.style.transform = 'translate(-50%,-50%) scale(1)'; }, true);
    });
  });
  // true fullscreen via CDP hides the toolbar
  const cdp = await page.context().newCDPSession(page);
  const { windowId } = await cdp.send('Browser.getWindowForTarget');
  await cdp.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'fullscreen' } });
  if (url) await page.goto(url);
  if (prep) await prep(page);
  await page.waitForTimeout(1200);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'x11grab', '-draw_mouse', '0', '-video_size', '1920x1080', '-framerate', '30', '-i', ':99', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '17', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  await page.waitForTimeout(300);
  const t0 = Date.now();
  if (run) await run(page);
  if (seconds) { const left = seconds * 1000 - (Date.now() - t0); if (left > 0) await page.waitForTimeout(left); }
  ff.stdin.write('q');
  await new Promise((r) => ff.on('close', r));
  await browser.close();
  console.log('recorded', out, ((Date.now() - t0) / 1000).toFixed(1) + 's');
}
// Human-paced helpers
export async function moveTo(page, sel, opts = {}) {
  const el = typeof sel === 'string' ? await page.waitForSelector(sel, { timeout: 15000 }) : sel;
  await el.scrollIntoViewIfNeeded();
  const b = await el.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: opts.steps ?? 25 });
  return el;
}
export async function clickH(page, sel, pause = 450) {
  await moveTo(page, sel);
  await page.waitForTimeout(pause);
  await page.mouse.down(); await page.waitForTimeout(90); await page.mouse.up();
}
export async function smoothScroll(page, to, ms = 1500) {
  await page.evaluate(([to, ms]) => new Promise((res) => {
    const el = document.querySelector('.main'); const from = el.scrollTop; const t0 = performance.now();
    const step = (t) => { const k = Math.min(1, (t - t0) / ms); const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; el.scrollTop = from + (to - from) * e; k < 1 ? requestAnimationFrame(step) : res(); };
    requestAnimationFrame(step);
  }), [to, ms]);
}
