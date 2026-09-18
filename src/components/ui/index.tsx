import { type ReactNode, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

/* ------------------------------------------------------------------ */
/* Kort og sektioner                                                   */
/* ------------------------------------------------------------------ */

/**
 * Kort med et fast sæt polstringer.
 *
 * Tidligere overstyrede hver side polstringen med !p-3 / !p-4 / !p-5, og
 * resultatet var at ingen to kort så ens ud. Nu er der tre størrelser og
 * ikke flere.
 */
export function Card({
  children,
  className,
  pad = 'md',
  as: As = 'div',
}: {
  children: ReactNode;
  className?: string;
  pad?: 'none' | 'sm' | 'md' | 'lg';
  as?: 'div' | 'section' | 'article' | 'li';
}) {
  const padding = { none: '', sm: 'p-3', md: 'p-4', lg: 'p-5' }[pad];
  return <As className={clsx('card', padding, className)}>{children}</As>;
}

/**
 * Overskrift til en sektion. Bevidst lille og i versaler, så den ikke
 * konkurrerer med sidens titel - det var en af grundene til at
 * forsiden føltes rodet.
 */
export function SectionTitle({ children, hint, action }: { children: ReactNode; hint?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-3">
      <h2 className="text-[11px] font-bold uppercase tracking-wider text-ink-400 dark:text-ink-500">{children}</h2>
      {action ?? (hint ? <span className="text-xs text-ink-500 dark:text-ink-400">{hint}</span> : null)}
    </div>
  );
}

/** Sidens titel, med plads til en handling til højre. */
export function PageHeader({
  title,
  subtitle,
  back,
  right,
}: {
  title: string;
  subtitle?: ReactNode;
  back?: { label: string; onClick: () => void };
  right?: ReactNode;
}) {
  return (
    <header className="mb-5">
      {back ? (
        <button onClick={back.onClick} className="btn-ghost -ml-2 mb-1 px-2 py-1 text-xs">
          ← {back.label}
        </button>
      ) : null}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold leading-tight tracking-tight">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{subtitle}</p> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
    </header>
  );
}

/**
 * Faneblade. Det er dem der fjerner stakken af sektioner på forsiden:
 * i stedet for at vise plan, repetition og fejl under hinanden, vises
 * én ad gangen.
 */
export function Tabs<T extends string>({
  value,
  onChange,
  tabs,
}: {
  value: T;
  onChange: (v: T) => void;
  tabs: { id: T; label: string; count?: number }[];
}) {
  return (
    <div className="mb-4 flex gap-1 rounded-xl bg-ink-100 p-1 dark:bg-ink-900" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={clsx(
            'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
            value === t.id
              ? 'bg-white text-ink-900 shadow-sm dark:bg-ink-800 dark:text-ink-50'
              : 'text-ink-500 hover:text-ink-700 dark:text-ink-400 dark:hover:text-ink-200',
          )}
        >
          {t.label}
          {t.count ? (
            <span
              className={clsx(
                'rounded-full px-1.5 text-[10px] font-bold tabular-nums',
                value === t.id ? 'bg-brand-600 text-white' : 'bg-ink-200 text-ink-600 dark:bg-ink-700 dark:text-ink-300',
              )}
            >
              {t.count}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

/**
 * En navngiven fremdriftslinje.
 *
 * Navnet står på sin egen linje over bjælken i stedet for i en fast
 * bredde ved siden af. Det er den eneste måde lange navne som
 * "Statistik og sandsynlighed" kan stå helt på en telefon.
 */
export function LabelledBar({
  label,
  value,
  right,
  tone,
  onClick,
}: {
  label: string;
  value: number;
  right: ReactNode;
  tone?: 'brand' | 'good' | 'warn' | 'accent';
  onClick?: () => void;
}) {
  const head = (
    <span className="mb-1 flex items-baseline justify-between gap-3">
      <span className="min-w-0 truncate text-sm font-semibold">{label}</span>
      <span className="shrink-0 text-xs font-bold tabular-nums text-ink-500 dark:text-ink-400">{right}</span>
    </span>
  );
  const body = (
    <>
      {head}
      <ProgressBar value={value} size="sm" tone={tone ?? (value >= 70 ? 'good' : value >= 35 ? 'brand' : 'warn')} label={label} />
    </>
  );
  return onClick ? (
    <button onClick={onClick} className="block w-full text-left">
      {body}
    </button>
  ) : (
    <div>{body}</div>
  );
}

/** En række kompakte nøgletal — erstatter tre separate kort. */
export function StatRow({ stats }: { stats: { label: string; value: string; tone?: 'brand' | 'good' | 'warn' | 'accent' }[] }) {
  return (
    <div className="card grid grid-cols-3 divide-x divide-ink-200 dark:divide-ink-800">
      {stats.map((s) => (
        <div key={s.label} className="px-2 py-3 text-center">
          <p
            className={clsx(
              'text-lg font-extrabold tabular-nums leading-none',
              s.tone === 'good' && 'text-good-600 dark:text-good-300',
              s.tone === 'warn' && 'text-warn-600 dark:text-warn-300',
              s.tone === 'accent' && 'text-accent-600 dark:text-accent-300',
              s.tone === 'brand' && 'text-brand-600 dark:text-brand-300',
            )}
          >
            {s.value}
          </p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Fremdrift                                                           */
/* ------------------------------------------------------------------ */

export function ProgressBar({
  value,
  tone = 'brand',
  size = 'md',
  label,
}: {
  value: number;
  tone?: 'brand' | 'accent' | 'good' | 'warn';
  size?: 'sm' | 'md';
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const bar = {
    brand: 'bg-brand-600',
    accent: 'bg-accent-600',
    good: 'bg-good-600',
    warn: 'bg-warn-500',
  }[tone];
  return (
    <div
      className={clsx('w-full overflow-hidden rounded-full bg-ink-200/80 dark:bg-ink-800', size === 'sm' ? 'h-1.5' : 'h-2.5')}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className={clsx('h-full rounded-full transition-[width] duration-500 ease-out', bar)} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Cirkulær fremdriftsring — til mestringsprocent pr. emne. */
export function ProgressRing({ value, size = 56, stroke = 6, children }: { value: number; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-ink-200 dark:stroke-ink-800" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * pct) / 100}
          className={clsx('transition-[stroke-dashoffset] duration-700', pct >= 90 ? 'stroke-good-500' : pct >= 50 ? 'stroke-brand-500' : 'stroke-warn-500')}
        />
      </svg>
      <span className="absolute text-[11px] font-bold tabular-nums">{children ?? `${Math.round(pct)}%`}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Mærkater                                                            */
/* ------------------------------------------------------------------ */

export function Chip({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'brand' | 'good' | 'warn' | 'bad' | 'accent';
  className?: string;
}) {
  const tones = {
    neutral: 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300',
    brand: 'bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-200',
    good: 'bg-good-100 text-good-700 dark:bg-good-900/40 dark:text-good-200',
    warn: 'bg-warn-100 text-warn-700 dark:bg-warn-900/40 dark:text-warn-200',
    bad: 'bg-bad-100 text-bad-700 dark:bg-bad-900/40 dark:text-bad-200',
    accent: 'bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-200',
  }[tone];
  return <span className={clsx('chip', tones, className)}>{children}</span>;
}

/** Sværhedsgrad vist som fyldte prikker. */
export function LevelDots({ level, className }: { level: number; className?: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-0.5', className)} title={`Niveau ${level} af 5`} aria-label={`Niveau ${level} af 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={clsx('h-1.5 w-1.5 rounded-full', i <= level ? 'bg-brand-500' : 'bg-ink-300 dark:bg-ink-700')}
        />
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Dialog                                                              */
/* ------------------------------------------------------------------ */

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    // Fokus flyttes ind i dialogen, så tastaturbrugere ikke bliver
    // efterladt ude på siden bagved.
    ref.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={clsx(
          'max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-lift animate-fade-up outline-none dark:bg-ink-900 sm:rounded-3xl',
          wide ? 'sm:max-w-2xl' : 'sm:max-w-md',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h3 className="text-lg font-bold tracking-tight">{title}</h3>
          <button onClick={onClose} className="btn-ghost -mr-2 -mt-1 px-2 py-1 text-xl leading-none" aria-label="Luk">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Beskeder                                                            */
/* ------------------------------------------------------------------ */

export function Callout({
  tone = 'brand',
  title,
  children,
  icon,
}: {
  tone?: 'brand' | 'good' | 'warn' | 'bad' | 'neutral';
  title?: string;
  children: ReactNode;
  icon?: ReactNode;
}) {
  const tones = {
    brand: 'border-brand-200 bg-brand-50 text-brand-950 dark:border-brand-900 dark:bg-brand-950/40 dark:text-brand-100',
    good: 'border-good-200 bg-good-100 text-good-900 dark:border-good-900 dark:bg-good-900/25 dark:text-good-100',
    warn: 'border-warn-200 bg-warn-100 text-warn-900 dark:border-warn-900 dark:bg-warn-900/25 dark:text-warn-100',
    bad: 'border-bad-200 bg-bad-100 text-bad-900 dark:border-bad-900 dark:bg-bad-900/25 dark:text-bad-100',
    neutral: 'border-ink-200 bg-ink-50 text-ink-800 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-200',
  }[tone];
  return (
    <div className={clsx('rounded-xl border px-4 py-3 text-sm leading-relaxed', tones)}>
      {title ? (
        <p className="mb-1 flex items-center gap-2 font-bold">
          {icon}
          {title}
        </p>
      ) : null}
      <div className={clsx(title ? '' : 'flex items-start gap-2')}>
        {!title && icon ? <span className="mt-0.5">{icon}</span> : null}
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

/** Kort besked der selv forsvinder. */
export function Toast({ message, onDone, tone = 'good' }: { message: string; onDone: () => void; tone?: 'good' | 'brand' | 'warn' }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [onDone]);
  const tones = { good: 'bg-good-600', brand: 'bg-brand-600', warn: 'bg-warn-600' }[tone];
  return (
    <div className={clsx('pointer-events-auto rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lift animate-fade-up', tones)} role="status">
      {message}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Diverse                                                             */
/* ------------------------------------------------------------------ */

export function EmptyState({ icon, title, body, action }: { icon: string; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-ink-300 px-6 py-10 text-center dark:border-ink-700">
      <span className="text-3xl" aria-hidden>{icon}</span>
      <p className="font-bold">{title}</p>
      <p className="max-w-sm text-sm text-ink-500 dark:text-ink-400">{body}</p>
      {action}
    </div>
  );
}

/** Udfoldeligt afsnit — til løsninger og detaljer man ikke altid vil se. */
export function Disclosure({ summary, children, defaultOpen }: { summary: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className="rounded-xl border border-ink-200 dark:border-ink-800">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold"
        aria-expanded={open}
      >
        {summary}
        <span className={clsx('text-ink-400 transition-transform', open && 'rotate-90')} aria-hidden>›</span>
      </button>
      {open ? <div className="border-t border-ink-200 px-4 py-3 dark:border-ink-800">{children}</div> : null}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-ink-500">
      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink-300 border-t-brand-600" aria-hidden />
      {label}
    </span>
  );
}
