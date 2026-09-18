import { type ReactNode, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Icon, type IconName } from '../Icon';

/* ------------------------------------------------------------------ */
/* Flader                                                              */
/* ------------------------------------------------------------------ */

export function Card({
  children,
  className,
  pad = 'md',
  raised,
  as: As = 'div',
}: {
  children: ReactNode;
  className?: string;
  pad?: 'none' | 'sm' | 'md' | 'lg';
  raised?: boolean;
  as?: 'div' | 'section' | 'article' | 'li';
}) {
  const padding = { none: '', sm: 'p-3', md: 'p-4', lg: 'p-5' }[pad];
  return <As className={clsx(raised ? 'card-raised' : 'card', padding, className)}>{children}</As>;
}

/** Ikon i en farvet flade — den eneste måde ikoner vises på i appen. */
export function IconTile({
  name,
  tone = 'brand',
  size = 'md',
  filled,
  className,
}: {
  name: IconName;
  tone?: 'brand' | 'xp' | 'good' | 'warn' | 'bad' | 'accent' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  filled?: boolean;
  className?: string;
}) {
  const box = { sm: 'h-8 w-8 rounded-lg', md: 'h-10 w-10 rounded-xl', lg: 'h-12 w-12 rounded-2xl' }[size];
  const icon = { sm: 16, md: 19, lg: 22 }[size];
  const tones = {
    brand: 'bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300',
    xp: 'bg-xp-100 text-xp-700 dark:bg-xp-500/15 dark:text-xp-300',
    good: 'bg-good-100 text-good-700 dark:bg-good-500/15 dark:text-good-300',
    warn: 'bg-warn-100 text-warn-700 dark:bg-warn-500/15 dark:text-warn-300',
    bad: 'bg-bad-100 text-bad-700 dark:bg-bad-500/15 dark:text-bad-300',
    accent: 'bg-accent-100 text-accent-700 dark:bg-accent-500/15 dark:text-accent-300',
    neutral: 'bg-ink-100 text-ink-500 dark:bg-white/[0.06] dark:text-ink-400',
  }[tone];
  return (
    <span className={clsx('flex shrink-0 items-center justify-center', box, tones, className)}>
      <Icon name={name} size={icon} filled={filled} />
    </span>
  );
}

export function SectionTitle({ children, hint, action }: { children: ReactNode; hint?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-3">
      <h2 className="eyebrow">{children}</h2>
      {action ?? (hint ? <span className="text-xs text-ink-500 dark:text-ink-400">{hint}</span> : null)}
    </div>
  );
}

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
        <button onClick={back.onClick} className="btn-ghost -ml-2 mb-1 gap-1 px-2 py-1 text-xs">
          <Icon name="arrow-left" size={14} />
          {back.label}
        </button>
      ) : null}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[28px] font-extrabold leading-[1.1]">{title}</h1>
          {subtitle ? <p className="mt-1.5 text-sm text-ink-500 dark:text-ink-400">{subtitle}</p> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Tal der tæller op                                                   */
/* ------------------------------------------------------------------ */

/**
 * Animerer fra den forrige værdi op til den nye.
 *
 * Det lyder som pynt, men det er den mekanik der gør at optjent XP
 * FØLES optjent i stedet for bare at være et tal der skifter.
 */
export function CountUp({ value, duration = 650, className }: { value: number; duration?: number; className?: string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const raf = useRef(0);

  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    const b = value;
    if (a === b) return;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic — hurtigt i starten, blødt i slutningen.
      const eased = 1 - (1 - t) ** 3;
      setShown(Math.round(a + (b - a) * eased));
      if (t < 1) raf.current = requestAnimationFrame(tick);
      else from.current = b;
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);

  return <span className={clsx('tabular-nums', className)}>{shown}</span>;
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
  tone?: 'brand' | 'xp' | 'accent' | 'good' | 'warn';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const bar = {
    brand: 'bg-brand-500',
    xp: 'bg-xp-400',
    accent: 'bg-accent-500',
    good: 'bg-good-500',
    warn: 'bg-warn-500',
  }[tone];
  const h = { sm: 'h-1.5', md: 'h-2', lg: 'h-3' }[size];
  return (
    <div
      className={clsx('w-full overflow-hidden rounded-full bg-ink-200/70 dark:bg-white/[0.08]', h)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className={clsx('h-full rounded-full transition-[width] duration-700 ease-spring', bar)} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Ring med gradient og glød når den er tæt på fuld. */
export function ProgressRing({
  value,
  size = 56,
  stroke = 6,
  children,
  tone,
}: {
  value: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
  tone?: 'brand' | 'xp';
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const colour = tone === 'xp' ? 'stroke-xp-400' : pct >= 90 ? 'stroke-xp-400' : pct >= 45 ? 'stroke-brand-500' : 'stroke-warn-500';
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-ink-200 dark:stroke-white/[0.08]" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * pct) / 100}
          className={clsx('transition-[stroke-dashoffset] duration-[900ms] ease-spring', colour)}
        />
      </svg>
      <span className="absolute text-[11px] font-extrabold tabular-nums">{children ?? `${Math.round(pct)}%`}</span>
    </div>
  );
}

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
  tone?: 'brand' | 'xp' | 'good' | 'warn' | 'accent';
  onClick?: () => void;
}) {
  const body = (
    <>
      <span className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-sm font-semibold">{label}</span>
        <span className="shrink-0 text-xs font-bold tabular-nums text-ink-500 dark:text-ink-400">{right}</span>
      </span>
      <ProgressBar value={value} size="sm" tone={tone ?? (value >= 70 ? 'xp' : value >= 35 ? 'brand' : 'warn')} label={label} />
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

/* ------------------------------------------------------------------ */
/* Spil-HUD                                                            */
/* ------------------------------------------------------------------ */

/** Niveaubjælken: nuværende niveau, fremgang, næste niveau. */
export function XpBar({ level, into, needed, compact }: { level: number; into: number; needed: number; compact?: boolean }) {
  const pct = needed > 0 ? (into / needed) * 100 : 0;
  return (
    <div className="flex items-center gap-2.5">
      <LevelBadge level={level} size={compact ? 'sm' : 'md'} />
      <div className="min-w-0 flex-1">
        <ProgressBar value={pct} tone="xp" size={compact ? 'sm' : 'md'} label={`Fremgang mod niveau ${level + 1}`} />
        {!compact ? (
          <p className="mt-1 text-[11px] font-semibold tabular-nums text-ink-400 dark:text-ink-500">
            <CountUp value={into} /> / {needed} XP
          </p>
        ) : null}
      </div>
      {!compact ? <LevelBadge level={level + 1} size="sm" dim /> : null}
    </div>
  );
}

export function LevelBadge({ level, size = 'md', dim }: { level: number; size?: 'sm' | 'md' | 'lg'; dim?: boolean }) {
  const box = { sm: 'h-7 w-7 text-[11px]', md: 'h-9 w-9 text-sm', lg: 'h-12 w-12 text-lg' }[size];
  return (
    <span
      className={clsx(
        'flex shrink-0 items-center justify-center rounded-xl font-extrabold tabular-nums',
        box,
        dim
          ? 'bg-ink-100 text-ink-400 dark:bg-white/[0.05] dark:text-ink-500'
          : 'bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-inset',
      )}
      title={`Niveau ${level}`}
    >
      {level}
    </span>
  );
}

/** De seneste syv dage som prikker — en stribe man ikke vil bryde. */
export function StreakStrip({ days, active }: { days: boolean[]; active: number }) {
  const names = ['M', 'T', 'O', 'T', 'F', 'L', 'S'];
  return (
    <div className="flex items-center gap-3">
      <span className="flex items-center gap-1.5 text-warn-500">
        <Icon name="flame" size={18} filled />
        <span className="text-lg font-extrabold tabular-nums text-ink-900 dark:text-ink-50">{active}</span>
      </span>
      <div className="flex gap-1">
        {days.map((on, i) => (
          <span key={i} className="flex flex-col items-center gap-1">
            <span
              className={clsx(
                'h-6 w-6 rounded-lg transition-colors',
                on ? 'bg-warn-400 dark:bg-warn-500' : 'bg-ink-200 dark:bg-white/[0.07]',
              )}
            />
            <span className="text-[9px] font-bold text-ink-400 dark:text-ink-500">{names[i]}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** XP-tal der flyver opad når man svarer rigtigt. */
export function XpPop({ amount, onDone }: { amount: number; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1100);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <span className="pointer-events-none absolute -top-1 left-1/2 z-20 -translate-x-1/2 animate-xp-rise text-lg font-extrabold text-xp-500 drop-shadow">
      +{amount} XP
    </span>
  );
}

/** Kombotæller under en serie rigtige svar. */
export function ComboMeter({ streak }: { streak: number }) {
  if (streak < 2) return null;
  return (
    <span
      className={clsx(
        'inline-flex animate-pop items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-extrabold',
        streak >= 5 ? 'bg-warn-500 text-ink-950' : 'bg-xp-500 text-ink-950',
      )}
    >
      <Icon name="bolt" size={12} filled />
      {streak} i træk
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Mærkater og navigation                                              */
/* ------------------------------------------------------------------ */

export function Chip({
  children,
  tone = 'neutral',
  className,
  icon,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'brand' | 'xp' | 'good' | 'warn' | 'bad' | 'accent';
  className?: string;
  icon?: IconName;
}) {
  const tones = {
    neutral: 'bg-ink-100 text-ink-600 dark:bg-white/[0.06] dark:text-ink-300',
    brand: 'bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
    xp: 'bg-xp-100 text-xp-700 dark:bg-xp-500/15 dark:text-xp-300',
    good: 'bg-good-100 text-good-700 dark:bg-good-500/15 dark:text-good-300',
    warn: 'bg-warn-100 text-warn-700 dark:bg-warn-500/15 dark:text-warn-300',
    bad: 'bg-bad-100 text-bad-700 dark:bg-bad-500/15 dark:text-bad-300',
    accent: 'bg-accent-100 text-accent-700 dark:bg-accent-500/15 dark:text-accent-300',
  }[tone];
  return (
    <span className={clsx('chip', tones, className)}>
      {icon ? <Icon name={icon} size={11} /> : null}
      {children}
    </span>
  );
}

export function LevelDots({ level, className }: { level: number; className?: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-[3px]', className)} title={`Niveau ${level} af 5`} aria-label={`Niveau ${level} af 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={clsx('h-1 w-2.5 rounded-full', i <= level ? 'bg-brand-500' : 'bg-ink-300 dark:bg-white/15')} />
      ))}
    </span>
  );
}

/** Segmenteret vælger — afløser faneblade, men strammere. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string; count?: number; icon?: IconName }[];
}) {
  return (
    <div className="mb-4 flex gap-1 rounded-xl bg-ink-100 p-1 dark:bg-white/[0.05]" role="tablist">
      {options.map((t) => {
        const on = value === t.id;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.id)}
            className={clsx(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-[13px] font-semibold transition-all duration-150 ease-spring',
              on
                ? 'bg-white text-ink-900 shadow-sm dark:bg-white/10 dark:text-white'
                : 'text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-200',
            )}
          >
            {t.icon ? <Icon name={t.icon} size={14} /> : null}
            {t.label}
            {t.count ? (
              <span
                className={clsx(
                  'rounded-md px-1.5 text-[10px] font-extrabold tabular-nums',
                  on ? 'bg-brand-500 text-white' : 'bg-ink-200 text-ink-600 dark:bg-white/10 dark:text-ink-300',
                )}
              >
                {t.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dialog og beskeder                                                  */
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
    ref.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/60 p-0 backdrop-blur-md sm:items-center sm:p-4" onClick={onClose}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={clsx(
          'max-h-[90vh] w-full animate-fade-up overflow-y-auto rounded-t-3xl border border-ink-200 bg-white p-5 shadow-lift outline-none',
          'dark:border-white/10 dark:bg-ink-900 sm:rounded-3xl',
          wide ? 'sm:max-w-2xl' : 'sm:max-w-md',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h3 className="text-lg font-extrabold">{title}</h3>
          <button onClick={onClose} className="btn-ghost -mr-2 -mt-1 p-1.5" aria-label="Luk">
            <Icon name="close" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Callout({
  tone = 'brand',
  title,
  children,
  icon,
}: {
  tone?: 'brand' | 'good' | 'warn' | 'bad' | 'neutral' | 'xp';
  title?: string;
  children: ReactNode;
  icon?: IconName;
}) {
  const tones = {
    brand: 'border-brand-200 bg-brand-50 text-brand-950 dark:border-brand-500/25 dark:bg-brand-500/10 dark:text-brand-100',
    xp: 'border-xp-200 bg-xp-100 text-xp-900 dark:border-xp-500/25 dark:bg-xp-500/10 dark:text-xp-200',
    good: 'border-good-200 bg-good-100 text-good-900 dark:border-good-500/25 dark:bg-good-500/10 dark:text-good-200',
    warn: 'border-warn-200 bg-warn-100 text-warn-900 dark:border-warn-500/25 dark:bg-warn-500/10 dark:text-warn-200',
    bad: 'border-bad-200 bg-bad-100 text-bad-900 dark:border-bad-500/25 dark:bg-bad-500/10 dark:text-bad-200',
    neutral: 'border-ink-200 bg-ink-50 text-ink-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-ink-300',
  }[tone];
  const fallback: IconName = tone === 'warn' ? 'warning' : tone === 'bad' ? 'close' : tone === 'good' || tone === 'xp' ? 'check' : 'info';
  return (
    <div className={clsx('rounded-xl border px-3.5 py-3 text-sm leading-relaxed', tones)}>
      <div className="flex items-start gap-2.5">
        <Icon name={icon ?? fallback} size={16} className="mt-0.5 shrink-0" />
        <div className="min-w-0">
          {title ? <p className="mb-0.5 font-bold">{title}</p> : null}
          <div>{children}</div>
        </div>
      </div>
    </div>
  );
}

export function Toast({ message, onDone, tone = 'xp', icon }: { message: string; onDone: () => void; tone?: 'xp' | 'brand' | 'warn'; icon?: IconName }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [onDone]);
  const tones = { xp: 'bg-xp-500 text-ink-950', brand: 'bg-brand-600 text-white', warn: 'bg-warn-500 text-ink-950' }[tone];
  return (
    <div className={clsx('flex animate-pop items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-bold shadow-lift', tones)} role="status">
      {icon ? <Icon name={icon} size={16} filled /> : null}
      {message}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Diverse                                                             */
/* ------------------------------------------------------------------ */

export function EmptyState({ icon, title, body, action }: { icon: IconName; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-ink-300 px-6 py-10 text-center dark:border-white/10">
      <IconTile name={icon} tone="neutral" size="lg" />
      <p className="font-bold">{title}</p>
      <p className="max-w-sm text-sm text-ink-500 dark:text-ink-400">{body}</p>
      {action}
    </div>
  );
}

export function Disclosure({ summary, children, defaultOpen }: { summary: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className="overflow-hidden rounded-xl border border-ink-200 dark:border-white/10">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold"
        aria-expanded={open}
      >
        {summary}
        <Icon name="chevron" size={16} className={clsx('shrink-0 text-ink-400 transition-transform duration-200', open && 'rotate-90')} />
      </button>
      {open ? <div className="animate-fade-in border-t border-ink-200 px-4 py-3 dark:border-white/10">{children}</div> : null}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-ink-500">
      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink-300 border-t-brand-500" aria-hidden />
      {label}
    </span>
  );
}

export function StatRow({ stats }: { stats: { label: string; value: string; tone?: 'brand' | 'xp' | 'good' | 'warn' | 'accent' }[] }) {
  return (
    <div className="card grid grid-cols-3 divide-x divide-ink-200 dark:divide-white/[0.07]">
      {stats.map((s) => (
        <div key={s.label} className="px-2 py-3 text-center">
          <p
            className={clsx(
              'text-lg font-extrabold leading-none tabular-nums',
              s.tone === 'xp' && 'text-xp-600 dark:text-xp-400',
              s.tone === 'good' && 'text-good-600 dark:text-good-400',
              s.tone === 'warn' && 'text-warn-600 dark:text-warn-400',
              s.tone === 'accent' && 'text-accent-600 dark:text-accent-400',
              s.tone === 'brand' && 'text-brand-600 dark:text-brand-400',
            )}
          >
            {s.value}
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-ink-400 dark:text-ink-500">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
