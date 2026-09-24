import type { Visual } from '../../types';
import { TONES, LINE, LABEL } from './Visual';
import { num } from '../../lib/math';

type BarSpec = Extract<Visual, { kind: 'barChart' }>;
type BoxSpec = Extract<Visual, { kind: 'boxPlot' }>;
type PieSpec = Extract<Visual, { kind: 'pie' }>;
type DotSpec = Extract<Visual, { kind: 'dotPlot' }>;
type PercentSpec = Extract<Visual, { kind: 'percentBar' }>;
type TreeSpec = Extract<Visual, { kind: 'probTree' }>;

export type FigureMode = 'teach' | 'problem';

/**
 * Diagrammerne til statistik og sandsynlighed.
 *
 * I en forklaring står værdierne på figuren, så eleven kan tjekke sin
 * aflæsning. I en opgave gør de ikke: der aflæses på aksen, som til
 * prøven, og tallet der spørges om, står ikke skrevet.
 */

/** Et pænt trin mellem akseinddelingerne: 1, 2, 5, 10, 20, 25, 50 … */
function niceStep(span: number, target = 6): number {
  const raw = Math.max(span, 1) / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const f = raw / mag;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
}

/** Hvor ofte en inddeling får et tal, så der højst står omkring ti. */
function labelEvery(count: number): number {
  return [1, 2, 5, 10].find((n) => count / n <= 10) ?? 10;
}

export function BarChart({ spec, mode = 'teach' }: { spec: BarSpec; mode?: FigureMode }) {
  const W = 400;
  const H = 240;
  const padL = 42;
  const padB = 46;
  const padT = 18;
  const peak = Math.max(...spec.data.map((d) => d.value), 1);
  const problem = mode === 'problem';
  const step = spec.step ?? (problem ? niceStep(peak) : peak / 4);
  const top = problem ? Math.ceil(peak / step) * step : peak;
  const lines = Math.round(top / step);
  const every = problem ? labelEvery(lines) : 1;
  const bw = (W - padL - 16) / spec.data.length;
  const scale = (v: number) => ((H - padB - padT) * v) / top;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto w-full max-w-md" role="img" aria-label="Søjlediagram">
      {Array.from({ length: lines + 1 }, (_, i) => {
        const v = step * i;
        const y = H - padB - scale(v);
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={W - 8} y2={y} stroke={LINE} strokeWidth="1" opacity={problem ? 0.22 : 0.16} />
            {i % every === 0 ? (
              <text x={padL - 7} y={y + 4} textAnchor="end" fontSize="10.5" fill={LABEL} opacity="0.8">
                {num(Math.round(v * 100) / 100)}
              </text>
            ) : null}
          </g>
        );
      })}
      <line x1={padL} y1={padT - 6} x2={padL} y2={H - padB} stroke={LINE} strokeWidth="1.5" />
      <line x1={padL} y1={H - padB} x2={W - 8} y2={H - padB} stroke={LINE} strokeWidth="2" />

      {spec.data.map((d, i) => {
        const h = scale(d.value);
        const x = padL + i * bw + bw * 0.16;
        const w = bw * 0.68;
        return (
          <g key={d.label}>
            <rect x={x} y={H - padB - h} width={w} height={h} rx="2" fill={TONES.brand.fill} opacity={0.88} />
            {problem ? null : (
              <text x={x + w / 2} y={H - padB - h - 6} textAnchor="middle" fontSize="11" fontWeight="700" fill={TONES.brand.text}>
                {num(d.value)}
              </text>
            )}
            <text x={x + w / 2} y={H - padB + 16} textAnchor="middle" fontSize="10.5" fill={LABEL}>
              {d.label.length > 9 ? `${d.label.slice(0, 8)}.` : d.label}
            </text>
          </g>
        );
      })}
      {spec.yLabel ? (
        <text x={6} y={12} fontSize="10.5" fill={LABEL} opacity="0.8">
          {spec.yLabel}
        </text>
      ) : null}
    </svg>
  );
}

export function BoxPlot({ spec, mode = 'teach' }: { spec: BoxSpec; mode?: FigureMode }) {
  const W = 420;
  const pad = 34;
  const problem = mode === 'problem';
  // I en opgave står boksplottet over en tallinje, og værdierne aflæses
  // på den. I en forklaring står de fem tal direkte ved figuren.
  const step = spec.step ?? niceStep(spec.max - spec.min, 10);
  // Tallene på aksen står på runde værdier (0, 4, 8 …), og aksen går ikke
  // under nul når data ikke gør.
  const every = labelEvery(Math.round((spec.max - spec.min) / step) + 2);
  const major = step * every;
  const lo = problem ? Math.max(spec.min >= 0 ? 0 : -Infinity, Math.floor((spec.min - step) / major) * major) : spec.min;
  const hi = problem ? Math.ceil((spec.max + step) / major) * major : spec.max;
  const H = problem ? 142 : 150;
  const span = hi - lo || 1;
  const x = (v: number) => pad + ((v - lo) / span) * (W - pad * 2);
  const cy = problem ? 52 : 62;
  const boxT = cy - 26;
  const boxH = 52;
  const axisY = cy + 48;
  const ticks = Math.round(span / step);

  const marks: [number, string][] = [
    [spec.min, 'min'],
    [spec.q1, 'Q₁'],
    [spec.median, 'md'],
    [spec.q3, 'Q₃'],
    [spec.max, 'max'],
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto w-full max-w-lg" role="img" aria-label="Boksplot">
      {/* Hale */}
      <line x1={x(spec.min)} y1={cy} x2={x(spec.q1)} y2={cy} stroke={LINE} strokeWidth="2" />
      <line x1={x(spec.q3)} y1={cy} x2={x(spec.max)} y2={cy} stroke={LINE} strokeWidth="2" />
      <line x1={x(spec.min)} y1={cy - 14} x2={x(spec.min)} y2={cy + 14} stroke={LINE} strokeWidth="2.5" />
      <line x1={x(spec.max)} y1={cy - 14} x2={x(spec.max)} y2={cy + 14} stroke={LINE} strokeWidth="2.5" />

      {/* Kassen */}
      <rect x={x(spec.q1)} y={boxT} width={Math.max(2, x(spec.q3) - x(spec.q1))} height={boxH} rx="2" fill={TONES.brand.soft} stroke={TONES.brand.fill} strokeWidth="2.5" />
      <line x1={x(spec.median)} y1={boxT} x2={x(spec.median)} y2={boxT + boxH} stroke={TONES.accent.fill} strokeWidth="3.5" />

      {problem ? (
        <g>
          <line x1={x(lo)} y1={axisY} x2={x(hi)} y2={axisY} stroke={LINE} strokeWidth="1.5" />
          {Array.from({ length: ticks + 1 }, (_, i) => {
            const v = lo + i * step;
            const big = Math.abs(Math.round(v / step)) % every === 0;
            return (
              <g key={i}>
                <line x1={x(v)} y1={axisY} x2={x(v)} y2={axisY + (big ? 7 : 4)} stroke={LINE} strokeWidth={big ? 1.5 : 1} />
                {big ? (
                  <text x={x(v)} y={axisY + 21} textAnchor="middle" fontSize="11" fill={LABEL}>
                    {num(Math.round(v * 100) / 100)}
                  </text>
                ) : null}
              </g>
            );
          })}
        </g>
      ) : (
        marks.map(([v, label], i) => (
          <g key={i}>
            <text x={x(v)} y={cy + 40} textAnchor="middle" fontSize="11.5" fontWeight="600" fill={LABEL}>
              {num(v)}
            </text>
            <text x={x(v)} y={boxT - 8} textAnchor="middle" fontSize="10" fill={LABEL} opacity="0.7">
              {label}
            </text>
          </g>
        ))
      )}
    </svg>
  );
}

export function PieChart({ spec }: { spec: PieSpec }) {
  const W = 320;
  const H = 230;
  const cx = 110;
  const cy = H / 2;
  const r = 82;
  const total = spec.slices.reduce((a, b) => a + b.value, 0) || 1;
  const palette = [TONES.brand.fill, TONES.accent.fill, TONES.warn.fill, TONES.bad.fill, TONES.good.fill];

  let angle = -Math.PI / 2;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto w-full max-w-sm" role="img" aria-label="Cirkeldiagram">
      {spec.slices.map((s, i) => {
        const sweep = (s.value / total) * Math.PI * 2;
        const x1 = cx + r * Math.cos(angle);
        const y1 = cy + r * Math.sin(angle);
        angle += sweep;
        const x2 = cx + r * Math.cos(angle);
        const y2 = cy + r * Math.sin(angle);
        const large = sweep > Math.PI ? 1 : 0;
        return (
          <path
            key={i}
            d={`M${cx} ${cy} L${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`}
            fill={palette[i % palette.length]}
            stroke="#fff"
            strokeWidth="2"
          />
        );
      })}
      {spec.slices.map((s, i) => (
        <g key={`l${i}`}>
          <rect x={218} y={40 + i * 24} width="12" height="12" rx="3" fill={palette[i % palette.length]} />
          <text x={236} y={50 + i * 24} fontSize="11.5" fill={LABEL}>
            {s.label} ({Math.round((s.value / total) * 100)} %)
          </text>
        </g>
      ))}
    </svg>
  );
}

export function DotPlot({ spec }: { spec: DotSpec }) {
  const W = 420;
  const H = 150;
  const pad = 30;
  const lo = Math.min(...spec.values);
  const hi = Math.max(...spec.values);
  const span = hi - lo || 1;
  const x = (v: number) => pad + ((v - lo) / span) * (W - pad * 2);
  const baseY = 100;

  // Stabl prikker når den samme værdi optræder flere gange.
  const stacks = new Map<number, number>();

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto w-full max-w-lg" role="img" aria-label="Prikdiagram over datasættet">
      <line x1={pad - 10} y1={baseY} x2={W - pad + 10} y2={baseY} stroke={LINE} strokeWidth="2" />
      {[...new Set(spec.values)].sort((a, b) => a - b).map((v) => (
        <g key={`t${v}`}>
          <line x1={x(v)} y1={baseY - 4} x2={x(v)} y2={baseY + 5} stroke={LINE} strokeWidth="1.5" />
          <text x={x(v)} y={baseY + 22} textAnchor="middle" fontSize="11" fill={LABEL} opacity="0.85">
            {num(v)}
          </text>
        </g>
      ))}
      {spec.values.map((v, i) => {
        const n = stacks.get(v) ?? 0;
        stacks.set(v, n + 1);
        return <circle key={i} cx={x(v)} cy={baseY - 12 - n * 15} r="6" fill={TONES.brand.fill} stroke="#fff" strokeWidth="1.5" />;
      })}
    </svg>
  );
}

export function PercentBar({ spec, mode = 'teach' }: { spec: PercentSpec; mode?: FigureMode }) {
  const W = 400;
  const H = 96;
  const pad = 14;
  const barW = W - pad * 2;
  const frac = Math.max(0, Math.min(1, spec.part / (spec.whole || 1)));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto w-full max-w-md" role="img" aria-label="Andel af en helhed">
      <rect x={pad} y={28} width={barW} height={34} rx="6" fill={LABEL} opacity="0.13" />
      <rect x={pad} y={28} width={barW * frac} height={34} rx="6" fill={TONES.brand.fill} />
      <text x={pad} y={20} fontSize="12" fontWeight="600" fill={TONES.brand.text}>
        {spec.partLabel ?? num(spec.part)}
      </text>
      <text x={W - pad} y={20} textAnchor="end" fontSize="12" fill={LABEL} opacity="0.8">
        {spec.wholeLabel ?? num(spec.whole)}
      </text>
      {mode === 'problem' ? null : (
        <text x={pad + barW * frac} y={80} textAnchor={frac > 0.85 ? 'end' : 'middle'} fontSize="12.5" fontWeight="700" fill={TONES.brand.text}>
          {num(Math.round(frac * 1000) / 10)} %
        </text>
      )}
    </svg>
  );
}

export function ProbTree({ spec }: { spec: TreeSpec }) {
  const W = 400;
  const H = 240;
  const levelW = (W - 90) / Math.max(1, spec.levels.length);

  // Vi tegner kun de to første niveauer — dybere træer bliver ulæselige
  // på en telefon, og opgaverne har aldrig brug for flere.
  const first = spec.levels[0];
  const second = spec.levels[1];
  if (!first) return null;

  const rootX = 40;
  const rootY = H / 2;
  const firstXs = 40 + levelW;
  const n1 = first.branches.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto w-full max-w-md" role="img" aria-label="Tælletræ">
      <circle cx={rootX} cy={rootY} r="6" fill={LABEL} />
      {first.branches.map((b, i) => {
        const y = ((i + 1) * H) / (n1 + 1);
        return (
          <g key={i}>
            <line x1={rootX} y1={rootY} x2={firstXs} y2={y} stroke={TONES.brand.fill} strokeWidth="2" />
            <text x={(rootX + firstXs) / 2} y={(rootY + y) / 2 - 6} textAnchor="middle" fontSize="11" fontWeight="600" fill={TONES.brand.text}>
              {b.p}
            </text>
            <circle cx={firstXs} cy={y} r="5" fill={TONES.brand.fill} />
            <text x={firstXs + 9} y={y + 4} fontSize="11.5" fill={LABEL}>
              {b.label}
            </text>
            {second
              ? second.branches.map((b2, j) => {
                  const y2 = y + (j - (second.branches.length - 1) / 2) * (H / (n1 * (second.branches.length + 1)));
                  const x2 = firstXs + levelW;
                  return (
                    <g key={j}>
                      <line x1={firstXs} y1={y} x2={x2} y2={y2} stroke={TONES.accent.fill} strokeWidth="1.6" />
                      <text x={x2 + 6} y={y2 + 3.5} fontSize="10.5" fill={LABEL} opacity="0.9">
                        {b2.label} ({b2.p})
                      </text>
                    </g>
                  );
                })
              : null}
          </g>
        );
      })}
    </svg>
  );
}
