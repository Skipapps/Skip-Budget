import { Image } from 'expo-image';
import { useState, useSyncExternalStore, type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { logoImageUrl } from '@/api/logos';
import { logoFailedLately, rememberLogoFailure, subscribeLogoFailures } from '@/lib/logo-failures';
import { logoAspect, logoBox, rememberLogoAspect } from '@/lib/logo-shape';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { monogramOf } from '@/lib/monogram';

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

export { FAILED_LOGO_RETRY_MS } from '@/lib/logo-failures';

/**
 * A brand's logo, or a coloured monogram. The fallback is not an error state: plenty of websites
 * have no logo, and the service answers those with a 404.
 */
export function BrandLogo({ name, domain, size = 40, className, fallback }: BrandLogoProps) {
  const url = logoImageUrl(domain);
  // Keyed by URL, not a flag on the row, so a recycled row showing another brand recovers at once.
  const failed = useSyncExternalStore(subscribeLogoFailures, () => logoFailedLately(url));
  // Learnt when the image loads; tied to its URL so a recycled row never borrows another's shape.
  const [shape, setShape] = useState<{ url: string; aspect: number } | null>(null);
  const aspect = (shape?.url === url ? shape.aspect : undefined) ?? logoAspect(url);

  const showFallback = !url || failed;
  const mark = monogramOf(name);

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
          style={logoBox(size, aspect)}
          contentFit="contain"
          // A logo seldom changes, so the disk cache spares the service a request on every
          // render and keeps logos showing offline.
          cachePolicy="memory-disk"
          transition={120}
          onLoad={(event) => {
            if (!url) return;
            const loaded = rememberLogoAspect(url, event.source.width, event.source.height);
            if (loaded !== undefined && loaded !== aspect) setShape({ url, aspect: loaded });
          }}
          onError={() => {
            if (url) rememberLogoFailure(url);
          }}
          accessibilityLabel={t('settings.logo.imageOf', { name })}
        />
      )}
    </View>
  );
}
