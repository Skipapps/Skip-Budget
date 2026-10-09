import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { AccountCard } from '@/components/cards/account-card';
import { PaymentCard } from '@/components/cards/payment-card';
import { resetLocaleForTests, setCurrency, setLanguage } from '@/i18n/store';
import { contrast } from '@/lib/tone';
import { FACE_COLORS } from '@/theme/card-colors';

// The dark theme's ink, near white: a light face must not take it.
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#F8F6FB', line: '#3E3949', surface: '#1B181F' }),
}));

const NBSP = ' ';

const card = (balance: number, creditLimit?: number | null, color = '#426EA8') => ({
  id: 'card',
  holder: 'Amex Komal',
  balance,
  last4: '6334',
  network: 'Amex',
  color,
  creditLimit,
});

const account = (accountType: 'Checking' | 'Savings' = 'Checking') => ({
  id: 'acct',
  bankName: 'Chase',
  nickname: '',
  accountType,
  balance: 11868,
  last4: '7010',
  color: '#6A5FC9',
});

type Screen = Awaited<ReturnType<typeof render>>;

const fillWidth = (screen: Screen) =>
  parseFloat(String(StyleSheet.flatten(screen.getByTestId('card-limit-fill').props.style).width));

beforeEach(() => resetLocaleForTests());
afterAll(() => resetLocaleForTests());

describe('PaymentCard and its credit limit', () => {
  it('draws the design: name, wordmark, Owed, the figure, the bar, the limit and the last four', async () => {
    const screen = await render(<PaymentCard card={card(4050, 10000)} />);

    expect(screen.getByText('Amex Komal')).toBeTruthy();
    expect(screen.getByText('AMEX')).toBeTruthy();
    expect(screen.getByText('Owed')).toBeTruthy();
    expect(screen.getByText('-$4,050')).toBeTruthy();
    expect(screen.getByText('$4,050 of $10,000 limit')).toBeTruthy();
    expect(screen.getByText('•••• 6334')).toBeTruthy();
    expect(fillWidth(screen)).toBeCloseTo(40.5, 9);
  });

  it('fills the bar from cents, not from the whole dollars on the face', async () => {
    // $0.40 of a $1.00 limit: the face says $0 of $1, the bar is 40% full.
    const screen = await render(<PaymentCard card={card(0.4, 1)} />);
    expect(fillWidth(screen)).toBeCloseTo(40, 9);
    expect(screen.getByText('$0 of $1 limit')).toBeTruthy();
  });

  it('shows an empty bar for a card in credit', async () => {
    const screen = await render(<PaymentCard card={card(-20, 500)} />);
    expect(fillWidth(screen)).toBe(0);
    expect(screen.getByText('$0 of $500 limit')).toBeTruthy();
  });

  it('shows a full bar past the limit', async () => {
    const screen = await render(<PaymentCard card={card(12000, 10000)} />);
    expect(fillWidth(screen)).toBe(100);
    expect(screen.getByText('$12,000 of $10,000 limit')).toBeTruthy();
  });

  it.each([[null], [undefined], [0]])(
    'draws no bar and no limit line when the limit is %p',
    async (limit) => {
      const screen = await render(<PaymentCard card={card(4050, limit)} />);
      expect(screen.queryByTestId('card-limit-bar')).toBeNull();
      expect(screen.queryByText(/limit/)).toBeNull();
      expect(screen.getByText('•••• 6334')).toBeTruthy();
    },
  );

  it('says the limit in Spanish', async () => {
    setLanguage('es');
    const screen = await render(<PaymentCard card={card(4050, 10000)} />);
    expect(screen.getByText('$4,050 de $10,000 de límite')).toBeTruthy();
  });

  it('says the limit in French', async () => {
    setLanguage('fr');
    setCurrency('CAD');
    const screen = await render(<PaymentCard card={card(4050, 10000)} />);
    expect(screen.getByText(`4${NBSP}050${NBSP}$ sur 10${NBSP}000${NBSP}$ de limite`)).toBeTruthy();
  });
});

describe('AccountCard', () => {
  it('draws the type badge, Available, the figure, Updated and the last four', async () => {
    const screen = await render(
      <AccountCard account={account()} updatedOn="2026-10-09" today="2026-10-09" />,
    );
    expect(screen.getByText('Chase')).toBeTruthy();
    expect(screen.getByText('Checking')).toBeTruthy();
    expect(screen.getByText('Available')).toBeTruthy();
    expect(screen.getByText('$11,868')).toBeTruthy();
    expect(screen.getByText('Updated today')).toBeTruthy();
    expect(screen.getByText('•••• 7010')).toBeTruthy();
  });

  it('has no Updated line when nothing says when the figure was true', async () => {
    const screen = await render(<AccountCard account={account('Savings')} />);
    expect(screen.getByText('Savings')).toBeTruthy();
    expect(screen.queryByText(/Updated/)).toBeNull();
  });
});

describe('Card face type', () => {
  it('keeps dark type on a light face whatever the theme’s ink is', async () => {
    const screen = await render(<PaymentCard card={card(329, null, '#7BC4F5')} />);
    for (const text of ['Amex Komal', 'AMEX', '•••• 6334']) {
      expect(StyleSheet.flatten(screen.getByText(text).props.style).color).toBe('#111111');
    }
    expect(StyleSheet.flatten(screen.getByText('-$329').props.style).color).toBe('#111111');
  });

  it('keeps white type on a dark face', async () => {
    const screen = await render(<PaymentCard card={card(329, null, '#161616')} />);
    expect(StyleSheet.flatten(screen.getByText('Amex Komal').props.style).color).toBe('#FFFFFF');
  });

  it('hides the Skip watermark from VoiceOver', async () => {
    const screen = await render(<PaymentCard card={card(329)} />);
    expect(screen.queryByText('Skip')).toBeNull();
    const watermark = screen.getByText('Skip', { includeHiddenElements: true });
    expect(watermark.props.allowFontScaling).toBe(false);
  });
});

describe('Card face colours from the palette', () => {
  it.each([
    ['blue', '#426EA8'],
    ['teal', '#367672'],
  ])('draws white type on %s, as the designs do', async (_name, color) => {
    const screen = await render(<PaymentCard card={card(329, null, color)} />);
    expect(StyleSheet.flatten(screen.getByText('Amex Komal').props.style).color).toBe('#FFFFFF');
  });

  it.each([
    ['sand', '#C9A979'],
    ['rose', '#C9787E'],
  ])('keeps dark type on %s, where white would fade', async (_name, color) => {
    const screen = await render(<PaymentCard card={card(329, null, color)} />);
    expect(StyleSheet.flatten(screen.getByText('Amex Komal').props.style).color).toBe('#111111');
  });

  const outline = (screen: Screen) =>
    StyleSheet.flatten(screen.getByTestId('card-face').props.style).borderWidth;

  it('outlines a black face on the dark page', async () => {
    const screen = await render(<PaymentCard card={card(329, null, '#1E1A22')} />);
    expect(outline(screen)).toBe(1);
  });

  it('draws no outline on a face that stands out from the page', async () => {
    const screen = await render(<PaymentCard card={card(329, null, '#426EA8')} />);
    expect(outline(screen)).toBeUndefined();
  });
});

/** A colour with an alpha drawn over the face, as the caption reaches the eye. */
function composite(rgba: string, face: string): string {
  const [r, g, b, a] = rgba.match(/[\d.]+/g)!.map(Number);
  const under = [1, 3, 5].map((i) => parseInt(face.slice(i, i + 2), 16));
  return `#${[r, g, b]
    .map((channel, i) => Math.round(a * channel + (1 - a) * under[i]))
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')}`;
}

describe('every face colour with white type', () => {
  // As the designs draw them: white on all but the two light ones.
  const WHITE = ['blue', 'violet', 'plum', 'teal', 'slate', 'black'];

  it.each(FACE_COLORS.map((option) => [option.id, option.value]))(
    '%s takes the type it is drawn with, and white clears 4.5:1 for name and captions',
    async (id, color) => {
      const screen = await render(<PaymentCard card={card(4050, 10000, color)} />);
      const name = StyleSheet.flatten(screen.getByText('Amex Komal').props.style).color as string;
      expect([id, name === '#FFFFFF']).toEqual([id, WHITE.includes(id)]);
      if (!WHITE.includes(id)) return;
      expect(contrast(name, color)).toBeGreaterThanOrEqual(4.5);
      for (const caption of ['Owed', '$4,050 of $10,000 limit']) {
        const drawn = StyleSheet.flatten(screen.getByText(caption).props.style).color as string;
        expect([caption, contrast(composite(drawn, color), color) >= 4.5]).toEqual([caption, true]);
      }
    },
  );
});
