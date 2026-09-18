import type { Visual } from '../../types';
import { TONES } from './Visual';

type Spec = Extract<Visual, { kind: 'fractionBar' }>;

/**
 * Brøkbjælker. Alle bjælker har samme totale bredde — det er hele
 * pointen: så kan man SE at 1/3 er større end 1/8, selvom 8 er et
 * større tal.
 */
export function FractionBar({ spec }: { spec: Spec }) {
  const rowH = 40;
  const gap = 14;
  const width = 360;
  const labelW = 62;
  const height = spec.rows.length * (rowH + gap);

  return (
    <svg
      viewBox={`0 0 ${width + labelW} ${height}`}
      className="mx-auto h-auto w-full max-w-lg text-ink-500"
      role="img"
      aria-label="Brøker vist som bjælker"
    >
      {spec.rows.map((row, r) => {
        const colors = TONES[row.tone ?? (r === 0 ? 'brand' : r === 1 ? 'accent' : 'warn')];
        const cellW = width / row.den;
        const y = r * (rowH + gap);
        return (
          <g key={r}>
            {Array.from({ length: row.den }, (_, i) => (
              <rect
                key={i}
                x={i * cellW}
                y={y}
                width={cellW - 2}
                height={rowH}
                rx="3"
                fill={i < row.num ? colors.fill : 'transparent'}
                stroke={colors.text}
                strokeWidth="1.5"
                opacity={i < row.num ? 1 : 0.35}
              />
            ))}
            <text x={width + 8} y={y + rowH / 2 + 5} fontSize="15" fontWeight="600" fill="currentColor">
              {row.label ?? `${row.num}/${row.den}`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
