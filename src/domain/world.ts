import { recordedFor } from './ai';
import { MEASURE_BY_ID } from './catalogue';
import {
  DAY,
  addDays,
  checkupGrade,
  checkupsOf,
  findingsOf,
  firstReporter,
  hypothesesOf,
  nowOf,
  personName,
  proposeLines,
  riskOf,
  stateOf,
  STATE_LABEL,
} from './engine';
import { seal } from './sha256';
import type { Answers, CarePlan, CheckUp, Decision, FieldId, Forecast, Notice, Person, Stream, StreamEvent, StreamState, World } from './types';

let counter = 0;
export const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(counter++).toString(36)}`;

// ---------------- People (pseudonyms; all demonstration data) ----------------
export const PEOPLE: Person[] = [
  { id: 'mathis', name: 'Mathis', kind: 'citizen', demo: true },
  { id: 'lea', name: 'Léa', kind: 'citizen', demo: true },
  { id: 'ines', name: 'Inès', kind: 'citizen', demo: true },
  { id: 'karim', name: 'Karim', kind: 'citizen', demo: true },
  { id: 'sofia', name: 'Sofia', kind: 'citizen', demo: true },
  { id: 'paul', name: 'Paul', kind: 'citizen', demo: true },
  { id: 'jade', name: 'Jade', kind: 'citizen', demo: true },
  { id: 'class-cm2', name: 'Class CM2, École Jean-Jaurès', kind: 'school', demo: true },
  { id: 'camille', name: 'Camille', kind: 'technician', title: 'Green spaces & water technician, city services', demo: true },
  { id: 'ferreira', name: 'Dr Ferreira', kind: 'ecologist', title: 'Referent ecologist (role-play)', demo: true },
];

// ---------------- Streams: Toulouse metropolitan area, schematic map ----------------
const S = (s: Omit<Stream, 'city' | 'demo'>): Stream => ({ ...s, city: 'Toulouse Métropole', demo: true });

export const STREAMS: Stream[] = [
  S({ id: 'trois-ponts', name: 'Trois Ponts brook', district: 'Croix-Daurade', lengthM: 420, surroundings: ['Park', 'Housing', 'Road'], photo: 'photos/three-bridges.jpg', path: 'M 612 214 C 640 250, 668 262, 700 300 S 744 352, 772 366', label: [690, 262], lat: 43.637, lon: 1.468, referentId: 'ferreira' }),
  S({ id: 'marcaissonne', name: 'Marcaissonne', district: 'Montaudran', lengthM: 650, surroundings: ['Housing', 'Road', 'Shops'], photo: 'photos/cloudy-film.jpg', path: 'M 880 560 C 840 520, 800 500, 760 470 S 700 430, 668 420', label: [800, 486], lat: 43.574, lon: 1.488, referentId: 'ferreira' }),
  S({ id: 'sausse', name: 'Sausse', district: 'Balma', lengthM: 540, surroundings: ['Park', 'Farmland'], photo: 'photos/sausse-banks.jpg', path: 'M 930 250 C 880 270, 840 290, 800 320 S 760 356, 744 366', label: [860, 268], lat: 43.611, lon: 1.499, referentId: 'ferreira', adoptedBy: 'class-cm2' }),
  S({ id: 'hers', name: 'Hers-Mort', district: 'Borderouge', lengthM: 900, surroundings: ['Housing', 'Road', 'Park'], photo: 'photos/eroded-bank.jpg', path: 'M 772 366 C 740 300, 700 230, 660 170 S 600 70, 560 20', label: [606, 120], lat: 43.642, lon: 1.455, referentId: 'ferreira' }),
  S({ id: 'touch', name: 'Touch', district: 'Purpan', lengthM: 800, surroundings: ['Park', 'Road'], photo: 'photos/clear-riffles.jpg', path: 'M 60 470 C 120 430, 170 400, 220 380 S 290 350, 330 330', label: [140, 418], lat: 43.6, lon: 1.39 }),
  S({ id: 'maltemps', name: 'Maltemps brook', district: 'Fenouillet', lengthM: 380, surroundings: ['Housing', 'Road'], photo: 'photos/three-bridges.jpg', path: 'M 470 30 C 450 70, 430 100, 400 130 S 360 170, 340 180', label: [452, 86], lat: 43.68, lon: 1.41 }),
  S({ id: 'saune', name: 'Saune', district: 'Quint-Fonsegrives', lengthM: 610, surroundings: ['Farmland', 'Housing'], photo: 'photos/sausse-banks.jpg', path: 'M 980 420 C 940 410, 900 400, 860 396 S 800 386, 772 380', label: [910, 392], lat: 43.585, lon: 1.53 }),
  S({ id: 'pech-david', name: 'Pech-David spring brook', district: 'Pech-David', lengthM: 260, surroundings: ['Park'], photo: 'photos/clear-riffles.jpg', path: 'M 520 620 C 500 590, 470 570, 440 556 S 400 540, 380 536', label: [470, 600], lat: 43.565, lon: 1.44 }),
  S({ id: 'aussonnelle', name: 'Aussonnelle', district: 'Seilh', lengthM: 720, surroundings: ['Farmland', 'Road'], photo: 'photos/stagnant-arm.jpg', path: 'M 40 160 C 90 150, 140 140, 190 130 S 250 120, 280 112', label: [110, 136], lat: 43.69, lon: 1.35 }),
  S({ id: 'larramet', name: 'Larramet', district: 'Tournefeuille', lengthM: 480, surroundings: ['Housing', 'Park'], photo: 'photos/clear-riffles.jpg', path: 'M 40 600 C 100 580, 150 560, 200 530 S 270 490, 300 476', label: [120, 566], lat: 43.58, lon: 1.34 }),
  S({ id: 'margelle', name: 'Margelle stream', district: 'Lalande', lengthM: 350, surroundings: ['Industry', 'Road', 'Parking'], photo: 'photos/litter-bank.jpg', path: 'M 420 260 C 450 240, 480 226, 520 214 S 580 204, 612 214', label: [500, 246], lat: 43.645, lon: 1.43 }),
  S({ id: 'lapujade', name: 'Lapujade brook', district: "L'Union", lengthM: 300, surroundings: ['Housing', 'School'], photo: 'photos/stagnant-arm.jpg', path: 'M 760 120 C 740 140, 720 160, 700 176 S 672 196, 660 200', label: [748, 150], lat: 43.66, lon: 1.48 }),
  S({ id: 'mange-pommes', name: 'Mange-Pommes brook', district: 'Saint-Orens', lengthM: 410, surroundings: ['Housing', 'Park'], photo: 'photos/clear-riffles.jpg', path: 'M 960 620 C 920 600, 880 590, 840 576 S 800 560, 780 548', label: [900, 612], lat: 43.555, lon: 1.53 }),
  S({ id: 'rivals', name: 'Rivals brook', district: 'Colomiers', lengthM: 520, surroundings: ['Housing', 'Road'], photo: 'photos/stagnant-arm.jpg', path: 'M 30 320 C 80 316, 130 312, 180 306 S 250 296, 300 290', label: [100, 300], lat: 43.61, lon: 1.33 }),
];

export const PHOTO_CREDITS: Record<string, { title: string; author: string; license: string; url: string; place: string }> = {
  'three-bridges.jpg': { title: 'Passage du ruisseau de Maltemps sous le canal latéral', author: 'Wikimedia Commons contributor', license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Passage_du_ruisseau_de_Maltemps_sous_le_canal_lat%C3%A9ral,_chemin_de_Celsis_(Toulouse).jpg', place: 'Toulouse, France' },
  'cloudy-film.jpg': { title: 'Marcaissonne', author: 'Adrianstork', license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Marcaissonne.jpg', place: 'Toulouse, France' },
  'eroded-bank.jpg': { title: 'Marcaissonne à Toulouse', author: 'Adrianstork', license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Marcaissonne_%C3%A0_Toulouse.jpg', place: 'Toulouse, France' },
  'sausse-banks.jpg': { title: 'Toulouse - Bords de la Sausse', author: 'Olybrius', license: 'CC BY-SA 3.0', url: 'https://commons.wikimedia.org/wiki/File:Toulouse_-_Bords_de_la_Sausse_-_20110202_(1).jpg', place: 'Toulouse, France' },
  'clear-riffles.jpg': { title: 'Toulouse - Sausse', author: 'Anicius Olybrius', license: 'CC BY-SA 2.0', url: 'https://commons.wikimedia.org/wiki/File:Toulouse_-_Sausse_-_20110202_(1).jpg', place: 'Toulouse, France' },
  'foam-stone.jpg': { title: 'Accumulation de mousse, pollution, Deûle, écluse du Grand Carré', author: 'Lamiot', license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:AccumulationMoussePollutionDe%C3%BBleEcluseGrandCarr%C3%A9Juillet2019a_01.jpg', place: 'Lille, France' },
  'stagnant-arm.jpg': { title: 'Stream of stagnant water', author: 'Wikimedia Commons contributor', license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Stream_of_stagnant_water.jpg', place: '—' },
  'litter-bank.jpg': { title: 'Nature’s Silent Struggle', author: 'Jemir Shamir', license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Nature%E2%80%99s_Silent_Struggle.jpg', place: '—' },
};

// ---------------- Building blocks ----------------
interface CheckupInput {
  streamId: string;
  authorId: string;
  at: string;
  photo?: string;
  answers: Answers;
  surroundings?: string[];
  note?: string;
  decisions?: Partial<Record<FieldId, Decision>>;
  ai?: CheckUp['ai'];
  followUp?: boolean;
  demo?: boolean;
}

export function makeCheckup(i: CheckupInput): CheckUp {
  const ai = i.ai ?? (i.photo ? recordedFor(i.photo) ?? undefined : undefined);
  const final: Answers = { ...i.answers };
  for (const [f, d] of Object.entries(i.decisions ?? {})) {
    if (d === 'adopted' && ai?.fields[f as FieldId] && ai.fields[f as FieldId]!.value !== 'unsure') final[f as FieldId] = ai.fields[f as FieldId]!.value;
  }
  return {
    id: uid('chk'),
    streamId: i.streamId,
    authorId: i.authorId,
    at: i.at,
    photo: i.photo,
    photoCredit: i.photo ? PHOTO_CREDITS[i.photo.split('/').pop() ?? '']?.title : undefined,
    answers: i.answers,
    surroundings: i.surroundings ?? [],
    note: i.note,
    sealedAt: i.at,
    sealHash: seal({ answers: i.answers, authorId: i.authorId, at: i.at }),
    ai,
    decisions: i.decisions ?? {},
    final,
    followUp: i.followUp,
    demo: i.demo ?? true,
  };
}

function ev(w: World, e: Omit<StreamEvent, 'id' | 'demo'> & { demo?: boolean }): StreamEvent {
  const full: StreamEvent = { id: uid('evt'), demo: e.demo ?? true, ...e };
  w.events.push(full);
  return full;
}

function notify(w: World, toId: string, streamId: string, text: string, photo?: string, demo = true): void {
  w.notices.push({ id: uid('ntc'), toId, at: nowOf(w).toISOString(), streamId, text, photo, read: false, demo });
}

const ago = (d: number, h = 10) => new Date(Date.now() - d * DAY + (h - 12) * 3_600_000).toISOString();

const OK: Answers = { clarity: 'clear', foam: 'none', odour: 'none', flow: 'flowing', banks: 'natural', vegetation: 'dense', litter: 'none' };

// ---------------- The seed world ----------------
export function seedWorld(): World {
  const w: World = { version: 3, streams: STREAMS.map((s) => ({ ...s })), people: PEOPLE.map((p) => ({ ...p })), checkups: [], plans: [], events: [], notices: [] };
  const add = (i: CheckupInput) => {
    const c = makeCheckup(i);
    w.checkups.push(c);
    ev(w, { streamId: c.streamId, at: c.at, kind: c.followUp ? 'followup' : 'checkup', title: c.followUp ? 'Follow-up check-up' : 'Check-up', authorId: c.authorId, refId: c.id });
    return c;
  };

  // Trois Ponts: a quiet history, then nobody for 19 days (the story starts here).
  add({ streamId: 'trois-ponts', authorId: 'paul', at: ago(132), photo: 'photos/three-bridges.jpg', answers: { ...OK, flow: 'slow' } });
  add({ streamId: 'trois-ponts', authorId: 'jade', at: ago(96), photo: 'photos/three-bridges.jpg', answers: { ...OK, clarity: 'cloudy', flow: 'slow' }, decisions: {} });
  add({ streamId: 'trois-ponts', authorId: 'paul', at: ago(61), answers: { ...OK, flow: 'slow' } });
  add({ streamId: 'trois-ponts', authorId: 'class-cm2', at: ago(19, 8), photo: 'photos/three-bridges.jpg', answers: { ...OK, flow: 'slow' } });
  ev(w, { streamId: 'trois-ponts', at: ago(40), kind: 'measure', title: 'Background measures', detail: 'Water temperature 19.6 °C · conductivity 610 µS/cm (city sensor — demonstration values)' });
  ev(w, { streamId: 'trois-ponts', at: ago(12), kind: 'measure', title: 'Background measures', detail: 'Water temperature 18.1 °C · conductivity 640 µS/cm (city sensor — demonstration values)' });

  // Marcaissonne: an open alert waiting for the referent ecologist's signature.
  add({ streamId: 'marcaissonne', authorId: 'ines', at: ago(9), photo: 'photos/cloudy-film.jpg', answers: { ...OK, clarity: 'cloudy', odour: 'faint', foam: 'some' }, surroundings: ['Housing', 'Road'] });
  add({ streamId: 'marcaissonne', authorId: 'karim', at: ago(5, 18), photo: 'photos/cloudy-film.jpg', answers: { ...OK, clarity: 'cloudy', odour: 'faint', foam: 'some' } });
  add({ streamId: 'marcaissonne', authorId: 'sofia', at: ago(2, 8), photo: 'photos/cloudy-film.jpg', answers: { ...OK, clarity: 'cloudy', odour: 'strong', foam: 'some' }, note: 'Grey water near the outfall under the bridge.' });

  // Sausse: a full care episode that ended in remission (adopted by a school).
  const s1 = add({ streamId: 'sausse', authorId: 'class-cm2', at: ago(84), photo: 'photos/litter-bank.jpg', answers: { ...OK, clarity: 'cloudy', litter: 'lots', flow: 'slow' } });
  add({ streamId: 'sausse', authorId: 'jade', at: ago(81), photo: 'photos/litter-bank.jpg', answers: { ...OK, clarity: 'cloudy', litter: 'lots', flow: 'slow' } });
  const sp: CarePlan = {
    id: uid('plan'),
    streamId: 'sausse',
    createdAt: ago(80),
    status: 'closed',
    lines: [
      { id: uid('ln'), measureId: 'm423', hypothesisId: 'h-litter', who: 'residents', urgency: 'medium', effort: 'light', status: 'done' },
      { id: uid('ln'), measureId: 'm444', hypothesisId: 'h-litter', who: 'association', urgency: 'low', effort: 'light', status: 'done' },
      { id: uid('ln'), measureId: 'm442', hypothesisId: 'h-litter', who: 'residents', urgency: 'low', effort: 'light', status: 'done' },
    ],
    signedBy: 'ferreira',
    signedAt: ago(78),
    followUpDue: ago(56),
  };
  sp.signatureHash = seal({ plan: sp.lines, by: sp.signedBy, at: sp.signedAt });
  w.plans.push(sp);
  ev(w, { streamId: 'sausse', at: ago(83), kind: 'hypothesis', title: 'Hypothesis: litter accumulation on the banks', detail: 'Confidence medium' });
  ev(w, { streamId: 'sausse', at: ago(78), kind: 'plan_signed', title: 'Care plan validated by Dr Ferreira, referent ecologist', authorId: 'ferreira', refId: sp.id });
  ev(w, { streamId: 'sausse', at: ago(71), kind: 'intervention', title: 'Bank clean-up by residents and Class CM2', detail: '§4.2.3 Litter, plastic, and hydrocarbon control — 46 kg collected (demonstration value)' });
  add({ streamId: 'sausse', authorId: 'class-cm2', at: ago(56), photo: 'photos/clear-riffles.jpg', answers: { ...OK, foam: 'none' }, followUp: true });
  ev(w, { streamId: 'sausse', at: ago(56, 11), kind: 'remission', title: 'Remission', detail: 'Follow-up check-up confirms the improvement. Thank you, Class CM2, for being first.' });
  add({ streamId: 'sausse', authorId: 'jade', at: ago(6), photo: 'photos/clear-riffles.jpg', answers: { ...OK } });
  void s1;

  // Hers-Mort: under watch (bank erosion).
  add({ streamId: 'hers', authorId: 'lea', at: ago(4), photo: 'photos/eroded-bank.jpg', answers: { ...OK, banks: 'eroding', clarity: 'cloudy' } });

  // Margelle: under watch (litter) — checked by the school.
  add({ streamId: 'margelle', authorId: 'class-cm2', at: ago(8), photo: 'photos/litter-bank.jpg', answers: { ...OK, litter: 'lots', clarity: 'cloudy', flow: 'slow' } });

  // Stable streams.
  add({ streamId: 'touch', authorId: 'karim', at: ago(3), photo: 'photos/clear-riffles.jpg', answers: { ...OK, banks: 'artificial', vegetation: 'sparse' } });
  add({ streamId: 'touch', authorId: 'sofia', at: ago(10), photo: 'photos/clear-riffles.jpg', answers: { ...OK, banks: 'artificial', vegetation: 'sparse' } });
  add({ streamId: 'maltemps', authorId: 'paul', at: ago(5), answers: { ...OK } });
  add({ streamId: 'larramet', authorId: 'jade', at: ago(7), answers: { ...OK } });
  add({ streamId: 'mange-pommes', authorId: 'ines', at: ago(11), answers: { ...OK } });

  // Not followed for a long time.
  add({ streamId: 'saune', authorId: 'paul', at: ago(30), answers: { ...OK } });
  add({ streamId: 'aussonnelle', authorId: 'karim', at: ago(45), answers: { ...OK } });
  add({ streamId: 'lapujade', authorId: 'sofia', at: ago(22), answers: { ...OK } });
  add({ streamId: 'rivals', authorId: 'jade', at: ago(60), answers: { ...OK } });

  // Derived records for the open alert.
  for (const h of hypothesesOf(w, 'marcaissonne')) ev(w, { streamId: 'marcaissonne', at: ago(2, 9), kind: 'hypothesis', title: `Hypothesis: ${h.title.toLowerCase()}`, detail: `Confidence ${h.confidence}` });
  ev(w, { streamId: 'marcaissonne', at: ago(2, 9), kind: 'state', title: 'State changed to Alert', state: 'alert' });
  const mp: CarePlan = {
    id: uid('plan'),
    streamId: 'marcaissonne',
    createdAt: ago(2, 9),
    status: 'proposed',
    lines: proposeLines(w, 'marcaissonne').map((l) => ({ ...l, id: uid('ln'), status: 'proposed' as const })),
  };
  w.plans.push(mp);
  ev(w, { streamId: 'marcaissonne', at: ago(2, 9), kind: 'plan_proposed', title: 'Care plan proposed by the system', detail: `${mp.lines.length} lines from the OneAquaHealth catalogue of measures`, refId: mp.id });
  ev(w, { streamId: 'hers', at: ago(4, 11), kind: 'state', title: 'State changed to Under watch', state: 'watch' });
  ev(w, { streamId: 'margelle', at: ago(8, 11), kind: 'state', title: 'State changed to Under watch', state: 'watch' });

  // Grades on check-up events.
  for (const e of w.events) if (e.refId && e.kind !== 'plan_proposed' && e.kind !== 'plan_signed') {
    const c = w.checkups.find((x) => x.id === e.refId);
    if (c) {
      e.grade = checkupGrade(w, c);
      e.title = `${e.kind === 'followup' ? 'Follow-up check-up' : 'Check-up'} by ${personName(w, c.authorId)}`;
    }
  }

  notify(w, 'mathis', 'sausse', 'Welcome. The streams near you are listed on the map. Grey ones are waiting for someone.');
  return w;
}

// ---------------- Actions: everything that changes the record goes through here ----------------
function snapshotStates(w: World): Record<string, StreamState> {
  return Object.fromEntries(w.streams.map((s) => [s.id, stateOf(w, s.id)]));
}

function contributorsOfEpisode(w: World, streamId: string): string[] {
  const fs = findingsOf(w, streamId).filter((f) => f.abnormal);
  const ids = new Set(fs.flatMap((f) => f.supporters.map((c) => c.authorId)));
  return [...ids].filter((id) => w.people.find((p) => p.id === id)?.kind !== 'ecologist');
}

function afterChange(w: World, before: Record<string, StreamState>, streamId: string, actor?: string): void {
  const prev = before[streamId];
  const next = stateOf(w, streamId);
  const at = nowOf(w).toISOString();
  const stream = w.streams.find((s) => s.id === streamId)!;
  if (prev !== next) {
    ev(w, { streamId, at, kind: 'state', title: `State changed to ${STATE_LABEL[next]}`, state: next, demo: false });
    const first = actor && contributorsOfEpisode(w, streamId)[0] === actor;
    for (const id of contributorsOfEpisode(w, streamId)) {
      if (next === 'alert' || next === 'watch')
        notify(w, id, streamId, `${stream.name} is now ${STATE_LABEL[next].toLowerCase()}.${id === actor && first ? ' Your report is the first in the chain.' : ''}`, undefined, false);
    }
  }
  // hypotheses
  const known = new Set(w.events.filter((e) => e.streamId === streamId && e.kind === 'hypothesis').map((e) => e.title));
  for (const h of hypothesesOf(w, streamId)) {
    const title = `Hypothesis: ${h.title.toLowerCase()}`;
    if (!known.has(title)) ev(w, { streamId, at, kind: 'hypothesis', title, detail: `Confidence ${h.confidence} — ${h.reasons.join('; ')}`, demo: false });
  }
  // seven-day risk indication
  const risk = riskOf(w, streamId);
  if (risk && !w.events.some((e) => e.streamId === streamId && e.kind === 'risk' && new Date(e.at).getTime() > nowOf(w).getTime() - 7 * DAY))
    ev(w, { streamId, at, kind: 'risk', title: `Indication: ${risk.title.toLowerCase()}`, detail: `${risk.level} — ${risk.reasons.join('; ')}. Indicative, not an epidemiological forecast.`, demo: false });
  // the system proposes a plan when the patient is in alert and no plan is open
  if (next === 'alert' && !w.plans.some((p) => p.streamId === streamId && p.status !== 'closed')) {
    const lines = proposeLines(w, streamId).map((l) => ({ ...l, id: uid('ln'), status: 'proposed' as const }));
    if (lines.length) {
      const p: CarePlan = { id: uid('plan'), streamId, createdAt: at, status: 'proposed', lines };
      w.plans.push(p);
      ev(w, { streamId, at, kind: 'plan_proposed', title: 'Care plan proposed by the system', detail: `${lines.length} lines from the OneAquaHealth catalogue of measures`, refId: p.id, demo: false });
    }
  }
  // remission: a validated plan and a follow-up that comes back stable
  const open = w.plans.find((p) => p.streamId === streamId && p.status === 'validated');
  const last = checkupsOf(w, streamId)[0];
  if (open && next === 'stable' && last?.followUp && open.signedAt && last.at > open.signedAt) {
    open.status = 'closed';
    open.lines.forEach((l) => !l.removed && (l.status = 'done'));
    const firstAuthor = firstReporter(w, streamId, open.signedAt)?.authorId;
    ev(w, { streamId, at, kind: 'remission', title: 'Remission', detail: `Follow-up check-up confirms the improvement.${firstAuthor ? ` Thank you, ${personName(w, firstAuthor)}, for being first.` : ''}`, demo: false });
    const ids = new Set([...(firstAuthor ? [firstAuthor] : []), last.authorId]);
    for (const id of ids) notify(w, id, streamId, `${stream.name} is in remission.${id === firstAuthor ? ' Thank you for being the first to notice.' : ' Thank you for the follow-up.'}`, last.photo, false);
  }
}

export function submitCheckup(w0: World, c: CheckUp): World {
  const w = structuredClone(w0);
  const before = snapshotStates(w);
  w.checkups.push(c);
  const e = ev(w, { streamId: c.streamId, at: c.at, kind: c.followUp ? 'followup' : 'checkup', title: `${c.followUp ? 'Follow-up check-up' : 'Check-up'} by ${personName(w, c.authorId)}`, authorId: c.authorId, refId: c.id, demo: c.demo });
  e.grade = checkupGrade(w, c);
  const others = new Set(checkupsOf(w, c.streamId).filter((x) => x.id !== c.id && new Date(c.at).getTime() - new Date(x.at).getTime() < 21 * DAY).map((x) => x.authorId));
  others.delete(c.authorId);
  notify(
    w,
    c.authorId,
    c.streamId,
    others.size
      ? `Your check-up was compared with ${others.size} other${others.size > 1 ? 's' : ''} from the last three weeks. It is grade ${e.grade}.`
      : `Your check-up is in the record. Alone for now, it is grade ${e.grade}; it rises when a neighbour confirms it.`,
    c.photo,
    c.demo,
  );
  afterChange(w, before, c.streamId, c.authorId);
  return w;
}

export function signPlan(w0: World, planId: string, signerId: string, removed: Record<string, string>): World {
  const w = structuredClone(w0);
  const plan = w.plans.find((p) => p.id === planId)!;
  const before = snapshotStates(w);
  const at = nowOf(w).toISOString();
  for (const l of plan.lines) {
    if (removed[l.id]) l.removed = { by: signerId, reason: removed[l.id] };
    else l.status = 'validated';
  }
  plan.status = 'validated';
  plan.signedBy = signerId;
  plan.signedAt = at;
  plan.followUpDue = addDays(at, 21);
  plan.signatureHash = seal({ lines: plan.lines, by: signerId, at });
  // the ecologist's signature confirms the findings that motivated the plan: they become grade A
  const hs = hypothesesOf(w, plan.streamId);
  const fields = new Set(hs.flatMap((h) => h.fields));
  for (const f of findingsOf(w, plan.streamId))
    if (fields.has(f.field) && f.abnormal)
      f.supporters.forEach((s) => {
        const c = w.checkups.find((x) => x.id === s.id)!;
        c.expertValidated = true;
        c.validatedFields = [...new Set([...(c.validatedFields ?? []), f.field])];
      });
  const signer = personName(w, signerId);
  ev(w, { streamId: plan.streamId, at, kind: 'plan_signed', title: `Care plan validated by ${signer}, referent ecologist`, detail: `${plan.lines.filter((l) => !l.removed).length} lines kept, ${Object.keys(removed).length} removed. Signature ${plan.signatureHash.slice(0, 12)}…`, authorId: signerId, refId: plan.id, demo: false });
  const stream = w.streams.find((s) => s.id === plan.streamId)!;
  const contributors = new Set(w.checkups.filter((c) => c.streamId === plan.streamId && c.at >= addDays(at, -21)).map((c) => c.authorId));
  const firstId = firstReporter(w, plan.streamId, at, 21);
  for (const id of contributors) {
    const mine = w.checkups.filter((c) => c.streamId === plan.streamId && c.authorId === id).sort((a, b) => a.at.localeCompare(b.at))[0];
    const day = mine ? new Date(mine.at).toLocaleDateString('en-GB', { weekday: 'long' }) : '';
    notify(
      w,
      id,
      plan.streamId,
      `Your check-up${day ? ` on ${day}` : ''} triggered an inspection. ${signer} validated the care plan for ${stream.name}. A follow-up visit is planned in three weeks. You are part of its care team.`,
      firstId?.id === mine?.id ? mine?.photo : undefined,
      false,
    );
  }
  afterChange(w, before, plan.streamId);
  return w;
}

export function markIntervention(w0: World, planId: string, lineId: string): World {
  const w = structuredClone(w0);
  const plan = w.plans.find((p) => p.id === planId)!;
  const line = plan.lines.find((l) => l.id === lineId)!;
  line.status = 'done';
  const at = nowOf(w).toISOString();
  const m = MEASURE_BY_ID[line.measureId];
  const who = { city: 'The city', association: 'An association', residents: 'Residents', ecologist: 'The ecologist' }[line.who];
  ev(w, { streamId: plan.streamId, at, kind: 'intervention', title: `${who} carried out: ${m.title}`, detail: `§${m.section} — ${m.plain}`, demo: false });
  const stream = w.streams.find((s) => s.id === plan.streamId)!;
  const ids = new Set(w.checkups.filter((c) => c.streamId === plan.streamId && c.at >= addDays(at, -30)).map((c) => c.authorId));
  for (const id of ids) notify(w, id, plan.streamId, `${who} completed “${m.title}” on ${stream.name}. A follow-up visit is planned. Would you take the photo again from the same spot?`, undefined, false);
  return w;
}

export function setForecast(w0: World, f: Forecast): World {
  const w = structuredClone(w0);
  const before = snapshotStates(w);
  w.forecast = f;
  for (const s of w.streams) afterChange(w, before, s.id);
  return w;
}

export function markRead(w0: World, toId: string): World {
  const w = structuredClone(w0);
  w.notices.forEach((n) => n.toId === toId && (n.read = true));
  return w;
}

export function unreadFor(w: World, toId: string): Notice[] {
  return w.notices.filter((n) => n.toId === toId && !n.read);
}
