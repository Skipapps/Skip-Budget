import { Image } from 'expo-image';
import { useSyncExternalStore, type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { logoImageUrl } from '@/api/logos';
import { cn } from '@/lib/cn';
import { isLightColor } from '@/lib/color';
import { CARD_COLORS } from '@/theme/card-colors';

type BrandLogoProps = {
  /** Shown in the fallback tile, so it is required even when a logo exists. */
  name: string;
  /** The website whose logo to draw; none draws the monogram. */
  domain?: string | null;
  size?: number;
  className?: string;
  /** Drawn instead of the monogram when there is no logo, e.g. a bill's own glyph. */
  fallback?: ReactNode;
};

/** How long a logo that would not load is drawn as letters before it is asked for again. */
export const FAILED_LOGO_RETRY_MS = 10 * 60 * 1000;

/**
 * Logo URLs that failed in the last FAILED_LOGO_RETRY_MS. A website with no logo answers 404 every
 * time, so without this every row showing it would ask again on every mount. Forgotten after the
 * wait rather than kept for the session, because a phone that was briefly offline fails the same
 * way and must get its logos back. Rows read it as a store, so a row on screen redraws (and asks
 * again) when a failure is forgotten, not only rows mounted later.
 */
const failedLately = new Set<string>();
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function rememberFailure(url: string) {
  if (failedLately.has(url)) return;
  failedLately.add(url);
  notify();
  setTimeout(() => {
    failedLately.delete(url);
    notify();
  }, FAILED_LOGO_RETRY_MS);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Fallback tile colour. Deterministic per name, so a brand looks the same everywhere; hashing the
 * name rather than cycling an index means adding brands never reshuffles the ones on screen.
 */
function monogramColor(name: string): string {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) % 100000;
  }
  return CARD_COLORS[hash % CARD_COLORS.length].value;
}

/** First letter of the first two words: "Trader Joe's" reads better as TJ than T. */
function monogram(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * A brand's logo, or a coloured monogram. The fallback is not an error state: plenty of websites
 * have no logo, and the service answers those with a 404.
 */
export function BrandLogo({ name, domain, size = 40, className, fallback }: BrandLogoProps) {
  const url = logoImageUrl(domain);
  // Keyed by URL, not a flag on the row, so a recycled row showing another brand recovers at once.
  const failed = useSyncExternalStore(subscribe, () => (url ? failedLately.has(url) : false));

  const showFallback = !url || failed;
  const background = monogramColor(name || '?');

  if (showFallback && fallback) return fallback;

  return (
    <View
      className={cn('items-center justify-center overflow-hidden rounded-full', className)}
      style={{
        width: size,
        height: size,
        backgroundColor: showFallback ? background : '#FFFFFF',
      }}
    >
      {showFallback ? (
        <Text
          className="font-app font-semibold"
          style={{
            fontSize: size * 0.36,
            color: isLightColor(background) ? '#161616' : '#FFFFFF',
          }}
          maxFontSizeMultiplier={1}
          allowFontScaling={false}
        >
          {monogram(name)}
        </Text>
      ) : (
        <Image
          source={{ uri: url }}
          style={{ width: size, height: size }}
          contentFit="contain"
          // A logo seldom changes, so the disk cache spares the service a request on every
          // render and keeps logos showing offline.
          cachePolicy="memory-disk"
          transition={120}
          onError={() => {
            if (url) rememberFailure(url);
          }}
          accessibilityLabel={`${name} logo`}
        />
      )}
    </View>
  );
}
