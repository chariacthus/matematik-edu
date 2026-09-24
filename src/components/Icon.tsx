import {
  ArrowLeft, ArrowRight, BookOpen, Brain, Calculator, Calendar, ChartColumn, Check,
  ChevronRight, Clock, Compass, Dices, Download, Eye, FileText, Flag, Flame, Grid3x3,
  Hand, House, Info, Layers, Lightbulb, Lock, Map, Medal, Monitor, Moon, Mountain, Pencil,
  Percent, Play, Plus, Rocket, RotateCw, Ruler, Search, Send, Settings, Shapes, Sigma,
  Sprout, SquareFunction, Star, Sun, Target, Trash2, TriangleAlert, Trophy,
  User, X, Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type IconName =
  | 'home' | 'map' | 'pencil' | 'exam' | 'user' | 'settings'
  | 'flame' | 'bolt' | 'star' | 'trophy' | 'target' | 'medal'
  | 'check' | 'close' | 'chevron' | 'arrow-left' | 'arrow-right' | 'plus'
  | 'lock' | 'play' | 'refresh' | 'clock' | 'calendar'
  | 'bulb' | 'hand' | 'search' | 'info' | 'warning' | 'brain'
  | 'book' | 'calculator' | 'shapes' | 'dice' | 'chart' | 'ruler'
  | 'function' | 'percent' | 'sigma' | 'compass' | 'layers' | 'flag'
  | 'eye' | 'send' | 'download' | 'trash' | 'sun' | 'moon' | 'monitor'
  | 'grid' | 'mountain' | 'seedling' | 'rocket';

const ICONS: Record<IconName, LucideIcon> = {
  home: House,
  map: Map,
  pencil: Pencil,
  exam: FileText,
  user: User,
  settings: Settings,
  flame: Flame,
  bolt: Zap,
  star: Star,
  trophy: Trophy,
  target: Target,
  medal: Medal,
  check: Check,
  close: X,
  chevron: ChevronRight,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  plus: Plus,
  lock: Lock,
  play: Play,
  refresh: RotateCw,
  clock: Clock,
  calendar: Calendar,
  bulb: Lightbulb,
  hand: Hand,
  search: Search,
  info: Info,
  warning: TriangleAlert,
  brain: Brain,
  book: BookOpen,
  calculator: Calculator,
  shapes: Shapes,
  dice: Dices,
  chart: ChartColumn,
  ruler: Ruler,
  function: SquareFunction,
  percent: Percent,
  sigma: Sigma,
  compass: Compass,
  layers: Layers,
  flag: Flag,
  eye: Eye,
  send: Send,
  download: Download,
  trash: Trash2,
  sun: Sun,
  moon: Moon,
  monitor: Monitor,
  grid: Grid3x3,
  mountain: Mountain,
  seedling: Sprout,
  rocket: Rocket,
};

export function Icon({
  name,
  size = 20,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  const Glyph = ICONS[name];
  return <Glyph size={size} strokeWidth={1.75} className={className} aria-hidden focusable="false" />;
}

const DOMAIN_ICONS: Record<string, IconName> = {
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
