import {
  AlertTriangle, BrickWall, Check, Circle, CircleDot, Cloud, Droplet, Mountain, MoveRight, Palette, Pause, Sparkle, Sprout, Square, Trash, PackageOpen, TrendingDown, Trees, Turtle, Waves, Wind,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { CircleCheck, CircleAlert, Hourglass, CircleDashed } from 'lucide-react';
import { STATE_LABEL, gradeRules } from '../domain/engine';
import type { AiObservation, Grade, StreamState } from '../domain/types';

export function Logo({ size = 34, color = '#3B6EF6', stroke = 3, animate = false }: { size?: number; color?: string; stroke?: number; animate?: boolean }) {
  // A heartbeat that relaxes into a river meander: on the left the pulse, on the right the stream.
  const d = 'M4 34 H14 L19 22 L25 46 L31 12 L37 40 L41 30 C47 30 49 22 56 22 C64 22 64 42 72 42 C80 42 80 26 88 26 C93 26 95 30 96 32';
  return (
    <svg width={size} height={size * 0.62} viewBox="0 0 100 62" fill="none" aria-label="StreamChart">
      <path d={d} stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={animate ? { strokeDasharray: 240, strokeDashoffset: 240, animation: 'draw 2s ease forwards' } : undefined} />
      <style>{'@keyframes draw { to { stroke-dashoffset: 0; } }'}</style>
    </svg>
  );
}

export function StateBadge({ state, lg }: { state: StreamState; lg?: boolean }) {
  return (
    <span className={`badge ${state} ${lg ? 'lg' : ''}`}>
      {{ stable: <CircleCheck />, watch: <Hourglass />, alert: <CircleAlert />, unfollowed: <CircleDashed /> }[state]}
      {STATE_LABEL[state]}
    </span>
  );
}

export const STATE_COLOR: Record<StreamState, string> = { stable: '#22A06B', watch: '#E08A1E', alert: '#E5484D', unfollowed: '#A3B0C2' };

export function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <span className="brand-mark" style={{ width: size, height: size }}>
      <Logo size={size * 0.62} color="#3B6EF6" stroke={7} />
    </span>
  );
}

export function ConfBar({ g }: { g?: Grade }) {
  const w = g ? { A: 100, B: 74, C: 48, D: 24 }[g] : 0;
  return (
    <span className="conf">
      <span className="bar"><span style={{ width: `${w}%` }} /></span>
      {g ? <GradeChip g={g} /> : <span className="faint tiny">—</span>}
    </span>
  );
}

export function streamCode(id: string): string {
  const h = [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 9000, 7);
  return `SC-${1000 + h}`;
}

export function GradeChip({ g, title }: { g: Grade; title?: string }) {
  const rule = gradeRules().find((r) => r.grade === g)?.rule;
  return (
    <span className={`grade ${g}`} title={title ?? `Confidence grade ${g}: ${rule}`}>
      {g}
    </span>
  );
}

const ICONS: Record<string, ReactNode> = {
  droplet: <Droplet />, cloud: <Cloud />, palette: <Palette />, circle: <Circle />, 'circle-dot': <CircleDot />, waves: <Waves />, wind: <Wind />, sparkle: <Sparkle />, alert: <AlertTriangle />,
  'move-right': <MoveRight />, turtle: <Turtle />, pause: <Pause />, mountain: <Mountain />, 'trending-down': <TrendingDown />, brick: <BrickWall />, trees: <Trees />, sprout: <Sprout />, square: <Square />,
  check: <Check />, trash: <Trash />, 'trash-2': <PackageOpen />,
};
export const OptIcon = ({ name }: { name: string }) => <>{ICONS[name] ?? <Circle />}</>;

const AV_COLORS = ['#3b6ef6', '#22a06b', '#e08a1e', '#8b5cf6', '#e5484d', '#0ea5e9', '#64748b'];
export function Avatar({ name, size = 38 }: { name: string; size?: number }) {
  const h = [...name].reduce((s, c) => s + c.charCodeAt(0), 0);
  return (
    <span className="avatar" style={{ background: AV_COLORS[h % AV_COLORS.length], width: size, height: size, fontSize: size * 0.4 }}>
      {name.replace('Dr ', '').slice(0, 1)}
    </span>
  );
}

export function Pulse({ series, height = 86, markers = [], beats = [] }: { series: { t: number; v: number }[]; height?: number; markers?: { t: number; label: string }[]; beats?: number[] }) {
  if (series.length < 2) return null;
  const W = 600;
  const t0 = series[0].t;
  const t1 = series[series.length - 1].t;
  const x = (t: number) => ((t - t0) / (t1 - t0 || 1)) * W;
  const y = (v: number) => 8 + (1 - v) * (height - 20);
  // a heartbeat-like trace: small blips at each sample, smoothed between
  let d = `M 0 ${y(series[0].v)}`;
  series.forEach((p, i) => {
    if (!i) return;
    const prev = series[i - 1];
    const mx = (x(prev.t) + x(p.t)) / 2;
    d += ` C ${mx} ${y(prev.v)}, ${mx} ${y(p.v)}, ${x(p.t)} ${y(p.v)}`;
  });
  const last = series[series.length - 1];
  // each check-up is a heartbeat on the trace
  const valueAt = (t: number) => {
    const k = series.findIndex((p) => p.t >= t);
    return k <= 0 ? series[0].v : series[k].v;
  };
  const blips = beats
    .filter((t) => t >= t0 && t <= t1)
    .map((t) => {
      const bx = x(t);
      const by = y(valueAt(t));
      return `M ${bx - 7} ${by} L ${bx - 3} ${by - 14} L ${bx + 1} ${by + 10} L ${bx + 5} ${by - 4} L ${bx + 8} ${by}`;
    });
  return (
    <svg className="pulse" viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" style={{ height }}>
      <line x1="0" x2={W} y1={y(0.85)} y2={y(0.85)} stroke="#22A06B" strokeOpacity="0.25" strokeDasharray="4 6" />
      <line x1="0" x2={W} y1={y(0.18)} y2={y(0.18)} stroke="#E5484D" strokeOpacity="0.25" strokeDasharray="4 6" />
      {markers.map((m) => (
        <g key={m.label + m.t}>
          <line x1={x(m.t)} x2={x(m.t)} y1={4} y2={height - 4} stroke="#3B6EF6" strokeOpacity="0.35" />
        </g>
      ))}
      <path d={d} fill="none" stroke="#3B6EF6" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {blips.map((b, i) => (
        <path key={i} d={b} fill="none" stroke="#3B6EF6" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      ))}
      <circle cx={x(last.t)} cy={y(last.v)} r="5" fill="#3B6EF6" stroke="white" strokeWidth="2" />
    </svg>
  );
}

export function Stamp({ title, sub, tone = 'blue', animate }: { title: string; sub?: string; tone?: 'blue' | 'green'; animate?: boolean }) {
  return (
    <span className={`stamp ${tone} ${animate ? 'stamp-in' : ''}`}>
      {title}
      {sub && <small>{sub}</small>}
    </span>
  );
}

export function DemoPill({ children = 'Demonstration data' }: { children?: ReactNode }) {
  return <span className="pill demo">{children}</span>;
}

export function PhotoBoxes({ src, observations, show }: { src: string; observations: AiObservation[]; show: boolean }) {
  return (
    <div className="boxwrap">
      <img className="bigphoto" src={src} alt="Check-up" style={{ maxHeight: 'none' }} />
      {show &&
        observations
          .filter((o) => o.box)
          .map((o, i) => {
            const [y0, x0, y1, x1] = o.box!;
            return (
              <div key={i} className="aibox" style={{ top: `${y0 / 10}%`, left: `${x0 / 10}%`, width: `${(x1 - x0) / 10}%`, height: `${(y1 - y0) / 10}%`, animationDelay: `${0.2 + i * 0.25}s` }}>
                <span>{o.text}</span>
              </div>
            );
          })}
    </div>
  );
}

export function BeforeAfter({ before, after, labels = ['Before', 'After'] }: { before: string; after: string; labels?: [string, string] }) {
  return (
    <div className="ba" style={{ ['--x' as string]: '50%' }}>
      <img src={before} alt={labels[0]} />
      <img className="after" src={after} alt={labels[1]} />
      <div className="handle" />
      <span className="lab" style={{ left: 10 }}>{labels[0]}</span>
      <span className="lab" style={{ right: 10 }}>{labels[1]}</span>
      <input
        type="range"
        min={0}
        max={100}
        defaultValue={50}
        aria-label="Compare before and after"
        onInput={(e) => (e.currentTarget.parentElement as HTMLElement).style.setProperty('--x', `${(e.target as HTMLInputElement).value}%`)}
      />
    </div>
  );
}
