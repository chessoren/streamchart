import { averageGrade, findingsOf, stateOf } from '../domain/engine';
import { GradeChip } from '../ui/kit';
import { useStore } from '../ui/store';

function Flag({ c }: { c: string }) {
  const f: Record<string, JSX.Element> = {
    IT: <><rect width="10" height="20" fill="#009246" /><rect x="10" width="10" height="20" fill="#fff" /><rect x="20" width="10" height="20" fill="#ce2b37" /></>,
    PT: <><rect width="12" height="20" fill="#046a38" /><rect x="12" width="18" height="20" fill="#da291c" /><circle cx="12" cy="10" r="4" fill="#ffe900" /></>,
    BE: <><rect width="10" height="20" fill="#000" /><rect x="10" width="10" height="20" fill="#fdda24" /><rect x="20" width="10" height="20" fill="#ef3340" /></>,
    NO: <><rect width="30" height="20" fill="#ba0c2f" /><rect x="8" width="5" height="20" fill="#fff" /><rect y="7.5" width="30" height="5" fill="#fff" /><rect x="9.25" width="2.5" height="20" fill="#00205b" /><rect y="8.75" width="30" height="2.5" fill="#00205b" /></>,
    FR: <><rect width="10" height="20" fill="#002395" /><rect x="10" width="10" height="20" fill="#fff" /><rect x="20" width="10" height="20" fill="#ed2939" /></>,
  };
  return <svg width="36" height="24" viewBox="0 0 30 20" style={{ borderRadius: 4, boxShadow: '0 0 0 1px rgba(0,0,0,.08)' }}>{f[c]}</svg>;
}

export function CupPage() {
  const { world } = useStore();
  const followed = world.streams.filter((s) => stateOf(world, s.id) !== 'unfollowed').length;
  const remissions = world.events.filter((e) => e.kind === 'remission').length;
  const grades = world.streams.flatMap((s) => findingsOf(world, s.id).map((f) => f.grade));
  const schools = new Set(world.checkups.filter((c) => world.people.find((p) => p.id === c.authorId)?.kind === 'school').map((c) => c.streamId)).size;
  const rows = [
    { city: 'Toulouse', flag: 'FR', live: true, followed: Math.round((followed / world.streams.length) * 100), remissions, grade: averageGrade(grades), schools },
    { city: 'Coimbra', flag: 'PT', followed: 71, remissions: 3, grade: 'B' as const, schools: 4 },
    { city: 'Ghent', flag: 'BE', followed: 64, remissions: 2, grade: 'B' as const, schools: 3 },
    { city: 'Oslo', flag: 'NO', followed: 58, remissions: 2, grade: 'B' as const, schools: 2 },
    { city: 'Benevento', flag: 'IT', followed: 49, remissions: 1, grade: 'C' as const, schools: 3 },
  ];
  return (
    <div className="col" style={{ gap: 18, maxWidth: 900 }}>
      <div>
        <div className="kicker">Roadmap preview · season challenge</div>
        <h1>The Stream Cup</h1>
        <p className="muted" style={{ marginTop: 6 }}>
          The five OneAquaHealth research cities, compared on what matters — not raw volume, which would favour big cities: the share of streams followed this season, remissions obtained, the average quality of check-ups, and school participation.
        </p>
      </div>
      <div className="card" style={{ padding: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr className="tiny faint" style={{ textAlign: 'left' }}>
              <th style={{ padding: 12 }}>City</th><th>Streams followed</th><th>Remissions</th><th>Avg. grade</th><th>Schools</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.city} style={{ borderTop: '1px solid var(--line-2)' }}>
                <td style={{ padding: 12 }}>
                  <span className="row"><Flag c={r.flag} /> <b className="serif" style={{ fontSize: 18, color: 'var(--ink)' }}>{r.city}</b> {r.live ? <span className="pill real">live from this demo</span> : <span className="pill demo">illustrative</span>}</span>
                </td>
                <td><b>{r.followed}%</b></td>
                <td><b>{r.remissions}</b></td>
                <td><GradeChip g={r.grade} /></td>
                <td><b>{r.schools}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="note">Toulouse's row is computed from this demo's record. The four other rows are illustrative placeholders: the Cup is on the roadmap, not built. No individual ranking is ever shown.</div>
    </div>
  );
}
