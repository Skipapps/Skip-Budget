import type { FC } from 'react';
import { useMemo } from 'react';
import type { SvgProps } from 'react-native-svg';

import { useTheme } from '@/providers/theme-provider';

import DarkInsights from '@/assets/illustrations/dark/insights.svg';
import DarkStateEmptyBills from '@/assets/illustrations/dark/state-empty-bills.svg';
import DarkStateEmptyCards from '@/assets/illustrations/dark/state-empty-cards.svg';
import DarkStateEmptyReceipts from '@/assets/illustrations/dark/state-empty-receipts.svg';
import DarkStateEmptySubscriptions from '@/assets/illustrations/dark/state-empty-subscriptions.svg';
import DarkStateEmptyWallet from '@/assets/illustrations/dark/state-empty-wallet.svg';
import DarkStateError from '@/assets/illustrations/dark/state-error.svg';
import DarkStateNoResults from '@/assets/illustrations/dark/state-no-results.svg';
import DarkTileSubscriptions from '@/assets/illustrations/dark/tile-subscriptions.svg';
import DarkWelcomeHero from '@/assets/illustrations/dark/welcome-hero.svg';

import Insights from '@/assets/illustrations/insights.svg';
import LoanSchedule from '@/assets/illustrations/loan-schedule.svg';
import LoginHero from '@/assets/illustrations/login-hero.svg';
import StateEmptyBills from '@/assets/illustrations/state-empty-bills.svg';
import StateEmptyCards from '@/assets/illustrations/state-empty-cards.svg';
import StateEmptyReceipts from '@/assets/illustrations/state-empty-receipts.svg';
import StateEmptySubscriptions from '@/assets/illustrations/state-empty-subscriptions.svg';
import StateEmptyWallet from '@/assets/illustrations/state-empty-wallet.svg';
import StateError from '@/assets/illustrations/state-error.svg';
import StateNoResults from '@/assets/illustrations/state-no-results.svg';
import TileLoanRepayment from '@/assets/illustrations/tile-loan-repayment.svg';
import TileMonthlyBills from '@/assets/illustrations/tile-monthly-bills.svg';
import TileReceipts from '@/assets/illustrations/tile-receipts.svg';
import TileSalary from '@/assets/illustrations/tile-salary.svg';
import TileSavings from '@/assets/illustrations/tile-savings.svg';
import TileSubscriptions from '@/assets/illustrations/tile-subscriptions.svg';
import WelcomeHero from '@/assets/illustrations/welcome-hero.svg';
import WelcomePrivacy from '@/assets/illustrations/welcome-privacy.svg';
import WelcomeTrack from '@/assets/illustrations/welcome-track.svg';

/** Illustrations per colour scheme. A drawing with no dark variant reuses the light one. */

type Pair = { light: FC<SvgProps>; dark: FC<SvgProps> };

const ARTWORK = {
  insights: { light: Insights, dark: DarkInsights },
  // One drawing for both modes: it sits on transparency and its palette reads on light and dark.
  loginHero: { light: LoginHero, dark: LoginHero },
  welcomeHero: { light: WelcomeHero, dark: DarkWelcomeHero },
  welcomePrivacy: { light: WelcomePrivacy, dark: WelcomePrivacy },
  welcomeTrack: { light: WelcomeTrack, dark: WelcomeTrack },

  tileLoanRepayment: { light: TileLoanRepayment, dark: TileLoanRepayment },
  tileMonthlyBills: { light: TileMonthlyBills, dark: TileMonthlyBills },
  tileReceipts: { light: TileReceipts, dark: TileReceipts },
  tileSalary: { light: TileSalary, dark: TileSalary },
  tileSavings: { light: TileSavings, dark: TileSavings },
  tileSubscriptions: { light: TileSubscriptions, dark: DarkTileSubscriptions },

  emptyBills: { light: StateEmptyBills, dark: DarkStateEmptyBills },
  emptyCards: { light: StateEmptyCards, dark: DarkStateEmptyCards },
  emptyReceipts: { light: StateEmptyReceipts, dark: DarkStateEmptyReceipts },
  emptySubscriptions: { light: StateEmptySubscriptions, dark: DarkStateEmptySubscriptions },
  emptyWallet: { light: StateEmptyWallet, dark: DarkStateEmptyWallet },
  error: { light: StateError, dark: DarkStateError },
  noResults: { light: StateNoResults, dark: DarkStateNoResults },

  // No dark version yet; the light drawing is reused.
  loanSchedule: { light: LoanSchedule, dark: LoanSchedule },
} satisfies Record<string, Pair>;

export type ArtworkName = keyof typeof ARTWORK;

/**
 * Every illustration resolved for the mode in force. Returns the whole set because tiles live in
 * data as a list and a hook cannot be called per row.
 */
export function useArtwork(): Record<ArtworkName, FC<SvgProps>> {
  const { scheme } = useTheme();

  return useMemo(() => {
    const resolved = {} as Record<ArtworkName, FC<SvgProps>>;
    for (const [name, pair] of Object.entries(ARTWORK) as [ArtworkName, Pair][]) {
      resolved[name] = pair[scheme];
    }
    return resolved;
  }, [scheme]);
}
