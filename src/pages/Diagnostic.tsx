import { useMemo, useState } from 'react';
import type { DomainId } from '../types';
import {
  answerItem,
  createSession,
  currentItem,
  isComplete,
  summarise,
  totalItems,
  type DiagnosticSession,
} from '../engine/diagnostic';
import { DOMAINS, domainName, getSkill } from '../content';
import { useStore } from '../state/store';
import { navigate } from '../lib/router';
import { ProblemCard, type SubmitInfo } from '../components/ProblemCard';
import { Callout, Card, CardTitle, FocusBar, LabelledBar, ProgressRing } from '../components/ui';
import { useFocusMode } from '../components/Layout';
import { Icon } from '../components/Icon';

/**
 * Niveautesten.
 *
 * Eleven kan afslutte når som helst. De emner der ikke nås, bliver
 * markeret som ikke-testede i profilen i stedet for at få et gættet tal
 * — profilen skal ikke lade som om den ved mere end den gør.
 */
export function DiagnosticPage() {
  const profile = useStore((s) => s.profile);
  const completeDiagnostic = useStore((s) => s.completeDiagnostic);
  const recordAttempt = useStore((s) => s.recordAttempt);

  const [session, setSession] = useState<DiagnosticSession>(() =>
    createSession(profile.confidence, profile.hardTopics, profile.easyTopics),
  );
  const [stopped, setStopped] = useState(false);
  /** Null indtil eleven har svaret; derefter om svaret var rigtigt. */
  const [outcome, setOutcome] = useState<boolean | null>(null);

  const item = currentItem(session);
  const done = isComplete(session) || stopped;
  const total = totalItems();
  const progress = (session.index / total) * 100;
  useFocusMode(!done);

  const handleSubmit = (info: SubmitInfo) => {
    if (!item || outcome !== null) return;
    setOutcome(info.correct);
    // Diagnoseforsøg tæller med i historikken, men påvirker ikke
    // faseprogressionen - eleven er jo ikke i gang med et forløb endnu.
    recordAttempt({ problem: item.problem, ...info, phase: 'diagnostic' });
  };

  /** Går videre med det svar eleven afgav (eller et overspringet svar). */
  const advance = (correct: boolean) => {
    setSession((s) => answerItem(s, correct));
    setOutcome(null);
  };

  if (done) {
    return <DiagnosticResult session={session} onSave={completeDiagnostic} />;
  }

  if (!item) return null;

  const skill = getSkill(item.skillId);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <FocusBar
        title={domainName(item.domainId)}
        meta={`Opgave ${session.index + 1} af ${total}`}
        progress={progress}
        progressLabel="Fremgang i niveautesten"
        onExit={() => setStopped(true)}
        exitLabel="Afslut testen her"
      />

      <Callout tone="neutral" icon="info">
        Det gør ikke noget at svare forkert. Testen skal finde ud af hvad du ikke kan endnu, så gæt hellere end at
        springe over.
      </Callout>

      {skill ? (
        <ProblemCard
          key={item.problem.id}
          problem={item.problem}
          skill={skill}
          onSubmit={handleSubmit}
          onNext={() => advance(outcome ?? false)}
          nextLabel="Næste opgave"
          allowHints={false}
          // Testen skal måle hvad eleven kan alene.
          allowTutor={false}
          maxTries={1}
        />
      ) : null}

      {outcome === null ? (
        <div className="flex justify-center">
          <button onClick={() => advance(false)} className="btn-ghost text-xs">
            Ved ikke, spring over
          </button>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Resultatet: den personlige læringsprofil                            */
/* ------------------------------------------------------------------ */

function DiagnosticResult({
  session,
  onSave,
}: {
  session: DiagnosticSession;
  onSave: (
    scores: Partial<Record<DomainId, number>>,
    abilities: Partial<Record<DomainId, number>>,
    untested: DomainId[],
  ) => void;
}) {
  const outcome = useMemo(() => summarise(session), [session]);
  const hardTopics = useStore((s) => s.profile.hardTopics);

  const rows = DOMAINS.map((d) => ({
    id: d.id,
    name: d.name,
    percent: outcome.scores[d.id] ?? 0,
    tested: !outcome.untested.includes(d.id),
  })).sort((a, b) => a.percent - b.percent);

  const recommended = rows.filter((r) => r.tested).slice(0, 3);
  const tested = rows.filter((r) => r.tested).length;

  const save = () => {
    onSave(outcome.scores, outcome.abilities, outcome.untested);
    navigate({ name: 'dashboard' });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="paper-head text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 animate-pop items-center justify-center rounded-3xl bg-brand-600 text-white shadow-glow">
          <Icon name="map" size={30} />
        </div>
        <h1 className="title-page">Dit nuværende niveau</h1>
        <p className="mt-1.5 text-sm text-ink-500 dark:text-ink-400">
          Baseret på {tested} af {DOMAINS.length} emner. Tallene ændrer sig hele tiden, efterhånden som du træner.
        </p>
      </header>

      {recommended.length ? (
        <Callout tone="brand" title="Vi anbefaler at du starter her" icon="target">
          <p className="mb-2">
            Start med {recommended.map((r) => r.name.toLowerCase()).join(', ')}. Der får du mest ud af tiden lige nu.
          </p>
          {recommended.some((r) => hardTopics.includes(r.id)) ? (
            <p className="text-xs opacity-80">
              Det passer med det du selv sagde i starten. Det er som regel et godt tegn: du ved godt hvor det driller.
            </p>
          ) : null}
        </Callout>
      ) : null}

      <Card>
        <CardTitle>Din profil, emne for emne</CardTitle>
        <ul className="stagger space-y-3">
          {rows.map((r) => (
            <li key={r.id}>
              {r.tested ? (
                <LabelledBar label={r.name} value={r.percent} right={`${r.percent} %`} />
              ) : (
                <div>
                  <span className="mb-1 flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-sm font-semibold text-ink-500 dark:text-ink-400">{r.name}</span>
                    <span className="shrink-0 text-xs text-ink-500 dark:text-ink-400">ikke testet</span>
                  </span>
                  <div className="h-1.5 rounded-full border border-dashed border-ink-300 dark:border-ink-700" />
                </div>
              )}
            </li>
          ))}
        </ul>
      </Card>

      {outcome.untested.length ? (
        <Callout tone="neutral" icon="info">
          {outcome.untested.length} emner blev ikke testet, fordi du afsluttede testen tidligt. De får et foreløbigt
          niveau ud fra det du selv svarede i starten, og bliver justeret så snart du træner dem.
        </Callout>
      ) : null}

      <div className="grid grid-cols-3 gap-3">
        {outcome.strongest.slice(0, 3).map((id) => (
          <Card key={id} className="!p-3 text-center">
            <ProgressRing value={outcome.scores[id] ?? 0} size={48} />
            <p className="mt-1.5 truncate text-2xs font-semibold">{domainName(id)}</p>
            <p className="text-2xs uppercase tracking-wide text-good-600">stærk</p>
          </Card>
        ))}
      </div>

      <button onClick={save} className="btn-primary w-full py-3.5 text-base">
        Kom i gang med min plan
      </button>
    </div>
  );
}
