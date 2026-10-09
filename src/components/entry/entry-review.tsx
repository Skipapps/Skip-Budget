import { Stack, useFocusEffect } from 'expo-router';
import { CalendarDays, ChevronRight, Pencil, Plus, type LucideIcon } from 'lucide-react-native';
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ComponentRef,
  type ReactNode,
} from 'react';
import { AccessibilityInfo, BackHandler, Pressable, Text, View } from 'react-native';

import { AmountFigure } from '@/components/flow/amount-figure';
import { FlowHeader, StepIndicator } from '@/components/flow/step-flow';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { GLYPH_STROKE } from '@/data/glyphs';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { amountForDisplay, dayChoice, dayFor } from '@/lib/entry-day';
import { formatCurrency } from '@/lib/format';
import { withTap } from '@/lib/press';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

/** A glyph in the house's tonal well, for rows with no logo of their own. */
export function GlyphWell({ icon: Icon }: { icon: LucideIcon }) {
  const colors = useColors();
  return (
    <View className="h-10 w-10 items-center justify-center rounded-[12px] bg-ink/5">
      <Icon size={20} color={colors.body} strokeWidth={GLYPH_STROKE} />
    </View>
  );
}

/** One line of the card: what it is, what it holds, and the page that changes it. */
type EntryLineSpec = {
  key: string;
  /** "Store", "Paid with". */
  label: string;
  /** What the record has for it, or null when nothing is set. */
  value: string | null;
  /** Save needs it: empty, it is drawn as a gap to fill rather than "Not set". */
  required?: boolean;
  /** Said in place of "Not set" when an optional row is empty ("Add a note"). */
  placeholder?: string;
  /** The 40pt mark: a logo, a bill mark, or a glyph in a well. */
  leading: ReactNode;
  /** The page that changes it. Omitted on a row whose chips below are the whole control. */
  onPress?: () => void;
  /** Sits under the row, inside the card: the date chips. */
  below?: ReactNode;
};

/** A line that is its own input: the store, service or company box, typed into on the page itself. */
type EntryFieldSpec = {
  key: string;
  field: ReactNode;
  below?: ReactNode;
};

export type EntryRowSpec = EntryLineSpec | EntryFieldSpec;

type EntryReviewProps = {
  title: string;
  /** What close asks before it throws the entry away. */
  closePrompt: string;
  /** Where close goes once confirmed; by default this page is popped. */
  onClose?: () => void;
  onBack: () => void;
  /**
   * The first page of the entry. Anywhere else the edge swipe is off, because leaving the route
   * would throw away what was filled in, and hardware back steps back instead.
   */
  root: boolean;
  /** The flow's dots, for a final page that is the last step of a stepped flow. */
  progress?: { steps: number; current: number };
  amountLabel: string;
  /** The draft as typed ("49.11"); empty or zero draws a gap, never $0. */
  amount: string;
  onEditAmount: () => void;
  /** Drawn in place of the amount: the voice review's "which amount?" when it heard two. */
  amountSlot?: ReactNode;
  rows: EntryRowSpec[];
  /** Above the amount: what a scan or a voice reading found. */
  topSlot?: ReactNode;
  /** Under the card: a bill's loan schedule. */
  bottomSlot?: ReactNode;
  primaryLabel: string;
  primaryDisabled?: boolean;
  onPrimary: () => void;
  error?: string | null;
  /** What still blocks Save, said calmly: nothing has gone wrong, something is not yet answered. */
  hint?: string | null;
  /** Under the Save button: Delete, when editing. */
  footerSlot?: ReactNode;
  /**
   * Kept by the form, which outlives this page while a row's own page is open: coming back lands
   * where the person was, not at the top.
   */
  scrollPlace?: { y: number; keep: (y: number) => void };
};

/**
 * The page every new receipt, bill and subscription lands on, however it began (typed, scanned,
 * uploaded or spoken), and the one an existing record is edited on: the amount, then a card of
 * everything else, each line opening a page for that one thing and coming back here. Nothing sends
 * anyone back through the steps. Save is pinned, with the reassurance that it can be edited later.
 */
export function EntryReview({
  title,
  closePrompt,
  onClose,
  onBack,
  root,
  progress,
  amountLabel,
  amount,
  onEditAmount,
  amountSlot,
  rows,
  topSlot,
  bottomSlot,
  primaryLabel,
  primaryDisabled = false,
  onPrimary,
  error,
  hint,
  footerSlot,
  scrollPlace,
}: EntryReviewProps) {
  const titleRef = useRef<ComponentRef<typeof Text>>(null);
  useEffect(() => {
    if (titleRef.current) AccessibilityInfo.sendAccessibilityEvent(titleRef.current, 'focus');
  }, []);

  const screenOptions = useMemo(() => ({ gestureEnabled: root }), [root]);
  const onBackRef = useRef(onBack);
  useEffect(() => {
    onBackRef.current = onBack;
  });
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (root) return false;
        onBackRef.current();
        return true;
      });
      return () => subscription.remove();
    }, [root]),
  );

  const footer = (
    <View className="w-full gap-2">
      {error ? (
        <Text
          className="w-full text-center font-app text-[13px] text-danger"
          maxFontSizeMultiplier={TEXT_CAP.reading}
        >
          {error}
        </Text>
      ) : null}
      {hint ? (
        <Text
          className="w-full text-center font-app text-[13px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.reading}
        >
          {hint}
        </Text>
      ) : null}
      <Text
        className="w-full text-center font-app text-[13px] text-muted"
        maxFontSizeMultiplier={TEXT_CAP.reading}
      >
        {t('entry.editLater')}
      </Text>
      <Button
        label={primaryLabel}
        onPress={onPrimary}
        disabled={primaryDisabled}
        accessibilityHint={hint ?? undefined}
      />
      {footerSlot}
    </View>
  );

  return (
    <Screen
      // A row can be a box to type in; the page scrolls it clear of the keyboard.
      avoidKeyboard={rows.some((row) => 'field' in row)}
      scrollPlace={scrollPlace}
      header={
        <View className="w-full pb-2">
          <FlowHeader
            title={title}
            onBack={onBack}
            closePrompt={closePrompt}
            onClose={onClose}
            titleRef={titleRef}
          />
          {progress ? <StepIndicator steps={progress.steps} current={progress.current} /> : null}
        </View>
      }
      footer={footer}
    >
      <Stack.Screen options={screenOptions} />

      {topSlot ? <View className="mt-4 w-full">{topSlot}</View> : null}

      {amountSlot ?? <AmountHero label={amountLabel} amount={amount} onPress={onEditAmount} />}

      <View className="mt-6 w-full overflow-hidden rounded-[16px] border border-line bg-card py-1">
        {rows.map((spec, index) => (
          <Fragment key={spec.key}>
            {index > 0 ? <View className="ml-[52px] h-px bg-line/60" /> : null}
            {'field' in spec ? (
              <View className="w-full px-4 py-3">{spec.field}</View>
            ) : (
              <EntryRow
                label={spec.label}
                value={spec.value}
                required={spec.required}
                placeholder={spec.placeholder}
                leading={spec.leading}
                onPress={spec.onPress}
              />
            )}
            {spec.below ? <View className="w-full px-4 pb-3">{spec.below}</View> : null}
          </Fragment>
        ))}
      </View>

      {bottomSlot ? <View className="mt-4 w-full">{bottomSlot}</View> : null}

      <View className="h-6" />
    </Screen>
  );
}

/** The amount, large, with "Tap to edit" under it; a gap to fill when there is none. */
function AmountHero({
  label,
  amount,
  onPress,
}: {
  label: string;
  amount: string;
  onPress: () => void;
}) {
  const colors = useColors();
  const shown = amountForDisplay(amount);

  if (shown === null) {
    // Never $0: a zero for an amount nobody gave is a false figure.
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('entry.row.spoken', {
          label,
          value: t('entry.row.neededSpoken'),
        })}
        accessibilityHint={t('entry.row.neededHint', { label: label.toLowerCase() })}
        onPress={withTap(onPress)}
        className="mt-6 min-h-[112px] w-full items-center justify-center rounded-[16px] bg-accent/10 px-4 active:opacity-80"
      >
        <Text
          className="text-center font-app-medium text-[17px] text-ink"
          maxFontSizeMultiplier={TEXT_CAP.figure}
        >
          {t('entry.amountMissing')}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('entry.row.spoken', {
        label,
        value: formatCurrency(Number(shown)),
      })}
      accessibilityHint={t('entry.tapToEdit')}
      onPress={withTap(onPress)}
      className="mt-6 w-full items-center py-2 active:opacity-70"
    >
      <Text className="font-app text-[14px] text-muted" maxFontSizeMultiplier={TEXT_CAP.control}>
        {label}
      </Text>
      <AmountFigure value={shown} />
      <View className="mt-2 flex-row items-center gap-1.5">
        <Pencil size={14} color={colors.muted} strokeWidth={1.8} />
        <Text className="font-app text-[13px] text-muted" maxFontSizeMultiplier={TEXT_CAP.control}>
          {t('entry.tapToEdit')}
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * One line: label above value, a chevron to change it. A missing required field is a gap to fill
 * ("Tap to add", an accent well with a plus) and no red, because nothing has gone wrong yet; a
 * missing optional one is just "Not set", or its own invitation ("Add a note").
 *
 * The words are ink, not accent ink: accent ink falls under 4.5:1 on a card in dark mode.
 */
function EntryRow({
  label,
  value,
  required = false,
  placeholder,
  leading,
  onPress,
}: Omit<EntryLineSpec, 'key' | 'below'>) {
  const colors = useColors();
  const missing = value === null;
  const gap = missing && required;

  const spoken = !missing
    ? value
    : required
      ? t('entry.row.neededSpoken')
      : t('entry.row.notSetSpoken');
  const shownLabel =
    missing && !required && !placeholder ? t('entry.row.optional', { label }) : label;
  const field = label.toLowerCase();

  const body = (
    <>
      {gap ? (
        <View className="h-10 w-10 items-center justify-center rounded-[12px] bg-accent/10">
          <Plus size={20} color={colors.accentInk} strokeWidth={GLYPH_STROKE} />
        </View>
      ) : (
        leading
      )}

      <View className="min-w-0 flex-1">
        <Text className="font-app text-[12px] text-muted" maxFontSizeMultiplier={TEXT_CAP.control}>
          {shownLabel}
        </Text>
        <Text
          className={cn(
            'mt-0.5 text-[15px]',
            gap || !missing ? 'font-app-medium text-ink' : 'font-app text-muted',
          )}
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {gap ? t('entry.row.tapToAdd') : missing ? (placeholder ?? t('entry.row.notSet')) : value}
        </Text>
      </View>
    </>
  );

  // A row with nothing to open is not a button: the chips under it are the control.
  if (!onPress) {
    return <View className="min-h-14 w-full flex-row items-center gap-3 px-4 py-3">{body}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('entry.row.spoken', { label, value: spoken })}
      accessibilityHint={
        gap
          ? t('entry.row.neededHint', { label: field })
          : t('entry.row.changeHint', { label: field })
      }
      onPress={withTap(onPress)}
      className="min-h-14 w-full flex-row items-center gap-3 px-4 py-3 active:opacity-60"
    >
      {body}
      <ChevronRight size={18} color={colors.muted} strokeWidth={2} />
    </Pressable>
  );
}

type DateChipsProps = {
  value: Date;
  today: Date;
  /** Today and Yesterday set the day in one tap. */
  onPick: (day: Date) => void;
  /** "Pick date" opens the calendar page. */
  onOpenCalendar: () => void;
};

/**
 * Today, Yesterday, or a day of your own: the two nearly everyone means are one tap, under the date.
 * Whichever the day is lights; a day that is neither lights "Pick date".
 */
export function DateChips({ value, today, onPick, onOpenCalendar }: DateChipsProps) {
  const choice = dayChoice(value, today);

  return (
    <SegmentedChips
      options={[
        {
          key: 'today',
          label: t('dates.today'),
          selected: choice === 'today',
          onPress: () => onPick(dayFor('today', today)),
        },
        {
          key: 'yesterday',
          label: t('dates.yesterday'),
          selected: choice === 'yesterday',
          onPress: () => onPick(dayFor('yesterday', today)),
        },
        {
          key: 'other',
          label: t('entry.pickDate'),
          selected: choice === 'other',
          onPress: onOpenCalendar,
          icon: CalendarDays,
        },
      ]}
    />
  );
}

export type SegmentOption = {
  key: string;
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: LucideIcon;
};

/**
 * Pick-one chips, the chosen one filled. By default they share a single tonal pill; `pills` gives
 * each its own outline, for a longer list (the billing cycles). Either wraps onto a second line
 * rather than shrink when the words are long or the type is large.
 */
export function SegmentedChips({
  options,
  variant = 'segmented',
}: {
  options: SegmentOption[];
  variant?: 'segmented' | 'pills';
}) {
  const colors = useColors();
  const pills = variant === 'pills';

  return (
    <View
      accessibilityRole="radiogroup"
      className={cn(
        'w-full flex-row flex-wrap',
        pills ? 'gap-2' : 'gap-1 rounded-[24px] bg-ink/5 p-1',
      )}
    >
      {options.map(({ key, label, selected, onPress, icon: Icon }) => (
        <Pressable
          key={key}
          accessibilityRole="radio"
          accessibilityState={{ selected, checked: selected }}
          accessibilityLabel={label}
          onPress={withTap(onPress)}
          className={cn(
            'min-h-10 min-w-0 flex-row items-center justify-center gap-1.5 rounded-full',
            pills ? 'border px-2.5' : 'grow px-3',
            selected
              ? pills
                ? 'border-control bg-control'
                : 'bg-control'
              : pills
                ? 'border-line bg-card active:bg-ink/5'
                : 'active:bg-ink/10',
          )}
        >
          {Icon ? (
            <Icon size={16} color={selected ? colors.onControl : colors.ink} strokeWidth={1.8} />
          ) : null}
          <Text
            className={cn(
              'text-[14px]',
              selected ? 'font-app-semibold text-on-control' : 'font-app-medium text-ink',
            )}
            maxFontSizeMultiplier={TEXT_CAP.control}
          >
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
