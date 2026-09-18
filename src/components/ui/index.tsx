import { type ReactNode, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

/* ------------------------------------------------------------------ */
/* Kort og sektioner                                                   */
/* ------------------------------------------------------------------ */

export function Card({ children, className, as: As = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'section' | 'article' }) {
  return <As className={clsx('card p-5', className)}>{children}</As>;
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-base font-bold tracking-tight text-ink-900 dark:text-ink-50">{children}</h2>
      {hint ? <span className="text-xs text-ink-500 dark:text-ink-400">{hint}</span> : null}
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
