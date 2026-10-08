import { Image } from 'expo-image';
import { useSyncExternalStore, type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { logoImageUrl } from '@/api/logos';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { monogramOf } from '@/lib/monogram';
import { useProStatus } from '@/lib/pro-status';

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
 * A brand's logo, or a coloured monogram. The fallback is not an error state: plenty of websites
 * have no logo, and the service answers those with a 404.
 */
export function BrandLogo({ name, domain, size = 40, className, fallback }: BrandLogoProps) {
  // Logos are Pro: free draws the store's initials (or the given fallback, e.g. a bill's glyph).
  const { pro, ready } = useProStatus();
  const logo = logoImageUrl(domain);
  const url = ready && pro ? logo : null;
  // A logo to draw and no plan yet: a quiet circle, so neither a payer nor a free account sees the
  // other's version flash, and nothing is fetched for an account that may be free.
  const waiting = Boolean(logo) && !ready;
  // Keyed by URL, not a flag on the row, so a recycled row showing another brand recovers at once.
  const failed = useSyncExternalStore(subscribe, () => (url ? failedLately.has(url) : false));

  const showFallback = !url || failed;
  const mark = monogramOf(name);

  if (waiting) {
    return (
      <View
        className={cn('overflow-hidden rounded-full bg-ink/10', className)}
        style={{ width: size, height: size }}
      />
    );
  }

  if (showFallback && fallback) return fallback;

  return (
    <View
      className={cn('items-center justify-center overflow-hidden rounded-full', className)}
      style={{
        width: size,
        height: size,
        backgroundColor: showFallback ? mark.background : '#FFFFFF',
      }}
    >
      {showFallback ? (
        // Stands in for a logo image, so it keeps the circle's size as the image would; the name
        // itself is written, and read out, beside it.
        <Text
          className="font-app font-semibold"
          style={{
            fontSize: size * 0.36,
            color: mark.ink,
          }}
          allowFontScaling={false}
        >
          {mark.letters}
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
          accessibilityLabel={t('settings.logo.imageOf', { name })}
        />
      )}
    </View>
  );
}
