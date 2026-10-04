import { describe, expect, it } from 'vitest';
import { findingsOf, hypothesesOf, riskOf, stateOf, voiceOf } from './engine';
import { sha256 } from './sha256';
import { makeCheckup, markIntervention, seedWorld, setForecast, signPlan, submitCheckup } from './world';
import { toFhirBundle } from './fhir';
import type { World } from './types';

const heat = (w: World) =>
  setForecast(w, { source: 'simulated', fetchedAt: new Date().toISOString(), days: Array.from({ length: 7 }, (_, i) => ({ date: `d${i}`, tmax: i < 5 ? 31 : 24, precip: 0 })) });

describe('sha256', () => {
  it('matches the FIPS test vector', () => {
    expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });
});

describe('seed world', () => {
  const w = seedWorld();
  it('has 14 streams, 6 waiting for someone', () => {
    expect(w.streams).toHaveLength(14);
    expect(w.streams.filter((s) => stateOf(w, s.id) === 'unfollowed')).toHaveLength(6);
  });
  it('has the expected patients', () => {
    expect(stateOf(w, 'trois-ponts')).toBe('unfollowed');
    expect(stateOf(w, 'marcaissonne')).toBe('alert');
    expect(stateOf(w, 'hers')).toBe('watch');
    expect(stateOf(w, 'margelle')).toBe('watch');
    expect(stateOf(w, 'sausse')).toBe('stable');
    expect(stateOf(w, 'touch')).toBe('stable');
  });
});

describe('a week in the life of Trois Ponts brook', () => {
  it('goes from forgotten to remission through the full care loop', () => {
    let w = seedWorld();
    const now = Date.now();
    const at = (h: number) => new Date(now + h * 3_600_000).toISOString();
    const base = { clarity: 'cloudy', foam: 'persistent', odour: 'faint', flow: 'slow', banks: 'natural', vegetation: 'dense', litter: 'none' };

    w = { ...w, now: at(0) };
    w = submitCheckup(w, makeCheckup({ streamId: 'trois-ponts', authorId: 'mathis', at: at(0), photo: 'photos/foam-stone.jpg', answers: base, decisions: { banks: 'kept', vegetation: 'kept' } }));
    expect(stateOf(w, 'trois-ponts')).toBe('watch');
    const foam1 = findingsOf(w, 'trois-ponts').find((f) => f.field === 'foam')!;
    expect(foam1.grade).toBe('B'); // photo + person/AI agreement
    expect(findingsOf(w, 'trois-ponts').find((f) => f.field === 'odour')!.grade).toBe('C'); // one nose

    w = { ...w, now: at(24) };
    w = submitCheckup(w, makeCheckup({ streamId: 'trois-ponts', authorId: 'lea', at: at(24), photo: 'photos/foam-stone.jpg', answers: { ...base, flow: 'stagnant' } }));
    expect(stateOf(w, 'trois-ponts')).toBe('watch');
    expect(findingsOf(w, 'trois-ponts').find((f) => f.field === 'odour')!.grade).toBe('B');
    expect(hypothesesOf(w, 'trois-ponts')[0].title).toMatch(/wastewater/);

    w = { ...w, now: at(30) };
    w = submitCheckup(w, makeCheckup({ streamId: 'trois-ponts', authorId: 'ines', at: at(30), photo: 'photos/stagnant-arm.jpg', answers: { ...base, foam: 'some', flow: 'stagnant' }, decisions: { flow: 'kept' } }));
    expect(riskOf(w, 'trois-ponts')).toBeNull(); // no forecast yet

    w = { ...w, now: at(48) };
    w = heat(w);
    expect(riskOf(w, 'trois-ponts')?.level).toBe('elevated');
    expect(stateOf(w, 'trois-ponts')).toBe('alert');
    const plan = w.plans.find((p) => p.streamId === 'trois-ponts' && p.status === 'proposed')!;
    expect(plan.lines.length).toBeGreaterThan(0);
    expect(plan.lines.length).toBeLessThanOrEqual(5);

    w = { ...w, now: at(72) };
    const removedLine = plan.lines.find((l) => l.measureId === 'm435');
    w = signPlan(w, plan.id, 'ferreira', removedLine ? { [removedLine.id]: 'Premature before the outfall is checked' } : {});
    const signed = w.plans.find((p) => p.id === plan.id)!;
    expect(signed.status).toBe('validated');
    expect(signed.signatureHash).toHaveLength(64);
    expect(findingsOf(w, 'trois-ponts').find((f) => f.field === 'foam')!.grade).toBe('A');
    expect(w.notices.some((n) => n.toId === 'mathis' && /triggered an inspection/.test(n.text))).toBe(true);
    expect(voiceOf(w, 'trois-ponts', 'curious').map((l) => l.text).join(' ')).toMatch(/Dr Ferreira signed a care plan/);

    const bundle = toFhirBundle(w, 'trois-ponts');
    const types = new Set(bundle.entry.map((e) => e.resource.resourceType));
    for (const t of ['Patient', 'Location', 'Observation', 'Media', 'QuestionnaireResponse', 'DiagnosticReport', 'CarePlan', 'Provenance', 'Communication', 'Device', 'Practitioner', 'RiskAssessment']) expect(types.has(t)).toBe(true);

    w = { ...w, now: at(96) };
    w = markIntervention(w, plan.id, signed.lines.find((l) => !l.removed)!.id);

    const later = at(24 * 22);
    w = { ...w, now: later, forecast: undefined };
    w = submitCheckup(w, makeCheckup({ streamId: 'trois-ponts', authorId: 'mathis', at: later, photo: 'photos/clear-riffles.jpg', answers: { clarity: 'clear', foam: 'none', odour: 'none', flow: 'flowing', banks: 'natural', vegetation: 'dense', litter: 'none' }, followUp: true }));
    expect(stateOf(w, 'trois-ponts')).toBe('stable');
    expect(w.events.some((e) => e.streamId === 'trois-ponts' && e.kind === 'remission')).toBe(true);
    expect(w.notices.some((n) => n.toId === 'mathis' && /remission/.test(n.text))).toBe(true);
    expect(voiceOf(w, 'trois-ponts', 'curious')[0].text).toBe('I am better.');

  });
});
