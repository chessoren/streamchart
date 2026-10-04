import { useEffect } from 'react';
import { fmtDateTime } from '../domain/engine';
import { markRead } from '../domain/world';
import { PERSONA_PERSON, useStore } from '../ui/store';

export function InboxPage() {
  const { world, setWorld, settings } = useStore();
  const me = PERSONA_PERSON[settings.persona];
  const person = world.people.find((p) => p.id === me);
  const list = world.notices.filter((n) => n.toId === me).sort((a, b) => b.at.localeCompare(a.at));
  const unreadIds = new Set(list.filter((n) => !n.read).map((n) => n.id));
  useEffect(() => {
    const t = window.setTimeout(() => setWorld((w) => markRead(w, me)), 2500);
    return () => window.clearTimeout(t);
  }, [me, setWorld]);
  return (
    <div className="col" style={{ gap: 18, maxWidth: 760 }}>
      <div>
        <div className="kicker">{person?.name}'s inbox</div>
        <h1>What your check-ups changed.</h1>
        <p className="muted" style={{ marginTop: 6 }}>No points, no streaks. Just what happened because you looked.</p>
      </div>
      {list.length === 0 && <div className="note">Nothing yet. Take the pulse of a stream and you will hear back.</div>}
      {list.map((n) => {
        const s = world.streams.find((x) => x.id === n.streamId);
        return (
          <a key={n.id} href={`#/stream/${n.streamId}`} className={`notice ${unreadIds.has(n.id) ? 'unread' : ''}`}>
            {n.photo ? <img src={n.photo} alt="" /> : <img src={s?.photo} alt="" style={{ opacity: 0.6 }} />}
            <div className="grow">
              <div className="row between">
                <b className="serif" style={{ color: 'var(--ink)' }}>{s?.name}</b>
                <span className="tiny faint">{fmtDateTime(n.at)}</span>
              </div>
              <p style={{ marginTop: 4 }}>{n.text}</p>
              {n.demo && <span className="tiny faint">demonstration data</span>}
            </div>
          </a>
        );
      })}
    </div>
  );
}
