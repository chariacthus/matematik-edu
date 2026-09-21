import { useEffect } from 'react';
import clsx from 'clsx';
import type { Problem, Skill, SkillState } from '../types';
import { TutorPanel } from './TutorPanel';
import { Icon } from './Icon';
import { Portal } from './Portal';
import { useIsNarrow } from '../lib/media';

/**
 * AI-lærerens ramme.
 *
 * Ikke en dialogboks: på en stor skærm er det et flydende glaspanel i
 * hjørnet, så eleven kan se opgaven mens der spørges. Det er hele
 * pointen — en modal der dækker opgaven tvinger én til at huske hvad
 * man var i gang med.
 *
 * På en telefon er der ikke plads ved siden af, så der bliver det et
 * ark der glider op nedefra.
 *
 * Panelet hænges på <body> gennem en Portal. Opgavekortet er af glas,
 * og `backdrop-filter` gør et element til udgangspunkt for sine faste
 * efterkommere — uden portalen ville panelet blive målt ud fra kortet
 * og ende som en stump på et par hundrede pixels.
 */
export function TutorDock({
  open,
  onClose,
  problem,
  skill,
  state,
  attemptedWrong,
  onHintUsed,
}: {
  open: boolean;
  onClose: () => void;
  problem: Problem;
  skill: Skill;
  state?: SkillState;
  attemptedWrong: boolean;
  onHintUsed: () => void;
}) {
  const narrow = useIsNarrow();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  /*
    Panelet svæver over siden, og på en bred skærm lagde det sig hen
    over højre side af opgaven - hintet forsvandt ind under det. Her
    sættes et mærke på <body> mens panelet er åbent, så indholdet kan
    rykke til side i CSS. Det sparer os for at trække tilstanden
    igennem hele komponenttræet, og på telefon dækker panelet alligevel
    med vilje.
  */
  useEffect(() => {
    if (!open || narrow) return;
    document.body.dataset.tutor = 'open';
    return () => {
      delete document.body.dataset.tutor;
    };
  }, [open, narrow]);

  if (!open) return null;

  return (
    <Portal>
      {/* Kun på telefon dæmpes baggrunden — på desktop skal opgaven
          stadig kunne læses ved siden af panelet. */}
      {narrow ? (
        <div className="fixed inset-0 z-40 bg-ink-950/50 backdrop-blur-sm sm:hidden" onClick={onClose} aria-hidden />
      ) : null}

      <div
        role="dialog"
        aria-modal={narrow}
        aria-label="AI-lærer"
        className={clsx(
          'glass-strong edge edge-strong fixed z-50 flex animate-panel-in flex-col overflow-hidden rounded-3xl shadow-lift',
          narrow
            ? 'safe-bottom inset-x-2 bottom-2 top-24'
            : 'bottom-6 right-6 h-[560px] w-[400px]',
        )}
      >
        <header className="flex items-center gap-2.5 border-b border-ink-200/70 px-4 py-3 dark:border-white/[0.08]">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-inset">
            <Icon name="sparkle" size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold leading-tight">AI-lærer</p>
            <p className="truncate text-[11px] text-ink-500 dark:text-ink-400">{skill.name}</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5" aria-label="Luk AI-lærer">
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 px-4 pb-4">
          <TutorPanel
            problem={problem}
            skill={skill}
            state={state}
            attemptedWrong={attemptedWrong}
            onHintUsed={onHintUsed}
          />
        </div>
      </div>
    </Portal>
  );
}
