// Raw screenshots for the Devpost gallery (3:2, 1950x1300).
import { chromium } from '@playwright/test';
const out = process.argv[2];
const base = process.env.BASE ?? 'http://localhost:4173/';
const browser = await chromium.launch({ executablePath: process.env.CHROME });
const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 1.3, ignoreHTTPSErrors: true });
const page = await ctx.newPage();
const wait = (ms) => page.waitForTimeout(ms);
const shot = async (name) => { await page.screenshot({ path: `${out}/${name}.png` }); console.log(name); };
const scroll = (y) => page.evaluate((y) => document.querySelector('.main').scrollTo(0, y), y);
await page.goto(base); await page.evaluate(() => localStorage.clear()); await page.reload(); await wait(1500);
await shot('01-patients-dashboard');
// Mathis's check-up on Trois Ponts brook
await page.goto(base + '#/stream/trois-ponts/checkup'); await wait(800);
await page.click("text=I'm on the bank"); await page.click('.samples button >> nth=0'); await wait(1200);
await page.click('button:has-text("Continue")');
const picks = ['Cloudy, with whitish deposits', 'Thick foam that stays', 'A faint unusual smell', 'Very slow', 'Natural and stable', 'Dense, with trees and bushes', 'None'];
for (const p of picks) { await wait(450); if (p === picks[1]) await shot('02-checkup-question'); await page.click(`.choice:has-text("${p}")`); }
await wait(600); await page.click('text=Review my check-up'); await wait(400);
await page.click('text=I confirm my check-up'); await wait(700); await shot('03-checkup-sealed');
await wait(2600); await shot('04-ai-reveal');
await scroll(620); await wait(300);
for (const b of await page.$$('button:has-text("I keep my answer")')) await b.click();
await wait(300); await shot('05-ai-compare-decide');
await page.click('text=Add my check-up to the chart'); await wait(1400); await shot('06-what-your-checkup-changed');
// Simulation → keep the simulated chart
await page.goto(base + '#/simulation'); await wait(800);
await page.click('button[aria-label="Step 10"]'); await wait(5500); await shot('07-emergency-scene-voice');
await page.click('text=Open this simulated chart'); await wait(6500);
await shot('08-stream-chart-alert');
await scroll(560); await wait(400); await shot('09-hypothesis-risk-careplan');
await page.goto(base + '#/ward'); await wait(1000); await shot('10-ward-room');
await page.goto(base + '#/inbox'); await wait(1000); await shot('11-citizen-inbox');
await page.goto(base + '#/stream/trois-ponts/voice'); await wait(9000); await shot('12-voice-of-the-stream');
await page.goto(base + '#/stream/sausse'); await wait(1000); await scroll(640); await wait(400); await shot('13-remission-recovery');
await page.goto(base + '#/stream/trois-ponts'); await wait(800);
await page.click('summary'); await wait(300);
await page.evaluate(() => document.querySelector('.main').scrollTo(0, 99999)); await wait(400);
await page.click('text=Post to public HAPI FHIR server'); await page.waitForSelector('text=Accepted by HAPI FHIR R4', { timeout: 40000 }).catch(() => {}); await wait(500); await shot('14-fhir-r4-export');
await page.goto(base + '#/kit'); await wait(1200); await shot('15-sign-and-school-kit');
await page.goto(base + '#/about'); await wait(800); await shot('16-honesty');
await browser.close();
