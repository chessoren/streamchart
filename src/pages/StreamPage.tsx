import { Activity, Camera, ChevronLeft, ClipboardCheck, Download, FlaskConical, HeartPulse, Info, MessageCircleQuestion, ShieldCheck, Sparkles, Stethoscope, ThermometerSun, Volume2, Wrench } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import {
  STATE_LABEL, nowOf, checkupGrade, checkupsOf, daysSinceVisit, findingsOf, firstReporter, fmtDate, fmtDateTime, gradeRules, hypothesesOf, personName, plainSentence, pulseSeries, riskOf, stateOf, timelineOf,
} from '../domain/engine';
import { FIELD_SHORT, labelOf } from '../domain/fields';
import { MEASURE_BY_ID, CATALOGUE_SOURCE } from '../domain/catalogue';
import { markIntervention, signPlan, PHOTO_CREDITS } from '../domain/world';
import { toFhirBundle, fhirSummary } from '../domain/fhir';
import type { CarePlan, EventKind, Register, World } from '../domain/types';
import { Avatar, BeforeAfter, GradeChip, Pulse, StateBadge, Stamp } from '../ui/kit';
import { PERSONA_PERSON, go, useStore } from '../ui/store';

const KIND_ICON: Record<EventKind, ReactNode> = {
  checkup: <Camera />, followup: <Camera />, measure: <Activity />, lab: <FlaskConical />, hypothesis: <Stethoscope />, risk: <ThermometerSun />, plan_proposed: <ClipboardCheck />, plan_signed: <ShieldCheck />, intervention: <Wrench />, remission: <HeartPulse />, state: <Info />,
};

export function StreamPage({ streamId }: { streamId: string }) {
  const { world, settings } = useStore();
  const s = world.streams.find((x) => x.id === streamId);
  if (!s) return <p>Unknown stream.</p>;
  const st = stateOf(world, s.id);
  const d = daysSinceVisit(world, s.id);
  const reg = settings.register;
  const credit = PHOTO_CREDITS[s.photo.split('/').pop() ?? ''];
  const hyps = hypothesesOf(world, s.id);
  const risk = riskOf(world, s.id);
  const plan = [...world.plans].reverse().find((p) => p.streamId === s.id);
  const remission = timelineOf(world, s.id).find((e) => e.kind === 'remission');

  return (
    <div className="col" style={{ gap: 20 }}>
      <a href="#/" className="row small muted" style={{ gap: 4 }}>
        <ChevronLeft size={16} /> City map
      </a>
      {/* Identity card */}
      <section className="card idcard">
        <div>
          <img className="idphoto" src={s.photo} alt={s.name} />
          {credit && (
            <div className="idphoto-credit">
              Photo: “{credit.title}”, {credit.author}, {credit.license} (Wikimedia Commons)
            </div>
          )}
        </div>
        <div className="col" style={{ gap: 12 }}>
          <div className="row between wrap">
            <div>
              <div className="kicker">Patient file · {s.city}</div>
              <h1 style={{ fontSize: 36 }}>{s.name}</h1>
              <div className="muted small">
                {s.district} · {s.lengthM} m reach · {s.surroundings.join(', ')} · {d === null ? 'never visited' : d === 0 ? 'last visit today' : `last visit ${d} day${d > 1 ? 's' : ''} ago`}
                {s.adoptedBy ? ` · adopted by ${personName(world, s.adoptedBy)}` : ''}
              </div>
            </div>
            <StateBadge state={st} lg />
          </div>
          <p className="serif" style={{ fontSize: 21, color: 'var(--ink)' }}>
            {st === 'unfollowed' ? `“${d === null ? 'Nobody has ever looked at me.' : `Nobody has looked at me for ${d} days.`}”` : plainSentence(world, s.id, reg)}
          </p>
          <div>
            <div className="row between tiny faint">
              <span>Pulse · last 4 months</span>
              <span>stable ─ watch ─ alert</span>
            </div>
            <Pulse series={pulseSeries(world, s.id)} beats={checkupsOf(world, s.id).map((c) => new Date(c.at).getTime())} />
          </div>
          <div className="row wrap" style={{ gap: 10 }}>
            <button className="btn primary big" onClick={() => go(`/stream/${s.id}/checkup`)}>
              <HeartPulse size={20} /> Take the pulse · 1 min
            </button>
            <button className="btn big" onClick={() => go(`/stream/${s.id}/voice`)}>
              <Volume2 size={20} /> Listen to the stream
            </button>
          </div>
        </div>
      </section>

      <div className="grid2" style={{ gridTemplateColumns: '1fr 1.05fr', alignItems: 'start' }}>
        {/* Life timeline */}
        <section className="card">
          <div className="row between">
            <h2>Life of the stream</h2>
            <span className="tiny faint">most recent first</span>
          </div>
          <p className="small muted" style={{ margin: '4px 0 14px' }}>
            Every event carries its author and its confidence grade.
          </p>
          <Timeline world={world} streamId={s.id} reg={reg} />
        </section>

        <div className="col" style={{ gap: 18 }}>
          {hyps.map((h) => (
            <section key={h.id} className="card hyp">
              <div className="row between">
                <span className="kicker">Hypothesis — never a diagnosis</span>
                <span className="tag">{plan?.status === 'validated' || plan?.status === 'closed' ? 'Confirmed by the referent ecologist' : 'Proposed by the system'}</span>
              </div>
              <h2 style={{ margin: '6px 0 10px' }}>{h.title}</h2>
              <div className="row small" style={{ gap: 10 }}>
                <span className="muted">Confidence</span>
                <div className="confbar grow">
                  <span style={{ width: h.confidence === 'high' ? '85%' : h.confidence === 'medium' ? '55%' : '25%' }} />
                </div>
                <b style={{ color: 'var(--ink)' }}>{h.confidence}</b>
              </div>
              <ul className="small" style={{ margin: '12px 0 8px', paddingLeft: 18 }}>
                {h.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              <WhyBox world={world} streamId={s.id} fields={h.fields} confirm={h.confirm} />
            </section>
          ))}

          {risk && (
            <section className="card risk">
              <div className="row between">
                <span className="kicker">Seven-day health indication · One Health</span>
                <span className={`tag ${risk.level === 'elevated' ? 'high' : 'medium'}`}>{risk.level}</span>
              </div>
              <h3 style={{ margin: '6px 0 8px', fontSize: 19 }}>{risk.title}</h3>
              <ul className="small" style={{ margin: '0 0 10px', paddingLeft: 18 }}>
                {risk.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              <div className="note">
                Indication, not an epidemiological forecast. Reassess on {fmtDate(risk.reassessOn)}. A slot is ready for the project's DipteraCAST predictions (ENORA): when connected, they appear here as a “laboratory analysis”.
              </div>
            </section>
          )}

          {plan && <CarePlanCard plan={plan} />}

          <CareTeam world={world} streamId={s.id} />

          {remission && <Recovery world={world} streamId={s.id} remissionAt={remission.at} />}
        </div>
      </div>

      <ExpertDetails world={world} streamId={s.id} />
    </div>
  );
}

function Timeline({ world, streamId, reg }: { world: World; streamId: string; reg: Register }) {
  const [all, setAll] = useState(false);
  const evs = timelineOf(world, streamId);
  const shown = all ? evs : evs.slice(0, 9);
  return (
    <div className="timeline">
      {shown.map((e) => {
        const c = e.refId ? world.checkups.find((x) => x.id === e.refId) : undefined;
        return (
          <div key={e.id} className={`tl k-${e.kind}`}>
            <span className="ico">{KIND_ICON[e.kind]}</span>
            <div className="row between" style={{ alignItems: 'baseline' }}>
              <b style={{ color: 'var(--ink)' }}>{e.title}</b>
              <span className="row tiny faint" style={{ gap: 6, flex: 'none' }}>
                {e.grade && <GradeChip g={e.grade} />}
                {fmtDate(e.at)}
              </span>
            </div>
            {e.detail && <div className="small muted">{e.detail}</div>}
            {c && (
              <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
                {c.photo && <img className="tl-photo" src={c.photo} alt="" />}
                <div className="small muted" style={{ marginTop: 6 }}>
                  {Object.entries(c.final)
                    .filter(([, v]) => v)
                    .slice(0, 7)
                    .map(([f, v]) => `${FIELD_SHORT[f as keyof typeof FIELD_SHORT]}: ${labelOf(f as never, v, reg).toLowerCase()}`)
                    .join(' · ')}
                  {c.ai && (
                    <div className="tiny" style={{ marginTop: 4 }}>
                      <Sparkles size={11} /> AI second look {c.ai.source === 'recorded' ? '(recorded Gemini answer)' : c.ai.source === 'offline' ? '(offline colour analysis)' : `(${c.ai.model})`}:{' '}
                      {Object.values(c.decisions).filter((x) => x === 'kept').length} kept, {Object.values(c.decisions).filter((x) => x === 'adopted').length} adopted
                    </div>
                  )}
                </div>
              </div>
            )}
            {e.demo && <span className="tiny faint">demonstration data</span>}
          </div>
        );
      })}
      {evs.length > 9 && (
        <button className="btn ghost small" onClick={() => setAll(!all)}>
          {all ? 'Show less' : `Show ${evs.length - 9} older events`}
        </button>
      )}
    </div>
  );
}

function WhyBox({ world, streamId, fields, confirm }: { world: World; streamId: string; fields: string[]; confirm: string }) {
  const [open, setOpen] = useState(false);
  const { showToast } = useStore();
  const fs = findingsOf(world, streamId).filter((f) => fields.includes(f.field));
  return (
    <div>
      <div className="row wrap" style={{ gap: 8 }}>
        <button className="btn" onClick={() => setOpen(!open)}>
          <MessageCircleQuestion size={16} /> Why?
        </button>
        <button className="btn" onClick={() => showToast('Second opinion requested: neighbours who follow this stream are invited to take its pulse.')}>
          Ask for a second opinion
        </button>
      </div>
      {open && (
        <div className="col" style={{ marginTop: 12, gap: 8 }}>
          {fs.map((f) => (
            <div key={f.field} className="row small" style={{ alignItems: 'flex-start' }}>
              <GradeChip g={f.grade} />
              <span>
                <b>{FIELD_SHORT[f.field]}</b> {labelOf(f.field, f.value, 'curious').toLowerCase()} — {f.reasons.join(', ')}. Seen by {f.authors.map((a) => personName(world, a)).join(', ')}.
              </span>
            </div>
          ))}
          <div className="note">What would confirm it: {confirm}</div>
        </div>
      )}
    </div>
  );
}

function CarePlanCard({ plan }: { plan: CarePlan }) {
  const { world, setWorld, settings, showToast } = useStore();
  const [removed, setRemoved] = useState<Record<string, string>>({});
  const [justSigned, setJustSigned] = useState(false);
  const persona = settings.persona;
  const signer = plan.signedBy ? world.people.find((p) => p.id === plan.signedBy) : undefined;
  const sign = () => {
    setWorld((w) => signPlan(w, plan.id, PERSONA_PERSON.ecologist, removed));
    setJustSigned(true);
    showToast('Plan validated. Every citizen who contributed has been told what their check-up changed.');
  };
  return (
    <section className="card">
      <div className="row between">
        <h2>Care plan</h2>
        {plan.status !== 'proposed' && signer && (
          <Stamp title="Validated" sub={`${signer.name} · ${fmtDate(plan.signedAt!)}`} tone="green" animate={justSigned} />
        )}
      </div>
      <div className={`planband ${plan.status}`} style={{ margin: '12px 0 6px' }}>
        {plan.status === 'proposed' ? (
          <>
            <ClipboardCheck size={18} /> Proposed by the system. It becomes official when an ecologist signs it.
          </>
        ) : plan.status === 'validated' ? (
          <>
            <ShieldCheck size={18} /> Validated by {signer?.name}, referent ecologist · follow-up visit {fmtDate(plan.followUpDue!)}
          </>
        ) : (
          <>
            <HeartPulse size={18} /> Episode closed — remission confirmed by follow-up.
          </>
        )}
      </div>
      {plan.lines.map((l) => {
        const m = MEASURE_BY_ID[l.measureId];
        const isRemoved = !!l.removed || !!removed[l.id];
        return (
          <div key={l.id} className={`planline ${isRemoved ? 'removed' : ''}`}>
            <div>
              <div className="what" style={{ fontWeight: 700, color: 'var(--ink)' }}>
                {m.plain}
              </div>
              <div className="tiny muted">
                OneAquaHealth catalogue §{m.section} “{m.title}” · {m.line}
              </div>
              <div className="row wrap" style={{ gap: 6, marginTop: 6 }}>
                <span className="tag">{{ city: 'City services', association: 'Association', residents: 'Residents', ecologist: 'Ecologist' }[l.who]}</span>
                <span className={`tag ${l.urgency}`}>{l.urgency} urgency</span>
                <span className="tag">{l.effort} effort</span>
                <span className="tag">{l.removed ? 'removed' : l.status.replace('_', ' ')}</span>
              </div>
              {l.removed && <div className="tiny muted" style={{ marginTop: 4 }}>Removed by {personName(world, l.removed.by)}: {l.removed.reason}</div>}
            </div>
            <div className="col" style={{ alignItems: 'flex-end', gap: 6 }}>
              {plan.status === 'proposed' && persona === 'ecologist' && (
                <button className="btn small" onClick={() => setRemoved((r) => (r[l.id] ? Object.fromEntries(Object.entries(r).filter(([k]) => k !== l.id)) : { ...r, [l.id]: 'Premature at this stage' }))}>
                  {removed[l.id] ? 'Keep' : 'Remove'}
                </button>
              )}
              {plan.status === 'validated' && persona === 'technician' && !l.removed && l.status !== 'done' && (
                <button className="btn small" onClick={() => setWorld((w) => markIntervention(w, plan.id, l.id))}>
                  Mark done
                </button>
              )}
            </div>
          </div>
        );
      })}
      <div className="tiny faint" style={{ marginTop: 8 }}>
        Source of the measures: {CATALOGUE_SOURCE}.
      </div>
      {plan.status === 'proposed' && (
        <div className="col" style={{ marginTop: 14 }}>
          {persona === 'ecologist' ? (
            <button className="seal-btn" onClick={sign}>
              I validate this plan
            </button>
          ) : persona === 'technician' ? (
            <button className="btn primary" onClick={() => showToast('Sent to Dr Ferreira, referent ecologist, with photos, check-ups and grades.')}>
              Send to the referent ecologist
            </button>
          ) : (
            <div className="note">Switch “Viewing as” to Dr Ferreira (referent ecologist) to review and sign, or to Camille (city) to send it.</div>
          )}
        </div>
      )}
    </section>
  );
}

const ROLE_LABEL: Record<string, string> = {
  sentinel: 'Sentinel — first to report',
  vigil: 'Vigil — comes back regularly',
  scout: 'Scout — eye close to consensus',
  guardian: 'Guardian — adopted the stream',
  referent: 'Referent ecologist',
  class: 'The class',
};

function CareTeam({ world, streamId }: { world: World; streamId: string }) {
  const list = checkupsOf(world, streamId);
  const s = world.streams.find((x) => x.id === streamId)!;
  const counts = new Map<string, number>();
  list.forEach((c) => counts.set(c.authorId, (counts.get(c.authorId) ?? 0) + 1));
  const first = firstReporter(world, streamId, nowOf(world).toISOString(), 30);
  const members = [...counts.keys()].map((id) => {
    const p = world.people.find((x) => x.id === id);
    const role = p?.kind === 'school' ? 'class' : first?.authorId === id ? 'sentinel' : (counts.get(id) ?? 0) >= 2 ? 'vigil' : 'scout';
    return { id, name: p?.name ?? id, role };
  });
  return (
    <section className="card">
      <h2>Care team</h2>
      <p className="small muted" style={{ margin: '4px 0 12px' }}>
        Roles tell a story; they do not rank anyone.
      </p>
      <div className="team">
        {s.referentId && (
          <div className="member ref">
            <Avatar name={personName(world, s.referentId)} />
            <div>
              <b className="small">{personName(world, s.referentId)}</b>
              <div className="tiny muted">{ROLE_LABEL.referent}</div>
            </div>
          </div>
        )}
        {members.map((m) => (
          <div key={m.id} className="member">
            <Avatar name={m.name} />
            <div>
              <b className="small">{m.name}</b>
              <div className="tiny muted">{ROLE_LABEL[m.role]}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Recovery({ world, streamId, remissionAt }: { world: World; streamId: string; remissionAt: string }) {
  const plan = world.plans.find((p) => p.streamId === streamId && p.signedAt && p.signedAt <= remissionAt);
  const first = firstReporter(world, streamId, plan?.signedAt ?? remissionAt, 30);
  const follow = checkupsOf(world, streamId).find((c) => c.followUp && c.at <= remissionAt);
  const series = pulseSeries(world, streamId, 110);
  const markers = [
    first && { t: new Date(first.at).getTime(), label: `First report · ${personName(world, first.authorId)}` },
    plan?.signedAt && { t: new Date(plan.signedAt).getTime(), label: `Plan signed · ${personName(world, plan.signedBy)}` },
    follow && { t: new Date(follow.at).getTime(), label: `Follow-up · ${personName(world, follow.authorId)}` },
  ].filter(Boolean) as { t: number; label: string }[];
  return (
    <section className="card">
      <div className="kicker">Recovery curve</div>
      <h2 style={{ margin: '4px 0 6px' }}>In remission since {fmtDate(remissionAt)}</h2>
      <Pulse series={series} height={110} markers={markers} beats={checkupsOf(world, streamId).map((c) => new Date(c.at).getTime())} />
      <div className="row wrap small" style={{ gap: 14, marginTop: 6 }}>
        {markers.map((m) => (
          <span key={m.label}>
            <b>{fmtDate(new Date(m.t).toISOString())}</b> {m.label}
          </span>
        ))}
      </div>
      {first?.photo && follow?.photo && (
        <div style={{ marginTop: 14 }}>
          <BeforeAfter before={first.photo} after={follow.photo} labels={[`First report · ${fmtDate(first.at)}`, `Follow-up · ${fmtDate(follow.at)}`]} />
          <div className="tiny faint" style={{ marginTop: 4 }}>
            Slide to compare. Demonstration pair: real photos of two different streams standing in for the same viewpoint.
          </div>
        </div>
      )}
    </section>
  );
}

function ExpertDetails({ world, streamId }: { world: World; streamId: string }) {
  const [hapi, setHapi] = useState<string>('');
  const fs = findingsOf(world, streamId);
  const bundle = toFhirBundle(world, streamId);
  const summary = fhirSummary(bundle);
  const download = () => {
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/fhir+json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `streamchart-${streamId}-fhir-r4.json`;
    a.click();
  };
  const validate = async () => {
    setHapi('Sending the transaction Bundle to the public HAPI FHIR R4 test server…');
    try {
      const r = await fetch('https://hapi.fhir.org/baseR4', { method: 'POST', headers: { 'Content-Type': 'application/fhir+json' }, body: JSON.stringify(bundle) });
      const j = await r.json();
      if (r.ok && j.resourceType === 'Bundle') {
        const created = (j.entry ?? []).filter((e: { response?: { status?: string } }) => /^20[01]/.test(e.response?.status ?? '')).length;
        setHapi(`Accepted by HAPI FHIR R4 (HTTP ${r.status}): ${created} of ${bundle.entry.length} resources created or matched.`);
      } else setHapi(`Server answered HTTP ${r.status}: ${(j.issue?.[0]?.diagnostics ?? '').slice(0, 220)}`);
    } catch (e) {
      setHapi(`Could not reach the public test server (${(e as Error).message}). The Bundle can still be downloaded.`);
    }
  };
  return (
    <details className="card">
      <summary style={{ cursor: 'pointer' }}>
        <b className="serif" style={{ fontSize: 19, color: 'var(--ink)' }}>Details for experts</b>
        <span className="small muted"> — findings, grades, provenance, HL7 FHIR R4 export</span>
      </summary>
      <div className="grid2" style={{ marginTop: 16, alignItems: 'start' }}>
        <div>
          <h3>Current findings (last 3 weeks)</h3>
          <table className="small" style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
            <tbody>
              {fs.map((f) => (
                <tr key={f.field} style={{ borderBottom: '1px solid var(--line-2)' }}>
                  <td style={{ padding: '6px 4px' }}>{FIELD_SHORT[f.field]}</td>
                  <td>{labelOf(f.field, f.value, 'expert')}</td>
                  <td>
                    <GradeChip g={f.grade} />
                  </td>
                  <td className="tiny muted">{f.reasons.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3 style={{ marginTop: 16 }}>How grades are given</h3>
          <div className="col small" style={{ gap: 6, marginTop: 8 }}>
            {gradeRules().map((r) => (
              <div key={r.grade} className="row" style={{ alignItems: 'flex-start' }}>
                <GradeChip g={r.grade} /> <span>{r.rule}</span>
              </div>
            ))}
          </div>
          <div className="note" style={{ marginTop: 10 }}>
            Grades are a proposed method, not a validated one. A validation study against expert assessments is on the roadmap.
          </div>
          <h3 style={{ marginTop: 16 }}>Seals (commit–reveal)</h3>
          <div className="col" style={{ gap: 6, marginTop: 6 }}>
            {checkupsOf(world, streamId)
              .slice(0, 4)
              .map((c) => (
                <div key={c.id} className="hash">
                  {fmtDateTime(c.sealedAt)} · {personName(world, c.authorId)} · grade {checkupGrade(world, c)}
                  <br />
                  citizen sha256 {c.sealHash.slice(0, 24)}… {c.ai && <>· AI sha256 {c.ai.hash.slice(0, 24)}…</>}
                </div>
              ))}
          </div>
        </div>
        <div>
          <h3>HL7 FHIR R4 export</h3>
          <p className="small muted" style={{ margin: '6px 0 10px' }}>
            The chart as a transaction Bundle: the stream is a <b>Patient</b> and a <b>Location</b>; each check-up is a <b>QuestionnaireResponse</b>, <b>Media</b> and <b>Observations</b> with a
            confidence-grade extension; the AI's look is an Observation from a <b>Device</b>; hypotheses are <b>DiagnosticReports</b>, the 7-day indication a <b>RiskAssessment</b>, the care plan a{' '}
            <b>CarePlan</b> whose co-signature is a <b>Provenance</b> with a verification signature; replies to citizens are <b>Communications</b>.
          </p>
          <div className="row wrap" style={{ gap: 6 }}>
            {Object.entries(summary).map(([k, v]) => (
              <span key={k} className="tag">
                {k} × {v}
              </span>
            ))}
          </div>
          <div className="row wrap" style={{ gap: 8, marginTop: 12 }}>
            <button className="btn" onClick={download}>
              <Download size={16} /> Download Bundle (.json)
            </button>
            <button className="btn" onClick={validate}>
              <ShieldCheck size={16} /> Post to public HAPI FHIR server
            </button>
          </div>
          {hapi && <div className="note" style={{ marginTop: 10 }}>{hapi}</div>}
          <h3 style={{ marginTop: 16 }}>Laboratory analyses</h3>
          <div className="note" style={{ marginTop: 6 }}>
            Designed to plug into the OneAquaHealth tools: DipteraCAST mosquito predictions and the Decision Support System. Not connected in this prototype; the seven-day indication uses a transparent rule with a live Open-Meteo forecast.
          </div>
          <div className="tiny faint" style={{ marginTop: 10 }}>State: {STATE_LABEL[stateOf(world, streamId)]}. All people, check-ups and plans shown are demonstration data.</div>
        </div>
      </div>
    </details>
  );
}
