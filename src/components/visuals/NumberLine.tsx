import type { Visual } from '../../types';
import { TONES } from './Visual';

type Spec = Extract<Visual, { kind: 'numberLine' }>;

/** Tallinjen — til negative tal, decimaler og ulighedsintervaller. */
export function NumberLine({ spec }: { spec: Spec }) {
  const W = 460;
  const H = 96;
  const pad = 26;
  const span = spec.max - spec.min || 1;
  const x = (v: number) => pad + ((v - spec.min) / span) * (W - pad * 2);
  const axisY = 52;

  const ticks: number[] = [];
  const step = spec.step > 0 ? spec.step : 1;
  // Start på et rundt multiplum af step, så mærkerne ikke ser skæve ud.
  const first = Math.ceil(spec.min / step) * step;
  for (let v = first; v <= spec.max + 1e-9; v += step) ticks.push(Math.round(v * 1000) / 1000);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto w-full max-w-xl text-ink-500" role="img" aria-label="Tallinje">
      {/* Interval til uligheder */}
      {spec.interval ? (
        <rect
          x={x(spec.interval.from ?? spec.min)}
          y={axisY - 9}
          width={Math.max(0, x(spec.interval.to ?? spec.max) - x(spec.interval.from ?? spec.min))}
          height="18"
          fill={TONES.brand.fill}
          opacity="0.22"
          rx="3"
        />
      ) : null}

      {/* Aksen */}
      <line x1={pad - 10} y1={axisY} x2={W - pad + 10} y2={axisY} stroke="currentColor" strokeWidth="2" />
      <path d={`M${W - pad + 10} ${axisY} l-8 -5 v10 z`} fill="currentColor" />
      <path d={`M${pad - 10} ${axisY} l8 -5 v10 z`} fill="currentColor" />

      {ticks.map((v) => (
        <g key={v}>
          <line x1={x(v)} y1={axisY - 6} x2={x(v)} y2={axisY + 6} stroke="currentColor" strokeWidth={v === 0 ? 2.5 : 1.5} />
          <text x={x(v)} y={axisY + 24} textAnchor="middle" fontSize="12" fill="currentColor" opacity="0.8">
            {String(v).replace('.', ',')}
          </text>
        </g>
      ))}

      {/* Endepunkter for intervallet: åben eller lukket cirkel */}
      {spec.interval?.from !== null && spec.interval?.from !== undefined ? (
        <circle
          cx={x(spec.interval.from)}
          cy={axisY}
          r="7"
          fill={spec.interval.openFrom ? '#fff' : TONES.brand.fill}
          stroke={TONES.brand.fill}
          strokeWidth="2.5"
        />
      ) : null}
      {spec.interval?.to !== null && spec.interval?.to !== undefined ? (
        <circle
          cx={x(spec.interval.to)}
          cy={axisY}
          r="7"
          fill={spec.interval.openTo ? '#fff' : TONES.brand.fill}
          stroke={TONES.brand.fill}
          strokeWidth="2.5"
        />
      ) : null}

      {/* Markerede punkter */}
      {(spec.marks ?? []).map((m, i) => {
        const colors = TONES[m.tone ?? 'brand'];
        return (
          <g key={i}>
            <circle cx={x(m.value)} cy={axisY} r="6" fill={colors.fill} stroke="#fff" strokeWidth="2" />
            {m.label ? (
              <text x={x(m.value)} y={axisY - 14} textAnchor="middle" fontSize="12.5" fontWeight="700" fill={colors.fill}>
                {m.label}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
