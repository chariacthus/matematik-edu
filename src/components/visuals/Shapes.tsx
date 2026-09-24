import type { Visual } from '../../types';
import { TONES, LINE, LABEL, GRID } from './Visual';

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
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto w-full max-w-sm" role="img" aria-label="Rektangel">
      <rect x={x} y={y} width={bw} height={bh} fill={TONES.brand.soft} stroke={LINE} strokeWidth="2" rx="1" />
      {showGrid
        ? Array.from({ length: spec.w - 1 }, (_, i) => (
            <line key={`v${i}`} x1={x + ((i + 1) * bw) / spec.w} y1={y} x2={x + ((i + 1) * bw) / spec.w} y2={y + bh} stroke={GRID} strokeWidth="1" />
          ))
        : null}
      {showGrid
        ? Array.from({ length: spec.h - 1 }, (_, i) => (
            <line key={`h${i}`} x1={x} y1={y + ((i + 1) * bh) / spec.h} x2={x + bw} y2={y + ((i + 1) * bh) / spec.h} stroke={GRID} strokeWidth="1" />
          ))
        : null}
      {spec.labelW ? (
        <text x={x + bw / 2} y={y + bh + 22} textAnchor="middle" fontSize="13.5" fontWeight="600" fill={LABEL}>
          {spec.labelW}
        </text>
      ) : null}
      {spec.labelH ? (
        <text x={x - 10} y={y + bh / 2 + 5} textAnchor="end" fontSize="13.5" fontWeight="600" fill={LABEL}>
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
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto w-full max-w-xs" role="img" aria-label="Cirkel">
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={TONES.brand.soft}
        stroke={show.includes('circumference') ? TONES.accent.fill : LINE}
        strokeWidth={show.includes('circumference') ? 3 : 2}
      />
      <circle cx={cx} cy={cy} r="3.5" fill={LABEL} />

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

/** Bue mellem to vinkler set fra et toppunkt. SVG har y nedad, derfor sweep 0. */
function arcPath(cx: number, cy: number, r: number, from: number, to: number) {
  const x1 = cx + r * Math.cos(from);
  const y1 = cy - r * Math.sin(from);
  const x2 = cx + r * Math.cos(to);
  const y2 = cy - r * Math.sin(to);
  const large = Math.abs(to - from) > Math.PI ? 1 : 0;
  return `M${x1} ${y1} A ${r} ${r} 0 ${large} 0 ${x2} ${y2}`;
}

/** Markering af en vinkel: bue, eller det lille kvadrat ved præcis 90°. */
function AngleMark({ cx, cy, from, to, r = 30 }: { cx: number; cy: number; from: number; to: number; r?: number }) {
  const span = Math.abs(to - from);
  if (Math.abs(span - Math.PI / 2) < 0.001) {
    const m = 13;
    const u = { x: Math.cos(from), y: -Math.sin(from) };
    const v = { x: Math.cos(to), y: -Math.sin(to) };
    return (
      <path
        d={`M${cx + u.x * m} ${cy + u.y * m} L${cx + (u.x + v.x) * m} ${cy + (u.y + v.y) * m} L${cx + v.x * m} ${cy + v.y * m}`}
        fill="none"
        stroke={TONES.brand.fill}
        strokeWidth="2"
      />
    );
  }
  // Buen svinges op fra det faste ben. Det er ikke pynt: man ser vinklen
  // blive målt, i den retning man selv ville måle den med en vinkelmåler.
  const len = Math.abs(to - from) * r;
  return (
    <path
      d={arcPath(cx, cy, r, from, to)}
      fill="none"
      stroke={TONES.brand.fill}
      strokeWidth="2"
      strokeDasharray={len}
      className="animate-arc-draw"
      style={{ ['--arc-len' as string]: len }}
    />
  );
}

/** Tekst placeret på vinklens halveringslinje, så den altid ligger i vinklen. */
function AngleLabel({
  cx,
  cy,
  from,
  to,
  r,
  children,
  fill = TONES.brand.text,
}: {
  cx: number;
  cy: number;
  from: number;
  to: number;
  r: number;
  children: string;
  fill?: string;
}) {
  const mid = (from + to) / 2;
  return (
    <text
      x={cx + r * Math.cos(mid)}
      y={cy - r * Math.sin(mid)}
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize="13.5"
      fontWeight="700"
      fill={fill}
    >
      {children}
    </text>
  );
}

/** Vinkelfigurer: en enkelt vinkel, to skærende linjer, parallelle linjer eller en trekant. */
export function AngleFigure({ spec }: { spec: AngleSpec }) {
  const W = 340;
  const H = 210;
  const labels = spec.labels ?? [];

  if (spec.type === 'lines') {
    const cx = W / 2;
    const cy = H / 2;
    const deg = spec.values[0] ?? 60;
    const rad = (deg * Math.PI) / 180;
    const L = 132;
    // De fire vinkler mellem linjerne, med uret fra den vandrette.
    const sectors: [number, number][] = [
      [0, rad],
      [rad, Math.PI],
      [Math.PI, Math.PI + rad],
      [Math.PI + rad, 2 * Math.PI],
    ];
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto w-full max-w-sm" role="img" aria-label="To linjer der skærer hinanden">
        <line x1={cx - L} y1={cy} x2={cx + L} y2={cy} stroke={LINE} strokeWidth="2" strokeLinecap="round" />
        <line
          x1={cx - L * Math.cos(rad)}
          y1={cy + L * Math.sin(rad)}
          x2={cx + L * Math.cos(rad)}
          y2={cy - L * Math.sin(rad)}
          stroke={LINE}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <AngleMark cx={cx} cy={cy} from={0} to={rad} r={32} />
        <circle cx={cx} cy={cy} r="3" fill={LINE} />
        {sectors.map(([from, to], i) =>
          labels[i] ? (
            <AngleLabel key={i} cx={cx} cy={cy} from={from} to={to} r={i === 0 ? 52 : 62} fill={i === 0 ? TONES.brand.text : LABEL}>
              {labels[i]!}
            </AngleLabel>
          ) : null,
        )}
      </svg>
    );
  }

  if (spec.type === 'parallel') {
    const deg = spec.values[0] ?? 62;
    const rad = (deg * Math.PI) / 180;
    const yTop = 60;
    const yBot = 150;
    // Transversalen skærer de to parallelle linjer; skæringspunkterne
    // følger hældningen, så figuren er geometrisk rigtig.
    const dx = (yBot - yTop) / Math.tan(rad);
    const xBot = W / 2 - dx / 2;
    const xTop = xBot + dx;
    const ext = 78;
    const tick = (x: number, y: number) =>
      [0, 1].map((k) => <path key={k} d={`M${x - 6 + k * 9} ${y - 6} l6 6 l-6 6`} fill="none" stroke={LINE} strokeWidth="1.6" />);
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto w-full max-w-sm" role="img" aria-label="To parallelle linjer skåret af en tværlinje">
        <line x1={24} y1={yTop} x2={W - 24} y2={yTop} stroke={LINE} strokeWidth="2" strokeLinecap="round" />
        <line x1={24} y1={yBot} x2={W - 24} y2={yBot} stroke={LINE} strokeWidth="2" strokeLinecap="round" />
        {tick(W - 70, yTop)}
        {tick(W - 70, yBot)}
        <line
          x1={xBot - ext * Math.cos(rad)}
          y1={yBot + ext * Math.sin(rad)}
          x2={xTop + ext * Math.cos(rad)}
          y2={yTop - ext * Math.sin(rad)}
          stroke={LINE}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <AngleMark cx={xTop} cy={yTop} from={0} to={rad} r={28} />
        <circle cx={xTop} cy={yTop} r="3" fill={LINE} />
        <circle cx={xBot} cy={yBot} r="3" fill={LINE} />
        {labels[0] ? (
          <AngleLabel cx={xTop} cy={yTop} from={0} to={rad} r={48}>
            {labels[0]}
          </AngleLabel>
        ) : null}
        {labels[1] ? (
          <AngleLabel cx={xBot} cy={yBot} from={0} to={rad} r={48} fill={LABEL}>
            {labels[1]}
          </AngleLabel>
        ) : null}
        {labels[2] ? (
          <AngleLabel cx={xBot} cy={yBot} from={Math.PI + rad} to={2 * Math.PI} r={48} fill={LABEL}>
            {labels[2]}
          </AngleLabel>
        ) : null}
      </svg>
    );
  }

  if (spec.type === 'triangle') {
    const A = { x: 52, y: H - 40 };
    const B = { x: W - 52, y: H - 40 };
    const C = { x: W / 2 + 26, y: 34 };
    const at = (p: { x: number; y: number }, q: { x: number; y: number }) => Math.atan2(p.y - q.y, q.x - p.x);
    const corners: { p: { x: number; y: number }; from: number; to: number }[] = [
      { p: A, from: at(A, B), to: at(A, C) },
      { p: B, from: at(B, C), to: at(B, A) },
      { p: C, from: at(C, A), to: at(C, B) },
    ];
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto w-full max-w-sm" role="img" aria-label="Trekant med vinkler">
        <polygon points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`} fill={TONES.brand.soft} stroke={LINE} strokeWidth="2" strokeLinejoin="round" />
        {corners.map((c, i) => (
          <AngleMark key={i} cx={c.p.x} cy={c.p.y} from={c.from} to={c.to} r={26} />
        ))}
        {corners.map((c, i) =>
          labels[i] ? (
            <AngleLabel key={`l${i}`} cx={c.p.x} cy={c.p.y} from={c.from} to={c.to} r={44}>
              {labels[i]!}
            </AngleLabel>
          ) : null,
        )}
      </svg>
    );
  }

  if (spec.type === 'straight') {
    // To nabovinkler på en ret linje, som de tegnes på et opgaveark: den
    // kendte med sit gradtal, den ukendte med et bogstav.
    const deg = spec.values[0] ?? 60;
    const rad = (deg * Math.PI) / 180;
    const cx = W / 2;
    const cy = H - 52;
    const L = 150;
    const ray = 132;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto w-full max-w-sm" role="img" aria-label="To nabovinkler på en ret linje">
        <line x1={cx - L} y1={cy} x2={cx + L} y2={cy} stroke={LINE} strokeWidth="2" strokeLinecap="round" />
        <line x1={cx} y1={cy} x2={cx + ray * Math.cos(rad)} y2={cy - ray * Math.sin(rad)} stroke={LINE} strokeWidth="2" strokeLinecap="round" />
        <AngleMark cx={cx} cy={cy} from={0} to={rad} r={34} />
        <AngleMark cx={cx} cy={cy} from={rad} to={Math.PI} r={26} />
        <circle cx={cx} cy={cy} r="3" fill={LINE} />
        {labels[0] ? (
          <AngleLabel cx={cx} cy={cy} from={0} to={rad} r={58}>
            {labels[0]}
          </AngleLabel>
        ) : null}
        {labels[1] ? (
          <AngleLabel cx={cx} cy={cy} from={rad} to={Math.PI} r={50}>
            {labels[1]}
          </AngleLabel>
        ) : null}
      </svg>
    );
  }

  const deg = spec.values[0] ?? 45;
  const rad = (deg * Math.PI) / 180;
  const ox = 62;
  const oy = H - 46;
  const L = 208;
  // Stumpe vinkler skal have en mindre bue for at holde sig inde i
  // figuren; spidse en større, så tallet ikke klemmes sammen i spidsen.
  const arcR = deg < 30 ? 54 : deg > 140 ? 32 : 42;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto w-full max-w-sm" role="img" aria-label="Vinkel">
      <line x1={ox} y1={oy} x2={ox + L} y2={oy} stroke={LINE} strokeWidth="2" strokeLinecap="round" />
      <line x1={ox} y1={oy} x2={ox + L * Math.cos(rad)} y2={oy - L * Math.sin(rad)} stroke={LINE} strokeWidth="2" strokeLinecap="round" />
      <AngleMark cx={ox} cy={oy} from={0} to={rad} r={arcR} />
      <circle cx={ox} cy={oy} r="3" fill={LINE} />
      {labels[0] ? (
        <AngleLabel cx={ox} cy={oy} from={0} to={rad} r={arcR + 24}>
          {labels[0]}
        </AngleLabel>
      ) : null}
      {labels[1] ? (
        <text x={ox + L - 4} y={oy + 20} textAnchor="end" fontSize="13.5" fontWeight="700" fill={LABEL}>
          {labels[1]}
        </text>
      ) : null}
    </svg>
  );
}
