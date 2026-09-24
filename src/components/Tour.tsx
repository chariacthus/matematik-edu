import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import clsx from 'clsx';
import { Icon } from './Icon';
import { Portal } from './Portal';

export interface TourStep {
  /** data-tour-værdien på det element der skal fremhæves. Uden target vises kortet midt på skærmen. */
  target?: string;
  title: string;
  body: string;
}

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Finder det synlige element med et givet data-tour.
 *
 * Både top- og bundmenuen bærer de samme navne, men kun den ene er
 * fremme ad gangen. Et skjult element har en kasse på 0x0, så det er
 * nok at springe dem over.
 */
function visibleTarget(name: string): Element | null {
  const all = [...document.querySelectorAll(`[data-tour="${name}"]`)];
  return all.find((el) => el.getBoundingClientRect().width > 0) ?? null;
}

export function Tour({ steps, onDone }: { steps: TourStep[]; onDone: () => void }) {
  const [i, setI] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  // Kortet vises først når målet er målt. Ellers står det midt på
  // skærmen et øjeblik og springer så hen til sin plads.
  const [ready, setReady] = useState(false);
  const step = steps[i];

  const measure = useCallback(() => {
    if (!step?.target) {
      setBox(null);
      setReady(true);
      return;
    }
    const el = visibleTarget(step.target);
    if (!el) {
      setBox(null);
      setReady(true);
      return;
    }
    const r = el.getBoundingClientRect();
    const pad = 8;
    setBox({ top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 });
    setReady(true);
  }, [step]);

  useLayoutEffect(() => {
    if (step?.target) setReady(false);
    const el = step?.target ? visibleTarget(step.target) : null;
    if (el) {
      const r = el.getBoundingClientRect();
      // Rul kun hvis målet ikke allerede er fremme. Bundmenuen er
      // position: fixed, og scrollIntoView får siden til at jagte den -
      // så måles kassen midt i en rulning og markeringen rammer forbi.
      const visible = r.top >= 0 && r.bottom <= window.innerHeight;
      if (!visible) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    const t = setTimeout(measure, 320);
    return () => clearTimeout(t);
  }, [step, measure]);

  useEffect(() => {
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [measure]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDone();
      if (e.key === 'ArrowRight') setI((v) => Math.min(v + 1, steps.length - 1));
      if (e.key === 'ArrowLeft') setI((v) => Math.max(v - 1, 0));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onDone, steps.length]);

  if (!step) return null;

  const last = i === steps.length - 1;
  const CARD = 250;
  // Et punkt i sidemenuen: kortet står til højre for det. Ellers under
  // hullet hvis der er plads til kortet dernede, og over hvis ikke.
  const beside = box ? box.left + box.width < 300 && window.innerWidth >= 1024 : false;
  const below = box ? box.top + box.height + CARD + 24 < window.innerHeight : true;

  return (
    <Portal>
      <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Rundvisning">
        {box ? (
          <div
            // Ingen overgang på geometrien: markeringen skal stå præcis
            // hvor kortet regner med den, og et hul der glider på plads
            // 300 ms efter kortet ser ud som en fejl.
            className="pointer-events-none absolute animate-fade-in rounded-2xl ring-2 ring-brand-400"
            style={{
              top: box.top,
              left: box.left,
              width: box.width,
              height: box.height,
              // Hullet laves med en meget stor skygge i stedet for en
              // maske - så er der ingen kanter der ikke passer sammen.
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.72)',
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-black/72" />
        )}

        {/*
          Kortet centreres med flex, ikke med -translate-x-1/2:
          animate-swap-in sætter selv en transform, og den ville erstatte
          forskydningen, så kortet endte uden for skærmen.
        */}
        <div
          className={clsx(
            'absolute flex justify-center',
            box ? (beside ? '' : 'inset-x-3') : 'inset-0 items-center',
            !ready && 'invisible',
          )}
          style={
            box
              ? beside
                ? { left: box.left + box.width + 16, top: Math.max(12, Math.min(box.top - 8, window.innerHeight - CARD - 24)), width: 352 }
                : below
                  ? { top: box.top + box.height + 14 }
                  : // Over hullet - men aldrig over skærmens kant.
                    { top: Math.max(12, box.top - CARD - 14) }
              : undefined
          }
        >
        <div className="glass-strong w-full max-w-sm animate-swap-in rounded-2xl p-4 shadow-lift">
          <p className="eyebrow mb-1.5">
            Trin {i + 1} af {steps.length}
          </p>
          <h2 className="mb-1.5 text-lg font-extrabold">{step.title}</h2>
          <p className="text-sm leading-relaxed text-ink-600 dark:text-ink-300">{step.body}</p>

          <div className="mt-3.5 flex items-center gap-2">
            <span className="flex flex-1 gap-1" aria-hidden>
              {steps.map((_, n) => (
                <span
                  key={n}
                  className={clsx(
                    'h-1 flex-1 rounded-full transition-colors',
                    n <= i ? 'bg-brand-500' : 'bg-ink-200 dark:bg-white/10',
                  )}
                />
              ))}
            </span>
          </div>

          <div className="mt-3.5 flex items-center justify-between gap-2">
            <button onClick={onDone} className="btn-ghost text-xs">
              Spring over
            </button>
            <span className="flex gap-2">
              {i > 0 ? (
                <button onClick={() => setI(i - 1)} className="btn-secondary text-xs">
                  Tilbage
                </button>
              ) : null}
              <button onClick={() => (last ? onDone() : setI(i + 1))} className="btn-primary text-xs">
                {last ? 'Så er jeg klar' : 'Videre'}
                {last ? null : <Icon name="arrow-right" size={14} />}
              </button>
            </span>
          </div>
        </div>
        </div>
      </div>
    </Portal>
  );
}
