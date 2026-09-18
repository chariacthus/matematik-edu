import type { Visual } from '../../types';
import { TONES } from './Visual';

type RectSpec = Extract<Visual, { kind: 'rect' }>;
type CircleSpec = Extract<Visual, { kind: 'circle' }>;
type AngleSpec = Extract<Visual, { kind: 'angles' }>;

/** Rektangel, eventuelt med tern så arealet kan tælles. */
export function RectFigure({ spec }: { spec: RectSpec }) {
  const W = 340;
  const H = 220;
  const pad = 34;
  const ratio = spec.w / Math.max(spec.h, 0.01);
  let bw = W - pad * 2;
  let bh = bw / ratio;
  if (bh > H - pad * 2) {
    bh = H - pad * 2;
    bw = bh * ratio;
  }
  const x = (W - bw) / 2;
  const y = (H - bh) / 2;
  // Ternene tegnes kun når de faktisk kan ses og tælles.
  const showGrid = spec.grid && spec.w <= 20 && spec.h <= 20 && spec.w * spec.h <= 150;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto w-full max-w-sm text-ink-500" role="img" aria-label="Rektangel">
      <rect x={x} y={y} width={bw} height={bh} fill={TONES.brand.soft} stroke={TONES.brand.fill} strokeWidth="2.5" rx="2" />
      {showGrid
        ? Array.from({ length: spec.w - 1 }, (_, i) => (
            <line key={`v${i}`} x1={x + ((i + 1) * bw) / spec.w} y1={y} x2={x + ((i + 1) * bw) / spec.w} y2={y + bh} stroke={TONES.brand.fill} strokeWidth="0.8" opacity="0.45" />
          ))
        : null}
      {showGrid
        ? Array.from({ length: spec.h - 1 }, (_, i) => (
            <line key={`h${i}`} x1={x} y1={y + ((i + 1) * bh) / spec.h} x2={x + bw} y2={y + ((i + 1) * bh) / spec.h} stroke={TONES.brand.fill} strokeWidth="0.8" opacity="0.45" />
          ))
        : null}
      {spec.labelW ? (
        <text x={x + bw / 2} y={y + bh + 22} textAnchor="middle" fontSize="13.5" fontWeight="600" fill="currentColor">
          {spec.labelW}
        </text>
      ) : null}
      {spec.labelH ? (
        <text x={x - 10} y={y + bh / 2 + 5} textAnchor="end" fontSize="13.5" fontWeight="600" fill="currentColor">
          {spec.labelH}
        </text>
      ) : null}
    </svg>
  );
}

/** Cirkel med radius, diameter eller omkreds markeret. */
export function CircleFigure({ spec }: { spec: CircleSpec }) {
  const W = 280;
  const H = 240;
  const cx = W / 2;
  const cy = H / 2;
  const r = 84;
  const show = spec.show ?? ['radius'];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto w-full max-w-xs text-ink-500" role="img" aria-label="Cirkel">
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={TONES.brand.soft}
        stroke={show.includes('circumference') ? TONES.accent.fill : TONES.brand.fill}
        strokeWidth={show.includes('circumference') ? 4 : 2.5}
      />
      <circle cx={cx} cy={cy} r="3.5" fill="currentColor" />

      {show.includes('radius') ? (
        <>
          <line x1={cx} y1={cy} x2={cx + r} y2={cy} stroke={TONES.brand.fill} strokeWidth="2.5" />
          <text x={cx + r / 2} y={cy - 9} textAnchor="middle" fontSize="13.5" fontWeight="700" fill={TONES.brand.text}>
            {spec.label ?? 'r'}
          </text>
        </>
      ) : null}

      {show.includes('diameter') ? (
        <>
          <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke={TONES.accent.fill} strokeWidth="2.5" strokeDasharray="6 4" />
          <text x={cx} y={cy + 22} textAnchor="middle" fontSize="13.5" fontWeight="700" fill={TONES.accent.text}>
            {spec.label ?? 'd'}
          </text>
        </>
      ) : null}
    </svg>
  );
}

/** Vinkelfigurer: en enkelt vinkel, to skærende linjer eller en trekant. */
export function AngleFigure({ spec }: { spec: AngleSpec }) {
  const W = 340;
  const H = 200;

  if (spec.type === 'lines' || spec.type === 'parallel') {
    const cx = W / 2;
    const cy = H / 2;
    const deg = spec.values[0] ?? 60;
    const rad = (deg * Math.PI) / 180;
    const L = 130;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto w-full max-w-sm text-ink-500" role="img" aria-label="To linjer der skærer hinanden">
        <line x1={cx - L} y1={cy} x2={cx + L} y2={cy} stroke="currentColor" strokeWidth="2.5" />
        <line
          x1={cx - L * Math.cos(rad)}
          y1={cy + L * Math.sin(rad)}
          x2={cx + L * Math.cos(rad)}
          y2={cy - L * Math.sin(rad)}
          stroke="currentColor"
          strokeWidth="2.5"
        />
        <path d={`M${cx + 34} ${cy} A 34 34 0 0 0 ${cx + 34 * Math.cos(rad)} ${cy - 34 * Math.sin(rad)}`} fill="none" stroke={TONES.brand.fill} strokeWidth="2.5" />
        <circle cx={cx} cy={cy} r="3.5" fill="currentColor" />
        {(spec.labels ?? []).map((lab, i) => {
          const positions = [
            { x: cx + 52, y: cy - 16 },
            { x: cx - 20, y: cy - 30 },
            { x: cx - 56, y: cy + 22 },
            { x: cx + 18, y: cy + 36 },
          ];
          const p = positions[i] ?? positions[0]!;
          return (
            <text key={i} x={p.x} y={p.y} fontSize="13.5" fontWeight="700" fill={i === 0 ? TONES.brand.text : 'currentColor'}>
              {lab}
            </text>
          );
        })}
      </svg>
    );
  }

  if (spec.type === 'triangle') {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto w-full max-w-sm text-ink-500" role="img" aria-label="Trekant med vinkler">
        <polygon points={`40,${H - 30} ${W - 40},${H - 30} ${W / 2 - 20},30`} fill={TONES.brand.soft} stroke={TONES.brand.fill} strokeWidth="2.5" />
        {(spec.labels ?? []).map((lab, i) => {
          const p = [
            { x: 56, y: H - 42 },
            { x: W - 68, y: H - 42 },
            { x: W / 2 - 22, y: 52 },
          ][i] ?? { x: 0, y: 0 };
          return (
            <text key={i} x={p.x} y={p.y} fontSize="13.5" fontWeight="700" fill="currentColor">
              {lab}
            </text>
          );
        })}
      </svg>
    );
  }

  // Enkelt vinkel med et ben vandret.
  const deg = spec.values[0] ?? 45;
  const rad = (deg * Math.PI) / 180;
  const ox = 60;
  const oy = H - 50;
  const L = 200;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto w-full max-w-sm text-ink-500" role="img" aria-label={`Vinkel på ${deg} grader`}>
      <line x1={ox} y1={oy} x2={ox + L} y2={oy} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1={ox} y1={oy} x2={ox + L * Math.cos(rad)} y2={oy - L * Math.sin(rad)} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d={`M${ox + 42} ${oy} A 42 42 0 0 0 ${ox + 42 * Math.cos(rad)} ${oy - 42 * Math.sin(rad)}`} fill="none" stroke={TONES.brand.fill} strokeWidth="2.5" />
      <text x={ox + 56} y={oy - 16} fontSize="14" fontWeight="700" fill={TONES.brand.text}>
        {spec.labels?.[0] ?? `${deg}°`}
      </text>
      {spec.labels?.[1] ? (
        <text x={ox + L - 30} y={oy - 14} fontSize="14" fontWeight="700" fill={TONES.accent.text}>
          {spec.labels[1]}
        </text>
      ) : null}
    </svg>
  );
}
