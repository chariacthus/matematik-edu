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
      <div className="overflow-x-auto rounded-xl bg-ink-50/70 p-3 dark:bg-ink-950/50">{body}</div>
      {'caption' in spec && spec.caption ? (
        <figcaption className="mt-2 text-center text-xs text-ink-500 dark:text-ink-400">{spec.caption}</figcaption>
      ) : null}
    </figure>
  );
}

/** Fælles farver, så figurerne ser ud som ét system. */
export const TONES = {
  brand: { fill: '#3b6af6', soft: '#dbe6fe', text: '#1d38d8' },
  accent: { fill: '#04c8a8', soft: '#c7fff1', text: '#05806f' },
  bad: { fill: '#ef4444', soft: '#fee2e2', text: '#b91c1c' },
  good: { fill: '#22c55e', soft: '#dcfce7', text: '#15803d' },
  warn: { fill: '#f59e0b', soft: '#fef3c7', text: '#b45309' },
} as const;

export type ToneKey = keyof typeof TONES;

export const tone = (t: ToneKey | undefined, fallback: ToneKey = 'brand') => TONES[t ?? fallback];

/** Aksefarve der virker i begge temaer. */
export const AXIS = 'currentColor';
