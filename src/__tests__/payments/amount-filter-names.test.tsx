import { render, screen } from '@testing-library/react-native';

import { AmountFilter } from '@/components/payments/amount-filter';
import { CurrencyField } from '@/components/ui/currency-field';
import { TextField } from '@/components/ui/text-field';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/**
 * VoiceOver names the Amount filter's two fields: an empty amount field has no placeholder, so
 * without a name each was heard as an unnamed text field. Every other field is left as it was.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), canGoBack: () => true } }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => new Proxy({}, { get: () => '#000000' }),
}));

const noop = () => {};

beforeEach(() => resetLocaleForTests());

describe('the Amount filter', () => {
  it('names both fields as VoiceOver reads them: text fields called At least and At most', async () => {
    await render(<AmountFilter initial={{ minCents: null, maxCents: null }} onPick={noop} />);
    for (const name of ['At least', 'At most']) {
      const field = screen.getByLabelText(name);
      expect(field.type).toBe('TextInput');
      expect(field.props.keyboardType).toBe('decimal-pad');
    }
  });

  it('names them in Spanish and French', async () => {
    setLanguage('es');
    await render(<AmountFilter initial={{ minCents: 1000, maxCents: null }} onPick={noop} />);
    expect(screen.getByLabelText('Mínimo').type).toBe('TextInput');
    expect(screen.getByLabelText('Máximo').type).toBe('TextInput');
    setLanguage('fr');
    await render(<AmountFilter initial={{ minCents: null, maxCents: null }} onPick={noop} />);
    expect(screen.getByLabelText('Minimum').type).toBe('TextInput');
    expect(screen.getByLabelText('Maximum').type).toBe('TextInput');
  });
});

describe('every other field', () => {
  it('keeps no name of its own when none is given', async () => {
    await render(
      <>
        <TextField label="Email" value="" onChangeText={noop} placeholder="you@example.com" />
        <CurrencyField label="Amount" value="" onChange={noop} />
      </>,
    );
    const tree = screen.toJSON() as unknown;
    const found: Record<string, unknown>[] = [];
    const walk = (node: unknown) => {
      if (!node || typeof node !== 'object') return;
      const host = node as { type: string; props: Record<string, unknown>; children?: unknown[] };
      if (host.type === 'TextInput') found.push(host.props);
      host.children?.forEach(walk);
    };
    (Array.isArray(tree) ? tree : [tree]).forEach(walk);
    expect(found).toHaveLength(2);
    for (const props of found) expect('accessibilityLabel' in props).toBe(false);
  });
});
