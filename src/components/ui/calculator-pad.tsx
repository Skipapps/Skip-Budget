import { ChevronLeft, Delete } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { colors } from '@/theme/colors';

type CalculatorPadProps = {
  title?: string;
  /** Starting value, e.g. the amount already in the field. */
  value: string;
  onCancel: () => void;
  onConfirm: (value: string) => void;
};

type Operator = '+' | '-' | '*' | '/';

type Key = {
  label: string;
  /** What the key does; digits and '.' carry their own label. */
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

/** Money rounding — results settle at cents rather than drifting in floats. */
function toCents(value: number): number {
  return Math.round(value * 100) / 100;
}

function group(raw: string): string {
  if (raw === '') return '0';
  const [whole, fraction] = raw.split('.');
  const grouped = (whole || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
}

/**
 * Four-function calculator for amount fields.
 *
 * Deliberately a running accumulator rather than an expression parser: it
 * matches how people expect a pocket calculator to behave, and every
 * intermediate result stays rounded to cents.
 */
export function CalculatorPad({
  title = 'Calculator',
  value,
  onCancel,
  onConfirm,
}: CalculatorPadProps) {
  const insets = useSafeAreaInsets();

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

  const applyPending = (next: number): number | null => {
    if (accumulator === null || pending === null) return next;
    switch (pending) {
      case '+':
        return toCents(accumulator + next);
      case '-':
        return toCents(accumulator - next);
      case '*':
        return toCents(accumulator * next);
      case '/':
        if (next === 0) return null;
        return toCents(accumulator / next);
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
      setError('Cannot divide by zero');
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

  const handleDone = () => {
    // Settle any half-finished operation so Done never discards a pending sum.
    const operand = Number(current || 0);
    const settled = pending !== null ? applyPending(operand) : Number(shown || 0);
    onConfirm(settled === null || Number.isNaN(settled) ? '' : String(settled));
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onCancel}>
      <View
        className="flex-1 bg-white"
        style={{ paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <View className="flex-row items-center px-4 py-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={8}
            onPress={onCancel}
            className="h-11 w-11 items-center justify-center rounded-[10px] active:bg-black/5"
          >
            <ChevronLeft size={24} color={colors.ink} strokeWidth={2} />
          </Pressable>
          <Text
            className="flex-1 pr-11 text-center font-poppins-semibold text-[18px] text-ink"
            maxFontSizeMultiplier={1.2}
          >
            {title}
          </Text>
        </View>

        <View className="flex-1 items-end justify-center px-6">
          <Text
            className="font-poppins text-[15px] text-muted"
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
          >
            {error ??
              (pending && accumulator !== null
                ? `${group(String(accumulator))} ${SYMBOLS[pending]}`
                : ' ')}
          </Text>

          <View className="mt-1 flex-row items-start">
            <Text
              allowFontScaling={false}
              className={cn(
                'mt-2 font-poppins-bold text-[24px]',
                isEmpty ? 'text-muted' : 'text-body',
              )}
            >
              $
            </Text>
            <Text
              allowFontScaling={false}
              className={cn('font-poppins-bold text-[48px]', isEmpty ? 'text-muted' : 'text-ink')}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {group(shown)}
            </Text>
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
                      accessibilityLabel={key.action === 'delete' ? 'Delete' : key.label}
                      onPress={() => press(key)}
                      className={cn(
                        'h-[64px] items-center justify-center rounded-[10px] border',
                        isEquals
                          ? 'border-control bg-control active:opacity-90'
                          : isActiveOperator
                            ? 'border-control bg-control active:opacity-90'
                            : isOperator || key.action === 'clear' || key.action === 'delete'
                              ? 'border-line bg-black/[0.04] active:bg-black/10'
                              : 'border-line bg-white active:bg-black/5',
                      )}
                    >
                      {key.action === 'delete' ? (
                        <Delete size={22} color={colors.ink} strokeWidth={1.8} />
                      ) : (
                        <Text
                          allowFontScaling={false}
                          className={cn(
                            'font-poppins text-[24px]',
                            isEquals || isActiveOperator ? 'text-white' : 'text-ink',
                          )}
                        >
                          {key.label}
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
          <Button label="Done" onPress={handleDone} />
        </View>
      </View>
    </Modal>
  );
}
