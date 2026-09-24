import type { Visual } from '../../types';
import { TONES, LINE, LABEL } from './Visual';

type Spec = Extract<Visual, { kind: 'coordinate' }>;

/**
 * Koordinatsystemet. Bruges til punkter, rette linjer, eksponentielle
 * kurver og parabler.
 *
 * Kurverne tegnes ved at sample funktionen og klippe til det synlige
 * område — ellers ville en stejl eksponentiel kurve skyde langt ud over
 * rammen og ødelægge figuren.
 */
export function Coordinate({ spec }: { spec: Spec }) {
  const W = 400;
  const H = 320;
  const pad = 30;
  const [x0, x1] = spec.xRange;
  const [y0, y1] = spec.yRange;
  const sx = (v: number) => pad + ((v - x0) / (x1 - x0 || 1)) * (W - pad * 2);
  const sy = (v: number) => H - pad - ((v - y0) / (y1 - y0 || 1)) * (H - pad * 2);

  const stepFor = (range: number) => {
    const raw = range / 8;
    const mag = 10 ** Math.floor(Math.log10(Math.max(raw, 0.001)));
    return [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? mag * 10;
  };
  const xStep = stepFor(x1 - x0);
  const yStep = stepFor(y1 - y0);

  const xTicks: number[] = [];
  for (let v = Math.ceil(x0 / xStep) * xStep; v <= x1 + 1e-9; v += xStep) xTicks.push(Math.round(v * 100) / 100);
  const yTicks: number[] = [];
  for (let v = Math.ceil(y0 / yStep) * yStep; v <= y1 + 1e-9; v += yStep) yTicks.push(Math.round(v * 100) / 100);

  /** Sampler en funktion og klipper væk hvad der ligger uden for rammen. */
  const pathFor = (f: (x: number) => number): string => {
    const N = 120;
    let d = '';
    let pen = false;
    for (let i = 0; i <= N; i++) {
      const x = x0 + ((x1 - x0) * i) / N;
      const y = f(x);
      if (!Number.isFinite(y) || y < y0 - (y1 - y0) || y > y1 + (y1 - y0)) {
        pen = false;
        continue;
      }
      const cy = Math.max(sy(y1), Math.min(sy(y0), sy(y)));
      d += `${pen ? 'L' : 'M'}${sx(x).toFixed(1)} ${cy.toFixed(1)} `;
      pen = true;
    }
    return d.trim();
  };

  const axisX = y0 <= 0 && y1 >= 0 ? sy(0) : H - pad;
  const axisY = x0 <= 0 && x1 >= 0 ? sx(0) : pad;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto w-full max-w-md text-ink-500 dark:text-ink-400" role="img" aria-label="Koordinatsystem">
      {/* Gitter */}
      {xTicks.map((v) => (
        <line key={`gx${v}`} x1={sx(v)} y1={pad} x2={sx(v)} y2={H - pad} stroke={LINE} strokeWidth="1" opacity="0.18" />
      ))}
      {yTicks.map((v) => (
        <line key={`gy${v}`} x1={pad} y1={sy(v)} x2={W - pad} y2={sy(v)} stroke={LINE} strokeWidth="1" opacity="0.18" />
      ))}

      {/* Akser */}
      <line x1={pad - 6} y1={axisX} x2={W - pad + 6} y2={axisX} stroke={LINE} strokeWidth="2" />
      <line x1={axisY} y1={H - pad + 6} x2={axisY} y2={pad - 6} stroke={LINE} strokeWidth="2" />
      <path d={`M${W - pad + 6} ${axisX} l-7 -4 v8 z`} fill={LABEL} />
      <path d={`M${axisY} ${pad - 6} l-4 7 h8 z`} fill={LABEL} />
      <text x={W - pad + 2} y={axisX + 18} fontSize="12" fill={LABEL} fontStyle="italic">x</text>
      <text x={axisY - 16} y={pad + 2} fontSize="12" fill={LABEL} fontStyle="italic">y</text>

      {/* Talmærker — kun hver anden, så der er luft */}
      {xTicks.filter((v) => v !== 0).map((v, i) => (i % 2 === 0 ? (
        <text key={`tx${v}`} x={sx(v)} y={axisX + 15} textAnchor="middle" fontSize="10.5" fill={LABEL} opacity="0.75">
          {String(v).replace('.', ',')}
        </text>
      ) : null))}
      {yTicks.filter((v) => v !== 0).map((v, i) => (i % 2 === 0 ? (
        <text key={`ty${v}`} x={axisY - 6} y={sy(v) + 3.5} textAnchor="end" fontSize="10.5" fill={LABEL} opacity="0.75">
          {String(v).replace('.', ',')}
        </text>
      ) : null))}

      {/* Rette linjer */}
      {(spec.lines ?? []).map((l, i) => {
        const c = TONES[l.tone ?? (i === 0 ? 'brand' : 'accent')];
        return (
          <g key={`l${i}`}>
            <path d={pathFor((x) => l.a * x + l.b)} stroke={c.fill} strokeWidth="2.5" fill="none" strokeLinecap="round" />
            {l.label ? (
              <text x={W - pad - 4} y={Math.max(pad + 12, Math.min(H - pad - 4, sy(l.a * x1 + l.b) - 6))} textAnchor="end" fontSize="12" fontWeight="700" fill={c.fill}>
                {l.label}
              </text>
            ) : null}
          </g>
        );
      })}

      {/* Kurver */}
      {(spec.curves ?? []).map((c, i) => {
        const colors = TONES[c.tone ?? 'brand'];
        const f = c.type === 'exp' ? (x: number) => c.b * c.a ** x : (x: number) => c.a * x * x + c.b;
        return (
          <g key={`c${i}`}>
            <path d={pathFor(f)} stroke={colors.fill} strokeWidth="2.5" fill="none" strokeLinecap="round" />
            {c.label ? (
              <text x={pad + 6} y={pad + 14 + i * 16} fontSize="12" fontWeight="700" fill={colors.fill}>
                {c.label}
              </text>
            ) : null}
          </g>
        );
      })}

      {/* Linjestykker */}
      {(spec.segments ?? []).map((s, i) => (
        <line
          key={`s${i}`}
          x1={sx(s.x1)}
          y1={sy(s.y1)}
          x2={sx(s.x2)}
          y2={sy(s.y2)}
          stroke={TONES.warn.fill}
          strokeWidth="2"
          strokeDasharray={s.dashed ? '5 4' : undefined}
        />
      ))}

      {/* Punkter */}
      {(spec.points ?? []).map((p, i) => {
        const c = TONES[p.tone ?? 'brand'];
        return (
          <g key={`p${i}`}>
            <circle cx={sx(p.x)} cy={sy(p.y)} r="5.5" fill={c.fill} stroke="#fff" strokeWidth="2" />
            {p.label ? (
              <text x={sx(p.x) + 9} y={sy(p.y) - 8} fontSize="12" fontWeight="700" fill={c.fill}>
                {p.label}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
