import { t, type MessageKey } from '@/i18n';
import type { ArtworkName } from '@/theme/artwork';

export type ProFeature = {
  id: string;
  artwork: ArtworkName;
  title: string;
  tagline: string;
  benefits: { title: string; detail: string }[];
};

/** Read when drawn, never at import, so the words follow the language on screen. */
function benefit(title: MessageKey, detail: MessageKey): ProFeature['benefits'][number] {
  return {
    get title() {
      return t(title);
    },
    get detail() {
      return t(detail);
    },
  };
}

/**
 * The explainer behind each locked door. Each page argues for its feature in its own terms, never
 * "this is locked".
 */
export const PRO_FEATURES: Record<string, ProFeature> = {
  loans: {
    id: 'loans',
    artwork: 'tileLoanRepayment',
    get title() {
      return t('pro.loans.title');
    },
    get tagline() {
      return t('pro.loans.tagline');
    },
    benefits: [
      benefit('pro.loans.exact.title', 'pro.loans.exact.detail'),
      benefit('pro.loans.schedule.title', 'pro.loans.schedule.detail'),
      benefit('pro.loans.bill.title', 'pro.loans.bill.detail'),
    ],
  },
  insights: {
    id: 'insights',
    artwork: 'insights',
    get title() {
      return t('pro.insights.title');
    },
    get tagline() {
      return t('pro.insights.tagline');
    },
    benefits: [
      benefit('pro.insights.stand.title', 'pro.insights.stand.detail'),
      benefit('pro.insights.goes.title', 'pro.insights.goes.detail'),
      benefit('pro.insights.months.title', 'pro.insights.months.detail'),
    ],
  },
  scan: {
    id: 'scan',
    artwork: 'tileReceipts',
    get title() {
      return t('pro.scan.title');
    },
    get tagline() {
      return t('pro.scan.tagline');
    },
    benefits: [
      benefit('pro.scan.unlimited.title', 'pro.scan.unlimited.detail'),
      benefit('pro.scan.private.title', 'pro.scan.private.detail'),
      benefit('pro.scan.handled.title', 'pro.scan.handled.detail'),
    ],
  },
  voice: {
    id: 'voice',
    artwork: 'welcomeTrack',
    get title() {
      return t('pro.voice.title');
    },
    get tagline() {
      return t('pro.voice.tagline');
    },
    benefits: [
      benefit('pro.voice.kinds.title', 'pro.voice.kinds.detail'),
      benefit('pro.voice.check.title', 'pro.voice.check.detail'),
      benefit('pro.voice.private.title', 'pro.voice.private.detail'),
    ],
  },
  unlimited: {
    id: 'unlimited',
    artwork: 'emptyWallet',
    get title() {
      return t('pro.unlimited.title');
    },
    get tagline() {
      return t('pro.unlimited.tagline');
    },
    benefits: [
      benefit('pro.unlimited.all.title', 'pro.unlimited.all.detail'),
      benefit('pro.unlimited.income.title', 'pro.unlimited.income.detail'),
      benefit('pro.unlimited.kept.title', 'pro.unlimited.kept.detail'),
    ],
  },
};
