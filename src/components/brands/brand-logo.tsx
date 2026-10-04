import { Image } from 'expo-image';
import { useMemo, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { useBrandDirectory } from '@/api/brands';
import { cn } from '@/lib/cn';
import { isLightColor } from '@/lib/color';
import { CARD_COLORS } from '@/theme/card-colors';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

type BrandLogoProps = {
  /** Shown in the fallback tile, so it is required even when a logo exists. */
  name: string;
  /** The brand's website, used to find its logo when `logoPath` is not given. */
  domain?: string | null;
  /** Where the logo lives in the brand-logos bucket, e.g. `v1/netflix.png`. */
  logoPath?: string | null;
  size?: number;
  className?: string;
  /**
   * Drawn instead of the monogram when there is no logo to show. A bill passes
   * its own glyph: a Housing bill whose logo will not load is still a house,
   * not a pair of letters.
   */
  fallback?: ReactNode;
};

/**
 * Picks the colour for a brand's fallback tile.
 *
 * Deterministic, so Walmart is the same colour on every screen and every
 * device without storing anything. Hashing the name rather than cycling an
 * index means adding brands never reshuffles the ones already on screen.
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
 * Our own logo for a brand, from the brand-logos bucket.
 *
 * Every logo is ours now — official artwork prepared for each catalog brand
 * and hosted in Supabase — so nothing is fetched from a third party, and a
 * brand without one simply draws its letters.
 */
function logoUrl(logoPath?: string | null): string | null {
  if (!logoPath || !SUPABASE_URL) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/brand-logos/${logoPath}`;
}

/**
 * A brand's logo path, found by its website.
 *
 * Bills, subscriptions and receipts carry only the brand's domain from their
 * join. The directory is the one cached catalog query the app already holds,
 * so this costs a lookup in memory, not a request per row.
 */
function useLogoPathForDomain(domain?: string | null): string | null {
  const { data: directory } = useBrandDirectory();
  const byDomain = useMemo(
    () => new Map((directory ?? []).map((brand) => [brand.domain, brand.logo_path])),
    [directory],
  );
  return domain ? (byDomain.get(domain) ?? null) : null;
}

/**
 * A brand's logo, or a coloured monogram when there is nothing to show.
 *
 * The fallback is not an error state — custom stores people type themselves
 * will never have a logo, and they should look deliberate rather than broken.
 */
export function BrandLogo({
  name,
  domain,
  logoPath,
  size = 40,
  className,
  fallback,
}: BrandLogoProps) {
  const found = useLogoPathForDomain(logoPath ? null : domain);
  const url = logoUrl(logoPath ?? found);
  // Remembering which URL failed rather than a bare boolean means a recycled
  // row showing a different brand recovers on its own — no effect, no reset.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const showFallback = !url || failedUrl === url;
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
          className="font-poppins font-semibold"
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
          // Logos are immutable per brand, so the disk cache spares the CDN a
          // request on every render and keeps them working offline.
          cachePolicy="memory-disk"
          transition={120}
          onError={() => setFailedUrl(url)}
          accessibilityLabel={`${name} logo`}
        />
      )}
    </View>
  );
}
