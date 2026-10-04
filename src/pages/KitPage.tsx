import QRCode from 'qrcode';
import { Printer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { STATE_LABEL, stateOf } from '../domain/engine';
import { Logo, StateBadge } from '../ui/kit';
import { useStore } from '../ui/store';

export function KitPage() {
  const { world } = useStore();
  const [streamId, setStreamId] = useState('trois-ponts');
  const [qr, setQr] = useState('');
  const s = world.streams.find((x) => x.id === streamId)!;
  const url = `${window.location.origin}${window.location.pathname}#/stream/${streamId}/checkup`;
  useEffect(() => {
    QRCode.toDataURL(url, { margin: 1, width: 360, color: { dark: '#12355B', light: '#FFFFFF' } }).then(setQr);
  }, [url]);
  return (
    <div className="col" style={{ gap: 20 }}>
      <div className="row between wrap noprint">
        <div>
          <div className="kicker">The physical world</div>
          <h1>A sign at the foot of every stream</h1>
          <p className="muted" style={{ marginTop: 6, maxWidth: 640 }}>Like the chart clipped to a hospital bed: the stream's name, its state, one line, and a code to scan. It also shows where to stand, so every photo is taken from the same viewpoint.</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <select value={streamId} onChange={(e) => setStreamId(e.target.value)} className="btn">
            {world.streams.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
          <button className="btn primary" onClick={() => window.print()}><Printer size={16} /> Print</button>
        </div>
      </div>
      <div className="grid2" style={{ alignItems: 'start' }}>
        <div className="sign">
          <div className="row between">
            <Logo size={56} />
            <StateBadge state={stateOf(world, streamId)} lg />
          </div>
          <div className="kicker">Patient file · {s.district}</div>
          <div className="big">{s.name}</div>
          <div className="serif" style={{ fontSize: 26, color: 'var(--ink-2)', lineHeight: 1.2 }}>This stream is a patient.<br />Take its pulse in one minute.</div>
          <div className="row" style={{ gap: 16, marginTop: 'auto', alignItems: 'flex-end' }}>
            {qr && <img src={qr} alt="QR code to the check-up" style={{ width: 150, height: 150 }} />}
            <div className="small muted">
              Scan, take one photo from this post, answer six questions.<br />
              Observe from the bank. Children with an adult.<br />
              <b style={{ color: 'var(--ink)' }}>Current state: {STATE_LABEL[stateOf(world, streamId)]}</b>
            </div>
          </div>
          <div className="tiny faint">StreamChart · a OneAquaHealth-compatible citizen science layer · EN / FR / PT / NL / NO / IT</div>
        </div>
        <div className="card col" style={{ gap: 10 }}>
          <div className="kicker">School kit · one page</div>
          <h2>Adopt a stream in a week</h2>
          <ol className="small" style={{ paddingLeft: 18, margin: 0, lineHeight: 1.7 }}>
            <li>Choose a stream near the school. Its chart becomes the class's, with the school's name on it.</li>
            <li>Four roles: <b>the photographer</b>, <b>the smell detective</b>, <b>the keeper of the file</b>, <b>the spokesperson</b>.</li>
            <li>45 minutes: 5 min safety on the bank, 10 min check-up, 15 min comparing with the AI, 15 min back in class.</li>
            <li>Three questions to discuss: Why does the stream sound sad or happy? What could we do? Who will look next?</li>
            <li>Open “Listen to the stream” in class and hear its voice change after your check-up.</li>
          </ol>
          <div className="note">Nothing to buy, nothing to install. Child language level on. Observation from the bank only; an adult accompanies.</div>
          <div className="kicker" style={{ marginTop: 6 }}>Check-up day</div>
          <p className="small">Once a season, a city can hold a check-up weekend: residents, schools and associations review every stream. By evening the city's health map is up to date, and the grey “not followed” streams get a state again.</p>
        </div>
      </div>
    </div>
  );
}
