import { tabLayout } from '@/components/navigation/tab-layout';

/**
 * The tab bar's widths, from the window width alone. "Settings" is the widest label: 64.2pt at
 * 15pt and 77pt at the 1.2x text cap, measured from the shipped Montserrat SemiBold.
 */

const SETTINGS_DEFAULT = 64.2;
const SETTINGS_AT_CAP = 77;
const WIDTHS = Array.from({ length: 111 }, (_, index) => 320 + index); // 320..430

describe('tabLayout', () => {
  it.each(WIDTHS)('never lets the tabs add up to more than the bar, at %ipt', (width) => {
    const { inner, icon, pill, label, slop } = tabLayout(width, 4);

    expect(3 * icon + pill).toBeLessThanOrEqual(inner);
    for (const value of [inner, icon, pill, label, slop]) {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
    }
    expect(icon).toBeGreaterThanOrEqual(32);
    expect(icon).toBeLessThanOrEqual(48);
    // An icon tab narrower than 44pt reaches it with hit slop.
    expect(icon + 2 * slop).toBeGreaterThanOrEqual(44);
  });

  it.each(WIDTHS.filter((width) => width >= 375))(
    'fits "Settings" whole at %ipt, at the default text size and at the cap',
    (width) => {
      const { label } = tabLayout(width, 4);

      expect(label).toBeGreaterThanOrEqual(SETTINGS_DEFAULT);
      expect(label).toBeGreaterThanOrEqual(SETTINGS_AT_CAP);
    },
  );

  it.each([
    [320, { inner: 194, icon: 32, pill: 98, label: 46, slop: 6 }],
    [375, { inner: 249, icon: 39, pill: 130, label: 78, slop: 3 }],
    [390, { inner: 264, icon: 44, pill: 130, label: 78, slop: 0 }],
    [414, { inner: 288, icon: 48, pill: 130, label: 78, slop: 0 }],
    [428, { inner: 302, icon: 48, pill: 130, label: 78, slop: 0 }],
  ])('lays out a %ipt window as worked out', (width, expected) => {
    expect(tabLayout(width, 4)).toEqual(expected);
  });

  it('gives the narrowest phone a smaller label rather than an overflow', () => {
    const { label } = tabLayout(320, 4);

    // The label's font shrinks to fit: about 11pt for "Settings".
    expect(label).toBeLessThan(SETTINGS_DEFAULT);
    expect((15 * label) / SETTINGS_DEFAULT).toBeGreaterThan(10);
  });

  it('copes with any number of tabs and with a window narrower than any phone', () => {
    for (const routes of [0, 1, 2, 3, 5, 6]) {
      for (const width of [0, 100, 200, 320, 430]) {
        const { inner, icon, pill } = tabLayout(width, routes);
        expect(Math.max(0, routes - 1) * icon + pill).toBeLessThanOrEqual(inner);
        expect(Math.min(icon, pill)).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
