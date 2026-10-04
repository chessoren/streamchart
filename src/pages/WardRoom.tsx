import { FolderOpen, Send, Wrench } from 'lucide-react';
import { STATE_RANK, averageGrade, daysSinceVisit, findingsOf, stateOf, threeLineSummary } from '../domain/engine';
import { MEASURE_BY_ID } from '../domain/catalogue';
import { GradeChip, StateBadge } from '../ui/kit';
import { go, useStore } from '../ui/store';

export function WardRoom() {
  const { world, showToast } = useStore();
  const rows = world.streams
    .map((s) => ({ s, st: stateOf(world, s.id), d: daysSinceVisit(world, s.id) }))
    .sort((a, b) => STATE_RANK[a.st] - STATE_RANK[b.st] || (b.d ?? 999) - (a.d ?? 999));
  return (
    <div className="col" style={{ gap: 18 }}>
      <div>
        <div className="kicker">City services · ward room</div>
        <h1>Where to go first.</h1>
        <p className="muted" style={{ marginTop: 6 }}>
          Every stream of the city, sorted by urgency. Three lines each, the confidence behind them, and the measures proposed from the project's own catalogue.
        </p>
      </div>
      <div className="ward">
        {rows.map(({ s, st }) => {
          const fs = findingsOf(world, s.id).filter((f) => f.abnormal);
          const plan = [...world.plans].reverse().find((p) => p.streamId === s.id && p.status !== 'closed');
          return (
            <div key={s.id} className={`card urgent ${st} wardrow`} style={{ padding: 14 }}>
              <img src={s.photo} alt="" style={st === 'unfollowed' ? { filter: 'grayscale(0.85)' } : undefined} />
              <div>
                <b className="serif" style={{ fontSize: 18, color: 'var(--ink)' }}>{s.name}</b>
                <div className="small muted">{s.district}</div>
                <div style={{ marginTop: 6 }}>
                  <StateBadge state={st} />
                </div>
              </div>
              <div className="small" style={{ lineHeight: 1.5 }}>
                {threeLineSummary(world, s.id).map((l) => (
                  <div key={l}>{l}</div>
                ))}
              </div>
              <div className="small">
                <div className="row" style={{ gap: 6, marginBottom: 6 }}>
                  <span className="muted">Average grade</span> {fs.length ? <GradeChip g={averageGrade(fs.map((f) => f.grade))} /> : <span className="faint">—</span>}
                </div>
                {plan ? (
                  plan.lines
                    .filter((l) => !l.removed)
                    .slice(0, 2)
                    .map((l) => (
                      <div key={l.id} className="tiny muted">
                        §{MEASURE_BY_ID[l.measureId].section} {MEASURE_BY_ID[l.measureId].title}
                      </div>
                    ))
                ) : (
                  <div className="tiny faint">{st === 'unfollowed' ? 'Needs a check-up first' : 'No plan needed'}</div>
                )}
                {plan && <div className="tiny" style={{ marginTop: 4, fontWeight: 700, color: plan.status === 'validated' ? 'var(--stable)' : '#9a6812' }}>{plan.status === 'validated' ? 'Plan validated' : 'Plan proposed — awaiting signature'}</div>}
              </div>
              <div className="col" style={{ gap: 6 }}>
                <button className="btn small" onClick={() => go(`/stream/${s.id}`)}>
                  <FolderOpen size={15} /> Open file
                </button>
                <button className="btn small" disabled={!plan || plan.status !== 'proposed'} onClick={() => showToast(`${s.name}: file sent to Dr Ferreira, referent ecologist.`)}>
                  <Send size={15} /> To ecologist
                </button>
                <button className="btn small" disabled={!plan || plan.status !== 'validated'} onClick={() => go(`/stream/${s.id}`)}>
                  <Wrench size={15} /> Plan work
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
