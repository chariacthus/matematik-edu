import { useState } from 'react';
import clsx from 'clsx';
import type { DomainId } from '../types';
import { DOMAINS } from '../content';
import { useStore } from '../state/store';
import { navigate } from '../lib/router';
import { Card, CardTitle, IconTile } from '../components/ui';
import { Icon, domainIcon } from '../components/Icon';

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
      <div className="paper-head py-2">
        <div className="mx-auto flex h-20 w-20 animate-pop items-center justify-center rounded-3xl bg-brand-600 text-white shadow-glow">
          <Icon name="sigma" size={38} />
        </div>
      </div>
      <div>
        <h1 className="title-page">MatematikAI</h1>
        <p className="mt-2 text-ink-500 dark:text-ink-400">Matematik til 9. klasse, bygget efter Fælles Mål og FP9.</p>
      </div>
      <Card className="text-left">
        <CardTitle>Sådan virker det</CardTitle>
        <ul className="space-y-2.5 text-sm text-ink-600 dark:text-ink-300">
          {([
            ['map', 'En kort niveautest viser hvor du står i 21 emner.'],
            ['target', 'Opgaverne følger dit niveau. Går det let, bliver de sværere.'],
            ['search', 'Laver du samme fejl to gange, får du den forklaret.'],
            ['hand', 'Sidder du fast, kan du få hjælp. Du får ikke svaret, men et skub videre.'],
          ] as const).map(([icon, text]) => (
            <li key={text} className="flex items-start gap-3">
              <IconTile name={icon} tone="brand" size="sm" />
              <span className="pt-1.5">{text}</span>
            </li>
          ))}
        </ul>
      </Card>
      <button onClick={() => setStep(1)} className="btn-primary w-full py-3 text-base">
        Find mit niveau
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
              'card-interactive tone-brand flex items-center gap-3 rounded-2xl px-4 py-3 text-left',
              confidence === value && '!border-brand-500 bg-brand-50 dark:bg-brand-500/10',
            )}
            aria-pressed={confidence === value}
          >
            <span
              className={clsx(
                'num flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-semibold transition-colors',
                confidence === value ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-500 dark:bg-white/[0.06] dark:text-ink-300',
              )}
            >
              {value as number}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{title as string}</span>
              <span className="block text-xs text-ink-500 dark:text-ink-400">{sub as string}</span>
            </span>
            {confidence === value ? (
              <span className="flex h-6 w-6 shrink-0 animate-pop items-center justify-center rounded-full bg-brand-600 text-white" aria-hidden>
                <Icon name="check" size={14} />
              </span>
            ) : null}
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
      <Heading title="Hvilke emner synes du er svære?" sub="Vælg dem du helst vil undgå. Du starter der, for det er der du lærer mest." />
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
            <span key={i} className={clsx('h-1.5 flex-1 rounded-full transition-colors duration-300', i <= step ? 'bg-brand-600' : 'bg-ink-200 dark:bg-ink-800')} />
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
      <h1 className="title-page">{title}</h1>
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
      ? '!border-bad-400/70 bg-bad-100 text-bad-900 dark:bg-bad-500/10 dark:text-bad-100'
      : '!border-good-400/70 bg-good-100 text-good-900 dark:bg-good-500/10 dark:text-good-100';

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {DOMAINS.map((d) => {
        const on = selected.includes(d.id);
        return (
          <button
            key={d.id}
            onClick={() => onToggle(d.id)}
            aria-pressed={on}
            className={clsx(
              'card-interactive flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium',
              tone === 'bad' ? 'tone-bad' : 'tone-good',
              on ? active : 'text-ink-700 dark:text-ink-200',
            )}
          >
            <Icon name={on ? 'check' : domainIcon(d.id)} size={15} className={clsx('shrink-0', on ? '' : 'text-ink-500 dark:text-ink-400')} />
            <span className="min-w-0 leading-snug">{d.name}</span>
          </button>
        );
      })}
    </div>
  );
}
