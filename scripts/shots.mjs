// Screenshots every main screen (used for the visual QA loop and the Devpost gallery).
import { chromium } from '@playwright/test';
const out = process.argv[2] ?? 'shots';
const base = process.env.BASE ?? 'http://localhost:4173/';
const W = Number(process.env.W ?? 1500), H = Number(process.env.H ?? 1000);
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? undefined });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
page.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text()));
await page.goto(base);
await page.evaluate(() => localStorage.clear());
const shots = (process.env.ONLY ?? 'map,stream-marc,stream-sausse,ward,voice,cup,kit,about,settings,sim,checkup').split(',');
const go = async (h) => { await page.goto(base + '#' + h); await page.waitForTimeout(900); };
for (const s of shots) {
  if (s === 'map') await go('/');
  if (s === 'stream-marc') await go('/stream/marcaissonne');
  if (s === 'stream-sausse') await go('/stream/sausse');
  if (s === 'ward') await go('/ward');
  if (s === 'voice') { await go('/stream/marcaissonne/voice'); await page.waitForTimeout(6000); }
  if (s === 'cup') await go('/cup');
  if (s === 'kit') await go('/kit');
  if (s === 'about') await go('/about');
  if (s === 'settings') await go('/settings');
  if (s === 'sim') { await go('/simulation'); }
  if (s === 'checkup') { await go('/stream/trois-ponts/checkup'); }
  await page.screenshot({ path: `${out}/${s}.png`, fullPage: process.env.FULL === '1' });
  console.log('shot', s);
}
await browser.close();
