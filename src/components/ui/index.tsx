import { type HTMLAttributes, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Icon, type IconName } from '../Icon';
import { MathInline } from '../MathText';
import { Portal } from '../Portal';

/* ------------------------------------------------------------------ */
/* Flader                                                              */
/* ------------------------------------------------------------------ */

export type Tone = 'brand' | 'xp' | 'good' | 'warn' | 'bad' | 'accent' | 'neutral';

export function Card({
  children,
  className,
  pad = 'md',
  raised,
  interactive,
  tone,
  as: As = 'div',
  ...rest
}: {
  children: ReactNode;
  className?: string;
  pad?: 'none' | 'sm' | 'md' | 'lg';
  raised?: boolean;
  /** Kanten tager kortets farve ved hover, og lyset følger musen. */
  interactive?: boolean;
  tone?: Tone;
  as?: 'div' | 'section' | 'article' | 'li';
} & Omit<HTMLAttributes<HTMLElement>, 'className' | 'children'>) {
  const padding = { none: '', sm: 'p-3', md: 'p-4', lg: 'p-5' }[pad];
  // rest videresendes, så data-tour og aria-* når frem til DOM'en.
  return (
    <As
      className={clsx(interactive ? 'card-interactive' : raised ? 'card-raised' : 'card', tone && `tone-${tone}`, padding, className)}
      {...rest}
    >
      {children}
    </As>
  );
}

/** Emnets egen formel på et stykke ternet papir. Pynt for skærmlæsere, derfor skjult. */
export function FormulaTile({ tex, size = 'md' }: { tex: string; size?: 'md' | 'lg' }) {
  return (
    <span
      aria-hidden
      data-formula
      className={clsx(
        'paper-tile flex items-center overflow-hidden rounded-xl',
        size === 'lg' ? 'h-20 px-4 text-2xl' : 'h-14 px-3 text-lg',
      )}
    >
      <MathInline tex={tex} className="whitespace-nowrap" />
    </span>
  );
}

/** Ikon i en farvet flade — den eneste måde ikoner vises på i appen. */
export function IconTile({
  name,
  tone = 'brand',
  size = 'md',
  className,
}: {
  name: IconName;
  tone?: 'brand' | 'xp' | 'good' | 'warn' | 'bad' | 'accent' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
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
      <Icon name={name} size={icon} />
    </span>
  );
}

/** Et kort faktum: "8 min", "20 opgaver", "0/5 mestret". */
export function MetaChip({
  icon,
  children,
  tone = 'neutral',
  className,
}: {
  icon?: IconName;
  children: ReactNode;
  tone?: 'neutral' | 'brand' | 'xp' | 'good' | 'warn' | 'bad' | 'accent';
  className?: string;
}) {
  // Udfyldt som chipsene på prøvevalget, med en hårfin kant så de står
  // skarpt på både lyst og mørkt.
  const tones = {
    neutral: 'border-ink-200 bg-ink-100 text-ink-600 dark:border-white/[0.06] dark:bg-white/[0.06] dark:text-ink-300',
    brand: 'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-400/20 dark:bg-brand-500/15 dark:text-brand-300',
    xp: 'border-xp-200 bg-xp-100 text-xp-700 dark:border-xp-400/20 dark:bg-xp-500/15 dark:text-xp-300',
    good: 'border-good-200 bg-good-100 text-good-700 dark:border-good-400/20 dark:bg-good-500/15 dark:text-good-300',
    warn: 'border-warn-200 bg-warn-100 text-warn-700 dark:border-warn-400/20 dark:bg-warn-500/15 dark:text-warn-300',
    bad: 'border-bad-200 bg-bad-100 text-bad-700 dark:border-bad-400/20 dark:bg-bad-500/15 dark:text-bad-300',
    accent: 'border-accent-200 bg-accent-100 text-accent-700 dark:border-accent-400/20 dark:bg-accent-500/15 dark:text-accent-300',
  }[tone];
  return (
    <span className={clsx('num inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-medium', tones, className)}>
      {icon ? <Icon name={icon} size={13} /> : null}
      {children}
    </span>
  );
}

/**
 * Valgkortet.
 *
 * Prøvevalgets kort som komponent: ikon, titel, to linjers beskrivelse,
 * fakta som chips og én handling. Et kort er ét valg.
 *
 * Med onClick er hele kortet klikbart; med action er der en knap nederst,
 * og selve kortet står stille.
 */
export function ChoiceCard({
  icon,
  preview,
  tone = 'brand',
  eyebrow,
  title,
  description,
  meta,
  action,
  onClick,
  selected,
  size = 'lg',
  children,
  className,
  ...rest
}: {
  icon?: IconName;
  preview?: ReactNode;
  tone?: Tone;
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  meta?: { icon?: IconName; label: ReactNode }[];
  action?: { label: string; onClick: () => void; icon?: IconName };
  onClick?: () => void;
  selected?: boolean;
  size?: 'lg' | 'md';
  children?: ReactNode;
  className?: string;
} & Omit<HTMLAttributes<HTMLElement>, 'className' | 'children' | 'title' | 'onClick'>) {
  const lg = size === 'lg';
  // Står kortet stille med en knap, er titlen en overskrift, så en
  // skærmlæser kan hoppe mellem valgene. Er hele kortet en knap, må der
  // ikke ligge en overskrift inde i den.
  const Title = onClick ? 'span' : 'h3';
  const body = (
    <>
      {selected ? (
        <span className="absolute right-3 top-3 flex h-6 w-6 animate-pop items-center justify-center rounded-full bg-brand-600 text-white" aria-hidden>
          <Icon name="check" size={14} />
        </span>
      ) : null}
      <span className="flex items-start justify-between gap-3">
        {preview ? (
          <span className="block min-w-0 flex-1">{preview}</span>
        ) : icon ? (
          <IconTile name={icon} tone={tone} size={lg ? 'lg' : 'md'} />
        ) : null}
        {eyebrow && !selected ? <span className="eyebrow shrink-0 pt-1 text-right">{eyebrow}</span> : null}
      </span>
      <Title className={clsx('block font-semibold tracking-tight', lg ? 'mt-4 text-lg' : 'mt-3 text-md')}>{title}</Title>
      {description ? (
        <span className={clsx('mt-1.5 block leading-relaxed text-ink-600 dark:text-ink-400', lg ? 'text-sm' : 'line-clamp-2 text-sm')}>
          {description}
        </span>
      ) : null}
      {meta?.length ? (
        <span className="mt-3.5 flex flex-wrap gap-1.5">
          {meta.map((m, i) => (
            <MetaChip key={i} icon={m.icon}>
              {m.label}
            </MetaChip>
          ))}
        </span>
      ) : null}
      {children ? <span className="mt-3.5 block">{children}</span> : null}
    </>
  );

  const frame = clsx(
    'flex flex-col text-left',
    lg ? 'rounded-3xl p-5 sm:p-6' : 'rounded-2xl p-4',
    `tone-${tone}`,
    selected && 'ring-1 ring-brand-500 [border-color:theme(colors.brand.500)]',
    className,
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-pressed={selected} className={clsx('card-interactive', frame)} {...rest}>
        {body}
      </button>
    );
  }
  return (
    <div className={clsx('card relative', frame)} {...rest}>
      {body}
      {action ? (
        // mt-auto skubber knappen til bunden når kort står side om side;
        // afstanden til indholdet ligger i padding, så de to ikke kæmper.
        <span className={clsx('mt-auto block', lg ? 'pt-5' : 'pt-4')}>
          <button onClick={action.onClick} className={clsx('btn-primary w-full', lg && 'btn-lg')}>
            {action.label}
            <Icon name={action.icon ?? 'arrow-right'} size={16} />
          </button>
        </span>
      ) : null}
    </div>
  );
}

/** Et tal der skal ses fra afstand: stime, dagens mål, karakter. */
export function StatTile({
  label,
  icon,
  value,
  suffix,
  hint,
  tone = 'neutral',
  children,
  className,
  ...rest
}: {
  label: ReactNode;
  icon?: IconName;
  value: number | string;
  suffix?: ReactNode;
  hint?: ReactNode;
  tone?: 'neutral' | 'brand' | 'xp' | 'warn';
  children?: ReactNode;
  className?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'children'>) {
  const iconTone = { neutral: 'text-ink-500 dark:text-ink-400', brand: 'text-brand-400', xp: 'text-xp-400', warn: 'text-orange-400' }[tone];
  return (
    <div className={clsx('card flex flex-col rounded-2xl p-4', className)} {...rest}>
      <span className="eyebrow flex items-center gap-1.5">
        {icon ? <Icon name={icon} size={13} className={iconTone} /> : null}
        {label}
      </span>
      <span className="num mt-2 flex items-baseline gap-1 text-3xl font-semibold leading-none tracking-tight">
        {typeof value === 'number' ? <CountUp value={value} /> : value}
        {suffix ? <span className="text-sm font-medium text-ink-500 dark:text-ink-400">{suffix}</span> : null}
      </span>
      {children ? <span className="mt-3 block">{children}</span> : null}
      {hint ? <span className="mt-2 block text-xs leading-snug text-ink-500 dark:text-ink-400">{hint}</span> : null}
    </div>
  );
}

/**
 * En række i en liste: ikon, titel, undertekst, noget i højre side og en
 * pil. "card" står alene; "plain" ligger inde i et kort med flere rækker.
 */
export function ListRow({
  icon,
  tone = 'brand',
  title,
  subtitle,
  trailing,
  onClick,
  chevron = true,
  variant = 'card',
  className,
  ...rest
}: {
  icon?: IconName;
  tone?: Tone;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  chevron?: boolean;
  variant?: 'card' | 'plain';
  className?: string;
} & Omit<HTMLAttributes<HTMLElement>, 'className' | 'children' | 'title' | 'onClick'>) {
  const inner = (
    <>
      {icon ? <IconTile name={icon} tone={tone} size="sm" /> : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{title}</span>
        {subtitle ? <span className="mt-0.5 block truncate text-xs text-ink-500 dark:text-ink-400">{subtitle}</span> : null}
      </span>
      {trailing ? <span className="shrink-0">{trailing}</span> : null}
      {onClick && chevron ? (
        <Icon name="chevron" size={16} className="shrink-0 text-ink-500 dark:text-ink-400 transition-transform duration-150 group-hover:translate-x-0.5" />
      ) : null}
    </>
  );
  const frame = clsx(
    'group flex w-full items-center gap-3 text-left',
    variant === 'card' ? 'rounded-2xl p-3.5' : 'rounded-xl px-2.5 py-2.5 transition-colors hover:bg-ink-100 dark:hover:bg-white/[0.04]',
    variant === 'card' && `tone-${tone}`,
    className,
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={clsx(variant === 'card' && 'card-interactive', frame)} {...rest}>
        {inner}
      </button>
    );
  }
  return (
    <div className={clsx(variant === 'card' && 'card', frame)} {...rest}>
      {inner}
    </div>
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

/**
 * Sideskallen.
 *
 * Hver rute havde sin egen lodrette rytme - nogle sider brugte
 * space-y-4, andre space-y-6, og en del satte mb-3/4/5 i hånden på hver
 * sektion. Resultatet var at afstanden mellem to overskrifter skiftede
 * alt efter hvilken side man stod på. Her ligger rytmen ét sted.
 *
 * Sektioner er søskende i samme flow, så de skal ikke selv sætte
 * bundmargen. Det er det, der holder siderne ens.
 */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('space-y-6', className)}>{children}</div>;
}

/** En sektion på en side: overskrift plus indhold, med fast afstand. */
export function Section({
  title,
  hint,
  action,
  children,
  className,
}: {
  title?: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      {title ? <SectionTitle hint={hint} action={action}>{title}</SectionTitle> : null}
      {children}
    </section>
  );
}

/**
 * Overskrift inde i et kort.
 *
 * Adskilt fra SectionTitle, som er den lille versaloverskrift OVER et
 * kort. De to roller var blandet sammen og skrevet i hånden hver gang,
 * så den samme slags overskrift optrådte med fire forskellige vægte og
 * tre forskellige bundmargener.
 */
export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={clsx('mb-2.5 text-sm font-bold', className)}>{children}</h3>;
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
    <header className="paper-head">
      {back ? (
        <button onClick={back.onClick} className="btn-ghost -ml-2 mb-1 gap-1 px-2 py-1 text-xs">
          <Icon name="arrow-left" size={14} />
          {back.label}
        </button>
      ) : null}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="title-page">{title}</h1>
          {subtitle ? <p className="mt-1.5 text-sm text-ink-500 dark:text-ink-400">{subtitle}</p> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
    </header>
  );
}

/**
 * Den smalle bjælke øverst mens man arbejder: luk, hvad man er i gang
 * med, og hvor langt man er. Den står i stedet for menuerne.
 */
export function FocusBar({
  title,
  meta,
  progress,
  progressLabel,
  tone = 'brand',
  onExit,
  exitLabel,
  right,
  track,
}: {
  title: string;
  meta?: ReactNode;
  progress: number;
  progressLabel: string;
  /** I stedet for den almindelige streg, fx lektionens syv trin. */
  track?: ReactNode;
  tone?: 'brand' | 'accent' | 'xp';
  onExit: () => void;
  exitLabel: string;
  right?: ReactNode;
}) {
  return (
    <div
      data-focusbar
      className="sticky top-0 z-20 -mx-4 border-b border-ink-200 bg-ink-50/90 px-4 py-2 backdrop-blur-xl dark:border-white/[0.07] dark:bg-ink-950/85 lg:top-4 lg:mx-0 lg:rounded-2xl lg:border lg:px-3"
    >
      <div className="flex items-center gap-2.5">
        <button onClick={onExit} className="btn-ghost -ml-2 h-10 w-10 shrink-0 p-0 lg:ml-0" aria-label={exitLabel} title={exitLabel}>
          <Icon name="close" size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-sm font-semibold">{title}</span>
            {meta ? <span className="num shrink-0 text-xs text-ink-500 dark:text-ink-400">{meta}</span> : null}
          </div>
          <div className="mt-1.5">
            {track ?? <ProgressBar value={progress} size="sm" tone={tone} label={progressLabel} />}
          </div>
        </div>
        {right ? <span className="flex shrink-0 items-center gap-2">{right}</span> : null}
      </div>
    </div>
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

  return <span className={clsx('num', className)}>{shown}</span>;
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
      <div
        className={clsx('h-full origin-left animate-bar-grow rounded-full transition-[width] duration-700 ease-spring', bar)}
        style={{ width: `${pct}%` }}
      />
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
          // Ringen fyldes op første gang den vises og glider derefter.
          // Uden forwards: når animationen slutter, overtager attributten
          // med samme værdi, så senere ændringer stadig får overgangen.
          style={{ ['--ring-len' as string]: c, ['--ring-off' as string]: c - (c * pct) / 100 }}
          className={clsx('animate-ring-fill transition-[stroke-dashoffset] duration-[900ms] ease-spring', colour)}
        />
      </svg>
      <span className="absolute text-2xs num font-bold">{children ?? `${Math.round(pct)}%`}</span>
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
        <span className="shrink-0 text-xs font-bold num text-ink-500 dark:text-ink-400">{right}</span>
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

/**
 * XP-bjælken.
 *
 * Tyk, med neon-gradient og en lysstribe der vandrer hen over. Ved
 * niveauskift skifter den til fejringstilstand: mærket hopper, en ring
 * sprænger udad, og bjælken gløder indtil animationen er ovre.
 */
export function XpBar({
  level,
  into,
  needed,
  compact,
  levelUp,
}: {
  level: number;
  into: number;
  needed: number;
  compact?: boolean;
  /** Sat i det øjeblik eleven er steget et niveau. */
  levelUp?: boolean;
}) {
  const pct = needed > 0 ? Math.min(100, (into / needed) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <LevelBadge level={level} size={compact ? 'sm' : 'md'} celebrate={levelUp} />

      <div className="min-w-0 flex-1">
        <div
          className={clsx(
            'relative w-full overflow-hidden rounded-full border transition-shadow duration-500',
            compact ? 'h-2.5' : 'h-3',
            levelUp
              ? 'border-xp-400/60 shadow-glow-xp'
              : 'border-ink-200 dark:border-white/[0.08]',
            'bg-ink-100 dark:bg-ink-850',
          )}
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Fremgang mod niveau ${level + 1}`}
        >
          <div
            className="neon-xp relative h-full rounded-full transition-[width] duration-[900ms] ease-spring"
            style={{ width: `${Math.max(pct, pct > 0 ? 4 : 0)}%` }}
          >
            {/* En tynd lysning langs overkanten, samme greb som på
                fladerne. Den løbende lysstribe er væk - den blinkede
                konstant i udkanten af synsfeltet. */}
            <span className="absolute inset-x-0 top-0 h-px rounded-t-full bg-white/30" aria-hidden />
          </div>
        </div>

        {!compact ? (
          <p className="mt-1.5 text-2xs font-bold num text-ink-500 dark:text-ink-400">
            <CountUp value={into} /> / {needed} XP
          </p>
        ) : null}
      </div>

      {!compact ? <LevelBadge level={level + 1} size="sm" dim /> : null}
    </div>
  );
}

export function LevelBadge({
  level,
  size = 'md',
  dim,
  celebrate,
}: {
  level: number;
  size?: 'sm' | 'md' | 'lg';
  dim?: boolean;
  celebrate?: boolean;
}) {
  const box = { sm: 'h-7 w-7 text-2xs', md: 'h-9 w-9 text-sm', lg: 'h-12 w-12 text-lg' }[size];
  return (
    <span className="relative inline-flex shrink-0">
      {/* Ringen der sprænger udad ved niveauskift. */}
      {celebrate ? (
        <span className="absolute inset-0 animate-level-burst rounded-xl border-2 border-xp-400" aria-hidden />
      ) : null}
      <span
        className={clsx(
          'flex items-center justify-center rounded-xl num font-bold',
          box,
          celebrate && 'animate-level-pop',
          dim
            ? 'bg-ink-100 text-ink-600 dark:bg-white/[0.05] dark:text-ink-300'
            : celebrate
              ? 'bg-xp-500 text-ink-950 shadow-glow-xp'
              : 'bg-brand-600 text-white shadow-inset',
        )}
        title={`Niveau ${level}`}
      >
        {level}
      </span>
    </span>
  );
}

/** Fejringsbanner når eleven stiger et niveau. */
export function LevelUpBanner({ level, title, onDone }: { level: number; title: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4200);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <Portal>
      <div className="pointer-events-none fixed inset-x-0 top-16 z-50 flex justify-center px-4">
        <button
          onClick={onDone}
          className="glass-strong pointer-events-auto flex animate-panel-in items-center gap-3 rounded-2xl border-xp-500/40 px-4 py-3 shadow-lift"
        >
          <LevelBadge level={level} size="lg" celebrate />
          <span className="text-left">
            <span className="block text-2xs font-bold uppercase tracking-[0.14em] text-xp-600 dark:text-xp-400">
              Niveau {level} nået
            </span>
            <span className="block text-base font-bold">{title}</span>
          </span>
        </button>
      </div>
    </Portal>
  );
}

/**
 * Dagsstriben.
 *
 * Aktive dage har en flamme der gløder; missede dage er en dæmpet
 * omrids. Dagens felt trækker vejret, så man kan se hvad der står på
 * spil lige nu.
 */
export function StreakStrip({ days, active }: { days: boolean[]; active: number }) {
  const names = ['M', 'T', 'O', 'T', 'F', 'L', 'S'];
  const today = days.length - 1;
  return (
    <div className="flex items-center gap-3">
      <span className="flex items-center gap-1.5">
        <Icon
          name="flame"
          size={20}
          className={clsx(active > 0 ? 'animate-flame-glow text-orange-400' : 'text-ink-300 dark:text-ink-600')}
        />
        <span className="num text-xl font-bold leading-none">{active}</span>
      </span>

      <div className="flex gap-1">
        {days.map((on, i) => {
          const isToday = i === today;
          return (
            <span key={i} className="flex animate-streak-lift flex-col items-center gap-1" style={{ animationDelay: `${i * 45}ms` }}>
              <span
                className={clsx(
                  'flex h-7 w-7 items-center justify-center rounded-lg border transition-all duration-300',
                  on
                    ? 'border-orange-300/60 bg-orange-400/20 text-orange-400 dark:border-orange-400/40'
                    : 'border-ink-200 bg-ink-100/60 text-ink-300 dark:border-white/[0.07] dark:bg-white/[0.03] dark:text-ink-700',
                  on && isToday && 'animate-flame-glow',
                )}
                title={on ? 'Aktiv dag' : 'Ingen aktivitet'}
              >
                <Icon name={on ? 'flame' : 'bolt'} size={14} />
              </span>
              <span className={clsx('text-2xs font-bold', isToday ? 'text-ink-700 dark:text-ink-200' : 'text-ink-500 dark:text-ink-400')}>
                {names[i]}
              </span>
            </span>
          );
        })}
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
    <span className="pointer-events-none absolute -top-1 left-1/2 z-20 -translate-x-1/2 animate-xp-rise text-lg font-bold text-xp-500 drop-shadow">
      +{amount} XP
    </span>
  );
}

/** Kombotæller under en serie rigtige svar. */
export function ComboMeter({ streak }: { streak: number }) {
  if (streak < 2) return null;
  return (
    <span
      key={streak}
      className={clsx(
        'inline-flex animate-combo-beat items-center gap-1 rounded-lg px-2 py-1 text-2xs font-bold',
        streak >= 5 ? 'bg-warn-500 text-ink-950' : 'bg-xp-500 text-ink-950',
      )}
    >
      <Icon name="bolt" size={12} />
      {streak} i træk
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Mærkater og navigation                                              */
/* ------------------------------------------------------------------ */

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
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string; count?: number; icon?: IconName }[];
  className?: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<{ x: number; w: number } | null>(null);

  // Markøren måles ud fra den valgte knap og glider derhen. Den flyttes
  // med transform på sit eget element - intet andet på elementet bruger
  // transform, så de ikke kan overskrive hinanden.
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const measure = () => {
      const btn = el.querySelector<HTMLElement>('[aria-selected="true"]');
      if (btn) setPill({ x: btn.offsetLeft, w: btn.offsetWidth });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [value, options.length]);

  return (
    <div ref={wrap} className={clsx('relative flex gap-1 rounded-xl border border-ink-200 bg-ink-100/60 p-1 dark:border-white/[0.06] dark:bg-white/[0.03]', className ?? 'mb-4')} role="tablist">
      {pill ? (
        <span
          className="absolute bottom-1 top-1 rounded-lg border border-ink-200 bg-white shadow-sm transition-[transform,width] duration-300 ease-spring dark:border-white/10 dark:bg-ink-800"
          style={{ width: pill.w, transform: `translateX(${pill.x - 4}px)`, left: 4 }}
          aria-hidden
        />
      ) : null}
      {options.map((t) => {
        const on = value === t.id;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.id)}
            className={clsx(
              'relative z-10 flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors duration-150 sm:min-h-0',
              on ? 'text-ink-900 dark:text-white' : 'text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-200',
            )}
          >
            {t.icon ? <Icon name={t.icon} size={14} /> : null}
            {t.label}
            {t.count ? (
              <span
                className={clsx(
                  'num rounded-md px-1.5 text-2xs font-semibold',
                  on ? 'bg-brand-600 text-white' : 'bg-ink-200 text-ink-600 dark:bg-white/10 dark:text-ink-300',
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

/** Sender fokus tilbage til det der åbnede et panel, når det lukker igen. */
export function useReturnFocus(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const opener = document.activeElement as HTMLElement | null;
    return () => opener?.focus?.({ preventScroll: true });
  }, [active]);
}

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
  useReturnFocus(open);

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
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/60 p-0 backdrop-blur-md sm:items-center sm:p-4" onClick={onClose}>
        <div
          ref={ref}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={clsx(
            'glass-strong flex max-h-[90vh] w-full animate-fade-up flex-col rounded-t-3xl shadow-lift outline-none',
            'sm:rounded-3xl',
            wide ? 'sm:max-w-2xl' : 'sm:max-w-md',
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Rulningen ligger indenfor, så den skinnende kant bliver
              stående i stedet for at rulle op med indholdet. */}
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <div className="mb-4 flex items-start justify-between gap-4">
              <h3 className="text-lg font-bold">{title}</h3>
              <button onClick={onClose} className="btn-ghost -my-2 -mr-3 h-11 w-11 p-0" aria-label="Luk">
                <Icon name="close" size={18} />
              </button>
            </div>
            {children}
          </div>
        </div>
      </div>
    </Portal>
  );
}

export function Callout({
  tone = 'brand',
  title,
  children,
  icon,
  className,
}: {
  tone?: 'brand' | 'good' | 'warn' | 'bad' | 'neutral' | 'xp';
  title?: string;
  children: ReactNode;
  icon?: IconName;
  className?: string;
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
    <div className={clsx('rounded-xl border px-3.5 py-3 text-sm leading-relaxed', tones, className)}>
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
      {icon ? <Icon name={icon} size={16} /> : null}
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
        <Icon name="chevron" size={16} className={clsx('shrink-0 text-ink-500 dark:text-ink-400 transition-transform duration-200', open && 'rotate-90')} />
      </button>
      {/* Højden foldes ud med grid-rows 0fr -> 1fr, så indholdet glider
          frem i stedet for at springe. */}
      <div
        className={clsx('grid transition-[grid-template-rows] duration-300 ease-spring', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}
        aria-hidden={!open}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-ink-200 px-4 py-3 dark:border-white/10">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** Pladsholder mens noget hentes: grå linjer med et glimt der løber hen over dem. */
export function Skeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={clsx('card space-y-3 rounded-3xl p-6', className)} aria-busy="true" aria-label="Henter">
      <div className="shimmer h-3 w-1/3 rounded-full bg-ink-100 dark:bg-white/[0.06]" />
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="shimmer h-4 rounded-full bg-ink-100 dark:bg-white/[0.06]" style={{ width: `${88 - i * 18}%` }} />
      ))}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-ink-500 dark:text-ink-400">
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
              'num text-lg font-bold leading-none',
              s.tone === 'xp' && 'text-xp-600 dark:text-xp-400',
              s.tone === 'good' && 'text-good-600 dark:text-good-400',
              s.tone === 'warn' && 'text-warn-600 dark:text-warn-400',
              s.tone === 'accent' && 'text-accent-600 dark:text-accent-400',
              s.tone === 'brand' && 'text-brand-600 dark:text-brand-400',
            )}
          >
            {s.value}
          </p>
          <p className="mt-1 text-2xs font-bold uppercase tracking-wide text-ink-500 dark:text-ink-400">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
