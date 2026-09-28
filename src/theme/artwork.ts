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
import TileSplitCalculator from '@/assets/illustrations/tile-split-calculator.svg';
import TileSubscriptions from '@/assets/illustrations/tile-subscriptions.svg';
import WelcomeHero from '@/assets/illustrations/welcome-hero.svg';
import WelcomePrivacy from '@/assets/illustrations/welcome-privacy.svg';
import WelcomeTrack from '@/assets/illustrations/welcome-track.svg';

/**
 * The artwork, in both modes.
 *
 * Illustrations cannot be recoloured by a token the way the interface can:
 * they are drawn, not styled, and the light versions are drawn on white. On a
 * near-black page they read as bright rectangles pasted onto it. So dark mode
 * gets its own set — the same drawings, redrawn for the background they sit on.
 *
 * A few have no dark version and fall back to the light one. That is a
 * deliberate row in the table rather than a missing import, so it is obvious
 * which ones are still owed artwork.
 */

type Pair = { light: FC<SvgProps>; dark: FC<SvgProps> };

const ARTWORK = {
  insights: { light: Insights, dark: DarkInsights },
  // Drawn once for both modes: the artwork sits on transparency and its
  // palette was chosen to read on light and near-black pages alike.
  loginHero: { light: LoginHero, dark: LoginHero },
  welcomeHero: { light: WelcomeHero, dark: DarkWelcomeHero },
  welcomePrivacy: { light: WelcomePrivacy, dark: WelcomePrivacy },
  welcomeTrack: { light: WelcomeTrack, dark: WelcomeTrack },

  // Single-mode drawings, like loginHero.
  tileLoanRepayment: { light: TileLoanRepayment, dark: TileLoanRepayment },
  tileMonthlyBills: { light: TileMonthlyBills, dark: TileMonthlyBills },
  tileReceipts: { light: TileReceipts, dark: TileReceipts },
  tileSalary: { light: TileSalary, dark: TileSalary },
  tileSavings: { light: TileSavings, dark: TileSavings },
  tileSplitCalculator: { light: TileSplitCalculator, dark: TileSplitCalculator },
  tileSubscriptions: { light: TileSubscriptions, dark: DarkTileSubscriptions },

  emptyBills: { light: StateEmptyBills, dark: DarkStateEmptyBills },
  emptyCards: { light: StateEmptyCards, dark: DarkStateEmptyCards },
  emptyReceipts: { light: StateEmptyReceipts, dark: DarkStateEmptyReceipts },
  emptySubscriptions: { light: StateEmptySubscriptions, dark: DarkStateEmptySubscriptions },
  emptyWallet: { light: StateEmptyWallet, dark: DarkStateEmptyWallet },
  error: { light: StateError, dark: DarkStateError },
  noResults: { light: StateNoResults, dark: DarkStateNoResults },

  // Still owed a dark version. The light drawing shows through until there is
  // one, which is worse than a redraw and better than a hole in the screen.
  loanSchedule: { light: LoanSchedule, dark: LoanSchedule },
} satisfies Record<string, Pair>;

export type ArtworkName = keyof typeof ARTWORK;

/**
 * Every illustration, already resolved for the mode in force.
 *
 * Returns the whole set rather than one drawing, because the tiles are held in
 * data as a list and a hook cannot be called per row. One call at the top of a
 * screen, then index it by name — including inside a map.
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
