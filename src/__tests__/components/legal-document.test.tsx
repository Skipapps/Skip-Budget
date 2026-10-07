import { render } from '@testing-library/react-native';

import { LegalDocument, type Section } from '@/components/ui/legal-document';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/** The shell both legal pages share: a date line, a courtesy notice off English, the blocks. */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', body: '#333333', line: '#DDDDDD' }),
}));

const SECTIONS: Section[] = [
  {
    heading: 'First',
    blocks: [
      { kind: 'text', text: 'A paragraph.' },
      { kind: 'bullets', items: ['One bullet', 'Another bullet'] },
      { kind: 'note', text: 'A note.' },
    ],
  },
  { heading: 'Second', blocks: [{ kind: 'text', text: 'Another paragraph.' }] },
];

function document() {
  return (
    <LegalDocument title="A title" updated="3 May 2026" summary="A summary." sections={SECTIONS} />
  );
}

beforeEach(() => resetLocaleForTests());
afterAll(() => resetLocaleForTests());

describe('LegalDocument', () => {
  it('shows the date line and every block, numbering the sections', async () => {
    const screen = await render(document());

    expect(screen.getByText('A title')).toBeTruthy();
    expect(screen.getByText('Last updated 3 May 2026')).toBeTruthy();
    expect(screen.getByText('A summary.')).toBeTruthy();
    expect(screen.getByText('A paragraph.')).toBeTruthy();
    expect(screen.getByText('One bullet')).toBeTruthy();
    expect(screen.getByText('Another bullet')).toBeTruthy();
    expect(screen.getByText('A note.')).toBeTruthy();
    expect(screen.getByText('Another paragraph.')).toBeTruthy();
    expect(screen.getByText(/^1\. /).props.children).toEqual([1, '. ', 'First']);
    expect(screen.getByText(/^2\. /).props.children).toEqual([2, '. ', 'Second']);
  });

  it('says nothing about a translation in English', async () => {
    const screen = await render(document());

    expect(screen.queryByText(/translation/i)).toBeNull();
    expect(screen.queryByText(/traducción|traduction/i)).toBeNull();
  });

  it('puts the Spanish date line and the courtesy notice above the text', async () => {
    setLanguage('es');
    const screen = await render(document());

    expect(screen.getByText('Última actualización: 3 May 2026')).toBeTruthy();
    expect(
      screen.getByText(
        'Esta es una traducción de cortesía. Si hay alguna diferencia, prevalece la versión en inglés.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText(/Last updated/)).toBeNull();
    expect(screen.queryByText(/^[a-z]+\.[a-zA-Z]+\./)).toBeNull();
  });

  it('puts the French date line and the courtesy notice above the text', async () => {
    setLanguage('fr');
    const screen = await render(document());

    expect(screen.getByText('Dernière mise à jour : 3 May 2026')).toBeTruthy();
    expect(
      screen.getByText(
        'Ceci est une traduction de courtoisie. En cas de divergence, la version anglaise prévaut.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText(/\{\w+\}/)).toBeNull();
  });
});
