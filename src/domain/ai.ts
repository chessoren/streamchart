import { FIELDS } from './fields';
import { seal } from './sha256';
import type { AiAssessment, AiFieldAnswer, AiObservation, FieldId } from './types';
import recorded from '../data/recorded-ai.json';

// The AI looks at the photo only. It never receives the citizen's answers:
// its answer is sealed (hashed) on arrival and revealed only after the citizen seals their own.

export const DEFAULT_MODEL = 'gemini-3.5-flash-lite';

export const AI_PROMPT = `You are the second pair of eyes in a 60-second citizen check-up of an urban stream (OneAquaHealth citizen science).
Look ONLY at the photo. You do not know what the citizen answered.
For each field, choose one of the allowed values, or "unsure" when the photo does not let you judge. Saying "unsure" is good practice: never force a precision you do not have.
Fields and allowed values:
- clarity: clear | cloudy | coloured
- foam: none | some | persistent
- odour: always "unsure" (a photo cannot carry a smell)
- flow: flowing | slow | stagnant
- banks: natural | eroding | artificial
- vegetation: dense | sparse | absent
- litter: none | some | lots
Give a confidence between 0 and 1 and a short note (max 15 words) per field, in calm plain English.
List up to 4 notable observations a citizen might have missed, each with a bounding box [ymin, xmin, ymax, xmax] normalised to 0-1000, and the field it relates to.
Write a one-sentence summary. Never diagnose a cause, never name a culprit, never say the water is safe or unsafe for people.`;

const FIELD_ENUM: Record<FieldId, string[]> = Object.fromEntries(FIELDS.map((f) => [f.id, [...f.options.map((o) => o.id), 'unsure']])) as Record<FieldId, string[]>;

export const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    fields: {
      type: 'OBJECT',
      properties: Object.fromEntries(
        FIELDS.map((f) => [
          f.id,
          {
            type: 'OBJECT',
            properties: { value: { type: 'STRING', enum: FIELD_ENUM[f.id] }, confidence: { type: 'NUMBER' }, note: { type: 'STRING' } },
            required: ['value', 'confidence'],
          },
        ]),
      ),
      required: FIELDS.map((f) => f.id),
    },
    observations: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          text: { type: 'STRING' },
          field: { type: 'STRING', enum: FIELDS.map((f) => f.id) },
          box: { type: 'ARRAY', items: { type: 'INTEGER' } },
        },
        required: ['text'],
      },
    },
    summary: { type: 'STRING' },
  },
  required: ['fields', 'observations', 'summary'],
};

export interface RawAi {
  fields: Partial<Record<FieldId, AiFieldAnswer>>;
  observations: AiObservation[];
  summary: string;
}

export function sealAi(raw: RawAi, source: AiAssessment['source'], model: string, at = new Date().toISOString()): AiAssessment {
  const clean: RawAi = {
    fields: Object.fromEntries(
      FIELDS.map((f) => {
        const a = raw.fields[f.id];
        const value = a && FIELD_ENUM[f.id].includes(a.value) ? a.value : 'unsure';
        return [f.id, { value: f.id === 'odour' ? 'unsure' : value, confidence: Math.max(0, Math.min(1, a?.confidence ?? 0)), note: a?.note }];
      }),
    ),
    observations: (raw.observations ?? []).slice(0, 4).map((o) => ({
      text: o.text,
      field: o.field,
      box: Array.isArray(o.box) && o.box.length === 4 ? (o.box.map((n) => Math.max(0, Math.min(1000, Math.round(n)))) as [number, number, number, number]) : undefined,
    })),
    summary: raw.summary ?? '',
  };
  return { ...clean, source, model, at, hash: seal({ ...clean, model, at }) };
}

export async function fileToDataUrl(file: Blob, maxSide = 1280): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function urlToDataUrl(src: string): Promise<string> {
  if (src.startsWith('data:')) return src;
  const blob = await (await fetch(src)).blob();
  return fileToDataUrl(blob);
}

export async function askGemini(photoDataUrl: string, apiKey: string, model = DEFAULT_MODEL, signal?: AbortSignal): Promise<AiAssessment> {
  const [meta, b64] = photoDataUrl.split(',');
  const mime = /data:(.*?);/.exec(meta)?.[1] ?? 'image/jpeg';
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ inline_data: { mime_type: mime, data: b64 } }, { text: AI_PROMPT }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: RESPONSE_SCHEMA, temperature: 0.2 },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini ${res.status}: ${t.slice(0, 200)}`);
  }
  const json = await res.json();
  const text: string = json.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
  return sealAi(JSON.parse(text) as RawAi, 'gemini', model);
}

// Responses recorded from gemini-3.5-flash-lite on the bundled sample photos (scripts/record-ai.mjs),
// used only when no key is configured. They are labelled "recorded" everywhere they appear.
export function recordedFor(photo: string): AiAssessment | null {
  const name = photo.split('/').pop() ?? '';
  const r = (recorded as unknown as Record<string, { model: string; at: string; raw: RawAi }>)[name];
  return r ? sealAi(r.raw, 'recorded', r.model, r.at) : null;
}

// Last-resort offline analyser: simple colour statistics, clearly labelled, never presented as AI vision.
export async function offlineAnalyse(photoDataUrl: string): Promise<AiAssessment> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = photoDataUrl;
  });
  const c = document.createElement('canvas');
  c.width = 96;
  c.height = 72;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(img, 0, 0, 96, 72);
  const d = ctx.getImageData(0, 0, 96, 72).data;
  let white = 0, green = 0, brown = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) {
    const [r, g, b] = [d[i], d[i + 1], d[i + 2]];
    n++;
    if (r > 200 && g > 200 && b > 190) white++;
    if (g > r + 15 && g > b + 15) green++;
    if (r > b + 30 && g > b + 10 && r < 180) brown++;
  }
  const wr = white / n, gr = green / n, br = brown / n;
  const raw: RawAi = {
    fields: {
      clarity: { value: br > 0.35 ? 'coloured' : 'unsure', confidence: 0.3, note: 'Colour statistics only.' },
      foam: { value: wr > 0.25 ? 'some' : 'unsure', confidence: 0.25, note: 'Bright white patches detected.' },
      odour: { value: 'unsure', confidence: 0 },
      flow: { value: 'unsure', confidence: 0 },
      banks: { value: 'unsure', confidence: 0 },
      vegetation: { value: gr > 0.35 ? 'dense' : gr > 0.12 ? 'sparse' : 'unsure', confidence: 0.35, note: 'Share of green pixels.' },
      litter: { value: 'unsure', confidence: 0 },
    },
    observations: [],
    summary: 'Offline colour analysis only — add a Gemini key in Settings for a real second look.',
  };
  return sealAi(raw, 'offline', 'offline-colour-v1');
}
