import type { Visual } from '../../types';
import { TONES } from './Visual';

type Spec = Extract<Visual, { kind: 'triangle' }>;

/**
 * Trekant. Er den retvinklet med kendte kateter, tegnes den i korrekte
 * proportioner — det gør Pythagoras og trigonometri langt lettere at
 * gennemskue end en vilkårlig trekant med tal skrevet på.
 */
export function TriangleFigure({ spec }: { spec: Spec }) {
  const W = 340;
  const H = 240;
  const pad = 40;

  const right = spec.right ?? (spec.a !== undefined && spec.b !== undefined && spec.c !== undefined);
  // Proportioner ud fra de kendte sider; ellers en pæn standardtrekant.
  const ratioA = spec.a ?? 3;
  const ratioB = spec.b ?? 4;
  const scale = Math.min((W - pad * 2) / Math.max(ratioB, 0.1), (H - pad * 2) / Math.max(ratioA, 0.1));
  const bw = Math.max(70, Math.min(W - pad * 2, ratioB * scale));
  const bh = Math.max(50, Math.min(H - pad * 2, ratioA * scale));

  // Hjørner: C nederst til venstre (den rette vinkel), B nederst til
  // højre, A øverst. Vinkel A i spec er ved B-hjørnet set fra siden b.
  const Cx = pad;
  const Cy = H - pad;
  const Bx = pad + bw;
  const By = H - pad;
  const Ax = right ? pad : pad + bw * 0.28;
  const Ay = H - pad - bh;

  const label = (key: keyof NonNullable<Spec['labels']>, fallback?: number) =>
    spec.labels?.[key] ?? (fallback !== undefined ? String(fallback) : undefined);

  const hot = (k: 'a' | 'b' | 'c' | 'A' | 'B') => spec.highlight?.includes(k);
  const strokeFor = (k: 'a' | 'b' | 'c') => (hot(k) ? TONES.accent.fill : TONES.brand.fill);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto w-full max-w-sm text-ink-500" role="img" aria-label="Trekant">
      <polygon points={`${Ax},${Ay} ${Bx},${By} ${Cx},${Cy}`} fill={TONES.brand.soft} opacity="0.45" />

      {/* Katete a (lodret), katete b (vandret), hypotenuse c */}
      <line x1={Ax} y1={Ay} x2={Cx} y2={Cy} stroke={strokeFor('a')} strokeWidth={hot('a') ? 4 : 2.5} strokeLinecap="round" />
      <line x1={Cx} y1={Cy} x2={Bx} y2={By} stroke={strokeFor('b')} strokeWidth={hot('b') ? 4 : 2.5} strokeLinecap="round" />
      <line x1={Ax} y1={Ay} x2={Bx} y2={By} stroke={strokeFor('c')} strokeWidth={hot('c') ? 4 : 2.5} strokeLinecap="round" />

      {/* Den rette vinkel som et lille kvadrat */}
      {right ? <path d={`M${Cx} ${Cy - 16} h16 v16 h-16 z`} fill="none" stroke="currentColor" strokeWidth="1.8" /> : null}

      {/* Vinkelbue ved B */}
      {spec.angleA !== undefined ? (
        <>
          <path d={`M${Bx - 30} ${By} A 30 30 0 0 0 ${Bx - 30 * Math.cos(Math.atan2(bh, bw))} ${By - 30 * Math.sin(Math.atan2(bh, bw))}`} fill="none" stroke={TONES.warn.fill} strokeWidth="2" />
          <text x={Bx - 46} y={By - 12} fontSize="13" fontWeight="700" fill={TONES.warn.text}>
            {label('A', spec.angleA)}
          </text>
        </>
      ) : null}

      {spec.angleB !== undefined ? (
        <text x={Ax + 14} y={Ay + 22} fontSize="13" fontWeight="700" fill={TONES.warn.text}>
          {label('B', spec.angleB)}
        </text>
      ) : null}

      {/* Sidelængder */}
      {label('a', spec.a) ? (
        <text x={Math.min(Ax, Cx) - 8} y={(Ay + Cy) / 2} textAnchor="end" fontSize="13" fontWeight="600" fill={strokeFor('a')}>
          {label('a', spec.a)}
        </text>
      ) : null}
      {label('b', spec.b) ? (
        <text x={(Cx + Bx) / 2} y={By + 20} textAnchor="middle" fontSize="13" fontWeight="600" fill={strokeFor('b')}>
          {label('b', spec.b)}
        </text>
      ) : null}
      {label('c', spec.c) ? (
        <text x={(Ax + Bx) / 2 + 12} y={(Ay + By) / 2 - 8} textAnchor="middle" fontSize="13" fontWeight="600" fill={strokeFor('c')}>
          {label('c', spec.c)}
        </text>
      ) : null}
    </svg>
  );
}
