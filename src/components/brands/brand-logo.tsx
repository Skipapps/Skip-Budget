import { Image } from 'expo-image';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { cn } from '@/lib/cn';
import { isLightColor } from '@/lib/color';
import { CARD_COLORS } from '@/theme/card-colors';

const CLIENT_ID = process.env.EXPO_PUBLIC_BRANDFETCH_CLIENT_ID;
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

type BrandLogoProps = {
  /** Shown in the fallback tile, so it is required even when a logo exists. */
  name: string;
  domain?: string | null;
  /** Set only for self-hosted logos; overrides the CDN when present. */
  logoPath?: string | null;
  size?: number;
  className?: string;
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

function logoUrl(domain?: string | null, logoPath?: string | null): string | null {
  // A self-hosted copy wins when one exists — it only does if a caching
  // agreement is in place, which is why nothing writes logo_path today.
  if (logoPath && SUPABASE_URL) {
    return `${SUPABASE_URL}/storage/v1/object/public/brand-logos/${logoPath}`;
  }
  if (!domain || !CLIENT_ID) return null;
  // Brandfetch requires the link to be embedded rather than fetched and
  // stored; expo-image requests it the same way a browser would.
  return `https://cdn.brandfetch.io/${domain}/w/200/h/200?c=${CLIENT_ID}`;
}

/**
 * A brand's logo, or a coloured monogram when there is nothing to show.
 *
 * The fallback is not an error state — custom stores people type themselves
 * will never have a logo, and they should look deliberate rather than broken.
 */
export function BrandLogo({ name, domain, logoPath, size = 40, className }: BrandLogoProps) {
  const url = logoUrl(domain, logoPath);
  // Remembering which URL failed rather than a bare boolean means a recycled
  // row showing a different brand recovers on its own — no effect, no reset.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const showFallback = !url || failedUrl === url;
  const background = monogramColor(name || '?');

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
