import { useState } from 'react';
import clsx from 'clsx';
import type { DayActivity } from '../engine/activity';

const WEEKDAYS = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];
const MONTHS = ['jan.', 'feb.', 'mar.', 'apr.', 'maj', 'jun.', 'jul.', 'aug.', 'sep.', 'okt.', 'nov.', 'dec.'];

function dayName(d: DayActivity, i: number, count: number): string {
  if (i === count - 1) return 'I dag';
  if (i === count - 2) return 'I går';
  const date = new Date(d.ts);
  const name = WEEKDAYS[date.getDay()] as string;
  return `${name[0]?.toUpperCase()}${name.slice(1)} ${date.getDate()}. ${MONTHS[date.getMonth()]}`;
}

function summary(d: DayActivity): string {
  if (!d.total) return 'ingen opgaver';
  return `${d.total} ${d.total === 1 ? 'opgave' : 'opgaver'}, ${d.correct} rigtige`;
}

/** Opgaver pr. dag som søjler: den fyldte del er rigtige, den lyse del forkerte. */
export function ActivityChart({ days }: { days: DayActivity[] }) {
  const last = days.length - 1;
  const [picked, setPicked] = useState(last);
  const max = Math.max(1, ...days.map((d) => d.total));
  const current = days[picked] ?? days[last];

  return (
    <div onMouseLeave={() => setPicked(last)}>
      <p className="mb-3 text-sm text-ink-600 dark:text-ink-300" aria-live="polite">
        <span className="font-semibold text-ink-900 dark:text-white">{current ? dayName(current, picked, days.length) : ''}</span>
        {current ? `: ${summary(current)}` : ''}
      </p>
      <div className="flex h-28 items-stretch gap-1 sm:gap-1.5" role="group" aria-label="Opgaver pr. dag">
        {days.map((d, i) => {
          const h = d.total ? Math.max(6, (d.total / max) * 100) : 0;
          const right = d.total ? (d.correct / d.total) * 100 : 0;
          return (
            <button
              key={d.day}
              type="button"
              onMouseEnter={() => setPicked(i)}
              onFocus={() => setPicked(i)}
              onClick={() => setPicked(i)}
              aria-label={`${dayName(d, i, days.length)}: ${summary(d)}`}
              aria-pressed={picked === i}
              className={clsx(
                'flex min-w-0 flex-1 flex-col justify-end rounded-md px-0.5 pb-0.5 transition-colors sm:px-1',
                picked === i ? 'bg-ink-100 dark:bg-white/[0.05]' : 'hover:bg-ink-50 dark:hover:bg-white/[0.03]',
              )}
            >
              {d.total ? (
                <span
                  className="flex w-full origin-bottom animate-column-grow flex-col overflow-hidden rounded-t rounded-b-sm"
                  style={{ height: `${h}%`, animationDelay: `${i * 25}ms` }}
                >
                  <span className="w-full bg-brand-500/35" style={{ height: `${100 - right}%` }} />
                  <span className="w-full flex-1 bg-brand-500" />
                </span>
              ) : (
                <span className="h-0.5 w-full rounded-full bg-ink-200 dark:bg-white/10" />
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-1 sm:gap-1.5" aria-hidden>
        {days.map((d, i) => (
          <span
            key={d.day}
            className={clsx(
              'min-w-0 flex-1 text-center text-2xs',
              i === last ? 'font-semibold text-ink-900 dark:text-white' : 'text-ink-500 dark:text-ink-400',
            )}
          >
            {(WEEKDAYS[new Date(d.ts).getDay()] as string)[0]?.toUpperCase()}
          </span>
        ))}
      </div>
    </div>
  );
}
