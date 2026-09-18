import type { SVGProps } from 'react';

/**
 * Ikonsættet.
 *
 * Alle ikoner er tegnet på det samme 24×24-gitter med samme stregtykkelse
 * og runde hjørner, så de ser ud som ét sæt. De arver farven fra teksten
 * via currentColor, og de har ingen egen farve — det er det der gør at de
 * virker i både lyst og mørkt tema uden at blive rettet til.
 *
 * Emoji blev brugt før. De ser forskellige ud på hver platform, kan ikke
 * farves, og de sender et signal om at ingen har tænkt over det.
 */

export type IconName =
  | 'home' | 'map' | 'pencil' | 'exam' | 'user' | 'settings'
  | 'flame' | 'bolt' | 'star' | 'trophy' | 'target' | 'medal'
  | 'check' | 'close' | 'chevron' | 'arrow-left' | 'arrow-right' | 'plus'
  | 'lock' | 'play' | 'refresh' | 'clock' | 'calendar'
  | 'bulb' | 'sparkle' | 'search' | 'info' | 'warning' | 'brain'
  | 'book' | 'calculator' | 'shapes' | 'dice' | 'chart' | 'ruler'
  | 'function' | 'percent' | 'sigma' | 'compass' | 'layers' | 'flag'
  | 'eye' | 'send' | 'download' | 'trash' | 'sun' | 'moon' | 'monitor'
  | 'grid' | 'mountain' | 'seedling' | 'rocket';

interface Props extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
  /** Fyldt variant til aktive tilstande. */
  filled?: boolean;
}

/* Hver post er indholdet af et 24×24 viewBox. */
const PATHS: Record<IconName, string> = {
  /* Navigation */
  home: 'M3 10.5 12 3l9 7.5M5.5 9.5V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.5',
  map: 'M9 4 3 6.5v13L9 17m0-13 6 3m-6-3v13m6-10 6-2.5v13L15 17m0-13v13m-6 0 6 0',
  pencil: 'M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3ZM15 6l3 3',
  exam: 'M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm8 0v5h5M9 13h6M9 17h4',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8.4-3a8.4 8.4 0 0 0-.13-1.46l1.8-1.35-2-3.46-2.1.86a8.3 8.3 0 0 0-2.53-1.47L15.1 2.9h-4l-.34 2.22a8.3 8.3 0 0 0-2.53 1.47l-2.1-.86-2 3.46 1.8 1.35a8.4 8.4 0 0 0 0 2.92l-1.8 1.35 2 3.46 2.1-.86a8.3 8.3 0 0 0 2.53 1.47l.34 2.22h4l.34-2.22a8.3 8.3 0 0 0 2.53-1.47l2.1.86 2-3.46-1.8-1.35c.09-.48.13-.97.13-1.46Z',

  /* Status og belønning */
  flame: 'M12 22c3.9 0 6.5-2.5 6.5-6 0-4.5-4-6-4.5-10-2 1.5-3 3.5-3 5.5-1-.5-1.5-1.5-1.5-2.5C7.5 11 5.5 13 5.5 16c0 3.5 2.6 6 6.5 6Z',
  bolt: 'M13.5 2 4 13.5h6L10.5 22 20 10.5h-6L13.5 2Z',
  star: 'm12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z',
  trophy: 'M7 4h10v6a5 5 0 0 1-10 0V4Zm0 2H4v2a3 3 0 0 0 3 3m10-5h3v2a3 3 0 0 1-3 3m-5 5v4m-3 2h6',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0-3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z',
  medal: 'M12 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm-3.5-1.5L7 22l5-2.5L17 22l-1.5-8.5',

  /* Handlinger */
  check: 'm5 13 4.5 4.5L19 7',
  close: 'M6 6l12 12M18 6 6 18',
  chevron: 'm9 5 7 7-7 7',
  'arrow-left': 'M19 12H5m0 0 6-6m-6 6 6 6',
  'arrow-right': 'M5 12h14m0 0-6-6m6 6-6 6',
  plus: 'M12 5v14M5 12h14',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3m-11 0h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z',
  play: 'M8 5.5v13l11-6.5-11-6.5Z',
  refresh: 'M20 12a8 8 0 1 1-2.6-5.9M20 4v5h-5',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13.5V12l3.5 2',
  calendar: 'M5 6h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm3-3v5m8-5v5M4 11h16',

  /* Læring */
  bulb: 'M9 18h6m-5 3h4m-5-6.5a6 6 0 1 1 6 0c-.6.5-1 1.2-1 2h-4c0-.8-.4-1.5-1-2Z',
  sparkle: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Zm7 9.5.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1Z',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm5.5-2.5L21 21',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-9.5V16m0-8h.01',
  warning: 'M12 3.5 2.5 20h19L12 3.5Zm0 6V14m0 3h.01',
  brain: 'M9.5 4a2.5 2.5 0 0 0-2.4 3.2A2.8 2.8 0 0 0 5 10a2.8 2.8 0 0 0 1.3 2.4A2.8 2.8 0 0 0 8 17.5a2.5 2.5 0 0 0 4 .5V4.5A2.5 2.5 0 0 0 9.5 4Zm5 0a2.5 2.5 0 0 1 2.4 3.2A2.8 2.8 0 0 1 19 10a2.8 2.8 0 0 1-1.3 2.4 2.8 2.8 0 0 1-1.7 5.1 2.5 2.5 0 0 1-4 .5',

  /* Fag */
  book: 'M5 4h9a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2.5H5V4Zm14 3h.5a1 1 0 0 1 1 1v11.5a2.5 2.5 0 0 0-2.5-2.5',
  calculator: 'M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm2 4h8v3H8V7Zm0 6h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01M16 17h.01',
  shapes: 'M7.5 3 13 12.5H2L7.5 3ZM17 21a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM14 3h7v7h-7V3Z',
  dice: 'M5 5h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm3 4h.01M16 9h.01M12 12h.01M8 15h.01M16 15h.01',
  chart: 'M4 20h16M7 20v-7m5 7V6m5 14v-10',
  ruler: 'M3.5 14.5 14.5 3.5a1.4 1.4 0 0 1 2 0l4 4a1.4 1.4 0 0 1 0 2l-11 11a1.4 1.4 0 0 1-2 0l-4-4a1.4 1.4 0 0 1 0-2ZM8 10l2 2m1.5-4.5 2 2M15 4l2 2',
  function: 'M7 20c0-9 .5-16 3.5-16 1.5 0 2 1 2 2M6 10h7m2 1.5 5 6m0-6-5 6',
  percent: 'M19 5 5 19M7.5 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm9 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  sigma: 'M18 4H6l6 8-6 8h12',
  compass: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm3.5-12.5-2 5.5-5.5 2 2-5.5 5.5-2Z',
  layers: 'm12 3 9 5-9 5-9-5 9-5Zm9 9-9 5-9-5m18 4-9 5-9-5',
  flag: 'M5 21V4m0 1h11l-2 4 2 4H5',

  /* Diverse */
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Zm9.5 2.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  send: 'M21 3 3 10.5l7 3 3 7L21 3Zm0 0-11 11',
  download: 'M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5M4 19h16',
  trash: 'M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m3 0v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7m4 4v6m4-6v6',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0-13v2m0 18v-2M3 12h2m18 0h-2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17m10-10 1.4-1.4',
  moon: 'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z',
  monitor: 'M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm4 15h8m-4-4v4',
  grid: 'M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z',
  mountain: 'M3 19h18L14 6l-3.5 6.5L8.5 10 3 19Z',
  seedling: 'M12 21v-7m0 0c0-3-2-5-5-5H4c0 3 2 5 5 5h3Zm0 0c0-3.5 2.5-6 6-6h2c0 3.5-2.5 6-6 6h-2Z',
  rocket: 'M9 15c-2 1-3 2.5-3.5 5 2.5-.5 4-1.5 5-3.5M9 15l-2.5-2.5m2.5 2.5L12 18m-5.5-5.5L9 10.5A11 11 0 0 1 19 3a11 11 0 0 1-7.5 10L9 15.5m6-8.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z',
};

/** Ikoner der tegnes fyldt frem for som streg. */
const FILLABLE: IconName[] = ['star', 'flame', 'bolt', 'play', 'check', 'medal', 'trophy'];

export function Icon({ name, size = 20, filled, className, ...rest }: Props) {
  const d = PATHS[name];
  const solid = filled && FILLABLE.includes(name);
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={solid ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={solid ? 0 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={d} />
    </svg>
  );
}

/** Ikon pr. emne, så biblioteket og kortet ser ensartet ud. */
export const DOMAIN_ICONS: Record<string, IconName> = {
  tal: 'calculator',
  broeker: 'layers',
  decimaler: 'sigma',
  procenter: 'percent',
  forhold: 'ruler',
  potenser: 'bolt',
  roedder: 'compass',
  algebra: 'function',
  ligninger: 'sigma',
  uligheder: 'chart',
  geometri: 'shapes',
  'areal-rumfang': 'grid',
  trigonometri: 'compass',
  koordinatsystem: 'map',
  flytninger: 'refresh',
  tegning: 'ruler',
  funktioner: 'function',
  statistik: 'chart',
  sandsynlighed: 'dice',
  problemloesning: 'brain',
  modeller: 'layers',
};

export const domainIcon = (id: string): IconName => DOMAIN_ICONS[id] ?? 'book';
