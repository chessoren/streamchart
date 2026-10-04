import { ChevronLeft, Pause, Volume2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { fmtDateTime, personName, voiceOf } from '../domain/engine';
import type { Register } from '../domain/types';
import { useStore } from '../ui/store';

export function WaterCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext('2d')!;
    let raf = 0;
    const draw = (t: number) => {
      const w = (c.width = c.clientWidth * devicePixelRatio);
      const h = (c.height = c.clientHeight * devicePixelRatio);
      ctx.clearRect(0, 0, w, h);
      for (let k = 0; k < 7; k++) {
        ctx.beginPath();
        const y0 = h * (0.35 + k * 0.1);
        for (let x = 0; x <= w; x += 8) {
          const y = y0 + Math.sin(x / (140 + k * 30) + t / (1600 + k * 300) + k) * (10 + k * 3) * devicePixelRatio;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(170, 205, 235, ${0.1 + k * 0.035})`;
        ctx.lineWidth = 1.5 * devicePixelRatio;
        ctx.stroke();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} />;
}

export function VoicePage({ streamId }: { streamId: string }) {
  const { world, settings, setSettings } = useStore();
  const s = world.streams.find((x) => x.id === streamId)!;
  const [reg, setReg] = useState<Register>(settings.register);
  const [sel, setSel] = useState<number | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const lines = voiceOf(world, streamId, reg);
  const speak = () => {
    if (!('speechSynthesis' in window)) return;
    if (speaking) {
      speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(lines.map((l) => l.text).join(' '));
    u.rate = 0.88;
    u.pitch = 0.95;
    u.onend = () => setSpeaking(false);
    speechSynthesis.speak(u);
    setSpeaking(true);
  };
  useEffect(() => () => speechSynthesis?.cancel(), []);
  const sources = sel !== null ? lines[sel].sources : [];
  return (
    <div className="col" style={{ gap: 16 }}>
      <a href={`#/stream/${streamId}`} className="row small muted" style={{ gap: 4 }}>
        <ChevronLeft size={16} /> {s.name}'s chart
      </a>
      <div className="voice">
        <WaterCanvas />
        <div className="row between" style={{ position: 'relative', marginBottom: 26 }}>
          <span className="kicker" style={{ color: 'rgba(255,255,255,0.7)' }}>{s.name} speaks</span>
          <div className="seg" style={{ background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)' }}>
            {(['child', 'curious', 'expert'] as Register[]).map((r) => (
              <button key={r} className={reg === r ? 'on' : ''} style={reg === r ? {} : { color: 'rgba(255,255,255,0.75)' }} onClick={() => { setReg(r); setSettings({ register: r }); }}>
                {r === 'child' ? 'Child' : r === 'curious' ? 'Curious' : 'Expert'}
              </button>
            ))}
          </div>
        </div>
        <div className="lines" key={reg}>
          {lines.map((l, i) => (
            <div key={i} className={`vl ${sel === i ? 'on' : ''}`} style={{ animationDelay: `${0.4 + i * 1.3}s`, padding: '4px 8px', margin: '0 -8px' }} onClick={() => setSel(sel === i ? null : i)}>
              “{l.text}”
            </div>
          ))}
        </div>
        <div className="row" style={{ position: 'relative', marginTop: 28, gap: 10 }}>
          <button className="btn" onClick={speak} style={{ background: 'rgba(255,255,255,0.12)', color: 'white', borderColor: 'rgba(255,255,255,0.25)' }}>
            {speaking ? <Pause size={16} /> : <Volume2 size={16} />} {speaking ? 'Stop' : 'Read aloud'}
          </button>
          <span className="small" style={{ opacity: 0.7 }}>Touch a sentence to see what it is based on.</span>
        </div>
      </div>
      <div className="card">
        <h3>Where each sentence comes from</h3>
        {sel === null ? (
          <p className="small muted" style={{ marginTop: 6 }}>
            The stream only says what its record contains. If it has no data, it says so. It never names a culprit, never gives health or bathing advice, and never says the water is safe.
          </p>
        ) : sources.length === 0 ? (
          <p className="small muted" style={{ marginTop: 6 }}>This sentence states an absence of data or an invitation — it is not based on an observation.</p>
        ) : (
          <div className="col" style={{ marginTop: 8, gap: 6 }}>
            {sources.map((id) => {
              const c = world.checkups.find((x) => x.id === id);
              const p = world.plans.find((x) => x.id === id);
              const e = world.events.find((x) => x.id === id);
              if (id === 'forecast') return <div key={id} className="small">7-day forecast ({world.forecast?.source === 'open-meteo' ? 'Open-Meteo, live' : 'simulated heatwave'})</div>;
              if (c) return <div key={id} className="small">Check-up by {personName(world, c.authorId)}, {fmtDateTime(c.at)}</div>;
              if (p) return <div key={id} className="small">Care plan signed by {personName(world, p.signedBy)}{p.signedAt ? `, ${fmtDateTime(p.signedAt)}` : ''}</div>;
              if (e) return <div key={id} className="small">{e.title}, {fmtDateTime(e.at)}</div>;
              return null;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
