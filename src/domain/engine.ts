import { FIELDS, FIELD_BY_ID, isAbnormal, labelOf, FIELD_SHORT } from './fields';
import { MEASURE_BY_ID } from './catalogue';
import type { CareLine, CheckUp, FieldId, Grade, Register, StreamState, World, StreamEvent } from './types';

export const DAY = 86_400_000;
export const UNFOLLOWED_AFTER_DAYS = 14;
export const WINDOW_DAYS = 21;

export function nowOf(w: World): Date {
  return w.now ? new Date(w.now) : new Date();
}

export function daysBetween(a: Date | string, b: Date | string): number {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / DAY);
}

export function personName(w: World, id?: string): string {
  return w.people.find((p) => p.id === id)?.name ?? 'Someone';
}

export function checkupsOf(w: World, streamId: string): CheckUp[] {
  return w.checkups.filter((c) => c.streamId === streamId).sort((a, b) => b.at.localeCompare(a.at));
}

function recent(w: World, streamId: string): CheckUp[] {
  const now = nowOf(w).getTime();
  return checkupsOf(w, streamId).filter((c) => now - new Date(c.at).getTime() <= WINDOW_DAYS * DAY && new Date(c.at).getTime() <= now);
}

// ---------- "Eye score": how often a person's judgement matches consensus and experts ----------
export function eyeScore(w: World, personId: string): { score: number; n: number } {
  let agree = 0;
  let n = 0;
  for (const c of w.checkups.filter((x) => x.authorId === personId)) {
    for (const f of FIELDS) {
      const mine = c.answers[f.id];
      const ai = c.ai?.fields[f.id];
      if (!mine || !ai || ai.value === 'unsure') continue;
      n++;
      if (ai.value === mine) agree++;
    }
  }
  return { score: n ? agree / n : 0, n };
}

// ---------- Findings and confidence grades ----------
export interface Finding {
  field: FieldId;
  value: string;
  abnormal: boolean;
  grade: Grade;
  supporters: CheckUp[];
  contradictors: CheckUp[];
  authors: string[];
  hasPhoto: boolean;
  aiAgree: boolean;
  expert: boolean;
  reasons: string[];
}

export function gradeRules(): { grade: Grade; rule: string }[] {
  return [
    { grade: 'A', rule: 'Photo, person and AI agree, corroborated by others — or validated by an expert' },
    { grade: 'B', rule: 'Photo with person–AI agreement, or two concordant people' },
    { grade: 'C', rule: 'Plausible but isolated: one person, or an unresolved disagreement' },
    { grade: 'D', rule: 'Fragile: no photo, imprecise or contradicted' },
  ];
}

export function findingsOf(w: World, streamId: string): Finding[] {
  const list = recent(w, streamId);
  const out: Finding[] = [];
  for (const f of FIELDS) {
    const withField = list.filter((c) => c.final[f.id]);
    if (!withField.length) continue;
    const latest = withField[0];
    const value = latest.final[f.id]!;
    const abnormal = isAbnormal(f.id, value);
    const supporters = withField.filter((c) => isAbnormal(f.id, c.final[f.id]) === abnormal);
    // A different answer only contradicts if it is close in time; older ones simply describe an earlier state.
    const contradictors = withField.filter((c) => isAbnormal(f.id, c.final[f.id]) !== abnormal && daysBetween(c.at, latest.at) <= 7);
    const authors = [...new Set(supporters.map((c) => c.authorId))];
    const hasPhoto = supporters.some((c) => !!c.photo);
    const aiAgree = supporters.some((c) => {
      const ai = c.ai?.fields[f.id]?.value;
      return !!ai && ai !== 'unsure' && isAbnormal(f.id, ai) === abnormal;
    });
    const expert = supporters.some((c) => c.validatedFields?.includes(f.id));
    const goodEye = authors.some((a) => {
      const e = eyeScore(w, a);
      return e.n >= 10 && e.score >= 0.75;
    });
    const corroborations = authors.length - 1;
    const unresolved = contradictors.length > 0;
    const reasons: string[] = [];
    if (hasPhoto) reasons.push('photo available');
    else reasons.push('no photo');
    if (aiAgree) reasons.push('person and AI agree');
    if (corroborations > 0) reasons.push(`${authors.length} people concordant`);
    if (goodEye) reasons.push('reliable eye (consistent past check-ups)');
    if (expert) reasons.push('validated by the referent ecologist');
    if (unresolved) reasons.push(`${contradictors.length} contradicting check-up${contradictors.length > 1 ? 's' : ''}`);

    let grade: Grade;
    if (expert) grade = 'A';
    else if (contradictors.length > supporters.length) grade = 'D';
    else if (!hasPhoto && !f.photoJudgeable && corroborations >= 1 && !unresolved) grade = 'B';
    else if (!hasPhoto) grade = corroborations >= 1 ? 'C' : 'D';
    else if (aiAgree && corroborations >= 2 && !unresolved) grade = 'A';
    else if ((aiAgree || corroborations >= 1 || goodEye) && !unresolved) grade = 'B';
    else grade = 'C';
    // odour cannot be checked on a photo: a single nose stays C.
    if (!f.photoJudgeable && corroborations === 0 && !expert) grade = grade === 'D' ? 'D' : 'C';

    out.push({ field: f.id, value, abnormal, grade, supporters, contradictors, authors, hasPhoto, aiAgree, expert, reasons });
  }
  return out;
}

const GRADE_ORDER: Grade[] = ['A', 'B', 'C', 'D'];
export function bestGrade(gs: Grade[]): Grade {
  return gs.length ? GRADE_ORDER[Math.min(...gs.map((g) => GRADE_ORDER.indexOf(g)))] : 'D';
}
export function worstGrade(gs: Grade[]): Grade {
  return gs.length ? GRADE_ORDER[Math.max(...gs.map((g) => GRADE_ORDER.indexOf(g)))] : 'D';
}
export function averageGrade(gs: Grade[]): Grade {
  if (!gs.length) return 'D';
  const m = gs.reduce((s, g) => s + GRADE_ORDER.indexOf(g), 0) / gs.length;
  return GRADE_ORDER[Math.round(m)];
}

export function checkupGrade(w: World, c: CheckUp): Grade {
  const fs = findingsOf(w, c.streamId).filter((f) => f.supporters.some((s) => s.id === c.id));
  const abn = fs.filter((f) => f.abnormal);
  if (abn.length) return averageGrade(abn.map((f) => f.grade));
  return averageGrade(fs.map((f) => f.grade));
}

// ---------- Hypotheses (never a diagnosis) ----------
export type Confidence = 'low' | 'medium' | 'high';
export interface Hypothesis {
  id: string;
  title: string;
  confidence: Confidence;
  reasons: string[];
  confirm: string;
  fields: FieldId[];
  lines: Omit<CareLine, 'id' | 'status'>[];
}

function conf(fs: Finding[]): Confidence {
  if (fs.some((f) => f.grade === 'D')) return 'low';
  if (fs.every((f) => f.grade === 'A')) return 'high';
  if (fs.every((f) => f.grade === 'A' || f.grade === 'B')) return 'medium';
  return 'low';
}

export function hypothesesOf(w: World, streamId: string): Hypothesis[] {
  const fs = findingsOf(w, streamId);
  const get = (id: FieldId) => fs.find((f) => f.field === id);
  const abn = (id: FieldId) => {
    const f = get(id);
    return f && f.abnormal ? f : undefined;
  };
  const out: Hypothesis[] = [];
  const foam = abn('foam');
  const odour = abn('odour');
  const clarity = abn('clarity');
  const flow = get('flow');
  const stagnant = flow && flow.value === 'stagnant' ? flow : undefined;
  const banks = abn('banks');
  const veg = get('vegetation');
  const litter = abn('litter');
  const n = (f?: Finding) => (f ? f.authors.length : 0);

  if (foam && (odour || clarity)) {
    const trig = [foam, odour, clarity].filter(Boolean) as Finding[];
    out.push({
      id: 'h-wastewater',
      title: 'Possible input of wastewater or polluted runoff',
      confidence: conf(trig),
      reasons: [
        `${foam.value === 'persistent' ? 'Persistent foam' : 'Foam'} reported by ${n(foam)} ${n(foam) > 1 ? 'people' : 'person'}`,
        ...(odour ? [`Unusual odour (${odour.value})`] : []),
        ...(clarity ? [`Water ${clarity.value}`] : []),
      ].slice(0, 3),
      confirm: 'A visit by the referent ecologist, or a water-quality measurement upstream (ammonium, E. coli).',
      fields: trig.map((t) => t.field),
      lines: [
        { measureId: 'm422', hypothesisId: 'h-wastewater', who: 'city', urgency: 'high', effort: 'medium' },
        { measureId: 'm421', hypothesisId: 'h-wastewater', who: 'city', urgency: 'medium', effort: 'medium' },
        { measureId: 'm444', hypothesisId: 'h-wastewater', who: 'association', urgency: 'low', effort: 'light' },
      ],
    });
  }
  if (stagnant) {
    out.push({
      id: 'h-stagnation',
      title: 'Low flow with stagnant pockets',
      confidence: conf([stagnant]),
      reasons: [`Still water reported by ${n(stagnant)} ${n(stagnant) > 1 ? 'people' : 'person'}`, ...(litter ? ['Litter may be blocking the flow'] : [])],
      confirm: 'A follow-up check-up after rain, from the same viewpoint.',
      fields: ['flow'],
      lines: [
        { measureId: 'm423', hypothesisId: 'h-stagnation', who: 'city', urgency: 'medium', effort: 'light' },
        { measureId: 'm435', hypothesisId: 'h-stagnation', who: 'ecologist', urgency: 'low', effort: 'heavy' },
      ],
    });
  }
  if (clarity && clarity.value === 'coloured' && flow && flow.value !== 'flowing') {
    out.push({
      id: 'h-nutrients',
      title: 'Possible nutrient enrichment (algal growth)',
      confidence: conf([clarity, flow]),
      reasons: ['Unusual green or brown colour', `Flow ${flow.value}`],
      confirm: 'A nutrient measurement or a closer look at the bed by the ecologist.',
      fields: ['clarity', 'flow'],
      lines: [{ measureId: 'm413', hypothesisId: 'h-nutrients', who: 'city', urgency: 'medium', effort: 'medium' }],
    });
  }
  if (banks) {
    const trig = [banks, ...(veg && veg.value !== 'dense' ? [veg] : [])];
    out.push({
      id: 'h-banks',
      title: 'Bank instability with sediment input',
      confidence: conf(trig),
      reasons: ['Eroding or collapsing banks', ...(veg && veg.value !== 'dense' ? [`Vegetation ${veg.value}`] : [])],
      confirm: 'A walk along the reach by the city technician to measure the eroded length.',
      fields: trig.map((t) => t.field),
      lines: [
        { measureId: 'm412', hypothesisId: 'h-banks', who: 'association', urgency: 'medium', effort: 'medium' },
        { measureId: 'm4312', hypothesisId: 'h-banks', who: 'city', urgency: 'medium', effort: 'medium' },
      ],
    });
  }
  if (litter) {
    out.push({
      id: 'h-litter',
      title: 'Litter accumulation on the banks',
      confidence: conf([litter]),
      reasons: [`Litter (${litter.value}) reported by ${n(litter)} ${n(litter) > 1 ? 'people' : 'person'}`],
      confirm: 'Photos from the same viewpoint on the next check-up.',
      fields: ['litter'],
      lines: [{ measureId: 'm423', hypothesisId: 'h-litter', who: 'residents', urgency: 'low', effort: 'light' }],
    });
  }
  return out;
}

// ---------- Seven-day health-risk indication (One Health bridge) ----------
export interface RiskIndication {
  level: 'elevated' | 'moderate';
  title: string;
  reasons: string[];
  reassessOn: string;
  source: string;
  basis: FieldId[];
}

export function riskOf(w: World, streamId: string): RiskIndication | null {
  const fs = findingsOf(w, streamId);
  const flow = fs.find((f) => f.field === 'flow' && f.value === 'stagnant');
  if (!flow || flow.grade === 'D' || !w.forecast) return null;
  const hot = w.forecast.days.filter((d) => d.tmax >= 25);
  if (!hot.length) return null;
  const level = hot.length >= 3 ? 'elevated' : 'moderate';
  const now = nowOf(w);
  return {
    level,
    title: 'Conditions favourable to mosquito proliferation over the next 7 days',
    reasons: [
      `Stagnant water reported (grade ${flow.grade})`,
      `${hot.length} day${hot.length > 1 ? 's' : ''} at 25 °C or more forecast (max ${Math.max(...hot.map((d) => d.tmax)).toFixed(0)} °C)`,
      w.forecast.source === 'open-meteo' ? 'Forecast: Open-Meteo, fetched live' : 'Forecast: simulated heatwave (demo)',
    ],
    reassessOn: new Date(now.getTime() + 7 * DAY).toISOString(),
    source: w.forecast.source,
    basis: ['flow'],
  };
}

// ---------- State of the patient ----------
export function stateOf(w: World, streamId: string): StreamState {
  const list = checkupsOf(w, streamId);
  const now = nowOf(w);
  const activePlan = w.plans.some((p) => p.streamId === streamId && p.status === 'validated');
  if (!list.length || (daysBetween(list[0].at, now) > UNFOLLOWED_AFTER_DAYS && !activePlan)) return 'unfollowed';
  const abn = findingsOf(w, streamId).filter((f) => f.abnormal && f.grade !== 'D');
  const strong = abn.filter((f) => f.grade === 'A' || f.grade === 'B');
  const risk = riskOf(w, streamId);
  // Alert = several concordant signals AND a risk for the environment or human health:
  // either a 7-day health-risk indication, or three solid signals including one at grade A.
  if (strong.length >= 2 && (risk || (strong.length >= 3 && strong.some((f) => f.grade === 'A')))) return 'alert';
  if (abn.length >= 1) return 'watch';
  return 'stable';
}

export const STATE_LABEL: Record<StreamState, string> = {
  unfollowed: 'Not followed',
  stable: 'Stable',
  watch: 'Under watch',
  alert: 'Alert',
};

export const STATE_RANK: Record<StreamState, number> = { alert: 0, watch: 1, unfollowed: 2, stable: 3 };

export function daysSinceVisit(w: World, streamId: string): number | null {
  const l = checkupsOf(w, streamId);
  return l.length ? daysBetween(l[0].at, nowOf(w)) : null;
}

export function plainSentence(w: World, streamId: string, reg: Register): string {
  const s = w.streams.find((x) => x.id === streamId)!;
  const st = stateOf(w, streamId);
  const recentPeople = new Set(recent(w, streamId).filter((c) => daysBetween(c.at, nowOf(w)) <= 7).map((c) => c.authorId)).size;
  const d = daysSinceVisit(w, streamId);
  const who = recentPeople ? `${recentPeople} ${recentPeople > 1 ? 'people have' : 'person has'} looked at it this week.` : '';
  switch (st) {
    case 'unfollowed':
      return d === null ? `Nobody has ever taken the pulse of ${s.name}.` : `Nobody has looked at ${s.name} for ${d} days.`;
    case 'stable':
      return reg === 'child' ? `${s.name} is doing well. ${who}` : `${s.name} is doing fine. ${who}`;
    case 'watch':
      return `${s.name} is doing so-so: one or more signs deserve a second look. ${who}`;
    case 'alert':
      return `${s.name} is not doing well: several signs agree. ${who}`;
  }
}

export function threeLineSummary(w: World, streamId: string): string[] {
  const hs = hypothesesOf(w, streamId);
  const fs = findingsOf(w, streamId).filter((f) => f.abnormal);
  const risk = riskOf(w, streamId);
  const d = daysSinceVisit(w, streamId);
  const l1 = fs.length
    ? `Signs: ${fs.map((f) => `${FIELD_SHORT[f.field].toLowerCase()} ${f.value} (${f.grade})`).join(', ')}.`
    : d === null
      ? 'No check-up yet.'
      : `No abnormal sign. Last visit ${d === 0 ? 'today' : `${d} days ago`}.`;
  const l2 = hs.length ? `Hypothesis: ${hs[0].title.toLowerCase()} — confidence ${hs[0].confidence}.` : 'No hypothesis.';
  const l3 = risk ? `Indication: ${risk.level} 7-day mosquito-favourable conditions.` : `${new Set(recent(w, streamId).map((c) => c.authorId)).size} contributor(s) in the last 3 weeks.`;
  return [l1, l2, l3];
}

// ---------- Care plan proposal (from the catalogue, max five lines) ----------
export function proposeLines(w: World, streamId: string): Omit<CareLine, 'id' | 'status'>[] {
  const hs = hypothesesOf(w, streamId);
  const seen = new Set<string>();
  const lines: Omit<CareLine, 'id' | 'status'>[] = [];
  const urg = { high: 0, medium: 1, low: 2 };
  for (const l of hs.flatMap((h) => h.lines).sort((a, b) => urg[a.urgency] - urg[b.urgency])) {
    if (seen.has(l.measureId) || !MEASURE_BY_ID[l.measureId]) continue;
    seen.add(l.measureId);
    lines.push(l);
  }
  const trimmed = lines.slice(0, 4);
  if (hs.length) trimmed.push({ measureId: 'm442', hypothesisId: hs[0].id, who: 'residents', urgency: 'low', effort: 'light' });
  return trimmed.slice(0, 5);
}

// ---------- Health pulse (for the cardiogram curve) ----------
export function pulseSeries(w: World, streamId: string, days = 120): { t: number; v: number; state: StreamState }[] {
  const now = nowOf(w).getTime();
  const out: { t: number; v: number; state: StreamState }[] = [];
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const t = now - days * DAY + (i * days * DAY) / steps;
    const sub: World = { ...w, now: new Date(t).toISOString(), forecast: i === steps ? w.forecast : undefined };
    sub.checkups = w.checkups.filter((c) => new Date(c.at).getTime() <= t);
    sub.plans = w.plans.filter((p) => new Date(p.signedAt ?? p.createdAt).getTime() <= t);
    const st = stateOf(sub, streamId);
    const v = st === 'stable' ? 0.85 : st === 'watch' ? 0.5 : st === 'alert' ? 0.18 : 0.62;
    out.push({ t, v, state: st });
  }
  return out;
}

// ---------- The stream's voice: first person, grounded, never invents ----------
export interface VoiceLine {
  text: string;
  sources: string[]; // check-up or event ids
}

function dayName(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'long' });
}

export function voiceOf(w: World, streamId: string, reg: Register): VoiceLine[] {
  const st = stateOf(w, streamId);
  const list = checkupsOf(w, streamId);
  const fs = findingsOf(w, streamId);
  const abn = fs.filter((f) => f.abnormal);
  const plan = w.plans.find((p) => p.streamId === streamId && p.status === 'validated');
  const signer = plan ? personName(w, plan.signedBy) : undefined;
  const remission = w.events.find((e) => e.streamId === streamId && e.kind === 'remission');
  const risk = riskOf(w, streamId);
  const out: VoiceLine[] = [];
  const kid = reg === 'child';
  const exp = reg === 'expert';

  if (remission && st === 'stable' && daysBetween(remission.at, nowOf(w)) <= 30) {
    const first = firstReporter(w, streamId, remission.at, 60);
    out.push({ text: kid ? 'I feel better now!' : exp ? `Remission recorded on ${fmtDate(remission.at)}.` : 'I am better.', sources: [remission.id] });
    out.push({ text: exp ? 'Follow-up check-up shows no abnormal sign on the treated indicators.' : kid ? 'The bubbles are gone.' : 'The signs that worried people have gone.', sources: [list[0]?.id].filter(Boolean) as string[] });
    if (first) out.push({ text: `Thank you, ${personName(w, first.authorId)}, ${kid ? 'for seeing me first.' : 'who noticed me first.'}`, sources: [first.id] });
    return out;
  }

  if (st === 'unfollowed') {
    const d = daysSinceVisit(w, streamId);
    out.push({
      text: d === null ? (kid ? 'Nobody has ever come to see me.' : 'Nobody has ever taken my pulse.') : exp ? `No check-up for ${d} days.` : `Nobody has looked at me for ${d} days.`,
      sources: list[0] ? [list[0].id] : [],
    });
    out.push({ text: exp ? 'Current condition unknown.' : kid ? "I don't know how I am." : "I don't know how I'm doing.", sources: [] });
    out.push({ text: kid ? 'If you walk by, can you take my pulse? It takes one minute.' : "If you pass by, take my pulse. It only takes a minute.", sources: [] });
    return out;
  }

  const week = list.filter((c) => daysBetween(c.at, nowOf(w)) <= 7);
  const people = [...new Set(week.map((c) => c.authorId))];

  if (st === 'stable') {
    out.push({ text: exp ? `${week.length} check-up(s) this week, ${people.length} observer(s).` : `This week, ${people.length} ${people.length > 1 ? 'people' : 'person'} came to see me.`, sources: week.map((c) => c.id) });
    const ok = fs.filter((f) => !f.abnormal && (f.field === 'clarity' || f.field === 'banks'));
    if (ok.length)
      out.push({
        text: exp ? `Concordant: ${ok.map((f) => `${FIELD_SHORT[f.field].toLowerCase()} ${f.value} (${f.grade})`).join(', ')}.` : kid ? 'They all said my water is fine and my edges are strong.' : 'Everyone said roughly the same thing: my banks hold, my water is clear.',
        sources: ok.flatMap((f) => f.supporters.map((s) => s.id)),
      });
    out.push({ text: exp ? 'No hypothesis open.' : kid ? 'I feel good!' : 'I feel fine.', sources: [] });
    return out;
  }

  // watch or alert: tell who saw what, in order
  const symptomCheckups = [...list].reverse().filter((c) => abn.some((f) => f.supporters.some((s) => s.id === c.id))).slice(-3);
  if (st === 'alert') out.push({ text: exp ? `${abn.length} concordant abnormal signs.` : kid ? "I'm not feeling well." : "I'm not doing well.", sources: [] });
  const told = new Set<string>();
  for (const c of symptomCheckups) {
    const sym = abn.filter((f) => f.supporters.some((s) => s.id === c.id));
    const fresh = sym.filter((f) => !told.has(f.field)).slice(0, 2);
    const when = daysBetween(c.at, nowOf(w)) >= 6 ? `On ${fmtDate(c.at)}` : dayName(c.at);
    let text: string;
    if (exp) text = `${fmtDate(c.at)}: ${personName(w, c.authorId)} reported ${sym.slice(0, 2).map((f) => symptomWords(f.field, c.final[f.field]!, reg)).join(' and ')} (grade ${checkupGrade(w, c)}).`;
    else if (!fresh.length) text = `${when}, ${personName(w, c.authorId)} saw the same thing.`;
    else text = `${when}, ${personName(w, c.authorId)} saw ${told.size ? 'the same, and ' : ''}${fresh.map((f) => symptomWords(f.field, c.final[f.field]!, reg)).join(' and ')}.`;
    fresh.forEach((f) => told.add(f.field));
    out.push({ text, sources: [c.id] });
  }
  if (st === 'alert') {
    const n = new Set(abn.flatMap((f) => f.authors)).size;
    if (n >= 2) out.push({ text: kid ? `${n} people saw it, so it's true.` : `${n} people saw it, so it's serious.`, sources: abn.flatMap((f) => f.supporters.map((s) => s.id)) });
    if (risk) out.push({ text: kid ? 'It will be hot soon, and my still water could become a home for mosquitoes.' : exp ? `Indicative risk (${risk.level}): ${risk.title.toLowerCase()}.` : 'The forecast says heat: my still water could become a problem.', sources: ['forecast'] });
  } else {
    out.push({ text: exp ? 'Cause undetermined; second observations requested.' : kid ? "I don't know why yet." : "I don't know why yet. Someone will take a closer look.", sources: [] });
  }
  if (plan && signer) out.push({ text: `${signer} signed a care plan for me.`, sources: [plan.id] });
  else if (w.plans.some((p) => p.streamId === streamId && p.status === 'proposed')) out.push({ text: kid ? 'Grown-ups are preparing a plan to help me.' : 'A care plan has been proposed. It becomes official when an ecologist signs it.', sources: [] });
  if (plan && people.length >= 2 && !exp) out.push({ text: kid ? 'For the first time in a long time, I know someone is taking care of me.' : 'For the first time in a long while, I know someone is taking care of me.', sources: [plan.id] });
  return out;
}

function symptomWords(field: FieldId, value: string, reg: Register): string {
  if (reg === 'expert') return `${FIELD_SHORT[field].toLowerCase()}: ${labelOf(field, value, 'expert').toLowerCase()}`;
  const kid = reg === 'child';
  const map: Partial<Record<FieldId, Record<string, string>>> = {
    foam: { some: kid ? 'some bubbles' : 'some foam', persistent: kid ? 'bubbles like soap near my stone' : 'foam near my stone' },
    clarity: { cloudy: kid ? 'my water all milky' : 'my water turning cloudy', coloured: kid ? 'a funny colour in my water' : 'an unusual colour in my water' },
    odour: { faint: kid ? 'a little smell' : 'a faint smell', strong: kid ? 'a bad smell' : 'a strong smell' },
    flow: { stagnant: kid ? 'water that does not move' : 'still water in my side arm' },
    banks: { eroding: kid ? 'my edges falling in' : 'my banks eroding' },
    vegetation: { absent: kid ? 'no plants on my edges' : 'my banks bare' },
    litter: { some: kid ? 'some rubbish' : 'some litter', lots: kid ? 'lots of rubbish' : 'a lot of litter' },
  };
  return map[field]?.[value] ?? FIELD_BY_ID[field].question.curious.toLowerCase();
}

// The sentinel: the first person who reported an abnormal sign in the episode that led to `untilIso`.
export function firstReporter(w: World, streamId: string, untilIso: string, lookbackDays = 45): CheckUp | undefined {
  return w.checkups
    .filter((c) => c.streamId === streamId && c.at <= untilIso && c.at >= addDays(untilIso, -lookbackDays) && FIELDS.some((f) => isAbnormal(f.id, c.final[f.id])))
    .sort((a, b) => a.at.localeCompare(b.at))[0];
}

export function addDays(iso: string, d: number): string {
  return new Date(new Date(iso).getTime() + d * DAY).toISOString();
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function timelineOf(w: World, streamId: string): StreamEvent[] {
  return w.events.filter((e) => e.streamId === streamId).sort((a, b) => b.at.localeCompare(a.at));
}
