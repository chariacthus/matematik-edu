import type { IconName } from '../components/Icon';

/**
 * Kernetyper for MatematikAI.
 *
 * Hele appen bygger på at en "opgave" (Problem) er et selvforklarende objekt:
 * den kender sit eget svar, sine hints, sin trinvise løsning og de typiske
 * fejl man laver i den. Det er dét, der gør både den adaptive motor og
 * AI-tutoren i stand til at arbejde uden et backend-kald.
 */

/* ------------------------------------------------------------------ */
/* Emner og færdigheder                                                */
/* ------------------------------------------------------------------ */

export type DomainId =
  | 'tal'
  | 'broeker'
  | 'decimaler'
  | 'procenter'
  | 'forhold'
  | 'potenser'
  | 'roedder'
  | 'algebra'
  | 'ligninger'
  | 'uligheder'
  | 'geometri'
  | 'areal-rumfang'
  | 'koordinatsystem'
  | 'funktioner'
  | 'statistik'
  | 'sandsynlighed'
  | 'trigonometri'
  | 'flytninger'
  | 'tegning'
  | 'problemloesning'
  | 'modeller';

/**
 * De fire kompetenceområder i Fælles Mål for matematik (7.-9. klasse).
 * Det er den inddeling Undervisningsministeriet bruger, og den samme som
 * FP9 er bygget op om.
 */
export type CategoryId = 'kompetencer' | 'tal-algebra' | 'geometri-maaling' | 'statistik-sandsynlighed';

/**
 * Færdigheds- og vidensområderne under hvert kompetenceområde. Dem bruger
 * lærere til at tale om pensum, så eleven kan genkende ordene fra timerne.
 */
export type AreaId =
  // Matematiske kompetencer
  | 'problembehandling'
  | 'modellering'
  | 'raesonnement'
  | 'repraesentation'
  | 'kommunikation'
  | 'hjaelpemidler'
  // Tal og algebra
  | 'tal'
  | 'regnestrategier'
  | 'ligninger'
  | 'formler'
  | 'funktioner'
  // Geometri og måling
  | 'geometriske-egenskaber'
  | 'geometrisk-tegning'
  | 'placeringer-flytninger'
  | 'maaling'
  // Statistik og sandsynlighed
  | 'statistik'
  | 'sandsynlighed';

/**
 * FP9 består af to prøver: én uden hjælpemidler og én med. En opgave der
 * kræver lommeregner hører kun hjemme i den ene.
 */
export type Aids = 'uden' | 'med' | 'begge';

/** 1 = helt begynder, 5 = udfordring på højt 9.-klasse-niveau. */
export type Difficulty = 1 | 2 | 3 | 4 | 5;

export interface Category {
  id: CategoryId;
  name: string;
  description: string;
  /** Kort forklaring af hvad Fælles Mål siger om området. */
  faellesMaal: string;
}

export interface Area {
  id: AreaId;
  category: CategoryId;
  name: string;
}

export interface Domain {
  id: DomainId;
  name: string;
  category: CategoryId;
  /** Færdigheds- og vidensområdet i Fælles Mål som emnet hører under. */
  area: AreaId;
  blurb: string;
  skills: Skill[];
}

export interface Skill {
  id: string;
  domainId: DomainId;
  name: string;
  /** Læringsmål formuleret som "Du kan ..." */
  goal: string;
  /** Færdigheder der bør sidde først (skill-id'er). */
  prerequisites: string[];
  /** Vejledende sværhedsgrad for færdigheden som helhed. */
  tier: Difficulty;
  /**
   * Hvilken FP9-prøve færdigheden hører til. Færdigheder der kræver
   * lommeregner eller regneark kan kun trænes til prøven med hjælpemidler.
   */
  aids?: Aids;
  /** Trin 1: forklaringen. */
  explain: ExplainBlock[];
  /** Trin 2: gennemregnede eksempler. */
  worked: WorkedExample[];
  /** Opgavegeneratorer. Den første er kernetypen; resten giver variation. */
  generators: Generator[];
}

/* ------------------------------------------------------------------ */
/* Forklaringer                                                        */
/* ------------------------------------------------------------------ */

export type ExplainBlock =
  | { kind: 'text'; body: string }
  /** Den korte, huskbare version. */
  | { kind: 'idea'; title: string; body: string }
  /** Analogi — "en ligning er en vægt". */
  | { kind: 'analogy'; body: string }
  | { kind: 'rule'; title: string; math: string; body?: string }
  | { kind: 'math'; math: string; caption?: string }
  | { kind: 'list'; title?: string; items: string[] }
  /** Typisk fejl, sagt højt inden eleven laver den. */
  | { kind: 'warning'; body: string }
  | { kind: 'visual'; visual: Visual; caption?: string };

export interface WorkedExample {
  title: string;
  prompt: string;
  steps: SolutionStep[];
  visual?: Visual;
  /** Pointen man skal tage med sig. */
  takeaway?: string;
}

export interface SolutionStep {
  /** Hvad vi gør, på dansk. */
  text: string;
  /** LaTeX for selve regningen. */
  math?: string;
  /** Hvorfor vi gør det. */
  why?: string;
}

/* ------------------------------------------------------------------ */
/* Opgaver                                                             */
/* ------------------------------------------------------------------ */

export interface Rng {
  /** Flydende tal i [0,1). */
  next(): number;
  /** Heltal i [min, max] — begge inklusive. */
  int(min: number, max: number): number;
  /** Heltal i [min, max] uden 0. */
  nonZero(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  /** n forskellige elementer fra items. */
  sample<T>(items: readonly T[], n: number): T[];
  shuffle<T>(items: readonly T[]): T[];
  bool(p?: number): boolean;
  /** +1 eller -1. */
  sign(): number;
}

export interface GenContext {
  rng: Rng;
  level: Difficulty;
}

export interface Generator {
  id: string;
  /** Vises i biblioteket: "Løs ligning med parentes". */
  label: string;
  /** Generatoren bruges først fra dette niveau. */
  minLevel?: Difficulty;
  /** Overstyrer færdighedens aids, hvis netop denne opgavetype afviger. */
  aids?: Aids;
  make(ctx: GenContext): ProblemDraft;
}

/** Hvad generatoren returnerer; motoren pakker den til et Problem. */
export interface ProblemDraft {
  prompt: string;
  /** Ekstra instruktion, fx "Svar med to decimaler". */
  instruction?: string;
  input: InputSpec;
  answer: AnswerSpec;
  choices?: string[];
  /** Stigende hjælp — fra et skub til næsten svaret. */
  hints: string[];
  solution: SolutionStep[];
  /** Kendte fejlsvar, så vi kan sige *hvorfor* det gik galt. */
  traps?: Trap[];
  visual?: Visual;
  /** Regel der bruges — vises i "Husk". */
  concept?: string;
  /** Forventet tid i sekunder; bruges til at opdage gæt. */
  seconds?: number;
}

export interface Problem extends ProblemDraft {
  id: string;
  skillId: string;
  domainId: DomainId;
  generatorId: string;
  level: Difficulty;
  seconds: number;
}

export type InputSpec =
  | { kind: 'number'; unit?: string; placeholder?: string; decimals?: number }
  | { kind: 'fraction' }
  | { kind: 'text'; placeholder?: string }
  | { kind: 'expression'; placeholder?: string }
  | { kind: 'choice' }
  | { kind: 'multi' }
  | { kind: 'pair'; labels: [string, string] }
  | { kind: 'point' };

export interface Frac {
  n: number;
  d: number;
}

export type AnswerSpec =
  | { type: 'number'; value: number; tolerance?: number }
  /** Accepterer ækvivalente brøker medmindre requireReduced. */
  | { type: 'fraction'; value: Frac; requireReduced?: boolean }
  | { type: 'text'; value: string; accept?: string[] }
  /** Sammenlignes efter normalisering (rækkefølge, mellemrum, *). */
  | { type: 'expression'; value: string; accept?: string[] }
  | { type: 'choice'; correct: number }
  | { type: 'multi'; correct: number[] }
  | { type: 'pair'; values: [number, number]; tolerance?: number }
  | { type: 'point'; x: number; y: number; tolerance?: number };

/**
 * En fælde er et forkert svar vi kan genkende. Rammer eleven den, får vi
 * fortalt præcis hvilken misforståelse der er på spil — i stedet for
 * bare "forkert".
 */
export interface Trap {
  misconceptionId: string;
  /** Det konkrete fejlsvar (tal eller tekst). */
  value?: number | string;
  /** Alternativ: egen matcher på elevens rå input. */
  match?: (raw: string, numeric: number | null) => boolean;
  /** Målrettet forklaring til netop denne fejl. */
  feedback: string;
}

export interface Misconception {
  id: string;
  domainId: DomainId;
  name: string;
  /** Hvad eleven tror. */
  belief: string;
  /** Hvorfor det ikke holder. */
  correction: string;
  /** Konkret huskeregel. */
  tip: string;
}

/* ------------------------------------------------------------------ */
/* Visualiseringer                                                     */
/* ------------------------------------------------------------------ */

export interface BalancePan {
  /** Antal x-klodser. */
  x: number;
  /** Antal 1-klodser (kan være negativt). */
  ones: number;
}

export type Visual =
  | { kind: 'balance'; left: BalancePan; right: BalancePan; caption?: string }
  | {
      kind: 'fractionBar';
      rows: { num: number; den: number; label?: string; tone?: 'brand' | 'accent' | 'warn' }[];
      caption?: string;
    }
  | {
      kind: 'numberLine';
      min: number;
      max: number;
      step: number;
      marks?: { value: number; label?: string; tone?: 'brand' | 'accent' | 'bad' | 'good' }[];
      interval?: { from: number | null; to: number | null; openFrom?: boolean; openTo?: boolean };
      caption?: string;
    }
  | {
      kind: 'coordinate';
      xRange: [number, number];
      yRange: [number, number];
      lines?: { a: number; b: number; label?: string; tone?: 'brand' | 'accent' | 'bad' }[];
      curves?: { type: 'exp' | 'quad'; a: number; b: number; label?: string; tone?: 'brand' | 'accent' | 'bad' }[];
      points?: { x: number; y: number; label?: string; tone?: 'brand' | 'accent' | 'bad' | 'good' }[];
      segments?: { x1: number; y1: number; x2: number; y2: number; label?: string; dashed?: boolean }[];
      caption?: string;
    }
  | {
      kind: 'triangle';
      /** Sider modsat vinkel A, B, C. c er hypotenusen i en retvinklet trekant (C = 90°). */
      a?: number;
      b?: number;
      c?: number;
      angleA?: number;
      angleB?: number;
      right?: boolean;
      labels?: { a?: string; b?: string; c?: string; A?: string; B?: string };
      highlight?: ('a' | 'b' | 'c' | 'A' | 'B')[];
      caption?: string;
    }
  | {
      kind: 'rect';
      w: number;
      h: number;
      labelW?: string;
      labelH?: string;
      grid?: boolean;
      caption?: string;
    }
  | {
      kind: 'circle';
      r: number;
      show?: ('radius' | 'diameter' | 'circumference')[];
      label?: string;
      caption?: string;
    }
  | {
      kind: 'solid';
      type: 'box' | 'cylinder' | 'cone' | 'sphere' | 'prism' | 'pyramid';
      dims: { w?: number; h?: number; d?: number; r?: number };
      labels?: Record<string, string>;
      caption?: string;
    }
  | {
      kind: 'angles';
      /** 'triangle' = vinkelsum, 'lines' = to linjer der skærer, 'parallel' = parallelle linjer. */
      type: 'triangle' | 'lines' | 'parallel' | 'single';
      values: (number | null)[];
      labels?: string[];
      caption?: string;
    }
  | { kind: 'barChart'; data: { label: string; value: number }[]; yLabel?: string; caption?: string }
  | { kind: 'boxPlot'; min: number; q1: number; median: number; q3: number; max: number; caption?: string }
  | { kind: 'pie'; slices: { label: string; value: number }[]; caption?: string }
  | { kind: 'dotPlot'; values: number[]; caption?: string }
  | {
      kind: 'probTree';
      levels: { label: string; branches: { label: string; p: string }[] }[];
      caption?: string;
    }
  | { kind: 'percentBar'; whole: number; part: number; wholeLabel?: string; partLabel?: string; caption?: string }
  | { kind: 'table'; head: string[]; rows: string[][]; caption?: string };

/* ------------------------------------------------------------------ */
/* Elevens tilstand                                                    */
/* ------------------------------------------------------------------ */

export type LessonPhase =
  | 'explain'
  | 'example'
  | 'guided'
  | 'independent'
  | 'variation'
  | 'challenge'
  | 'mastery';

export const LESSON_PHASES: LessonPhase[] = [
  'explain',
  'example',
  'guided',
  'independent',
  'variation',
  'challenge',
  'mastery',
];

export type SkillStatus = 'locked' | 'ready' | 'learning' | 'review' | 'mastered';

export interface SkillState {
  skillId: string;
  /** BKT: sandsynligheden for at eleven kan færdigheden. */
  pKnown: number;
  /** Elo-agtig evne; bestemmer hvilket niveau opgaverne trækkes på. */
  ability: number;
  attempts: number;
  correct: number;
  streak: number;
  bestStreak: number;
  /** Hvor langt eleven er i 7-trins-forløbet. */
  phase: LessonPhase;
  phaseProgress: number;
  lastSeen: number | null;
  masteredAt: number | null;
  /* Spaced repetition (SM-2-inspireret) */
  interval: number;
  ease: number;
  due: number | null;
  reviews: number;
  lapses: number;
  /* Adfærd */
  avgSeconds: number;
  hintsUsed: number;
  /** Rettelser i træk uden hints — bruges til at hæve niveau. */
  cleanStreak: number;
}

export interface MisconceptionState {
  id: string;
  count: number;
  lastSeen: number;
  /** Rettet, når eleven bagefter har svaret rigtigt på samme type. */
  resolved: boolean;
  skillIds: string[];
}

export interface Attempt {
  ts: number;
  skillId: string;
  domainId: DomainId;
  generatorId: string;
  level: Difficulty;
  correct: boolean;
  seconds: number;
  hints: number;
  tries: number;
  phase: LessonPhase | 'diagnostic' | 'practice' | 'review';
  misconceptionId?: string;
  confidence?: 1 | 2 | 3;
}

export interface LearnerProfile {
  name: string;
  grade: number;
  /** 1-5 fra onboarding. */
  confidence: number;
  hardTopics: DomainId[];
  easyTopics: DomainId[];
  createdAt: number;
  onboarded: boolean;
  diagnosticDone: boolean;
  /** Har eleven set rundvisningen på forsiden? */
  tourDone: boolean;
  /** Procent pr. emne fra diagnosen. */
  diagnostic: Partial<Record<DomainId, number>>;
  recommended: DomainId[];
}

export interface Gamification {
  xp: number;
  level: number;
  streakDays: number;
  lastActiveDay: string | null;
  /** achievement-id -> tidspunkt for optjening. */
  achievements: Record<string, number>;
  dailyGoalXp: number;
  todayXp: number;
  today: string | null;
  totalMinutes: number;
}

export interface Settings {
  theme: 'light' | 'dark' | 'system';
  sound: boolean;
  reducedMotion: boolean;
  askConfidence: boolean;
  /** Valgfri Claude-nøgle; ligger kun i browseren. */
  apiKey: string;
  useLlmTutor: boolean;
  /** Hvilken Claude-model der bruges, hvis den er slået til. */
  llmModel: string;
  /** Samlet forbrug, så eleven kan se hvad den valgfri AI har kostet. */
  llmUsage: { input: number; output: number; calls: number };
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  /** Navn fra ikonsættet - aldrig en emoji. */
  icon: IconName;
  /** Returnerer true når betingelsen er opfyldt. */
  check: (s: AchievementContext) => boolean;
}

export interface AchievementContext {
  gamification: Gamification;
  skills: Record<string, SkillState>;
  attempts: Attempt[];
  profile: LearnerProfile;
  masteredCount: number;
  domainsMastered: number;
}
