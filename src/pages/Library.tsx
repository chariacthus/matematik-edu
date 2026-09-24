import { useMemo, useState } from "react";
import clsx from "clsx";
import type { AreaId, Domain, DomainId, Skill, SkillState } from "../types";
import { CATEGORIES, DOMAINS, areaName, getDomain, skillsOf } from "../content";
import { useStore } from "../state/store";
import { domainProgress, prerequisitesMet } from "../engine/planner";
import { skillStatus } from "../engine/mastery";
import { retention } from "../engine/srs";
import { navigate } from "../lib/router";
import { relativeDays } from "../lib/dates";
import {
  Card,
  ChoiceCard,
  Chip,
  EmptyState,
  LevelDots,
  MetaChip,
  PageHeader,
  ProgressBar,
  ProgressRing,
  Segmented,
} from "../components/ui";
import { SkillMap } from "../components/SkillMap";
import { Icon, domainIcon } from "../components/Icon";
import { MathText } from "../components/MathText";

/**
 * Samler emner efter deres færdigheds- og vidensområde.
 *
 * Rækkefølgen følger den første forekomst, så listen står som i
 * pensum og ikke i alfabetisk orden.
 */
function groupByArea(domains: Domain[]): [AreaId, Domain[]][] {
  const groups = new Map<AreaId, Domain[]>();
  for (const d of domains) {
    const list = groups.get(d.area);
    if (list) list.push(d);
    else groups.set(d.area, [d]);
  }
  return [...groups];
}

/** Biblioteket: hele pensum, grupperet i de fem hovedkategorier. */
export function LibraryPage() {
  const skills = useStore((s) => s.skills);
  const profile = useStore((s) => s.profile);
  const [query, setQuery] = useState("");

  const progress = useMemo(
    () => domainProgress(skills, profile),
    [skills, profile],
  );
  const byId = new Map(progress.map((p) => [p.domainId, p]));

  const q = query.trim().toLowerCase();
  const matches = (id: DomainId) => {
    if (!q) return true;
    const d = getDomain(id);
    if (!d) return false;
    return (
      d.name.toLowerCase().includes(q) ||
      d.blurb.toLowerCase().includes(q) ||
      d.skills.some(
        (s) =>
          s.name.toLowerCase().includes(q) || s.goal.toLowerCase().includes(q),
      )
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Emner"
        subtitle={`Pensum efter Fælles Mål: ${DOMAINS.length} emner, ${DOMAINS.reduce((n, d) => n + d.skills.length, 0)} færdigheder`}
      />

      <div className="relative">
        <Icon name="search" size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Søg efter emne eller færdighed …"
          className="field pl-10"
          aria-label="Søg i biblioteket"
          type="search"
        />
      </div>

      {CATEGORIES.map((cat) => {
        const domains = DOMAINS.filter(
          (d) => d.category === cat.id && matches(d.id),
        );
        if (!domains.length) return null;
        return (
          <section key={cat.id}>
            {/* Kompetenceområdets navn står alene, og Fælles Måls egen
                formulering står under - ikke klemt ind ved siden af. */}
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="eyebrow">{cat.name}</h2>
              <span className="num text-xs text-ink-400">{domains.length} emner</span>
            </div>
            <p className="mb-4 mt-1 max-w-2xl text-xs leading-relaxed text-ink-500 dark:text-ink-400">
              {cat.faellesMaal}
            </p>
            {/*
              Emnerne samles under deres færdigheds- og vidensområde.
              Før stod områdets navn på hvert eneste kort, så der kunne
              stå "Tal" fire gange i træk under en overskrift der i
              forvejen hed "Tal og algebra". Nu står det én gang.
            */}
            {groupByArea(domains).map(([area, inArea]) => (
              <div key={area} className="mb-4 last:mb-0">
                {/* Kun værd at skrive når området deler sig i flere. */}
                {groupByArea(domains).length > 1 ? (
                  <h3 className="mb-2 text-[11px] font-semibold text-ink-500 dark:text-ink-400">
                    {areaName(area)}
                  </h3>
                ) : null}
                <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-3">
                  {inArea.map((d) => {
                    const p = byId.get(d.id);
                    const done = p ? p.mastered === p.total : false;
                    return (
                      <ChoiceCard
                        key={d.id}
                        size="md"
                        icon={domainIcon(d.id)}
                        tone={done ? "xp" : "brand"}
                        title={d.name}
                        meta={[{ icon: "star", label: `${p?.mastered ?? 0}/${p?.total ?? d.skills.length}` }]}
                        onClick={() => navigate({ name: "domain", domainId: d.id })}
                      >
                        <ProgressBar
                          value={p?.percent ?? 0}
                          size="sm"
                          tone={(p?.percent ?? 0) >= 70 ? "xp" : "brand"}
                          label={d.name}
                        />
                      </ChoiceCard>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        );
      })}

      {q && !DOMAINS.some((d) => matches(d.id)) ? (
        <EmptyState
          icon="search"
          title="Ingen træffere"
          body={`Der er ingen emner eller færdigheder der matcher "${query}".`}
        />
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
  const [view, setView] = useState<"kort" | "liste">("kort");

  if (!domain) {
    return (
      <EmptyState
        icon="compass"
        title="Emnet findes ikke"
        body="Linket peger på et emne der ikke er i biblioteket."
        action={
          <button
            onClick={() => navigate({ name: "library" })}
            className="btn-primary"
          >
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
    <div>
      <PageHeader
        title={domain.name}
        subtitle={domain.blurb}
        back={{ label: "Emner", onClick: () => navigate({ name: "library" }) }}
        right={<ProgressRing value={percent} size={56} />}
      />

      <div className="mb-5 mt-4 flex flex-wrap items-center gap-1.5">
        <MetaChip icon={domainIcon(domain.id)}>{areaName(domain.area)}</MetaChip>
        <MetaChip icon="star" tone={mastered === list.length ? "xp" : "neutral"}>
          {mastered}/{list.length} mestret
        </MetaChip>
        {diagnostic !== undefined ? (
          <MetaChip icon="target" tone="brand">
            niveautest {diagnostic} %
          </MetaChip>
        ) : null}
      </div>

      <Segmented
        value={view}
        onChange={setView}
        options={[
          { id: "kort", label: "Kort", icon: "map" },
          { id: "liste", label: "Liste", icon: "book" },
        ]}
      />

      {view === "kort" ? (
        <Card pad="md">
          <SkillMap
            skills={list}
            states={skills}
            icon={domainIcon(domain.id)}
            onPick={(id) => navigate({ name: "lesson", skillId: id })}
          />
        </Card>
      ) : (
        <ul className="stagger space-y-2.5">
          {list.map((skill) => (
            <SkillRow
              key={skill.id}
              skill={skill}
              state={skills[skill.id]}
              allStates={skills}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function SkillRow({
  skill,
  state,
  allStates,
}: {
  skill: Skill;
  state?: SkillState;
  allStates: Record<string, SkillState>;
}) {
  const ready = prerequisitesMet(skill, allStates);
  const status = skillStatus(state, ready);

  const badge = {
    locked: { label: "Låst", tone: "neutral" as const },
    ready: { label: "Klar", tone: "brand" as const },
    learning: { label: "I gang", tone: "warn" as const },
    review: { label: "Repetér", tone: "accent" as const },
    mastered: { label: "Mestret", tone: "good" as const },
  }[status];

  const missing = skill.prerequisites.filter(
    (id) => !(allStates[id]?.masteredAt || (allStates[id]?.pKnown ?? 0) >= 0.6),
  );

  return (
    <li>
      <button
        onClick={() => navigate({ name: "lesson", skillId: skill.id })}
        className={clsx(
          "card w-full p-4 text-left transition-shadow hover:shadow-lift",
          status === "locked" && "opacity-70",
        )}
      >
        <div className="flex items-start gap-3">
          <span
            className={clsx(
              "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm",
              status === "mastered"
                ? "bg-good-500 text-white"
                : status === "review"
                  ? "bg-accent-500 text-white"
                  : status === "learning"
                    ? "bg-warn-500 text-white"
                    : "bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400",
            )}
            aria-hidden
          >
            {status === "mastered"
              ? "★"
              : status === "review"
                ? "↻"
                : status === "learning"
                  ? "◐"
                  : status === "locked"
                    ? "🔒"
                    : "○"}
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
                  tone={state.masteredAt ? "good" : "brand"}
                  label={`Sikkerhed i ${skill.name}`}
                />
                <p className="mt-1 text-[11px] text-ink-500 dark:text-ink-400">
                  {state.correct}/{state.attempts} rigtige
                  {state.masteredAt && state.due
                    ? ` · næste repetition ${relativeDays(state.due)}${retention(state) < 0.6 ? " (begynder at falme)" : ""}`
                    : ` · ${Math.round(state.pKnown * 100)} % sikker`}
                </p>
              </div>
            ) : null}

            {status === "locked" && missing.length ? (
              <p className="mt-2 text-xs text-ink-500 dark:text-ink-400">
                Tag først: {missing.map((id) => skillNameOf(id)).join(", ")}
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
