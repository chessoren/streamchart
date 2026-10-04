import { stateOf } from '../domain/engine';
import type { World } from '../domain/types';
import { STATE_COLOR } from './kit';

// Schematic map of the Toulouse metropolitan area: the Garonne, the canals, and each
// followed stream drawn as a vein coloured by the patient's state.
export function CityMap({ world, highlight, onPick, compact }: { world: World; highlight?: string; onPick?: (id: string) => void; compact?: boolean }) {
  return (
    <div className="mapwrap">
      <svg viewBox="0 0 1000 640" role="img" aria-label="Map of the city's streams coloured by health state">
        <defs>
          <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" fill="#e1e7f0" />
          </pattern>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
        <rect width="1000" height="640" fill="#f7f9fc" />
        <rect width="1000" height="640" fill="url(#dots)" />
        {/* districts */}
        <path d="M300 180 C 380 140, 520 150, 600 210 C 660 260, 650 380, 580 430 C 500 480, 380 470, 320 410 C 270 350, 250 230, 300 180 Z" fill="#eef2f8" />
        <path d="M600 210 C 680 190, 760 230, 790 300 C 810 360, 760 420, 700 430 L 640 420 C 660 360, 650 260, 600 210 Z" fill="#f0f3f8" />
        <text x="455" y="320" textAnchor="middle" fontSize="15" fill="#9aa5b8" fontFamily="Inter Variable, sans-serif" fontStyle="italic">Toulouse centre</text>
        {/* parks */}
        <ellipse cx="460" cy="560" rx="90" ry="50" fill="#e6f5ec" />
        <ellipse cx="190" cy="380" rx="70" ry="40" fill="#e6f5ec" />
        <ellipse cx="820" cy="300" rx="70" ry="38" fill="#e6f5ec" />
        {/* Garonne */}
        <path d="M 150 640 C 260 560, 360 520, 380 430 S 400 280, 340 180 S 200 40, 120 0" fill="none" stroke="#d3e2fa" strokeWidth="34" strokeLinecap="round" />
        <path d="M 150 640 C 260 560, 360 520, 380 430 S 400 280, 340 180 S 200 40, 120 0" fill="none" stroke="#b3cbf3" strokeWidth="2" strokeDasharray="2 10" />
        <text x="300" y="560" fontSize="14" fill="#5b7fd6" fontFamily="Inter Variable, sans-serif" fontStyle="italic" transform="rotate(-38 300 560)">Garonne</text>
        {/* canals */}
        <path d="M 1000 470 C 840 470, 700 430, 590 400 S 420 350, 380 360" fill="none" stroke="#dbe6f7" strokeWidth="7" strokeLinecap="round" />
        <path d="M 380 360 C 360 300, 350 240, 340 180" fill="none" stroke="#dbe6f7" strokeWidth="6" strokeLinecap="round" />
        <text x="860" y="462" fontSize="12" fill="#7f97c9" fontStyle="italic">Canal du Midi</text>
        {world.streams.map((s) => {
          const st = stateOf(world, s.id);
          const hl = highlight === s.id;
          return (
            <g key={s.id} onClick={() => onPick?.(s.id)} style={{ cursor: onPick ? 'pointer' : 'default' }}>
              {(hl || st === 'alert') && <path d={s.path} stroke={STATE_COLOR[st]} strokeWidth={18} opacity={0.35} fill="none" filter="url(#glow)" />}
              <path className="stream-path" d={s.path} stroke="#ffffff" strokeWidth={hl ? 13 : 10} />
              <path className="stream-path" d={s.path} stroke={STATE_COLOR[st]} strokeWidth={hl ? 9 : 6.5} strokeDasharray={st === 'unfollowed' ? '2 9' : undefined}>
                <title>{s.name}</title>
              </path>
              {!compact && (
                <text className="map-label" x={s.label[0]} y={s.label[1] - 12} textAnchor="middle">
                  {s.name}
                  {st === 'unfollowed' ? ' ?' : ''}
                </text>
              )}
            </g>
          );
        })}
        <g transform="translate(24 600)" fontSize="13" fontFamily="Source Sans 3, sans-serif" fontWeight="600" fill="#374359">
          {(['stable', 'watch', 'alert', 'unfollowed'] as const).map((k, i) => (
            <g key={k} transform={`translate(${i * 128} 0)`}>
              <line x1="0" x2="22" y1="0" y2="0" stroke={STATE_COLOR[k]} strokeWidth="6" strokeLinecap="round" strokeDasharray={k === 'unfollowed' ? '2 7' : undefined} />
              <text x="30" y="4">{{ stable: 'Stable', watch: 'Under watch', alert: 'Alert', unfollowed: 'Not followed' }[k]}</text>
            </g>
          ))}
        </g>
        <text x="976" y="626" textAnchor="end" fontSize="11" fill="#9aa5b8">Schematic map · Toulouse Métropole</text>
      </svg>
    </div>
  );
}
