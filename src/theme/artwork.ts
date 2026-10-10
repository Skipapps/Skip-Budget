import type { FC } from 'react';
import { useMemo } from 'react';
import type { SvgProps } from 'react-native-svg';

import { useTheme } from '@/providers/theme-provider';

import DarkStateEmptyBills from '@/assets/illustrations/dark/state-empty-bills.svg';
import DarkStateEmptyReceipts from '@/assets/illustrations/dark/state-empty-receipts.svg';
import DarkStateEmptySubscriptions from '@/assets/illustrations/dark/state-empty-subscriptions.svg';
import DarkStateEmptyWallet from '@/assets/illustrations/dark/state-empty-wallet.svg';
import DarkStateError from '@/assets/illustrations/dark/state-error.svg';
import DarkStateNoResults from '@/assets/illustrations/dark/state-no-results.svg';
import DarkWelcomeHero from '@/assets/illustrations/dark/welcome-hero.svg';

import LoginHero from '@/assets/illustrations/login-hero.svg';
import StateEmptyBills from '@/assets/illustrations/state-empty-bills.svg';
import StateEmptyReceipts from '@/assets/illustrations/state-empty-receipts.svg';
import StateEmptySubscriptions from '@/assets/illustrations/state-empty-subscriptions.svg';
import StateEmptyWallet from '@/assets/illustrations/state-empty-wallet.svg';
import StateError from '@/assets/illustrations/state-error.svg';
import StateNoResults from '@/assets/illustrations/state-no-results.svg';
import TileSavings from '@/assets/illustrations/tile-savings.svg';
import WelcomeHero from '@/assets/illustrations/welcome-hero.svg';

/** Illustrations per colour scheme. A drawing with no dark variant reuses the light one. */

type Pair = { light: FC<SvgProps>; dark: FC<SvgProps> };

const ARTWORK = {
  // One drawing for both modes: it sits on transparency and its palette reads on light and dark.
  loginHero: { light: LoginHero, dark: LoginHero },
  welcomeHero: { light: WelcomeHero, dark: DarkWelcomeHero },

  tileSavings: { light: TileSavings, dark: TileSavings },

  emptyBills: { light: StateEmptyBills, dark: DarkStateEmptyBills },
  emptyReceipts: { light: StateEmptyReceipts, dark: DarkStateEmptyReceipts },
  emptySubscriptions: { light: StateEmptySubscriptions, dark: DarkStateEmptySubscriptions },
  emptyWallet: { light: StateEmptyWallet, dark: DarkStateEmptyWallet },
  error: { light: StateError, dark: DarkStateError },
  noResults: { light: StateNoResults, dark: DarkStateNoResults },
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
