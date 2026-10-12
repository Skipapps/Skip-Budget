import { fireEvent, render, screen } from '@testing-library/react-native';

import { PageHeader } from '@/components/ui/page-header';
import { TEXT_CAP } from '@/theme/text-scale';

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/providers/theme-provider', () => ({ useColors: () => ({}) }));

/**
 * A page's subtitle sits centred under its name, tucked into the room under a one-line name; a name
 * that wraps leaves no room, so the subtitle then starts below it rather than over it.
 */

const lineLaidOut = (height: number) =>
  fireEvent(screen.getByTestId('page-header-line'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 342, height } },
  });

describe('a page header with a subtitle', () => {
  it('draws the subtitle centred and muted, growing with the heading ceiling', async () => {
    await render(<PageHeader title="Loans" subtitle="Everything you owe, in one place" />);
    const subtitle = screen.getByText('Everything you owe, in one place');
    expect(subtitle.props.className).toContain('text-center');
    expect(subtitle.props.className).toContain('text-muted');
    expect(subtitle.props.maxFontSizeMultiplier).toBe(TEXT_CAP.heading);
    expect(subtitle.props.numberOfLines).toBeUndefined();
    expect(screen.getByRole('header', { name: 'Loans' })).toBeTruthy();
  });

  it('tucks under a one-line name, and drops below one that wraps', async () => {
    await render(<PageHeader title="Loans" subtitle="Everything you owe, in one place" />);
    const marginTop = () =>
      screen.getByText('Everything you owe, in one place').props.style.marginTop;
    await lineLaidOut(52);
    expect(marginTop()).toBe(-10);
    await lineLaidOut(78);
    expect(marginTop()).toBe(0);
    await lineLaidOut(52);
    expect(marginTop()).toBe(-10);
  });
});

describe('a page header without one', () => {
  it('draws the same single line as before', async () => {
    await render(<PageHeader title="Savings" />);
    expect(screen.queryByTestId('page-header-line')).toBeNull();
    expect(screen.getByRole('header', { name: 'Savings' })).toBeTruthy();
  });
});
