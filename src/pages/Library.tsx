import { useMemo, useState } from 'react';
import clsx from 'clsx';
import type { DomainId, Skill, SkillState } from '../types';
import { CATEGORIES, DOMAINS, getDomain, skillsOf } from '../content';
import { useStore } from '../state/store';
import { domainProgress, prerequisitesMet } from '../engine/planner';
import { skillStatus } from '../engine/mastery';
import { retention } from '../engine/srs';
import { navigate } from '../lib/router';
import { relativeDays } from '../lib/dates';
import { Chip, EmptyState, LevelDots, ProgressBar, ProgressRing, SectionTitle } from '../components/ui';
import { MathText } from '../components/MathText';

/** Biblioteket: hele pensum, grupperet i de fem hovedkategorier. */
export function LibraryPage() {
  const skills = useStore((s) => s.skills);
  const profile = useStore((s) => s.profile);
  const [query, setQuery] = useState('');

  const progress = useMemo(() => domainProgress(skills, profile), [skills, profile]);
  const byId = new Map(progress.map((p) => [p.domainId, p]));

  const q = query.trim().toLowerCase();
  const matches = (id: DomainId) => {
    if (!q) return true;
    const d = getDomain(id);
    if (!d) return false;
    return (
      d.name.toLowerCase().includes(q) ||
      d.blurb.toLowerCase().includes(q) ||
      d.skills.some((s) => s.name.toLowerCase().includes(q) || s.goal.toLowerCase().includes(q))
    );
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Matematikbibliotek</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          Hele pensum for 9. klasse — {DOMAINS.length} emner og {DOMAINS.reduce((n, d) => n + d.skills.length, 0)} færdigheder.
        </p>
      </header>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Søg efter emne eller færdighed …"
        className="field"
        aria-label="Søg i biblioteket"
        type="search"
      />

      {CATEGORIES.map((cat) => {
        const domains = DOMAINS.filter((d) => d.category === cat.id && matches(d.id));
        if (!domains.length) return null;
        return (
          <section key={cat.id}>
            <SectionTitle hint={cat.description}>{cat.name}</SectionTitle>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {domains.map((d) => {
                const p = byId.get(d.id);
                return (
                  <button
                    key={d.id}
                    onClick={() => navigate({ name: 'domain', domainId: d.id })}
                    className="card flex gap-3 !p-4 text-left transition-shadow hover:shadow-lift"
                  >
                    <ProgressRing value={p?.percent ?? 0} size={46} stroke={5} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold">{d.name}</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-ink-500 dark:text-ink-400">{d.blurb}</span>
                      <span className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Chip tone={p && p.mastered === p.total ? 'good' : 'neutral'}>
                          {p?.mastered ?? 0}/{p?.total ?? d.skills.length} mestret
                        </Chip>
                        {p?.diagnostic !== null && p?.diagnostic !== undefined ? (
                          <Chip tone="brand">test {p.diagnostic} %</Chip>
                        ) : null}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}

      {q && !DOMAINS.some((d) => matches(d.id)) ? (
        <EmptyState icon="🔎" title="Ingen træffere" body={`Der er ingen emner eller færdigheder der matcher "${query}".`} />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ét emne                                                             */
/* ------------------------------------------------------------------ */

export function DomainPage({ domainId }: { domainId: string }) {
  const domain = getDomain(domainId as DomainId);
  const skills = useStore((s) => s.skills);
  const profile = useStore((s) => s.profile);

  if (!domain) {
    return (
      <EmptyState
        icon="🧭"
        title="Emnet findes ikke"
        body="Linket peger på et emne der ikke er i biblioteket."
        action={
          <button onClick={() => navigate({ name: 'library' })} className="btn-primary">
            Til biblioteket
          </button>
        }
      />
    );
  }

  const list = skillsOf(domain.id);
  const mastered = list.filter((s) => skills[s.id]?.masteredAt).length;
  const percent = list.length ? Math.round((mastered / list.length) * 100) : 0;
  const diagnostic = profile.diagnostic[domain.id];

  return (
    <div className="space-y-5">
      <button onClick={() => navigate({ name: 'library' })} className="btn-ghost -ml-2 px-2 py-1 text-xs">
        ← Bibliotek
      </button>

      <header className="flex items-start gap-4">
        <ProgressRing value={percent} size={64} />
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight">{domain.name}</h1>
          <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">{domain.blurb}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip tone={mastered === list.length ? 'good' : 'neutral'}>
              {mastered}/{list.length} mestret
            </Chip>
            {diagnostic !== undefined ? <Chip tone="brand">niveautest: {diagnostic} %</Chip> : null}
          </div>
        </div>
      </header>

      <ul className="space-y-2.5">
        {list.map((skill) => (
          <SkillRow key={skill.id} skill={skill} state={skills[skill.id]} allStates={skills} />
        ))}
      </ul>
    </div>
  );
}

function SkillRow({ skill, state, allStates }: { skill: Skill; state?: SkillState; allStates: Record<string, SkillState> }) {
  const ready = prerequisitesMet(skill, allStates);
  const status = skillStatus(state, ready);

  const badge = {
    locked: { label: 'Låst', tone: 'neutral' as const },
    ready: { label: 'Klar', tone: 'brand' as const },
    learning: { label: 'I gang', tone: 'warn' as const },
    review: { label: 'Repetér', tone: 'accent' as const },
    mastered: { label: 'Mestret', tone: 'good' as const },
  }[status];

  const missing = skill.prerequisites.filter((id) => !(allStates[id]?.masteredAt || (allStates[id]?.pKnown ?? 0) >= 0.6));

  return (
    <li>
      <button
        onClick={() => navigate({ name: 'lesson', skillId: skill.id })}
        className={clsx('card w-full !p-4 text-left transition-shadow hover:shadow-lift', status === 'locked' && 'opacity-70')}
      >
        <div className="flex items-start gap-3">
          <span
            className={clsx(
              'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm',
              status === 'mastered'
                ? 'bg-good-500 text-white'
                : status === 'review'
                  ? 'bg-accent-500 text-white'
                  : status === 'learning'
                    ? 'bg-warn-500 text-white'
                    : 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400',
            )}
            aria-hidden
          >
            {status === 'mastered' ? '★' : status === 'review' ? '↻' : status === 'learning' ? '◐' : status === 'locked' ? '🔒' : '○'}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold">{skill.name}</span>
              <Chip tone={badge.tone}>{badge.label}</Chip>
              <LevelDots level={skill.tier} className="ml-auto" />
            </div>
            <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">
              <MathText>{skill.goal}</MathText>
            </p>

            {state && state.attempts > 0 ? (
              <div className="mt-2.5">
                <ProgressBar
                  value={state.masteredAt ? 100 : state.pKnown * 100}
                  size="sm"
                  tone={state.masteredAt ? 'good' : 'brand'}
                  label={`Sikkerhed i ${skill.name}`}
                />
                <p className="mt-1 text-[11px] text-ink-500 dark:text-ink-400">
                  {state.correct}/{state.attempts} rigtige
                  {state.masteredAt && state.due
                    ? ` · næste repetition ${relativeDays(state.due)}${retention(state) < 0.6 ? ' (begynder at falme)' : ''}`
                    : ` · ${Math.round(state.pKnown * 100)} % sikker`}
                </p>
              </div>
            ) : null}

            {status === 'locked' && missing.length ? (
              <p className="mt-2 text-xs text-ink-500 dark:text-ink-400">
                Tag først: {missing.map((id) => skillNameOf(id)).join(', ')}
              </p>
            ) : null}
          </div>
        </div>
      </button>
    </li>
  );
}

function skillNameOf(id: string): string {
  for (const d of DOMAINS) {
    const s = d.skills.find((x) => x.id === id);
    if (s) return s.name.toLowerCase();
  }
  return id;
}
