import type { Visual } from '../../types';
import { TONES } from './Visual';

type Spec = Extract<Visual, { kind: 'solid' }>;

/**
 * Rumfigurer tegnet i skrå projektion. De er skitser — de skal minde om
 * hvilken figur der er tale om og hvor målene sidder, ikke være
 * målfaste tegninger.
 */
export function SolidFigure({ spec }: { spec: Spec }) {
  const W = 300;
  const H = 230;
  const stroke = TONES.brand.fill;
  const fill = TONES.brand.soft;
  const lab = (k: string) => spec.labels?.[k];

  if (spec.type === 'box' || spec.type === 'prism') {
    const x = 60;
    const y = 70;
    const w = 150;
    const h = 90;
    const d = 42;
    const isPrism = spec.type === 'prism';

    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto w-full max-w-xs text-ink-500" role="img" aria-label="Rumfigur">
        {isPrism ? (
          <>
            <polygon points={`${x},${y + h} ${x + w},${y + h} ${x + w / 2},${y}`} fill={fill} stroke={stroke} strokeWidth="2.5" />
            <polygon points={`${x + d},${y + h - d} ${x + w + d},${y + h - d} ${x + w / 2 + d},${y - d}`} fill={fill} stroke={stroke} strokeWidth="2" opacity="0.65" />
            <line x1={x} y1={y + h} x2={x + d} y2={y + h - d} stroke={stroke} strokeWidth="2" />
            <line x1={x + w} y1={y + h} x2={x + w + d} y2={y + h - d} stroke={stroke} strokeWidth="2" />
            <line x1={x + w / 2} y1={y} x2={x + w / 2 + d} y2={y - d} stroke={stroke} strokeWidth="2" />
          </>
        ) : (
          <>
            <polygon points={`${x},${y} ${x + w},${y} ${x + w},${y + h} ${x},${y + h}`} fill={fill} stroke={stroke} strokeWidth="2.5" />
            <polygon points={`${x},${y} ${x + d},${y - d} ${x + w + d},${y - d} ${x + w},${y}`} fill={fill} stroke={stroke} strokeWidth="2" opacity="0.75" />
            <polygon points={`${x + w},${y} ${x + w + d},${y - d} ${x + w + d},${y + h - d} ${x + w},${y + h}`} fill={fill} stroke={stroke} strokeWidth="2" opacity="0.55" />
          </>
        )}
        {lab('w') ? <text x={x + w / 2} y={y + h + 22} textAnchor="middle" fontSize="13" fontWeight="600" fill="currentColor">{lab('w')}</text> : null}
        {lab('h') ? <text x={x - 12} y={y + h / 2 + 4} textAnchor="end" fontSize="13" fontWeight="600" fill="currentColor">{lab('h')}</text> : null}
        {lab('d') ? <text x={x + w + d + 8} y={y - d / 2 + 4} fontSize="13" fontWeight="600" fill="currentColor">{lab('d')}</text> : null}
      </svg>
    );
  }

  if (spec.type === 'cylinder') {
    const cx = W / 2;
    const rx = 62;
    const ry = 20;
    const top = 50;
    const bottom = 175;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto w-full max-w-xs text-ink-500" role="img" aria-label="Cylinder">
        <rect x={cx - rx} y={top} width={rx * 2} height={bottom - top} fill={fill} />
        <line x1={cx - rx} y1={top} x2={cx - rx} y2={bottom} stroke={stroke} strokeWidth="2.5" />
        <line x1={cx + rx} y1={top} x2={cx + rx} y2={bottom} stroke={stroke} strokeWidth="2.5" />
        <ellipse cx={cx} cy={bottom} rx={rx} ry={ry} fill={fill} stroke={stroke} strokeWidth="2.5" />
        <ellipse cx={cx} cy={top} rx={rx} ry={ry} fill={fill} stroke={stroke} strokeWidth="2.5" />
        <line x1={cx} y1={top} x2={cx + rx} y2={top} stroke={TONES.accent.fill} strokeWidth="2" strokeDasharray="4 3" />
        {lab('r') ? <text x={cx + rx / 2} y={top - 8} textAnchor="middle" fontSize="13" fontWeight="700" fill={TONES.accent.text}>r = {lab('r')}</text> : null}
        {lab('h') ? <text x={cx + rx + 12} y={(top + bottom) / 2} fontSize="13" fontWeight="600" fill="currentColor">h = {lab('h')}</text> : null}
      </svg>
    );
  }

  if (spec.type === 'cone' || spec.type === 'pyramid') {
    const cx = W / 2;
    const rx = 62;
    const ry = 18;
    const apex = 45;
    const base = 175;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto w-full max-w-xs text-ink-500" role="img" aria-label="Kegle">
        <polygon points={`${cx},${apex} ${cx - rx},${base} ${cx + rx},${base}`} fill={fill} stroke={stroke} strokeWidth="2.5" />
        {spec.type === 'cone' ? <ellipse cx={cx} cy={base} rx={rx} ry={ry} fill={fill} stroke={stroke} strokeWidth="2.5" /> : null}
        <line x1={cx} y1={apex} x2={cx} y2={base} stroke={TONES.accent.fill} strokeWidth="2" strokeDasharray="4 3" />
        {lab('h') ? <text x={cx + 8} y={(apex + base) / 2} fontSize="13" fontWeight="600" fill={TONES.accent.text}>h = {lab('h')}</text> : null}
        {lab('r') ? <text x={cx - rx / 2 - 8} y={base + 24} fontSize="13" fontWeight="700" fill="currentColor">r = {lab('r')}</text> : null}
      </svg>
    );
  }

  // Kugle
  const cx = W / 2;
  const cy = H / 2;
  const r = 72;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto w-full max-w-xs text-ink-500" role="img" aria-label="Kugle">
      <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth="2.5" />
      <ellipse cx={cx} cy={cy} rx={r} ry={r / 3.4} fill="none" stroke={stroke} strokeWidth="1.6" strokeDasharray="5 4" opacity="0.7" />
      <line x1={cx} y1={cy} x2={cx + r} y2={cy} stroke={TONES.accent.fill} strokeWidth="2.5" />
      <circle cx={cx} cy={cy} r="3" fill="currentColor" />
      {lab('r') ? <text x={cx + r / 2} y={cy - 9} textAnchor="middle" fontSize="13.5" fontWeight="700" fill={TONES.accent.text}>r = {lab('r')}</text> : null}
    </svg>
  );
}
