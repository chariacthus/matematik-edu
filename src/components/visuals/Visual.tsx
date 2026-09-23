import type { Visual as VisualSpec } from '../../types';
import { Balance } from './Balance';
import { FractionBar } from './FractionBar';
import { NumberLine } from './NumberLine';
import { Coordinate } from './Coordinate';
import { TriangleFigure } from './TriangleFigure';
import { RectFigure, CircleFigure, AngleFigure } from './Shapes';
import { SolidFigure } from './Solid';
import { BarChart, BoxPlot, PieChart, DotPlot, PercentBar, ProbTree } from './Charts';

/**
 * Fordeler en visualisering til den rigtige komponent.
 *
 * Alle figurer er inline SVG med viewBox, så de skalerer ned på en
 * telefon uden at blive ulæselige, og de bruger currentColor eller
 * temaets farvetokens, så de virker i både lyst og mørkt tema.
 */
export function Visual({ spec, className }: { spec: VisualSpec; className?: string }) {
  const body = (() => {
    switch (spec.kind) {
      case 'balance':
        return <Balance spec={spec} />;
      case 'fractionBar':
        return <FractionBar spec={spec} />;
      case 'numberLine':
        return <NumberLine spec={spec} />;
      case 'coordinate':
        return <Coordinate spec={spec} />;
      case 'triangle':
        return <TriangleFigure spec={spec} />;
      case 'rect':
        return <RectFigure spec={spec} />;
      case 'circle':
        return <CircleFigure spec={spec} />;
      case 'angles':
        return <AngleFigure spec={spec} />;
      case 'solid':
        return <SolidFigure spec={spec} />;
      case 'barChart':
        return <BarChart spec={spec} />;
      case 'boxPlot':
        return <BoxPlot spec={spec} />;
      case 'pie':
        return <PieChart spec={spec} />;
      case 'dotPlot':
        return <DotPlot spec={spec} />;
      case 'percentBar':
        return <PercentBar spec={spec} />;
      case 'probTree':
        return <ProbTree spec={spec} />;
      default:
        return null;
    }
  })();

  if (!body) return null;

  return (
    <figure className={className}>
      <div className="figure-scope overflow-x-auto rounded-xl border border-ink-200 bg-white p-3 dark:border-white/10 dark:bg-ink-950">{body}</div>
      {'caption' in spec && spec.caption ? (
        <figcaption className="mt-2 text-center text-xs text-ink-500 dark:text-ink-400">{spec.caption}</figcaption>
      ) : null}
    </figure>
  );
}

/**
 * Figurernes farver.
 *
 * Værdierne ligger som CSS-variabler på .figure-scope, så de skifter med
 * temaet. Før var de faste hex-værdier valgt til hvid baggrund - de
 * mørke tekstfarver forsvandt næsten i mørkt tema, og de lyse fyld
 * lyste op som neon.
 */
export const TONES = {
  brand: { fill: 'var(--fig-brand)', soft: 'var(--fig-brand-soft)', text: 'var(--fig-brand-text)' },
  accent: { fill: 'var(--fig-accent)', soft: 'var(--fig-accent-soft)', text: 'var(--fig-accent-text)' },
  xp: { fill: 'var(--fig-xp)', soft: 'var(--fig-xp-soft)', text: 'var(--fig-xp)' },
  bad: { fill: 'var(--fig-bad)', soft: 'var(--fig-bad-soft)', text: 'var(--fig-bad)' },
  good: { fill: 'var(--fig-good)', soft: 'var(--fig-good-soft)', text: 'var(--fig-good)' },
  warn: { fill: 'var(--fig-warn)', soft: 'var(--fig-warn-soft)', text: 'var(--fig-warn)' },
} as const;

/** Stregen figuren er tegnet med. Neutral - som blyant på papir. */
export const LINE = 'var(--fig-line)';
/** Tal og navne på figuren. */
export const LABEL = 'var(--fig-label)';
export const GRID = 'var(--fig-grid)';

export type ToneKey = keyof typeof TONES;

export const tone = (t: ToneKey | undefined, fallback: ToneKey = 'brand') => TONES[t ?? fallback];

export const AXIS = LINE;
