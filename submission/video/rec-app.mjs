import { record, clickH, moveTo, smoothScroll } from './rec.mjs';
const B = 'http://localhost:4173/';
const only = process.argv[2];
const W = (p, ms) => p.waitForTimeout(ms);
const fresh = async (p) => { await p.evaluate(() => localStorage.clear()); await p.reload(); await W(p, 1500); };
const keepSim = async (p) => {
  await fresh(p);
  await p.goto(B + '#/simulation'); await W(p, 800);
  await p.click('button[aria-label="Step 10"]'); await W(p, 800);
  await p.click('text=Open this simulated chart'); await W(p, 6000);
};

const clips = {
  // 1. Mathis's 60-second check-up, sealed AI reveal, effect
  checkup: { url: B, prep: fresh, run: async (p) => {
    await W(p, 2200);
    await moveTo(p, '.rowitem:has-text("Trois Ponts brook")'); await W(p, 700);
    await clickH(p, '.rowitem:has-text("Trois Ponts brook")'); await W(p, 2600);
    await clickH(p, 'button:has-text("Take the pulse")'); await W(p, 2600);
    await clickH(p, "text=I'm on the bank"); await W(p, 1200);
    await clickH(p, '.samples button >> nth=0'); await W(p, 2200);
    await clickH(p, 'button:has-text("Continue")'); await W(p, 900);
    for (const t of ['Cloudy, with whitish deposits', 'Thick foam that stays', 'A faint unusual smell', 'Very slow', 'Natural and stable', 'Dense, with trees and bushes', 'None']) { await W(p, 650); await clickH(p, `.choice:has-text("${t}")`, 300); }
    await W(p, 1000); await clickH(p, 'text=Review my check-up'); await W(p, 1800);
    await clickH(p, 'text=I confirm my check-up'); await W(p, 3600);
    await W(p, 2500);
    await smoothScroll(p, 520, 1800); await W(p, 2500);
    await smoothScroll(p, 1100, 1800); await W(p, 800);
    for (const b of await p.$$('button:has-text("I keep my answer")')) { await clickH(p, b, 350); await W(p, 500); }
    await W(p, 600); await clickH(p, 'text=Add my check-up to the chart'); await W(p, 4500);
  } },
  // 2. The chart of a patient in alert
  chart: { url: B + '#/stream/marcaissonne', prep: fresh, run: async (p) => {
    await p.goto(B + '#/stream/marcaissonne'); await W(p, 3500);
    await moveTo(p, '.pulse'); await W(p, 2000);
    await smoothScroll(p, 560, 2500); await W(p, 2500);
    await clickH(p, 'button:has-text("Why?")'); await W(p, 3500);
    await smoothScroll(p, 980, 2500); await W(p, 3500);
    await smoothScroll(p, 1500, 2500); await W(p, 3000);
  } },
  // 3. The emergency scene, played in full
  sim: { url: B + '#/simulation', prep: fresh, run: async (p) => {
    await p.goto(B + '#/simulation'); await W(p, 1500);
    await clickH(p, 'button:has-text("Play")'); await W(p, 63000);
  } },
  // 4. The reply to the citizen and the stream's voice
  reply: { url: B, prep: keepSim, run: async (p) => {
    await p.goto(B + '#/inbox'); await W(p, 4500);
    await moveTo(p, '.notice >> nth=0'); await W(p, 1500);
    await p.goto(B + '#/stream/trois-ponts/voice'); await W(p, 11000);
    await clickH(p, '.vl >> nth=1'); await W(p, 2500);
  } },
  // 5. FHIR export to a public server + the physical sign
  scale: { url: B, prep: keepSim, run: async (p) => {
    await p.goto(B + '#/stream/trois-ponts'); await W(p, 1500);
    await clickH(p, 'summary'); await W(p, 800);
    await smoothScroll(p, 99999, 2000); await W(p, 1200);
    await clickH(p, 'button:has-text("Post to public HAPI FHIR server")'); await p.waitForSelector('text=Accepted by HAPI FHIR R4', { timeout: 30000 }).catch(() => {}); await W(p, 3500);
    await p.goto(B + '#/kit'); await W(p, 5500);
  } },
};
for (const [name, c] of Object.entries(clips)) if (!only || only.split(',').includes(name)) await record(`clips/${name}.mp4`, c);
