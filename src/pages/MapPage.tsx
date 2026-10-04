import { Activity, ArrowDown, ArrowUp, ClipboardCheck, Download, Ellipsis, HeartPulse, ListFilter, Search, ShieldCheck, Users } from 'lucide-react';
import { useState } from 'react';
import { STATE_LABEL, STATE_RANK, averageGrade, checkupsOf, daysSinceVisit, findingsOf, nowOf, stateOf } from '../domain/engine';
import type { StreamState } from '../domain/types';
import { CityMap } from '../ui/CityMap';
import { ConfBar, StateBadge, streamCode } from '../ui/kit';
import { go, useStore } from '../ui/store';

export function MapPage() {
  const { world } = useStore();
  const [filter, setFilter] = useState<StreamState | 'all'>('all');
  const rows = world.streams
    .map((s) => {
      const fs = findingsOf(world, s.id);
      const abn = fs.filter((f) => f.abnormal);
      return { s, st: stateOf(world, s.id), d: daysSinceVisit(world, s.id), grade: fs.length ? averageGrade((abn.length ? abn : fs).map((f) => f.grade)) : undefined, n: checkupsOf(world, s.id).length };
    })
    .sort((a, b) => STATE_RANK[a.st] - STATE_RANK[b.st] || (b.d ?? 999) - (a.d ?? 999));
  const waiting = rows.filter((r) => r.st === 'unfollowed').length;
  const followed = rows.length - waiting;
  const now = nowOf(world).getTime();
  const week = world.checkups.filter((c) => now - new Date(c.at).getTime() < 7 * 86_400_000).length;
  const prevWeek = world.checkups.filter((c) => {
    const d = now - new Date(c.at).getTime();
    return d >= 7 * 86_400_000 && d < 14 * 86_400_000;
  }).length;
  const openPlans = world.plans.filter((p) => p.status !== 'closed').length;
  const toSign = world.plans.filter((p) => p.status === 'proposed').length;
  const remissions = world.events.filter((e) => e.kind === 'remission').length;
  const allGrades = world.streams.flatMap((s) => findingsOf(world, s.id).map((f) => f.grade));
  const strong = allGrades.filter((g) => g === 'A' || g === 'B').length;
  const shown = rows.filter((r) => filter === 'all' || r.st === filter);

  return (
    <div className="col" style={{ gap: 16 }}>
      <div className="title-row">
        <h1>Patients</h1>
        <span className="pill live">Live data</span>
        <span className="grow" />
        <button className="btn cta" onClick={() => go('/stream/trois-ponts/checkup')}>
          <HeartPulse /> Take a pulse
        </button>
      </div>

      <div className="grid4">
        <Kpi title="Streams followed" value={`${followed}/${rows.length}`} icon={<Activity color="#3B6EF6" />} trend={<><span className="up"><ArrowUp size={11} /> {waiting}</span> waiting for someone</>} />
        <Kpi title="Check-ups this week" value={String(week)} icon={<Users color="#E08A1E" />} trend={week >= prevWeek ? <><span className="up"><ArrowUp size={11} /> {week - prevWeek}</span> vs last week</> : <><span className="down"><ArrowDown size={11} /> {prevWeek - week}</span> vs last week</>} />
        <Kpi title="Solid information" value={`${allGrades.length ? Math.round((strong / allGrades.length) * 100) : 0}%`} icon={<ShieldCheck color="#22A06B" />} trend={<>of findings are grade A or B</>} />
        <Kpi title="Open care plans" value={String(openPlans)} icon={<ClipboardCheck color="#E5484D" />} trend={<><span className="down">{toSign} to sign</span> · {remissions} remission{remissions > 1 ? 's' : ''}</>} />
      </div>

      <div className="grid2" style={{ gridTemplateColumns: '1.55fr 1fr', alignItems: 'stretch' }}>
        <div className="card col" style={{ gap: 10 }}>
          <div className="row between">
            <h2>{rows.length} streams, {waiting} are waiting for someone.</h2>
            <span className="tiny faint">Tap a stream to open its chart</span>
          </div>
          <CityMap world={world} onPick={(id) => go(`/stream/${id}`)} />
        </div>
        <div className="card col" style={{ gap: 6 }}>
          <h2>Waiting for someone</h2>
          <p className="small muted">No visit for more than two weeks. Nobody is to blame — somebody just needs to pass by.</p>
          <div className="rowlist" style={{ marginTop: 4 }}>
            {rows
              .filter((r) => r.st === 'unfollowed')
              .map(({ s, d }) => (
                <a key={s.id} href={`#/stream/${s.id}`} className="rowitem">
                  <img className="thumb" src={s.photo} alt="" style={{ filter: 'grayscale(0.9)', width: 38, height: 38 }} />
                  <div className="grow">
                    <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{s.name}</div>
                    <div className="tiny muted">“{d === null ? 'Nobody has ever looked at me.' : `Nobody has looked at me for ${d} days.`}”</div>
                  </div>
                  <span className="btn small">Take its pulse</span>
                </a>
              ))}
          </div>
        </div>
      </div>

        <div className="card" style={{ padding: '12px 12px 6px' }}>
          <div className="table-head">
            <h2 className="row" style={{ gap: 8 }}>
              <HeartPulse size={16} color="#3B6EF6" /> Stream charts
            </h2>
            <div className="row" style={{ gap: 6 }}>
              <select className="btn small" value={filter} onChange={(e) => setFilter(e.target.value as StreamState | 'all')} aria-label="Filter by state">
                <option value="all">All states</option>
                {(['alert', 'watch', 'unfollowed', 'stable'] as StreamState[]).map((k) => (
                  <option key={k} value={k}>{STATE_LABEL[k]}</option>
                ))}
              </select>
              <button className="iconbtn" aria-label="Search" onClick={() => (document.querySelector('.search input') as HTMLInputElement)?.focus()}><Search size={14} /></button>
              <button className="iconbtn" aria-label="Filter"><ListFilter size={14} /></button>
              <a className="iconbtn" aria-label="FHIR export" href="#/stream/marcaissonne" title="Each chart exports to HL7 FHIR R4"><Download size={14} /></a>
            </div>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Stream ID</th>
                <th>Stream</th>
                <th className="hide-sm">Reach</th>
                <th>Status</th>
                <th className="hide-sm">Last visit</th>
                <th>Confidence</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(({ s, st, d, grade, n }) => (
                <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => go(`/stream/${s.id}`)}>
                  <td className="id">
                    <b>{streamCode(s.id)}</b>
                    <small>{n} check-up{n === 1 ? '' : 's'}</small>
                  </td>
                  <td>
                    <span className="who">
                      <img src={s.photo} alt="" style={st === 'unfollowed' ? { filter: 'grayscale(0.9)' } : undefined} />
                      <span style={{ fontWeight: 500, color: 'var(--ink-2)' }}>{s.name}</span>
                    </span>
                  </td>
                  <td className="route hide-sm">
                    <b>{s.district}</b>
                    <small>{s.lengthM} m · {s.surroundings.slice(0, 2).join(', ')}</small>
                  </td>
                  <td>
                    <StateBadge state={st} />
                  </td>
                  <td className="hide-sm">{d === null ? 'Never' : d === 0 ? 'Today' : `${d} d ago`}</td>
                  <td>
                    <ConfBar g={grade} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="iconbtn" style={{ display: 'inline-grid' }}><Ellipsis size={14} /></span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
    </div>
  );
}

function Kpi({ title, value, icon, trend }: { title: string; value: string; icon: JSX.Element; trend: JSX.Element }) {
  return (
    <div className="kpi">
      <div className="kh">
        {title} <span className="dots">···</span>
      </div>
      <div className="kb">
        <div className="kv">
          {value}
          <span className="ki">{icon}</span>
        </div>
        <div className="kt">{trend}</div>
      </div>
    </div>
  );
}
