import { record } from './rec.mjs';
const base = 'file:///home/user/streamchart/submission/video/scenes/scenes.html?s=';
const only = process.argv[2];
const list = [['opening', 21], ['problem', 21], ['idea', 22], ['end', 9]];
for (const [s, sec] of list) if (!only || only === s) await record(`clips/${s}.mp4`, { dsf: 1, seconds: sec, url: base + s, run: async (p) => { await p.reload(); } });
