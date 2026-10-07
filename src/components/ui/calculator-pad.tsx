import { ChevronLeft, Delete } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { affixGap, displayAmount } from '@/components/flow/amount-figure';
import { Button } from '@/components/ui/button';
import { currencyMark, numberMarks, t } from '@/i18n';
import { cn } from '@/lib/cn';
import { roundMoney } from '@/lib/money';
import { useColors } from '@/providers/theme-provider';

type CalculatorPadProps = {
  title?: string;
  value: string;
  onCancel: () => void;
  onConfirm: (value: string) => void;
};

type Operator = '+' | '-' | '*' | '/';

type Key = {
  /** What a digit key appends. The dot key's face is the language's decimal mark; this stays '.'. */
  label: string;
  action: 'digit' | 'dot' | 'operator' | 'equals' | 'clear' | 'delete';
  operator?: Operator;
  span?: number;
};

const ROWS: Key[][] = [
  [
    { label: 'AC', action: 'clear', span: 2 },
    { label: '⌫', action: 'delete' },
    { label: '÷', action: 'operator', operator: '/' },
  ],
  [
    { label: '7', action: 'digit' },
    { label: '8', action: 'digit' },
    { label: '9', action: 'digit' },
    { label: '×', action: 'operator', operator: '*' },
  ],
  [
    { label: '4', action: 'digit' },
    { label: '5', action: 'digit' },
    { label: '6', action: 'digit' },
    { label: '−', action: 'operator', operator: '-' },
  ],
  [
    { label: '1', action: 'digit' },
    { label: '2', action: 'digit' },
    { label: '3', action: 'digit' },
    { label: '+', action: 'operator', operator: '+' },
  ],
  [
    { label: '0', action: 'digit', span: 2 },
    { label: '.', action: 'dot' },
    { label: '=', action: 'equals' },
  ],
];

const SYMBOLS: Record<Operator, string> = { '+': '+', '-': '−', '*': '×', '/': '÷' };

/**
 * Figure size comes from the glyph count, not `adjustsFontSizeToFit` (same iOS first-layout-pass bug
 * and fix as `amountFigureBand` in components/flow/amount-figure): the pad opens over a field that
 * already has a value. Sizes use measured advances of the app font's bold so each band fits an
 * iPhone SE (327pt inside the pad's px-6). `affixTop` = 0.268 x (size - affixSize), to the half
 * point, levels the currency mark's cap with the digits.
 *
 * There is no digit cap here, so the last band is a floor: past about 18 digits the figure ellipsises.
 */
const FIGURE_BANDS = [
  { maxGlyphs: 7, size: 48, affixSize: 24, affixTop: 6.5 },
  { maxGlyphs: 10, size: 40, affixSize: 20, affixTop: 5.5 },
  { maxGlyphs: 14, size: 32, affixSize: 16, affixTop: 4.5 },
  { maxGlyphs: 18, size: 26, affixSize: 13, affixTop: 3.5 },
  { maxGlyphs: Infinity, size: 20, affixSize: 12, affixTop: 2 },
];

export function calculatorFigureBand(display: string) {
  return FIGURE_BANDS.find((band) => display.length <= band.maxGlyphs) ?? FIGURE_BANDS[0];
}

/**
 * Four-function calculator for amount fields. A running accumulator, not an expression parser, like a
 * pocket calculator; every intermediate result is rounded to cents. Operands and results stay ASCII
 * strings with a "." in every language; only the figure and the dot key are drawn in its marks.
 */
export function CalculatorPad({ title, value, onCancel, onConfirm }: CalculatorPadProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const mark = currencyMark();
  const { decimal } = numberMarks();

  const [current, setCurrent] = useState(value);
  const [accumulator, setAccumulator] = useState<number | null>(null);
  const [pending, setPending] = useState<Operator | null>(null);
  const [error, setError] = useState<string | null>(null);
  // After = or an operator, the next digit starts a fresh number.
  const [replaceNext, setReplaceNext] = useState(false);

  const reset = () => {
    setCurrent('');
    setAccumulator(null);
    setPending(null);
    setError(null);
    setReplaceNext(false);
  };

  // Every result settles at the cent as src/lib/money.ts posts it (half away from zero);
  // Math.round(v * 100) / 100 would show 20.15 ÷ 2 as $10.07.
  const applyPending = (next: number): number | null => {
    if (accumulator === null || pending === null) return next;
    switch (pending) {
      case '+':
        return roundMoney(accumulator + next);
      case '-':
        return roundMoney(accumulator - next);
      case '*':
        return roundMoney(accumulator * next);
      case '/':
        if (next === 0) return null;
        return roundMoney(accumulator / next);
    }
  };

  const press = (key: Key) => {
    if (key.action === 'clear') return reset();

    if (key.action === 'delete') {
      setError(null);
      setCurrent((previous) => (replaceNext ? '' : previous.slice(0, -1)));
      setReplaceNext(false);
      return;
    }

    if (key.action === 'digit') {
      setError(null);
      setCurrent((previous) => {
        const base = replaceNext ? '' : previous;
        const [, fraction] = base.split('.');
        if (fraction !== undefined && fraction.length >= 2) return base;
        if (base === '0') return key.label;
        return base + key.label;
      });
      setReplaceNext(false);
      return;
    }

    if (key.action === 'dot') {
      setError(null);
      setCurrent((previous) => {
        const base = replaceNext ? '' : previous;
        return base.includes('.') ? base : `${base || '0'}.`;
      });
      setReplaceNext(false);
      return;
    }

    const operand = Number(current || accumulator || 0);
    const result = applyPending(operand);

    if (result === null) {
      setError(t('loan.calcPad.divideByZero'));
      setCurrent('');
      setAccumulator(null);
      setPending(null);
      setReplaceNext(false);
      return;
    }

    if (key.action === 'operator') {
      setAccumulator(result);
      setPending(key.operator ?? null);
      setCurrent(String(result));
      setReplaceNext(true);
      return;
    }

    // equals
    setAccumulator(null);
    setPending(null);
    setCurrent(String(result));
    setReplaceNext(true);
  };

  const shown = current === '' ? (accumulator !== null ? String(accumulator) : '') : current;
  const isEmpty = shown === '' || Number(shown) === 0;
  const shownFigure = displayAmount(shown);
  const figure = calculatorFigureBand(shownFigure);

  const currencyAffix = (gap: number) => (
    <Text
      allowFontScaling={false}
      style={{
        fontSize: figure.affixSize,
        marginTop: figure.affixTop,
        ...(gap ? { marginLeft: gap } : null),
      }}
      className={cn('font-app-bold', isEmpty ? 'text-muted' : 'text-body')}
    >
      {mark.symbol}
    </Text>
  );

  const handleDone = () => {
    // Settle any half-finished operation so Done never discards a pending sum.
    const operand = Number(current || 0);
    const settled = pending !== null ? applyPending(operand) : Number(shown || 0);
    onConfirm(settled === null || Number.isNaN(settled) ? '' : String(settled));
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onCancel}>
      <View
        className="flex-1 bg-card"
        style={{ paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <View className="flex-row items-center px-4 py-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            hitSlop={8}
            onPress={onCancel}
            className="h-11 w-11 items-center justify-center rounded-[12px] active:bg-ink/5"
          >
            <ChevronLeft size={24} color={colors.ink} strokeWidth={2} />
          </Pressable>
          <Text
            className="flex-1 pr-11 text-center font-app-semibold text-[18px] text-ink"
            maxFontSizeMultiplier={1.2}
          >
            {title ?? t('loan.calcPad.title')}
          </Text>
        </View>

        <View className="flex-1 items-end justify-center px-6">
          <Text
            className="font-app text-[15px] text-muted"
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
          >
            {error ??
              (pending && accumulator !== null
                ? `${displayAmount(String(accumulator))} ${SYMBOLS[pending]}`
                : ' ')}
          </Text>

          <View className="mt-1 flex-row items-start">
            {mark.after ? null : currencyAffix(0)}
            <Text
              allowFontScaling={false}
              style={{ fontSize: figure.size }}
              className={cn('font-app-bold', isEmpty ? 'text-muted' : 'text-ink')}
              numberOfLines={1}
            >
              {shownFigure}
            </Text>
            {mark.after ? currencyAffix(affixGap(figure.affixSize, true)) : null}
          </View>
        </View>

        <View className="px-4">
          {ROWS.map((row, rowIndex) => (
            <View key={rowIndex} className="flex-row">
              {row.map((key) => {
                const isOperator = key.action === 'operator';
                const isEquals = key.action === 'equals';
                const isActiveOperator = isOperator && pending === key.operator && replaceNext;

                return (
                  <View key={key.label} style={{ flex: key.span ?? 1 }} className="p-1.5">
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        key.action === 'delete'
                          ? t('common.delete')
                          : key.action === 'dot'
                            ? decimal
                            : key.label
                      }
                      onPress={() => press(key)}
                      className={cn(
                        'h-[64px] items-center justify-center rounded-[12px] border',
                        isEquals
                          ? 'border-control bg-control active:opacity-90'
                          : isActiveOperator
                            ? 'border-control bg-control active:opacity-90'
                            : isOperator || key.action === 'clear' || key.action === 'delete'
                              ? 'border-line bg-ink/[0.04] active:bg-ink/10'
                              : 'border-line bg-card active:bg-ink/5',
                      )}
                    >
                      {key.action === 'delete' ? (
                        <Delete size={22} color={colors.ink} strokeWidth={1.8} />
                      ) : (
                        <Text
                          allowFontScaling={false}
                          className={cn(
                            'font-app text-[24px]',
                            isEquals || isActiveOperator ? 'text-on-control' : 'text-ink',
                          )}
                        >
                          {key.action === 'dot' ? decimal : key.label}
                        </Text>
                      )}
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        <View className="px-5 pt-3">
          <Button label={t('common.done')} onPress={handleDone} />
        </View>
      </View>
    </Modal>
  );
}
