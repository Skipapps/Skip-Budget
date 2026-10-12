import { summaryTone } from '@/components/loans/loans-summary-card';
import { contrast } from '@/lib/tone';
import { buildTokens } from '@/theme/palette';

jest.mock('@/providers/theme-provider', () => ({}));
jest.mock('@/theme/loan-icons', () => ({}));
jest.mock('lucide-react-native', () => ({}));

/**
 * The Loans summary is navy in both modes, off the theme's own surfaces, so its type is checked
 * here rather than by the palette's: every text pair at 4.5:1 or more, and the bar's fill at 3:1
 * against its track, as WCAG asks of a graphic.
 */

describe.each(['light', 'dark'] as const)('the %s summary card', (scheme) => {
  const tone = summaryTone(scheme, buildTokens(scheme));

  it.each(['ink', 'muted'] as const)('sets its %s type at 4.5:1 or more on the card', (part) => {
    expect(contrast(tone[part], tone.card)).toBeGreaterThanOrEqual(4.5);
  });

  it('draws the paid-off bar at 3:1 or more on its track', () => {
    expect(contrast(tone.fill, tone.track)).toBeGreaterThanOrEqual(3);
  });

  it('keeps the design’s card and figures', () => {
    expect(tone.card).toBe(scheme === 'light' ? '#EFF7FF' : '#16213F');
    expect(tone.fill).toBe(scheme === 'light' ? '#062554' : '#8EA2E8');
    if (scheme === 'light') expect(tone.ink).toBe('#10245A');
    else expect(tone.ink).toBe(buildTokens('dark').ink);
  });
});
