import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { useState } from 'react';
import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';

import { AmountFigure, amountFigureBand, displayAmount } from '@/components/flow/amount-figure';
import { AmountStep } from '@/components/flow/amount-step';
import { AmountPad } from '@/components/ui/amount-pad';
import { CalculatorPad } from '@/components/ui/calculator-pad';
import type { CurrencyCode, Language } from '@/i18n/config';
import { resetLocaleForTests, setCurrency, setLanguage } from '@/i18n/store';

/**
 * Amount entry in every language. What is typed stays an ASCII draft with a "." all the way to the
 * parser; only the drawing changes. So "1234.56" typed on a French keypad shows "1 234,56 $" (a
 * no-break space between the thousands) and still hands back exactly "1234.56", the number English
 * and Spanish hand back.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/providers/theme-provider', () => ({ useColors: () => ({ ink: '#000000' }) }));
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const NBSP = '\u00a0';
/**
 * Text queries fold whitespace by default and count a no-break space as whitespace, so they would
 * pass "1 234,56" written with an ordinary space. RAW compares the characters exactly as drawn.
 */
const RAW = { normalizer: (text: string) => text };

type Case = {
  language: Language;
  currency: CurrencyCode;
  /** "1234.56" as drawn. */
  shown: string;
  spoken: string;
  decimalKey: string;
  decimalFace: string;
  deleteKey: string;
  done: string;
  /** The mark is drawn after the figure. */
  after: boolean;
};

const CASES: Case[] = [
  {
    language: 'en',
    currency: 'USD',
    shown: '1,234.56',
    spoken: 'Amount, $1,234.56',
    decimalKey: 'Decimal point',
    decimalFace: '.',
    deleteKey: 'Delete last digit',
    done: 'Done',
    after: false,
  },
  {
    language: 'es',
    currency: 'MXN',
    shown: '1,234.56',
    spoken: 'Importe, $1,234.56',
    decimalKey: 'Punto decimal',
    decimalFace: '.',
    deleteKey: 'Borrar el último dígito',
    done: 'Listo',
    after: false,
  },
  {
    language: 'fr',
    currency: 'CAD',
    shown: `1${NBSP}234,56`,
    spoken: `Montant, 1${NBSP}234,56${NBSP}$`,
    decimalKey: 'Virgule décimale',
    decimalFace: ',',
    deleteKey: 'Effacer le dernier chiffre',
    done: 'Terminé',
    after: true,
  },
];

const TYPED = ['1', '2', '3', '4', 'decimal', '5', '6'];

const styleOf = (node: { props: { style?: StyleProp<TextStyle> } }) =>
  StyleSheet.flatten(node.props.style) ?? {};

/** Every visible string and every label, so a raw key or an unfilled {param} cannot hide. */
function everythingRead(): string[] {
  const out: string[] = [];
  const walk = (node: unknown) => {
    if (typeof node === 'string') return void out.push(node);
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(walk);
    const { props, children } = node as { props?: Record<string, unknown>; children?: unknown };
    for (const key of ['accessibilityLabel', 'placeholder', 'title']) {
      if (typeof props?.[key] === 'string') out.push(props[key] as string);
    }
    walk(children);
  };
  walk(screen.toJSON());
  return out;
}

function expectNoRawText() {
  for (const text of everythingRead()) {
    expect(text).not.toMatch(/^[a-z]+\.[a-zA-Z]+\./);
    expect(text).not.toMatch(/\{\w+\}/);
  }
}

async function typeAmount(decimalKey: string) {
  for (const key of TYPED) {
    await fireEvent.press(screen.getByLabelText(key === 'decimal' ? decimalKey : key, RAW));
  }
}

beforeEach(() => {
  resetLocaleForTests();
});

describe.each(CASES)('typing 1234.56 in $language', (c) => {
  beforeEach(() => {
    setLanguage(c.language);
    setCurrency(c.currency);
  });

  it('draws the figure in the language and hands back the same ASCII draft', async () => {
    const onConfirm = jest.fn();
    await render(
      <AmountPad title="T" caption="C" value="" onCancel={() => {}} onConfirm={onConfirm} />,
    );

    await typeAmount(c.decimalKey);

    expect(screen.getByText(c.shown, RAW)).toBeTruthy();
    expect(screen.getByLabelText(c.spoken, RAW)).toBeTruthy();

    await fireEvent.press(screen.getByText(c.done, RAW));
    expect(onConfirm).toHaveBeenCalledWith('1234.56');
    expect(Number(onConfirm.mock.calls[0][0])).toBe(1234.56);
    expectNoRawText();
  });

  it('labels the decimal key with the language’s mark, and the delete key in its words', async () => {
    await render(
      <AmountPad title="T" caption="C" value="" onCancel={() => {}} onConfirm={() => {}} />,
    );

    const decimal = screen.getByLabelText(c.decimalKey, RAW);
    expect(within(decimal).getByText(c.decimalFace, RAW)).toBeTruthy();
    expect(screen.getByLabelText(c.deleteKey, RAW)).toBeTruthy();
  });

  it('puts the currency mark on the language’s side, set apart only in French', async () => {
    await render(<AmountFigure value="1234.56" />);

    const texts = within(screen.getByLabelText(c.spoken, RAW))
      .getAllByText(/./, RAW)
      .map((node) => String(node.props.children));
    expect(texts).toEqual(c.after ? [c.shown, '$'] : ['$', c.shown]);

    const mark = styleOf(screen.getByText('$', RAW));
    // "1 234,56" is eight glyphs: the 48pt band, a 21pt mark, a 6pt no-break space before it.
    expect(mark.marginLeft).toBe(c.after ? 6 : undefined);
    expect(mark.marginTop).toBe(7);
  });

  it('keeps the draft identical from the step-1 keypad too', async () => {
    const seen: string[] = [];
    function Harness() {
      const [value, setValue] = useState('');
      return (
        <AmountStep
          value={value}
          onChange={(next) => {
            seen.push(next);
            setValue(next);
          }}
        />
      );
    }
    await render(<Harness />);

    await typeAmount(c.decimalKey);

    expect(seen).toEqual(['1', '12', '123', '1234', '1234.', '1234.5', '1234.56']);
    expect(screen.getByText(c.shown, RAW)).toBeTruthy();
  });
});

describe('a typed amount in French', () => {
  beforeEach(() => setLanguage('fr'));

  it('groups with a no-break space, never a plain one', () => {
    const shown = displayAmount('1234.56');
    expect(shown).toBe('1\u00a0234,56');
    expect(shown).not.toContain(' ');
    expect(displayAmount('999999999')).toBe('999\u00a0999\u00a0999');
  });

  it('keeps a trailing decimal mark while the cents are still to come', () => {
    expect(displayAmount('12.')).toBe('12,');
    expect(displayAmount('')).toBe('0');
  });

  it('lands in the same size band as the English figure', () => {
    expect(amountFigureBand(displayAmount('444444444.44')).size).toBe(36);
    expect(amountFigureBand(displayAmount('444444')).size).toBe(64);
  });

  it('writes the pound after the figure too', async () => {
    setCurrency('GBP');
    await render(<AmountFigure value="1234.56" />);
    expect(screen.getByLabelText('Montant, 1\u00a0234,56\u00a0£', RAW)).toBeTruthy();
    expect(styleOf(screen.getByText('£', RAW)).marginLeft).toBe(6);
  });

  it('reads a rate with a decimal comma and spaces the %', async () => {
    await render(<AmountFigure value="7.5" unit="percent" />);
    expect(screen.getByLabelText('Taux, 7,5 pour cent', RAW)).toBeTruthy();
    expect(screen.getByText('7,5', RAW)).toBeTruthy();
    // 64pt band, 28pt %, an 8pt no-break space.
    expect(styleOf(screen.getByText('%', RAW)).marginLeft).toBe(8);
  });
});

describe('a rate in Spanish', () => {
  it('reads with a decimal point and keeps the % flush', async () => {
    setLanguage('es');
    await render(<AmountFigure value="7.5" unit="percent" />);
    expect(screen.getByLabelText('Tasa, 7.5 por ciento', RAW)).toBeTruthy();
    expect(styleOf(screen.getByText('%', RAW)).marginLeft).toBeUndefined();
  });
});

/**
 * The calculator's arithmetic is on ASCII strings in every language: 20.15 ÷ 2 is 10.075 exactly
 * and posts as 10.08 (half away from zero), never 10.07, whichever language drew the keys.
 */
describe.each(CASES)('the calculator in $language', (c) => {
  beforeEach(() => {
    setLanguage(c.language);
    setCurrency(c.currency);
  });

  async function calculate(start: string, keys: string[]): Promise<string> {
    const onConfirm = jest.fn();
    await render(<CalculatorPad value={start} onCancel={() => {}} onConfirm={onConfirm} />);
    for (const key of keys) await fireEvent.press(screen.getByLabelText(key, RAW));
    await fireEvent.press(screen.getByText(c.done, RAW));
    return onConfirm.mock.calls[0][0];
  }

  it('posts 20.15 ÷ 2 as 10.08', async () => {
    expect(await calculate('20.15', ['÷', '2', '='])).toBe('10.08');
  });

  it('types a decimal with the language’s key and still posts to the cent', async () => {
    // 10.05 × 0.5 = 5.025 exactly, posted 5.03.
    expect(await calculate('10.05', ['×', '0', c.decimalFace, '5', '='])).toBe('5.03');
    // 0.1 + 0.2 is 0.3, not 0.30000000000000004.
    expect(await calculate('0.1', ['+', '0', c.decimalFace, '2', '='])).toBe('0.3');
  });

  it('settles a half-finished sum on Done the same way', async () => {
    expect(await calculate('20.15', ['÷', '2'])).toBe('10.08');
  });

  it('draws the figure, the pending sum and the mark in the language', async () => {
    await render(<CalculatorPad value="1234.5" onCancel={() => {}} onConfirm={() => {}} />);
    const figure = c.language === 'fr' ? `1${NBSP}234,5` : '1,234.5';
    expect(screen.getByText(figure, RAW)).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('÷', RAW));
    expect(screen.getByText(`${figure} ÷`, RAW)).toBeTruthy();

    const mark = styleOf(screen.getByText('$', RAW));
    // Seven glyphs: the 48pt band, a 24pt mark, a 7pt no-break space in French.
    expect(mark.marginLeft).toBe(c.after ? 7 : undefined);
    expectNoRawText();
  });
});

describe('the calculator’s own words', () => {
  it.each([
    ['es' as const, 'Calculadora', 'No se puede dividir entre cero', 'Eliminar'],
    ['fr' as const, 'Calculatrice', 'Division par zéro impossible', 'Supprimer'],
  ])('are in %s', async (language, title, divideByZero, deleteKey) => {
    setLanguage(language);
    await render(<CalculatorPad value="5" onCancel={() => {}} onConfirm={() => {}} />);

    expect(screen.getByText(title, RAW)).toBeTruthy();
    expect(screen.getByLabelText(deleteKey, RAW)).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('÷', RAW));
    await fireEvent.press(screen.getByLabelText('0', RAW));
    await fireEvent.press(screen.getByLabelText('=', RAW));
    expect(screen.getByText(divideByZero, RAW)).toBeTruthy();
    expectNoRawText();
  });
});
