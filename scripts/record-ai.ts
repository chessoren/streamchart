// Records real Gemini answers for the bundled sample photos, so the demo works without a key.
// Usage: GEMINI_API_KEY=... npx vite-node scripts/record-ai.ts
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { AI_PROMPT, RESPONSE_SCHEMA, DEFAULT_MODEL } from '../src/domain/ai';

const key = process.env.GEMINI_API_KEY;
if (!key) throw new Error('GEMINI_API_KEY missing');
const out: Record<string, unknown> = {};
for (const name of readdirSync('public/photos').filter((n) => n.endsWith('.jpg'))) {
  const b64 = readFileSync(`public/photos/${name}`).toString('base64');
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ inline_data: { mime_type: 'image/jpeg', data: b64 } }, { text: AI_PROMPT }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: RESPONSE_SCHEMA, temperature: 0.2 },
    }),
  });
  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('');
  out[name] = { model: DEFAULT_MODEL, at: new Date().toISOString(), raw: JSON.parse(text) };
  console.log(name, JSON.stringify(JSON.parse(text).fields));
}
writeFileSync('src/data/recorded-ai.json', JSON.stringify(out, null, 2));
