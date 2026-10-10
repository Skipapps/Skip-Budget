import {
  ArchiveRestore,
  ArrowDownUp,
  CalendarCheck,
  CalendarRange,
  ChartNoAxesColumn,
  CircleCheck,
  CreditCard,
  History,
  Infinity as InfinityIcon,
  LockOpen,
  Mic,
  PiggyBank,
  ReceiptText,
  ScanLine,
  Scale,
  ShieldCheck,
  Sparkles,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';

import { t, type MessageKey } from '@/i18n';

export type ProFeature = {
  id: string;
  /** The big mark in the accent circle. */
  icon: LucideIcon;
  /** One example under it, as the person would see or say it. */
  example: string;
  title: string;
  /** One line under the title. */
  subtitle: string;
  /** Two or three lines, each a single line of words with its own icon. */
  points: { icon: LucideIcon; text: string }[];
};

/** Read when drawn, never at import, so the words follow the language on screen. */
function point(icon: LucideIcon, text: MessageKey): ProFeature['points'][number] {
  return {
    icon,
    get text() {
      return t(text);
    },
  };
}

/**
 * Each point's icon, keyed by the message it draws (`pro.<id>.a`, `.b`, `.c`), in that order. The
 * middle one may go, so a page with two points keeps the keys its words already have.
 */
type PointIcons = { a: LucideIcon; b?: LucideIcon; c: LucideIcon };

function feature(id: string, icon: LucideIcon, points: PointIcons): ProFeature {
  const key = (part: string) => `pro.${id}.${part}` as MessageKey;
  return {
    id,
    icon,
    get example() {
      return t(key('example'));
    },
    get title() {
      return t(key('title'));
    },
    get subtitle() {
      return t(key('subtitle'));
    },
    points: (['a', 'b', 'c'] as const).flatMap((part) => {
      const pointIcon = points[part];
      return pointIcon ? [point(pointIcon, key(part))] : [];
    }),
  };
}

/**
 * What each locked door says for itself: one example, a heading, a line, two or three points. Each
 * page argues for its feature in its own terms, never "this is locked".
 */
export const PRO_FEATURES: Record<string, ProFeature> = {
  insights: feature('insights', ChartNoAxesColumn, {
    a: Wallet,
    b: ArrowDownUp,
    c: CalendarCheck,
  }),
  scan: feature('scan', ScanLine, { a: InfinityIcon, b: Sparkles, c: ShieldCheck }),
  voice: feature('voice', Mic, { a: ReceiptText, b: CircleCheck, c: ShieldCheck }),
  history: feature('history', History, { a: CalendarRange, b: ArchiveRestore, c: Scale }),
  // Moving money between accounts is free on every plan, so it is no point for Pro.
  unlimited: feature('unlimited', CreditCard, { a: InfinityIcon, c: LockOpen }),
  habits: feature('habits', CalendarCheck, { a: CircleCheck, b: PiggyBank, c: ReceiptText }),
};
