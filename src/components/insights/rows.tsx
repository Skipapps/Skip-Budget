import { ArrowRight, ChevronRight } from 'lucide-react-native';
import { createElement, type FC, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import { ActionPill } from '@/components/ui/action-pill';
import { FitGroup, FitText, useFitGroup, useGroupFits } from '@/components/ui/fit-group';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/format';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

/** Every mark on the page: icons, logos, avatars. */
export const MARK = 36;

/** The white card each section draws its rows in. */
export const CARD = 'w-full rounded-[20px] border border-line bg-card px-[16px] py-[16px]';

/** A gradient drawing in the same round well a bill's category mark sits in. Decoration only. */
export function IconWell({ icon, size = MARK }: { icon: FC<SvgProps>; size?: number }) {
  return (
    <View
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="items-center justify-center rounded-full border border-line bg-ink/5"
    >
      {/* createElement, not JSX: a capitalised local for a looked-up component trips the lint rule. */}
      {createElement(icon, { width: Math.round(size * 0.6), height: Math.round(size * 0.6) })}
    </View>
  );
}

/** A share of something, 0 to 1, as an accent bar on a faint track. Drawn only. */
export function ShareBar({ share, className }: { share: number; className?: string }) {
  const width = `${Math.max(0, Math.min(1, share)) * 100}%` as const;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={cn('h-[6px] w-full overflow-hidden rounded-full bg-ink/5', className)}
    >
      <View className="h-full rounded-full bg-accent" style={{ width }} />
    </View>
  );
}

/** A hairline across the card, between its parts. */
export function Rule({ className }: { className?: string }) {
  return <View className={cn('h-px w-full bg-line', className)} />;
}

/**
 * A label and a signed figure. Money out is tinted, money in is not shouted about. Every row in the
 * card keeps its figure beside its label, or every row puts it underneath.
 */
export function StandRow({
  id,
  label,
  value,
  plain = false,
  strong = false,
  muted = false,
  mark,
  caption,
  figure,
}: {
  /** Names the fit slots; unique in its card. */
  id: string;
  label: string;
  value: number;
  plain?: boolean;
  /** The card's total line. */
  strong?: boolean;
  /** A summing line under a rule ("Monthly payments"): the label goes quiet. */
  muted?: boolean;
  mark?: ReactNode;
  /** Muted lines under the label: "Every month · 1 source". */
  caption?: string | readonly string[] | null;
  /** Drawn in place of the amount, already written ("40%"). */
  figure?: string;
}) {
  const colors = useColors();
  const stacked = !useGroupFits();
  const negative = value < 0;

  const words = (
    <View
      className={
        stacked ? 'w-full items-start' : 'w-full flex-row items-center justify-between gap-3'
      }
    >
      <FitText
        id={`${id}-label`}
        role="row"
        size={strong ? 16 : 15}
        className={
          strong
            ? 'font-app-semibold text-ink'
            : muted
              ? 'font-app text-muted'
              : 'font-app-medium text-ink'
        }
        slotClassName={stacked ? 'w-full' : 'min-w-0 flex-1'}
      >
        {label}
      </FitText>
      <FitText
        id={`${id}-value`}
        hug
        role="row"
        size={strong ? 16 : 15}
        className={strong ? 'font-app-bold text-ink' : 'font-app-semibold text-ink'}
        style={negative && !plain && !strong ? { color: colors.moneyOut } : undefined}
        slotClassName={stacked ? 'mt-0.5' : 'shrink-0'}
      >
        {figure ?? formatCurrency(Math.abs(value))}
      </FitText>
    </View>
  );

  const lines = caption ? (typeof caption === 'string' ? [caption] : caption) : [];
  const note =
    lines.length > 0
      ? lines.map((line) => (
          <Text
            key={line}
            className="mt-[2px] font-app text-[12px] text-muted"
            maxFontSizeMultiplier={TEXT_CAP.row}
          >
            {line}
          </Text>
        ))
      : null;

  if (!mark) {
    return note ? (
      <View className="w-full">
        {words}
        {note}
      </View>
    ) : (
      words
    );
  }

  return (
    <View className="w-full flex-row items-center gap-3">
      {mark}
      <View className="min-w-0 flex-1">
        {words}
        {note}
      </View>
    </View>
  );
}

/** A name, its figure and a bar of its share; stacked with the rest of its card, the figure goes under the name. */
export function BarRow({
  id,
  first,
  mark,
  label,
  amount,
  figure,
  share,
  note,
}: {
  id: string;
  first: boolean;
  mark: ReactNode;
  label: string;
  amount: number;
  /** Drawn in place of the amount, already written ("40%"). */
  figure?: string;
  /** Of the card's biggest, 0 to 1. */
  share: number;
  note?: string;
}) {
  const stacked = !useGroupFits();
  return (
    <View className={first ? 'flex-row items-center gap-3' : 'mt-4 flex-row items-center gap-3'}>
      {mark}
      <View className="min-w-0 flex-1">
        <View
          className={
            stacked ? 'w-full items-start' : 'w-full flex-row items-baseline justify-between gap-3'
          }
        >
          <FitText
            id={`${id}-label`}
            role="row"
            size={15}
            className="font-app-medium text-ink"
            slotClassName={stacked ? 'w-full' : 'min-w-0 flex-1'}
          >
            {label}
          </FitText>
          <FitText
            id={`${id}-amount`}
            hug
            role="row"
            size={15}
            className="font-app-semibold text-ink"
            slotClassName={stacked ? 'mt-0.5' : 'shrink-0'}
          >
            {figure ?? formatCurrency(amount)}
          </FitText>
        </View>
        <ShareBar share={share} className="mt-1.5" />
        {note ? (
          <Text
            className="mt-1 font-app text-[12px] text-muted"
            maxFontSizeMultiplier={TEXT_CAP.row}
          >
            {note}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** A whole card that opens a page: a name, a hint under it, a figure and the chevron. */
export function Row({
  label,
  value,
  hint,
  mark,
  onPress,
}: {
  label: string;
  value?: string;
  hint?: string;
  mark?: ReactNode;
  onPress: () => void;
}) {
  const colors = useColors();
  const words = useFitGroup({ mode: 'switch' });
  const stacked = !words.fits;
  const figure = value ? (
    <FitText
      id="value"
      hug
      role="row"
      size={15}
      className="font-app-semibold text-ink"
      slotClassName={stacked ? 'mt-0.5' : 'shrink-0'}
    >
      {value}
    </FitText>
  ) : null;

  return (
    <FitGroup group={words} className="w-full">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}${value ? `, ${value}` : ''}${hint ? `, ${hint}` : ''}`}
        onPress={onPress}
        className="w-full flex-row items-center gap-3 rounded-[20px] border border-line bg-card px-[16px] py-[16px] active:bg-ink/5"
      >
        {mark}
        {/* Stacked, the figure follows the name, in the order VoiceOver reads the row. */}
        <View className="min-w-0 flex-1 items-start">
          <FitText
            id="label"
            role="row"
            size={15}
            className="font-app-medium text-ink"
            slotClassName="w-full"
          >
            {label}
          </FitText>
          {stacked ? figure : null}
          {hint ? (
            <Text
              className="mt-0.5 font-app text-[12px] text-muted"
              maxFontSizeMultiplier={TEXT_CAP.row}
            >
              {hint}
            </Text>
          ) : null}
        </View>
        {stacked ? null : figure}
        <ChevronRight size={18} color={colors.muted} strokeWidth={2} />
      </Pressable>
    </FitGroup>
  );
}

export function Prompt({
  title,
  message,
  actionLabel,
  onPress,
}: {
  title: string;
  message: string;
  actionLabel: string;
  onPress: () => void;
}) {
  return (
    <View className="w-full rounded-[20px] border border-line bg-card px-5 py-5">
      <Text
        className="font-app-semibold text-[15px] leading-6 text-ink"
        maxFontSizeMultiplier={TEXT_CAP.heading}
      >
        {title}
      </Text>
      <Text
        className="mt-2 font-app text-[13px] leading-[19px] text-muted"
        maxFontSizeMultiplier={TEXT_CAP.reading}
      >
        {message}
      </Text>
      <ActionPill
        className="mt-4 self-start"
        icon={ArrowRight}
        label={actionLabel}
        onPress={onPress}
      />
    </View>
  );
}
