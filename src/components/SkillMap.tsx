import { useMemo } from 'react';
import clsx from 'clsx';
import type { Skill, SkillState } from '../types';
import { skillStatus } from '../engine/mastery';
import { prerequisitesMet } from '../engine/planner';
import { Icon, type IconName } from './Icon';
import { useIsNarrow } from '../lib/media';

/**
 * Færdighedskortet.
 *
 * Emnerne ligger ikke i en liste, men i en bane hvor forudsætninger er
 * tegnet som forbindelser. Det er hele forskellen på at læse en
 * indholdsfortegnelse og at kunne se hvor man er, hvad der er åbnet, og
 * hvad der venter.
 *
 * Banen bygges i lag: en færdighed placeres i laget efter sin dybeste
 * forudsætning. Så peger forbindelserne altid fremad, og der kommer
 * ingen krydsninger bagud.
 */

export type NodeStatus = 'locked' | 'ready' | 'learning' | 'review' | 'mastered';

interface Node {
  skill: Skill;
  status: NodeStatus;
  /** Sikkerhed 0-1, bruges til at fylde ringen. */
  progress: number;
  col: number;
  row: number;
}

/**
 * Banen vender med skærmen: vandret på en stor skærm, lodret på en
 * telefon. Et vandret kort på en telefon ville kræve sidescrolling, og
 * så holder man op med at bruge det.
 */
const H = { step: 132, lane: 96, padA: 42, padB: 40 };
const V = { step: 108, lane: 116, padA: 46, padB: 34 };

/** Placerer færdighederne i lag efter deres forudsætninger. */
function layout(
  skills: Skill[],
  states: Record<string, SkillState>,
  vertical: boolean,
): { nodes: Node[]; width: number; height: number } {
  const byId = new Map(skills.map((s) => [s.id, s]));
  const depth = new Map<string, number>();

  const depthOf = (id: string, seen = new Set<string>()): number => {
    if (depth.has(id)) return depth.get(id) as number;
    // Cyklusværn: pensum har ingen, men et fejlagtigt id skal ikke hænge appen.
    if (seen.has(id)) return 0;
    seen.add(id);
    const skill = byId.get(id);
    if (!skill) return 0;
    const local = skill.prerequisites.filter((p) => byId.has(p));
    const d = local.length ? Math.max(...local.map((p) => depthOf(p, seen))) + 1 : 0;
    depth.set(id, d);
    return d;
  };
  skills.forEach((s) => depthOf(s.id));

  const columns = new Map<number, Skill[]>();
  skills.forEach((s) => {
    const d = depth.get(s.id) ?? 0;
    if (!columns.has(d)) columns.set(d, []);
    (columns.get(d) as Skill[]).push(s);
  });

  const nodes: Node[] = [];
  let maxRows = 0;
  [...columns.keys()].sort((a, b) => a - b).forEach((col) => {
    const list = (columns.get(col) as Skill[]).slice().sort((a, b) => a.tier - b.tier);
    maxRows = Math.max(maxRows, list.length);
    list.forEach((skill, row) => {
      const state = states[skill.id];
      nodes.push({
        skill,
        status: skillStatus(state, prerequisitesMet(skill, states)),
        progress: state?.masteredAt ? 1 : (state?.pKnown ?? 0),
        col,
        row,
      });
    });
  });

  const depthCount = Math.max(1, columns.size);
  const laneCount = Math.max(1, maxRows);

  return vertical
    ? { nodes, width: V.padB * 2 + laneCount * V.lane, height: V.padA * 2 + depthCount * V.step }
    : { nodes, width: H.padA * 2 + depthCount * H.step, height: H.padB * 2 + laneCount * H.lane };
}

/* Midtpunktet for en knude i den valgte retning. */
const cx = (n: Node, v: boolean) => (v ? V.padB + n.row * V.lane + V.lane / 2 : H.padA + n.col * H.step + H.step / 2);
const cy = (n: Node, v: boolean) => (v ? V.padA + n.col * V.step + V.step / 2 : H.padB + n.row * H.lane + H.lane / 2);

const STATUS_STYLE: Record<NodeStatus, { ring: string; fill: string; text: string; icon: IconName | null }> = {
  locked:   { ring: 'stroke-ink-300 dark:stroke-white/10', fill: 'fill-ink-100 dark:fill-white/[0.04]', text: 'fill-ink-400', icon: 'lock' },
  ready:    { ring: 'stroke-brand-500', fill: 'fill-white dark:fill-ink-850', text: 'fill-ink-700 dark:fill-ink-200', icon: null },
  learning: { ring: 'stroke-brand-500', fill: 'fill-brand-50 dark:fill-brand-500/10', text: 'fill-brand-700 dark:fill-brand-200', icon: null },
  review:   { ring: 'stroke-accent-500', fill: 'fill-accent-50 dark:fill-accent-500/10', text: 'fill-accent-700 dark:fill-accent-200', icon: 'refresh' },
  mastered: { ring: 'stroke-xp-500', fill: 'fill-xp-100 dark:fill-xp-500/15', text: 'fill-xp-700 dark:fill-xp-300', icon: 'star' },
};

export function SkillMap({
  skills,
  states,
  onPick,
  icon,
}: {
  skills: Skill[];
  states: Record<string, SkillState>;
  onPick: (skillId: string) => void;
  icon: IconName;
}) {
  const vertical = useIsNarrow();
  const { nodes, width, height } = useMemo(() => layout(skills, states, vertical), [skills, states, vertical]);
  const byId = new Map(nodes.map((n) => [n.skill.id, n]));

  return (
    <div className="no-scrollbar -mx-1 overflow-x-auto px-1 pb-1">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        // Lodret skalerer til bredden; vandret får lov at rulle.
        className={vertical ? 'h-auto w-full' : 'max-w-none'}
        width={vertical ? undefined : width}
        height={vertical ? undefined : height}
        role="group"
        aria-label="Færdighedskort"
      >
        {/* Forbindelser først, så de ligger bag knuderne */}
        {nodes.flatMap((n) =>
          n.skill.prerequisites
            .map((p) => byId.get(p))
            .filter((from): from is Node => from !== undefined)
            .map((from) => {
              // Forbindelsen forlader knuden i den retning banen løber.
              const x1 = cx(from, vertical) + (vertical ? 0 : 26);
              const y1 = cy(from, vertical) + (vertical ? 46 : 0);
              const x2 = cx(n, vertical) - (vertical ? 0 : 26);
              const y2 = cy(n, vertical) - (vertical ? 26 : 0);
              const midX = (x1 + x2) / 2;
              const midY = (y1 + y2) / 2;
              const curve = vertical
                ? `M${x1} ${y1} C${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`
                : `M${x1} ${y1} C${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
              const done = from.status === 'mastered';
              return (
                <path
                  key={`${from.skill.id}->${n.skill.id}`}
                  d={curve}
                  fill="none"
                  strokeWidth={done ? 2.5 : 2}
                  strokeLinecap="round"
                  strokeDasharray={done ? undefined : '4 5'}
                  className={done ? 'stroke-xp-400' : 'stroke-ink-300 dark:stroke-white/12'}
                />
              );
            }),
        )}

        {nodes.map((n, i) => {
          const st = STATUS_STYLE[n.status];
          const r = 26;
          const circumference = 2 * Math.PI * (r - 3);
          const lines = wrapLabel(n.skill.name, vertical ? 15 : 20);
          return (
            <g
              key={n.skill.id}
              transform={`translate(${cx(n, vertical)} ${cy(n, vertical)})`}
              className={clsx('transition-opacity', n.status === 'locked' ? 'opacity-60' : 'cursor-pointer')}
              onClick={() => onPick(n.skill.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onPick(n.skill.id);
                }
              }}
              aria-label={`${n.skill.name}: ${
                { locked: 'låst', ready: 'klar', learning: 'i gang', review: 'til repetition', mastered: 'mestret' }[n.status]
              }`}
            >
              <g className="animate-pop" style={{ animationDelay: `${Math.min(i, 10) * 55}ms` }}>
              <circle r={r} className={clsx(st.fill, st.ring)} strokeWidth="2" />

              {/* Fremdriftsring for det man er i gang med */}
              {n.status === 'learning' && n.progress > 0 ? (
                <circle
                  r={r - 3}
                  fill="none"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - n.progress)}
                  transform="rotate(-90)"
                  className="stroke-brand-500"
                />
              ) : null}

              {st.icon ? (
                <g transform="translate(-9 -9)" className={clsx(st.text, 'pointer-events-none')}>
                  <IconGlyph name={st.icon} />
                </g>
              ) : (
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  className={clsx(st.text, 'pointer-events-none text-[13px] font-extrabold')}
                  style={{ fontSize: 13, fontWeight: 800 }}
                >
                  {n.skill.tier}
                </text>
              )}

              {/* Navnet brydes over to linjer frem for at blive skåret af —
                  "Ligninger i ét trin" er ikke til megen hjælp som
                  "Ligninger i ét…". */}
              <text
                textAnchor="middle"
                className="pointer-events-none fill-ink-600 dark:fill-ink-400"
                style={{ fontSize: 10, fontWeight: 600 }}
              >
                {lines.map((line, i) => (
                  <tspan key={i} x={0} y={r + 15 + i * 11}>
                    {line}
                  </tspan>
                ))}
              </text>
              </g>
            </g>
          );
        })}
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-ink-500 dark:text-ink-400">
        <Legend tone="bg-white dark:bg-ink-850 ring-1 ring-brand-500" label="Klar" />
        <Legend tone="bg-brand-100 dark:bg-brand-500/20" label="I gang" />
        <Legend tone="bg-xp-200 dark:bg-xp-500/25" label="Mestret" />
        <Legend tone="bg-accent-100 dark:bg-accent-500/20" label="Repetér" />
        <Legend tone="bg-ink-200 dark:bg-white/[0.08]" label="Låst" />
        <span className="ml-auto flex items-center gap-1">
          <Icon name={icon} size={12} /> {skills.length} færdigheder
        </span>
      </div>
    </div>
  );
}

/**
 * Bryder et navn over højst to linjer på hele ord. Passer det ikke,
 * afkortes den sidste linje — men først da.
 */
function wrapLabel(name: string, max: number): string[] {
  if (name.length <= max) return [name];
  const words = name.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= max) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length === 1) break;
    }
  }
  if (current && lines.length < 2) lines.push(current);
  // Rest der ikke nåede med, samles på anden linje.
  const used = lines.join(' ').length;
  if (used < name.length && lines.length === 2) {
    const tail = name.slice(lines[0]!.length + 1);
    lines[1] = tail.length > max ? `${tail.slice(0, max - 1)}…` : tail;
  }
  return lines.slice(0, 2);
}

function Legend({ tone, label }: { tone: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={clsx('h-3 w-3 rounded-full', tone)} />
      {label}
    </span>
  );
}

/** Ikonstier gentaget inde i SVG'et, hvor <Icon> ikke kan bruges direkte. */
function IconGlyph({ name }: { name: IconName }) {
  const d: Partial<Record<IconName, string>> = {
    lock: 'M7 11V8a5 5 0 0 1 10 0v3m-11 0h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z',
    star: 'm12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z',
    refresh: 'M20 12a8 8 0 1 1-2.6-5.9M20 4v5h-5',
  };
  const path = d[name];
  if (!path) return null;
  const solid = name === 'star';
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={solid ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={solid ? 0 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}
