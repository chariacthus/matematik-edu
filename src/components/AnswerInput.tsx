import { useEffect, useRef } from 'react';
import clsx from 'clsx';
import type { InputSpec } from '../types';
import type { Response } from '../lib/answer';
import { MathText } from './MathText';

/**
 * Svarfelterne.
 *
 * Alle varianter deler den samme kontrakt: de får en Response og giver en
 * ny tilbage. Det gør at lektionsafspilleren kan behandle alle opgavetyper
 * ens, uanset om der skal skrives et tal, vælges en mulighed eller
 * angives et punkt.
 */

export type Verdict = 'idle' | 'correct' | 'wrong';

interface Props {
  spec: InputSpec;
  choices?: string[];
  value: Response;
  onChange: (r: Response) => void;
  onSubmit: () => void;
  verdict: Verdict;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function AnswerInput({ spec, choices, value, onChange, onSubmit, verdict, disabled, autoFocus }: Props) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && spec.kind !== 'choice' && spec.kind !== 'multi') {
      // Kort forsinkelse, så feltet ikke stjæler fokus mens siden skifter.
      // preventScroll: ellers ruller browseren feltet ind i billedet, og
      // overskriften på lektionen forsvinder op bag den faste topbjælke
      // i samme sekund man åbner den.
      const t = setTimeout(() => ref.current?.focus({ preventScroll: true }), 60);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [autoFocus, spec.kind]);

  const ring =
    verdict === 'correct'
      ? 'border-xp-500 ring-2 ring-xp-500/35'
      : verdict === 'wrong'
        ? 'border-bad-500 ring-2 ring-bad-500/35'
        : '';

  // Kanten om feltet skifter tone med svaret, så man kan se det uden
  // at læse feedbacken.
  const edgeTone = verdict === 'correct' ? 'edge-xp' : verdict === 'wrong' ? 'edge-bad' : '';

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !disabled) {
      e.preventDefault();
      onSubmit();
    }
  };

  /* ---------------- Multiple choice ---------------- */
  if (spec.kind === 'choice') {
    const selected = value.kind === 'choice' ? value.index : null;
    return (
      <div className="grid gap-2.5" role="radiogroup" aria-label="Svarmuligheder">
        {(choices ?? []).map((c, i) => {
          const isSelected = selected === i;
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => onChange({ kind: 'choice', index: i })}
              onDoubleClick={onSubmit}
              className={clsx(
                'flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-base',
                'transition-all duration-150 ease-spring active:scale-[0.98] disabled:opacity-60',
                isSelected
                  ? verdict === 'correct'
                    ? 'animate-pulse-correct border-xp-500 bg-xp-100 dark:bg-xp-500/15'
                    : verdict === 'wrong'
                      ? 'animate-shake border-bad-500 bg-bad-100 dark:bg-bad-500/15'
                      : 'border-brand-500 bg-brand-50 dark:bg-brand-500/[0.14]'
                  : 'border-ink-200 bg-white/70 backdrop-blur-sm hover:-translate-y-0.5 hover:border-brand-300 hover:bg-white dark:border-white/[0.09] dark:bg-white/[0.04] dark:hover:border-brand-400/50 dark:hover:bg-white/[0.08]',
              )}
            >
              <span
                className={clsx(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold transition-colors',
                  isSelected
                    ? verdict === 'correct'
                      ? 'bg-xp-500 text-ink-950'
                      : verdict === 'wrong'
                        ? 'bg-bad-500 text-white'
                        : 'bg-brand-600 text-white'
                    : 'bg-ink-100 text-ink-500 dark:bg-white/[0.08] dark:text-ink-300',
                )}
                aria-hidden
              >
                {String.fromCharCode(65 + i)}
              </span>
              <MathText className="min-w-0 flex-1">{`$${c}$`.replace(/^\$\$|\$\$$/g, '$')}</MathText>
            </button>
          );
        })}
      </div>
    );
  }

  /* ---------------- Flere rigtige ---------------- */
  if (spec.kind === 'multi') {
    const selected = value.kind === 'multi' ? value.indices : [];
    return (
      <div className="grid gap-2.5">
        <p className="text-xs text-ink-500">Der kan være flere rigtige svar.</p>
        {(choices ?? []).map((c, i) => {
          const isSelected = selected.includes(i);
          return (
            <button
              key={i}
              type="button"
              role="checkbox"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() =>
                onChange({
                  kind: 'multi',
                  indices: isSelected ? selected.filter((x) => x !== i) : [...selected, i],
                })
              }
              className={clsx(
                'flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left',
                'transition-all duration-150 ease-spring active:scale-[0.98] disabled:opacity-60',
                isSelected
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/[0.14]'
                  : 'border-ink-200 bg-white/70 hover:border-brand-300 dark:border-white/[0.09] dark:bg-white/[0.04]',
              )}
            >
              <span className={clsx('flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2', isSelected ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-300 dark:border-ink-600')} aria-hidden>
                {isSelected ? '✓' : ''}
              </span>
              <MathText className="min-w-0 flex-1">{c}</MathText>
            </button>
          );
        })}
      </div>
    );
  }

  /* ---------------- To tal ---------------- */
  if (spec.kind === 'pair') {
    const v = value.kind === 'pair' ? value : { a: '', b: '' };
    return (
      <div className="flex flex-wrap items-center gap-3">
        {(['a', 'b'] as const).map((key, i) => (
          <label key={key} className="flex items-center gap-2">
            <span className="text-sm font-semibold text-ink-600 dark:text-ink-300">{spec.labels[i]} =</span>
            <input
              ref={i === 0 ? ref : undefined}
              inputMode="decimal"
              className={clsx('field max-w-[7rem] font-mono', ring)}
              value={v[key]}
              disabled={disabled}
              onChange={(e) => onChange({ kind: 'pair', a: key === 'a' ? e.target.value : v.a, b: key === 'b' ? e.target.value : v.b })}
              onKeyDown={onKeyDown}
              aria-label={spec.labels[i]}
            />
          </label>
        ))}
      </div>
    );
  }

  /* ---------------- Punkt ---------------- */
  if (spec.kind === 'point') {
    const v = value.kind === 'point' ? value : { x: '', y: '' };
    return (
      <div className="flex items-center gap-1.5 font-mono text-lg">
        <span aria-hidden>(</span>
        <input
          ref={ref}
          inputMode="decimal"
          className={clsx('field max-w-[5.5rem] text-center font-mono', ring)}
          value={v.x}
          disabled={disabled}
          onChange={(e) => onChange({ kind: 'point', x: e.target.value, y: v.y })}
          onKeyDown={onKeyDown}
          aria-label="x-koordinat"
        />
        <span aria-hidden>,</span>
        <input
          inputMode="decimal"
          className={clsx('field max-w-[5.5rem] text-center font-mono', ring)}
          value={v.y}
          disabled={disabled}
          onChange={(e) => onChange({ kind: 'point', x: v.x, y: e.target.value })}
          onKeyDown={onKeyDown}
          aria-label="y-koordinat"
        />
        <span aria-hidden>)</span>
      </div>
    );
  }

  /* ---------------- Tal, brøk, tekst, udtryk ---------------- */
  const v = value.kind === 'text' ? value.value : '';
  const placeholder =
    spec.kind === 'fraction'
      ? 'fx 3/4'
      : spec.kind === 'number'
        ? spec.placeholder ?? 'Dit svar'
        : ('placeholder' in spec ? spec.placeholder : undefined) ?? 'Dit svar';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className={clsx('w-full max-w-xs', edgeTone)}>
      <input
        ref={ref}
        // Tal- og brøkfelter skal vise det numeriske tastatur på mobil,
        // men "text" bruges så komma og brøkstreg kan tastes.
        inputMode={spec.kind === 'number' ? 'decimal' : 'text'}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className={clsx('field w-full font-mono text-lg', ring)}
        placeholder={placeholder}
        value={v}
        disabled={disabled}
        onChange={(e) => onChange({ kind: 'text', value: e.target.value })}
        onKeyDown={onKeyDown}
        aria-label="Dit svar"
      />
      </div>
      {spec.kind === 'number' && spec.unit ? (
        <span className="text-base font-semibold text-ink-500 dark:text-ink-400">{spec.unit}</span>
      ) : null}
    </div>
  );
}

/** Lille hjælpelinje under feltet der forklarer hvad der forventes. */
export function InputHint({ spec }: { spec: InputSpec }) {
  const text = {
    number: 'Brug komma som decimaltegn — fx 3,5.',
    fraction: 'Skriv brøken som tæller/nævner — fx 3/4.',
    expression: 'Skriv udtrykket som du ville på papir — fx 2x + 3.',
    text: '',
    choice: '',
    multi: '',
    pair: '',
    point: 'Første tal er x, andet tal er y.',
  }[spec.kind];
  if (!text) return null;
  return <p className="mt-2 text-xs text-ink-500 dark:text-ink-400">{text}</p>;
}
