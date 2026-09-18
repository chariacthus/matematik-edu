import { useState } from 'react';
import clsx from 'clsx';
import type { DomainId } from '../types';
import { DOMAINS } from '../content';
import { useStore } from '../state/store';
import { navigate } from '../lib/router';
import { Card } from '../components/ui';

/**
 * Onboarding.
 *
 * Fire korte skridt. Svarene bruges rigtigt: den selvvurderede sikkerhed
 * sætter startniveauet i diagnosen, og de emner eleven selv kalder svære
 * vægtes ind i anbefalingerne bagefter.
 */
export function OnboardingPage() {
  const complete = useStore((s) => s.completeOnboarding);
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [confidence, setConfidence] = useState(3);
  const [hard, setHard] = useState<DomainId[]>([]);
  const [easy, setEasy] = useState<DomainId[]>([]);

  const toggle = (list: DomainId[], set: (v: DomainId[]) => void, other: DomainId[], setOther: (v: DomainId[]) => void) => (id: DomainId) => {
    if (list.includes(id)) set(list.filter((x) => x !== id));
    else {
      set([...list, id]);
      // Et emne kan ikke både være svært og nemt.
      if (other.includes(id)) setOther(other.filter((x) => x !== id));
    }
  };

  const finish = () => {
    complete({ name, confidence, hard, easy });
    navigate({ name: 'diagnose' });
  };

  const steps = [
    /* 0 — velkomst */
    <div key="0" className="space-y-5 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-600 font-serif text-4xl text-white animate-pop" aria-hidden>
        π
      </div>
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">MatematikAI</h1>
        <p className="mt-2 text-ink-600 dark:text-ink-300">Din personlige matematiklærer til 9. klasse.</p>
      </div>
      <Card className="text-left">
        <p className="mb-3 text-sm font-bold">Sådan virker det</p>
        <ul className="space-y-2.5 text-sm text-ink-600 dark:text-ink-300">
          {[
            ['📋', 'Du starter med en kort niveautest — så ved vi hvor du står i 19 forskellige emner.'],
            ['🎯', 'Opgaverne tilpasser sig dig. Går det let, bliver de sværere. Går det galt, går vi et trin tilbage.'],
            ['🔍', 'Laver du den samme fejl flere gange, stopper vi op og forklarer præcis den fejl.'],
            ['✦', 'AI-læreren hjælper dig videre — men den giver dig ikke svaret.'],
          ].map(([icon, text]) => (
            <li key={text} className="flex gap-3">
              <span className="text-base" aria-hidden>{icon}</span>
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </Card>
      <button onClick={() => setStep(1)} className="btn-primary w-full py-3 text-base">
        Lad os finde dit matematikniveau
      </button>
    </div>,

    /* 1 — navn */
    <div key="1" className="space-y-5">
      <Heading title="Hvad skal jeg kalde dig?" sub="Kun så appen kan sige goddag. Alt bliver gemt i din egen browser." />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && setStep(2)}
        placeholder="Dit fornavn"
        className="field text-lg"
        autoFocus
        maxLength={30}
        aria-label="Dit fornavn"
      />
      <div className="flex gap-2">
        <button onClick={() => setStep(0)} className="btn-secondary">Tilbage</button>
        <button onClick={() => setStep(2)} className="btn-primary flex-1 py-3">
          {name.trim() ? 'Videre' : 'Spring over'}
        </button>
      </div>
    </div>,

    /* 2 — selvvurdering */
    <div key="2" className="space-y-5">
      <Heading title="Hvor sikker føler du dig i matematik?" sub="Der er ikke noget rigtigt svar. Det hjælper os bare med at vælge det første niveau." />
      <div className="grid gap-2">
        {[
          [1, 'Slet ikke sikker', 'Jeg er tit i tvivl om det meste'],
          [2, 'Lidt usikker', 'Nogle ting kan jeg, andre er svære'],
          [3, 'Midt imellem', 'Jeg klarer mig, men bliver hurtigt usikker'],
          [4, 'Ret sikker', 'Jeg kan det meste af det vi har haft'],
          [5, 'Meget sikker', 'Jeg vil gerne udfordres'],
        ].map(([value, title, sub]) => (
          <button
            key={value as number}
            onClick={() => setConfidence(value as number)}
            className={clsx(
              'flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all',
              confidence === value
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/50'
                : 'border-ink-200 bg-white hover:border-ink-300 dark:border-ink-700 dark:bg-ink-800',
            )}
            aria-pressed={confidence === value}
          >
            <span
              className={clsx(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold',
                confidence === value ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-500 dark:bg-ink-700 dark:text-ink-300',
              )}
            >
              {value as number}
            </span>
            <span className="min-w-0">
              <span className="block font-bold">{title as string}</span>
              <span className="block text-xs text-ink-500 dark:text-ink-400">{sub as string}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={() => setStep(1)} className="btn-secondary">Tilbage</button>
        <button onClick={() => setStep(3)} className="btn-primary flex-1 py-3">Videre</button>
      </div>
    </div>,

    /* 3 — svære emner */
    <div key="3" className="space-y-5">
      <Heading title="Hvilke emner synes du er svære?" sub="Vælg dem du helst vil undgå. Vi starter der — det er der du får mest ud af tiden." />
      <DomainPicker selected={hard} onToggle={toggle(hard, setHard, easy, setEasy)} tone="bad" />
      <div className="flex gap-2">
        <button onClick={() => setStep(2)} className="btn-secondary">Tilbage</button>
        <button onClick={() => setStep(4)} className="btn-primary flex-1 py-3">
          {hard.length ? `Videre (${hard.length} valgt)` : 'Spring over'}
        </button>
      </div>
    </div>,

    /* 4 — nemme emner */
    <div key="4" className="space-y-5">
      <Heading title="Og hvilke er nemme?" sub="Dem kører vi hurtigere igennem, så du ikke spilder tid på noget du allerede kan." />
      <DomainPicker selected={easy} onToggle={toggle(easy, setEasy, hard, setHard)} tone="good" />
      <div className="flex gap-2">
        <button onClick={() => setStep(3)} className="btn-secondary">Tilbage</button>
        <button onClick={finish} className="btn-primary flex-1 py-3 text-base">Start niveautesten</button>
      </div>
    </div>,
  ];

  return (
    <div className="mx-auto max-w-lg py-4">
      {step > 0 ? (
        <div className="mb-6 flex gap-1.5" aria-label={`Trin ${step} af 4`}>
          {[1, 2, 3, 4].map((i) => (
            <span key={i} className={clsx('h-1.5 flex-1 rounded-full', i <= step ? 'bg-brand-600' : 'bg-ink-200 dark:bg-ink-800')} />
          ))}
        </div>
      ) : null}
      {steps[step]}
    </div>
  );
}

function Heading({ title, sub }: { title: string; sub: string }) {
  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
      <p className="mt-1.5 text-sm text-ink-500 dark:text-ink-400">{sub}</p>
    </div>
  );
}

function DomainPicker({
  selected,
  onToggle,
  tone,
}: {
  selected: DomainId[];
  onToggle: (id: DomainId) => void;
  tone: 'bad' | 'good';
}) {
  const active =
    tone === 'bad'
      ? 'border-bad-400 bg-bad-100 text-bad-900 dark:bg-bad-900/30 dark:text-bad-100'
      : 'border-good-400 bg-good-100 text-good-900 dark:bg-good-900/30 dark:text-good-100';

  return (
    <div className="flex flex-wrap gap-2">
      {DOMAINS.map((d) => (
        <button
          key={d.id}
          onClick={() => onToggle(d.id)}
          aria-pressed={selected.includes(d.id)}
          className={clsx(
            'rounded-xl border-2 px-3 py-2 text-sm font-semibold transition-all',
            selected.includes(d.id) ? active : 'border-ink-200 bg-white text-ink-600 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-300',
          )}
        >
          {d.name}
        </button>
      ))}
    </div>
  );
}
