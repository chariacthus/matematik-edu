import type { Visual } from '../../types';
import { TONES } from './Visual';

type Spec = Extract<Visual, { kind: 'balance' }>;

/**
 * Vægten der bærer hele forståelsen af ligninger: det du gør på den ene
 * side, skal du gøre på den anden. Vippen hælder efter hvad der faktisk
 * er tungest, så figuren ikke lyver når siderne er i ubalance.
 */
export function Balance({ spec }: { spec: Spec }) {
  // x antages at veje 2 enheder — nok til at klodserne ser forskellige ud.
  const weight = (pan: Spec['left']) => pan.x * 2 + pan.ones;
  const diff = weight(spec.left) - weight(spec.right);
  const tilt = Math.max(-7, Math.min(7, diff * 1.4));

  return (
    <svg viewBox="0 0 420 200" className="mx-auto h-auto w-full max-w-md text-ink-400" role="img" aria-label="Vægt der viser en ligning">
      {/* Vippearm */}
      <g transform={`rotate(${tilt} 210 70)`}>
        <line x1="60" y1="70" x2="360" y2="70" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        <Pan x={110} pan={spec.left} tone="brand" />
        <Pan x={310} pan={spec.right} tone="accent" />
      </g>

      {/* Søjle og fod */}
      <path d="M210 70 L190 165 L230 165 Z" fill="currentColor" opacity="0.25" />
      <rect x="160" y="165" width="100" height="10" rx="5" fill="currentColor" opacity="0.4" />
      <circle cx="210" cy="70" r="7" fill="currentColor" />

      <text x="210" y="192" textAnchor="middle" fontSize="13" fill="currentColor" opacity="0.7">
        {diff === 0 ? 'i balance' : 'ude af balance'}
      </text>
    </svg>
  );
}

function Pan({ x, pan, tone }: { x: number; pan: Spec['left']; tone: 'brand' | 'accent' }) {
  const colors = TONES[tone];
  const blocks: { w: number; label: string; fill: string }[] = [
    ...Array.from({ length: Math.min(pan.x, 6) }, () => ({ w: 26, label: 'x', fill: colors.fill })),
    ...Array.from({ length: Math.min(Math.abs(pan.ones), 12) }, () => ({
      w: 14,
      label: pan.ones < 0 ? '-1' : '1',
      fill: pan.ones < 0 ? TONES.bad.fill : colors.soft,
    })),
  ];
  const total = blocks.reduce((sum, b) => sum + b.w + 3, 0);
  let cursor = x - total / 2;

  return (
    <g>
      {/* Snore og skål */}
      <line x1={x} y1="70" x2={x} y2="96" stroke="currentColor" strokeWidth="2" />
      <rect x={x - 62} y="96" width="124" height="6" rx="3" fill="currentColor" opacity="0.5" />
      {blocks.map((b, i) => {
        const bx = cursor;
        cursor += b.w + 3;
        return (
          <g key={i}>
            <rect x={bx} y={96 - 22} width={b.w} height="22" rx="4" fill={b.fill} stroke={colors.text} strokeWidth="1" />
            <text
              x={bx + b.w / 2}
              y={96 - 7}
              textAnchor="middle"
              fontSize={b.w > 20 ? 12 : 9}
              fontWeight="700"
              fill={b.fill === colors.soft ? colors.text : '#fff'}
            >
              {b.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}
