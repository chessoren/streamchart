import { Pause, Play, RotateCcw, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { STATE_RANK, daysSinceVisit, findingsOf, hypothesesOf, personName, riskOf, stateOf, threeLineSummary, voiceOf } from '../domain/engine';
import { FIELD_SHORT } from '../domain/fields';
import { MEASURE_BY_ID } from '../domain/catalogue';
import { makeCheckup, seedWorld, setForecast, signPlan, submitCheckup } from '../domain/world';
import type { Answers, World } from '../domain/types';
import { CityMap } from '../ui/CityMap';
import { GradeChip, StateBadge, Stamp } from '../ui/kit';
import { go, useStore } from '../ui/store';
import { WaterCanvas } from './VoicePage';

const H = 3_600_000;
const BASE: Answers = { clarity: 'cloudy', foam: 'persistent', odour: 'faint', flow: 'slow', banks: 'natural', vegetation: 'dense', litter: 'none' };

interface Beat {
  t: number; // seconds into the scene
  caption: string;
  focus: 'map' | 'checkup' | 'risk' | 'ward' | 'sign' | 'notice' | 'voice';
  apply?: (w: World, t0: number) => World;
  person?: string;
}

// The accelerated scene. Every computation (grades, state, hypothesis, risk, plan, notices) is the real engine;
// only the people, their check-ups and the heatwave are scripted, and the screen says so.
const BEATS: Beat[] = [
  { t: 0, focus: 'map', caption: 'Trois Ponts brook has not been followed for over two weeks. A lone patient.' },
  {
    t: 5, focus: 'checkup', person: 'mathis', caption: 'Day 1. Mathis sees foam and smells something. One person is enough to open the file.',
    apply: (w, t0) => submitCheckup({ ...w, now: new Date(t0).toISOString() }, makeCheckup({ streamId: 'trois-ponts', authorId: 'mathis', at: new Date(t0).toISOString(), photo: 'photos/foam-stone.jpg', answers: BASE, decisions: { banks: 'kept', vegetation: 'kept' } })),
  },
  {
    t: 15, focus: 'checkup', person: 'lea', caption: 'Day 2. Léa saw the same thing — and still water in a side arm. The community makes the information stronger.',
    apply: (w, t0) => submitCheckup({ ...w, now: new Date(t0 + 24 * H).toISOString() }, makeCheckup({ streamId: 'trois-ponts', authorId: 'lea', at: new Date(t0 + 24 * H).toISOString(), photo: 'photos/foam-stone.jpg', answers: { ...BASE, flow: 'stagnant' }, decisions: { banks: 'kept', vegetation: 'kept', flow: 'kept' } })),
  },
  {
    t: 25, focus: 'checkup', person: 'ines', caption: 'Inès, from a neighbouring street, photographs the stagnant arm. The AI disagrees on the flow; she keeps her answer.',
    apply: (w, t0) => submitCheckup({ ...w, now: new Date(t0 + 30 * H).toISOString() }, makeCheckup({ streamId: 'trois-ponts', authorId: 'ines', at: new Date(t0 + 30 * H).toISOString(), photo: 'photos/stagnant-arm.jpg', answers: { ...BASE, foam: 'some', flow: 'stagnant', vegetation: 'sparse' }, decisions: { flow: 'kept' } })),
  },
  {
    t: 30, focus: 'risk', caption: 'Day 3. The forecast announces heat. Stagnant water + heat: an indication of risk for people, with its reasons.',
    apply: (w, t0) => setForecast({ ...w, now: new Date(t0 + 48 * H).toISOString() }, { source: 'simulated', fetchedAt: new Date(t0 + 48 * H).toISOString(), days: Array.from({ length: 7 }, (_, i) => ({ date: `D+${i}`, tmax: [31, 33, 34, 32, 29, 26, 24][i], precip: 0 })) }),
  },
  { t: 38, focus: 'ward', caption: 'Day 4. At city hall, the ward room puts Trois Ponts first, in three lines.', apply: (w, t0) => ({ ...w, now: new Date(t0 + 72 * H).toISOString() }) },
  {
    t: 45, focus: 'sign', caption: 'Dr Ferreira reviews the photos, confirms the hypothesis, removes one premature measure — and signs.',
    apply: (w) => {
      const p = w.plans.find((x) => x.streamId === 'trois-ponts' && x.status === 'proposed');
      if (!p) return w;
      const premature = p.lines.find((l) => l.measureId === 'm435') ?? p.lines.find((l) => l.measureId === 'm421');
      return signPlan(w, p.id, 'ferreira', premature ? { [premature.id]: 'Premature until the outfall is inspected' } : {});
    },
  },
  { t: 52, focus: 'sign', caption: 'The plan goes from “proposed” to “validated”. The AI assists; a human decides.' },
  { t: 55, focus: 'notice', caption: 'Every citizen who contributed hears back: your check-up triggered an inspection.' },
  { t: 60, focus: 'voice', caption: 'And the stream speaks.' },
];

export function SimulationPage() {
  const { setWorld, showToast } = useStore();
  // the scene ends about now, so a kept record has no future dates
  const [t0] = useState(() => Date.now() - 4 * 24 * H);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number>();
  const worlds = useMemo(() => {
    const out: World[] = [];
    let w: World = { ...seedWorld(), forecast: undefined, now: new Date(t0 - H).toISOString() };
    for (const b of BEATS) {
      if (b.apply) w = b.apply(w, t0);
      out.push(w);
    }
    return out;
  }, [t0]);
  const w = worlds[i];
  const beat = BEATS[i];

  useEffect(() => {
    if (!playing) return;
    if (i >= BEATS.length - 1) {
      setPlaying(false);
      return;
    }
    timer.current = window.setTimeout(() => setI(i + 1), (BEATS[i + 1].t - BEATS[i].t) * 1000);
    return () => window.clearTimeout(timer.current);
  }, [playing, i]);

  const keep = () => {
    setWorld(() => ({ ...worlds[worlds.length - 1], now: undefined }));
    showToast('The simulated record of Trois Ponts brook is now in your demo (labelled as demonstration data).');
    go('/stream/trois-ponts');
  };

  return (
    <div className="col" style={{ gap: 16 }}>
      <div className="simbar">
        <span>SIMULATION — accelerated time</span>
        <span className="small" style={{ fontWeight: 600 }}>Demonstration citizens and a scripted heatwave; grades, states, hypothesis, risk, plan and notices are computed live by the real engine.</span>
      </div>
      <div className="row between wrap" style={{ gap: 12 }}>
        <h1>The emergency scene · 60 seconds</h1>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn primary" onClick={() => { if (i >= BEATS.length - 1) setI(0); setPlaying(!playing); }}>
            {playing ? <Pause size={16} /> : <Play size={16} />} {playing ? 'Pause' : i ? 'Resume' : 'Play'}
          </button>
          <button className="btn" onClick={() => { setPlaying(false); setI(0); }}>
            <RotateCcw size={16} /> Restart
          </button>
        </div>
      </div>
      <div className="caption" key={i} style={{ animation: 'vlIn .6s ease forwards' }}>
        <span className="tiny faint" style={{ fontFamily: 'var(--sans)', marginRight: 10 }}>{beat.t}s</span>
        {beat.caption}
      </div>
      <div className="grid2" style={{ gridTemplateColumns: '1.2fr 1fr', alignItems: 'start' }}>
        <CityMap world={w} highlight="trois-ponts" compact />
        <Focus w={w} beat={beat} />
      </div>
      <div className="row" style={{ gap: 4 }}>
        {BEATS.map((b, k) => (
          <button key={k} onClick={() => { setPlaying(false); setI(k); }} title={b.caption} style={{ flex: 1, height: 8, borderRadius: 99, background: k <= i ? 'var(--ink)' : 'var(--line)' }} aria-label={`Step ${k + 1}`} />
        ))}
      </div>
      {i === BEATS.length - 1 && (
        <div className="row wrap" style={{ gap: 10 }}>
          <button className="btn primary" onClick={keep}>
            Open this simulated chart
          </button>
          <span className="small muted">Copies the simulated record into your demo so you can explore it, sign, follow up and reach remission.</span>
        </div>
      )}
    </div>
  );
}

function Focus({ w, beat }: { w: World; beat: Beat }) {
  const st = stateOf(w, 'trois-ponts');
  const last = w.checkups.filter((c) => c.streamId === 'trois-ponts').sort((a, b) => b.at.localeCompare(a.at))[0];
  if (beat.focus === 'map')
    return (
      <div className="card col" style={{ gap: 10 }}>
        <StateBadge state={st} lg />
        <p className="serif" style={{ fontSize: 24, color: 'var(--ink)' }}>“Nobody has looked at me for {daysSinceVisit(w, 'trois-ponts')} days.”</p>
        <img src="photos/three-bridges.jpg" alt="" className="idphoto" style={{ filter: 'grayscale(0.7)' }} />
      </div>
    );
  if (beat.focus === 'checkup' && last)
    return (
      <div className="card col" style={{ gap: 10 }}>
        <div className="row between">
          <b className="serif" style={{ fontSize: 20, color: 'var(--ink)' }}>Check-up by {personName(w, last.authorId)}</b>
          <StateBadge state={st} />
        </div>
        <img src={last.photo} alt="" className="idphoto" />
        <div className="col" style={{ gap: 4 }}>
          {findingsOf(w, 'trois-ponts').filter((f) => f.abnormal).map((f) => (
            <div key={f.field} className="row small" style={{ gap: 8 }}>
              <GradeChip g={f.grade} /> <b>{FIELD_SHORT[f.field]}</b> {f.value} <span className="muted">— {f.authors.length} {f.authors.length > 1 ? 'people' : 'person'}{f.aiAgree ? ', AI agrees' : ''}</span>
            </div>
          ))}
        </div>
        {hypothesesOf(w, 'trois-ponts')[0] && <div className="note">Hypothesis: {hypothesesOf(w, 'trois-ponts')[0].title} — confidence {hypothesesOf(w, 'trois-ponts')[0].confidence}</div>}
      </div>
    );
  if (beat.focus === 'risk') {
    const r = riskOf(w, 'trois-ponts');
    return (
      <div className="card risk col" style={{ gap: 10 }}>
        <div className="row between">
          <span className="kicker">Seven-day indication</span>
          <StateBadge state={st} lg />
        </div>
        <h2>{r?.title}</h2>
        <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>{r?.reasons.map((x) => <li key={x}>{x}</li>)}</ul>
        <div className="note">Indication, not an epidemiological forecast. Simulated heatwave for this scene.</div>
      </div>
    );
  }
  if (beat.focus === 'ward') {
    const rows = w.streams.map((s) => ({ s, st: stateOf(w, s.id) })).sort((a, b) => STATE_RANK[a.st] - STATE_RANK[b.st]).slice(0, 3);
    return (
      <div className="card col" style={{ gap: 10 }}>
        <span className="kicker">Ward room · city services</span>
        {rows.map(({ s, st: x }) => (
          <div key={s.id} className={`card flat urgent ${x}`} style={{ padding: 12 }}>
            <div className="row between"><b className="serif" style={{ color: 'var(--ink)' }}>{s.name}</b><StateBadge state={x} /></div>
            {s.id === 'trois-ponts' && <div className="small" style={{ marginTop: 6 }}>{threeLineSummary(w, s.id).map((l) => <div key={l}>{l}</div>)}</div>}
          </div>
        ))}
      </div>
    );
  }
  if (beat.focus === 'sign') {
    const p = [...w.plans].reverse().find((x) => x.streamId === 'trois-ponts');
    return (
      <div className="card col" style={{ gap: 8 }}>
        <div className="row between">
          <h2>Care plan</h2>
          {p?.status === 'validated' && <Stamp title="Validated" sub="Dr Ferreira · ecologist" tone="green" animate />}
        </div>
        <div className={`planband ${p?.status}`}>{p?.status === 'validated' ? <><ShieldCheck size={18} /> Validated by Dr Ferreira, referent ecologist</> : 'Proposed by the system'}</div>
        {p?.lines.map((l) => (
          <div key={l.id} className={`planline ${l.removed ? 'removed' : ''}`} style={{ gridTemplateColumns: '1fr' }}>
            <div className="what small" style={{ fontWeight: 700 }}>{MEASURE_BY_ID[l.measureId].plain}</div>
            <div className="tiny muted">§{MEASURE_BY_ID[l.measureId].section} {MEASURE_BY_ID[l.measureId].title}{l.removed ? ` — removed: ${l.removed.reason}` : ''}</div>
          </div>
        ))}
      </div>
    );
  }
  if (beat.focus === 'notice') {
    const ns = w.notices.filter((n) => n.streamId === 'trois-ponts' && /inspection/.test(n.text));
    return (
      <div className="col" style={{ gap: 10 }}>
        {ns.map((n) => (
          <div key={n.id} className="notice unread" style={{ animation: 'vlIn .6s ease forwards' }}>
            {n.photo ? <img src={n.photo} alt="" /> : <img src="photos/three-bridges.jpg" alt="" />}
            <div>
              <b className="serif" style={{ color: 'var(--ink)' }}>To {personName(w, n.toId)}</b>
              <p className="small" style={{ marginTop: 4 }}>{n.text}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }
  const lines = voiceOf(w, 'trois-ponts', 'curious');
  return (
    <div className="voice" style={{ minHeight: 360, padding: 30 }}>
      <WaterCanvas />
      <div className="lines">
        {lines.map((l, k) => (
          <div key={k} className="vl" style={{ fontSize: 21, animationDelay: `${0.3 + k * 1.1}s` }}>“{l.text}”</div>
        ))}
      </div>
    </div>
  );
}
