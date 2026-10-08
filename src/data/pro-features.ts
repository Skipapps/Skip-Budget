import {
  ArchiveRestore,
  ArrowDownUp,
  BadgeCheck,
  Banknote,
  Bell,
  CalendarCheck,
  CalendarRange,
  ChartNoAxesColumn,
  CircleCheck,
  CreditCard,
  History,
  Infinity as InfinityIcon,
  LockOpen,
  Mic,
  ReceiptText,
  Replace,
  ScanLine,
  Scale,
  ShieldCheck,
  Sparkles,
  Store,
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
  /** Three lines, each a single line of words with its own icon. */
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

function feature(
  id: string,
  icon: LucideIcon,
  points: [LucideIcon, LucideIcon, LucideIcon],
): ProFeature {
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
    points: [point(points[0], key('a')), point(points[1], key('b')), point(points[2], key('c'))],
  };
}

/**
 * What each locked door says for itself: one example, a heading, a line, three points. Each page
 * argues for its feature in its own terms, never "this is locked".
 */
export const PRO_FEATURES: Record<string, ProFeature> = {
  insights: feature('insights', ChartNoAxesColumn, [Wallet, ArrowDownUp, CalendarCheck]),
  scan: feature('scan', ScanLine, [InfinityIcon, Sparkles, ShieldCheck]),
  voice: feature('voice', Mic, [ReceiptText, CircleCheck, ShieldCheck]),
  history: feature('history', History, [CalendarRange, ArchiveRestore, Scale]),
  logos: feature('logos', Store, [BadgeCheck, Replace, Bell]),
  unlimited: feature('unlimited', CreditCard, [InfinityIcon, Banknote, LockOpen]),
};
