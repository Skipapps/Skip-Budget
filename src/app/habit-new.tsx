import { router, useLocalSearchParams } from 'expo-router';
import { CalendarDays, ChevronRight, Tag, Trash2 } from 'lucide-react-native';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  useArchiveHabit,
  useCreateHabit,
  useHabit,
  useHabitTaps,
  useHabits,
  useUpdateHabit,
  type HabitRow,
  type HabitValues,
} from '@/api/habits';
import { usePro } from '@/api/pro';
import { usePaymentSources, type PaymentSourceRow } from '@/api/queries';
import {
  EntryReview,
  GlyphWell,
  SegmentedChips,
  type EntryRowSpec,
} from '@/components/entry/entry-review';
import { FieldPage } from '@/components/entry/edit-pages';
import { AmountFigure } from '@/components/flow/amount-figure';
import { AmountKeypad, applyAmountKey } from '@/components/flow/amount-keypad';
import { StepFlow } from '@/components/flow/step-flow';
import { HabitCard } from '@/components/habits/habit-card';
import { HabitColorSwatches } from '@/components/habits/habit-color-swatches';
import { HabitIcon } from '@/components/habits/habit-icon';
import { HabitIconPicker } from '@/components/habits/habit-icon-picker';
import { HabitPresetGrid } from '@/components/habits/habit-preset-grid';
import { useProGate } from '@/components/pro/pro-gate';
import { Button } from '@/components/ui/button';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { Skeleton } from '@/components/ui/skeleton';
import { SourceTiles } from '@/components/ui/source-tiles';
import { TextField } from '@/components/ui/text-field';
import { FieldLabel } from '@/components/ui/typography';
import { HABIT_COLORS, type HabitColor } from '@/data/habit-colors';
import { FALLBACK_HABIT_ICON, habitIcon } from '@/data/habit-icons';
import {
  HABIT_PRESETS,
  OWN_HABIT_CHIPS,
  PRESETS_SHOWN,
  habitPreset,
  presetChips,
  presetPrice,
  type HabitPreset,
  type HabitPresetId,
} from '@/data/habit-presets';
import { t, useLocale } from '@/i18n';
import { formatFullDate } from '@/lib/date';
import { failureMessage, failureText } from '@/lib/failure';
import { formatCurrency } from '@/lib/format';
import { weekStartOf } from '@/lib/habit-week';
import { success, warn } from '@/lib/haptics';
import { withTap } from '@/lib/press';
import { refusedForPro } from '@/lib/pro-refusal';
import { useToday } from '@/lib/use-today';
import { useConfirm } from '@/providers/dialog-provider';
import { useColors } from '@/providers/theme-provider';
import { useToast } from '@/providers/toast-context';
import { useArtwork } from '@/theme/artwork';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * The pages of one habit: Pick, or Add my own's name and icon; the price; the final page; and the
 * pages a line of the final page opens (`habit`, `iconEdit`, `priceEdit`).
 */
type Page = 'pick' | 'name' | 'icon' | 'price' | 'confirm' | 'habit' | 'iconEdit' | 'priceEdit';

/** The radio fills before Step 2 slides in, so the tap visibly took. */
const PICK_DELAY_MS = 150;

type Initial = {
  presetId: HabitPresetId | null;
  /** Add my own: no preset behind it. */
  own: boolean;
  name: string;
  iconId: string | null;
  color: HabitColor;
  /** The draft as typed ("5", "4.5"). */
  price: string;
  /** '' is Skip, picked on purpose; null is not answered yet. A saved habit has answered. */
  sourceId: string | null;
};

const blank = (): Initial => ({
  presetId: null,
  own: false,
  name: '',
  iconId: null,
  color: HABIT_COLORS[0].id,
  price: '',
  sourceId: null,
});

const savedSource = (habit: Pick<HabitRow, 'card_id' | 'bank_account_id'>) =>
  habit.card_id ?? habit.bank_account_id ?? '';

/**
 * Where a tap's receipt is paid from. An unchanged choice keeps the saved columns: a card a lapsed
 * account can no longer pick from is still the habit's card, and must not be dropped by a save.
 */
function paidWithColumns(
  sourceId: string,
  sources: readonly PaymentSourceRow[],
  saved: HabitRow | null,
): Pick<HabitValues, 'card_id' | 'bank_account_id'> {
  if (saved && sourceId === savedSource(saved)) {
    return { card_id: saved.card_id, bank_account_id: saved.bank_account_id };
  }
  const chosen = sources.find((source) => source.id === sourceId);
  return {
    card_id: chosen?.kind === 'card' ? chosen.id : null,
    bank_account_id: chosen?.kind === 'account' ? chosen.id : null,
  };
}

/** Keyed on the habit's id, so the form remounts once the row lands, seeding state without an effect. */
export default function HabitNewScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const artwork = useArtwork();
  const habit = useHabit(id);
  const existing = habit.data ?? null;
  // Archived from this page: it is on its way back, and must not flash "gone" while it goes.
  const [archivedHere, setArchivedHere] = useState(false);
  const gate = useProGate('habits');

  // Starting a habit is Pro; editing one the account already has is not.
  if (!id && gate) return gate;

  if (id && !existing) {
    // A failed read is neither a gone habit nor a new one: dropping the id would start a second.
    if (habit.isError) {
      return (
        <Screen showBack>
          <PageState
            art={artwork.error}
            title={failureText()}
            actionLabel={t('common.tryAgain')}
            onAction={() => {
              void habit.refetch();
            }}
            secondaryLabel={t('receipts.add.goBack')}
            onSecondary={() => router.back()}
          />
        </Screen>
      );
    }

    if (!habit.isFetched) {
      return (
        <StepFlow
          title={t('habitFlow.edit.title')}
          closePrompt={t('habitFlow.edit.close')}
          steps={1}
          current={0}
          onBack={() => router.back()}
        >
          <View className="w-full gap-6">
            <Skeleton className="h-28 w-full rounded-[16px]" />
            <Skeleton className="h-64 w-full rounded-[16px]" />
          </View>
        </StepFlow>
      );
    }
  }

  // Gone, or deleted from another phone: an update on it would report success and write nothing.
  if (id && (!existing || (existing.archived_at && !archivedHere))) {
    return (
      <Screen showBack>
        <PageState
          art={artwork.error}
          title={failureText()}
          actionLabel={t('receipts.add.goBack')}
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const preset = habitPreset(existing?.preset_id);
  const initial: Initial = existing
    ? {
        presetId: preset?.id ?? null,
        own: !preset,
        name: existing.name,
        iconId: existing.icon_id,
        color: existing.color,
        price: String(existing.price),
        sourceId: savedSource(existing),
      }
    : blank();

  return (
    <HabitForm
      key={existing?.id ?? 'new'}
      saved={existing}
      initial={initial}
      onArchived={() => setArchivedHere(true)}
    />
  );
}

function HabitForm({
  saved,
  initial,
  onArchived,
}: {
  /** The habit being edited; null for a new one. */
  saved: HabitRow | null;
  initial: Initial;
  onArchived: () => void;
}) {
  const colors = useColors();
  const editing = saved !== null;
  const initialView: Page = editing ? 'confirm' : 'pick';
  const { currency } = useLocale();
  const { today } = useToday();

  const [presetId, setPresetId] = useState(initial.presetId);
  const [own, setOwn] = useState(initial.own);
  const [name, setName] = useState(initial.name);
  const [iconId, setIconId] = useState(initial.iconId);
  const [color, setColor] = useState<HabitColor>(initial.color);
  const [price, setPrice] = useState(initial.price);
  const [sourceId, setSourceId] = useState(initial.sourceId);
  // The Habit line's own page keeps its name and icon here until Done, so the icon picker it
  // opens can come back to what was typed.
  const [draftName, setDraftName] = useState('');
  const [draftIcon, setDraftIcon] = useState<string | null>(null);

  const [view, setView] = useState<Page>(initialView);
  const [moreShown, setMoreShown] = useState(false);
  const [justRevealed, setJustRevealed] = useState(false);
  const [reviewY, setReviewY] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const { sources } = usePaymentSources();
  const habits = useHabits();
  // An edit previews the card with its real days; a new habit has none yet.
  const taps = useHabitTaps();
  const { pro } = usePro();
  const createHabit = useCreateHabit();
  const updateHabit = useUpdateHabit();
  const archiveHabit = useArchiveHabit();
  const confirm = useConfirm();
  const toast = useToast();

  const pickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (pickTimer.current) clearTimeout(pickTimer.current);
    },
    [],
  );

  const active = (habits.data ?? []).filter((habit) => habit.id !== saved?.id);
  const trackingIds = new Set(
    active.map((habit) => habit.preset_id).filter((id): id is string => Boolean(id)),
  );
  const usedColors = new Set(active.map((habit) => habit.color));
  const firstUnused = HABIT_COLORS.find((option) => !usedColors.has(option.id))?.id;
  /** Two cards in one colour read as one habit, so a colour already worn gives way to a free one. */
  const colorFor = (wanted: HabitColor) =>
    usedColors.has(wanted) ? (firstUnused ?? wanted) : wanted;

  const preset = own ? undefined : habitPreset(presetId);
  const chips = presetChips(preset?.chips ?? OWN_HABIT_CHIPS, currency);
  const priceOf = (option: HabitPreset) => presetPrice(option, currency);

  const amount = Number(price);
  const priceReady = Number.isFinite(amount) && amount > 0;

  const title = editing ? t('habitFlow.edit.title') : t('habitFlow.new.title');
  const closePrompt = editing ? t('habitFlow.edit.close') : t('habitFlow.new.close');

  const toConfirm = () => {
    setError(null);
    setView('confirm');
  };

  const pick = (option: HabitPreset) => {
    setError(null);
    if (own || presetId !== option.id) {
      setOwn(false);
      setPresetId(option.id);
      setName(t(option.name));
      setIconId(option.icon);
      setColor(colorFor(option.color));
      setPrice(String(priceOf(option)));
    }
    if (pickTimer.current) clearTimeout(pickTimer.current);
    pickTimer.current = setTimeout(() => setView('price'), PICK_DELAY_MS);
  };

  const startOwn = () => {
    setError(null);
    if (!own) {
      setOwn(true);
      setPresetId(null);
      setName('');
      setIconId(null);
      setPrice('');
      setColor(firstUnused ?? HABIT_COLORS[0].id);
    }
    setView('name');
  };

  const openHabitPage = () => {
    setDraftName(name);
    setDraftIcon(iconId);
    setView('habit');
  };

  const handleSave = async () => {
    setError(null);
    const trimmed = name.trim();
    const missing = [
      (!trimmed || !iconId) && t('habitFlow.field.habit'),
      !priceReady && t('habitFlow.field.price'),
      sourceId === null && t('habitFlow.field.paidWith'),
    ].filter((field): field is string => Boolean(field));
    if (missing.length > 0 || !iconId || sourceId === null) {
      warn();
      setError(
        t(editing ? 'habitFlow.edit.missing' : 'habitFlow.confirm.missingNew', {
          fields: missing.join(', '),
        }),
      );
      return;
    }

    const paidWith = paidWithColumns(sourceId, sources, saved);
    const categoryId = habitIcon(iconId)?.spendCategory ?? 'other';

    try {
      if (saved) {
        await updateHabit.mutateAsync({
          id: saved.id,
          values: {
            name: trimmed,
            icon_id: iconId,
            color,
            price: amount,
            ...paidWith,
            // An icon this build does not know keeps the category it was filed under.
            ...(iconId !== saved.icon_id ? { category_id: categoryId } : null),
          },
        });
        success();
        toast('toast.habit.updated');
      } else {
        const orders = (habits.data ?? []).map((habit) => habit.sort_order);
        await createHabit.mutateAsync({
          name: trimmed,
          icon_id: iconId,
          color,
          price: amount,
          category_id: categoryId,
          ...paidWith,
          preset_id: own ? null : presetId,
          started_on: weekStartOf(today),
          saved_from: today,
          // Lowest first on the dashboard: a new habit goes on top.
          ...(orders.length > 0 ? { sort_order: Math.min(...orders) - 1 } : null),
        });
        success();
        toast('toast.habit.added');
      }
      router.back();
    } catch (thrown) {
      // The database's Pro wall, for someone the app also thinks is free: show what Pro adds,
      // pushed so Back returns to the filled-in page. For someone the app thinks has Pro, the two
      // disagree, and that is reported like any failure.
      if (!saved && refusedForPro(thrown) && !pro) {
        router.push({ pathname: '/pro-feature', params: { id: 'habits' } });
        return;
      }
      warn();
      setError(failureMessage(thrown));
    }
  };

  const handleDelete = async () => {
    if (!saved) return;
    const ok = await confirm({
      title: t('habitFlow.delete.title', { name: saved.name }),
      message: t('habitFlow.delete.message'),
      confirmLabel: t('common.delete'),
      destructive: true,
    });
    if (!ok) return;

    try {
      await archiveHabit.mutateAsync(saved.id);
      onArchived();
      toast('toast.habit.deleted', 'deleted');
      router.back();
    } catch (thrown) {
      warn();
      setError(failureMessage(thrown));
    }
  };

  if (view === 'pick') {
    return (
      <StepFlow
        title={title}
        closePrompt={closePrompt}
        steps={3}
        current={0}
        onBack={() => router.back()}
        question={t('habitFlow.pick.question')}
      >
        <HabitPresetGrid
          presets={HABIT_PRESETS}
          shownBefore={PRESETS_SHOWN}
          moreShown={moreShown}
          justRevealed={justRevealed}
          selectedId={own ? null : presetId}
          trackingIds={trackingIds}
          priceOf={priceOf}
          onPick={pick}
          onMore={() => {
            setMoreShown(true);
            setJustRevealed(true);
          }}
          onOwn={startOwn}
        />
      </StepFlow>
    );
  }

  if (view === 'name') {
    return (
      <StepFlow
        title={title}
        closePrompt={closePrompt}
        steps={3}
        current={0}
        root={false}
        onBack={() => setView('pick')}
        question={t('habitFlow.name.question')}
        primaryLabel={t('common.continue')}
        primaryDisabled={!name.trim()}
        onPrimary={() => setView('icon')}
        avoidKeyboard
      >
        <NameField value={name} onChange={setName} autoFocus />
      </StepFlow>
    );
  }

  if (view === 'icon') {
    return (
      <StepFlow
        title={title}
        closePrompt={closePrompt}
        steps={3}
        current={0}
        root={false}
        onBack={() => setView('name')}
        question={t('habitFlow.icon.question')}
      >
        <HabitIconPicker
          value={iconId}
          onPick={(picked) => {
            setIconId(picked);
            setView('price');
          }}
        />
      </StepFlow>
    );
  }

  if (view === 'price') {
    return (
      <StepFlow
        title={title}
        closePrompt={closePrompt}
        steps={3}
        current={1}
        onBack={() => setView(own ? 'icon' : 'pick')}
        question={t('habitFlow.price.question')}
      >
        <PriceBody
          name={name}
          iconId={iconId}
          color={color}
          value={price}
          onChange={setPrice}
          chips={chips}
          // Empty is allowed on: the final page shows the gap, as a receipt's does.
          action={<Button label={t('common.continue')} onPress={toConfirm} />}
        />
      </StepFlow>
    );
  }

  if (view === 'priceEdit') {
    return (
      <PriceEditPage
        name={name}
        iconId={iconId}
        color={color}
        value={price}
        chips={chips}
        onBack={() => setView('confirm')}
        onDone={(next) => {
          setPrice(next);
          toConfirm();
        }}
      />
    );
  }

  if (view === 'habit') {
    const icon = habitIcon(draftIcon) ?? FALLBACK_HABIT_ICON;
    const iconLabel = t('habitFlow.field.icon');
    return (
      <FieldPage
        title={t('habitFlow.field.habit')}
        question={t('habitFlow.name.question')}
        onBack={() => setView('confirm')}
        onDone={() => {
          setName(draftName);
          if (draftIcon) setIconId(draftIcon);
          toConfirm();
        }}
        doneDisabled={!draftName.trim()}
        avoidKeyboard
      >
        <NameField value={draftName} onChange={setDraftName} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('entry.row.spoken', { label: iconLabel, value: t(icon.label) })}
          accessibilityHint={t('entry.row.changeHint', { label: iconLabel.toLowerCase() })}
          onPress={withTap(() => setView('iconEdit'))}
          className="mt-4 min-h-14 w-full flex-row items-center gap-3 rounded-[16px] border border-line bg-card px-4 py-3 active:opacity-60"
        >
          <HabitIcon iconId={icon.id} color={color} size={40} />
          <View className="min-w-0 flex-1">
            <Text
              className="font-app text-[12px] text-muted"
              maxFontSizeMultiplier={TEXT_CAP.control}
            >
              {iconLabel}
            </Text>
            <Text
              className="mt-0.5 font-app-medium text-[15px] text-ink"
              maxFontSizeMultiplier={TEXT_CAP.row}
            >
              {t(icon.label)}
            </Text>
          </View>
          <ChevronRight size={18} color={colors.muted} strokeWidth={2} />
        </Pressable>
      </FieldPage>
    );
  }

  if (view === 'iconEdit') {
    return (
      <FieldPage title={t('habitFlow.field.icon')} onBack={() => setView('habit')}>
        <HabitIconPicker
          value={draftIcon}
          onPick={(picked) => {
            setDraftIcon(picked);
            setView('habit');
          }}
        />
      </FieldPage>
    );
  }

  const busy = createHabit.isPending || updateHabit.isPending;
  const isRoot = view === initialView;
  const priceChanged = saved !== null && priceReady && amount !== saved.price;
  const sourceChanged = saved !== null && sourceId !== savedSource(saved);

  const rows: EntryRowSpec[] = [
    {
      key: 'habit',
      label: t('habitFlow.field.habit'),
      value: name.trim() && iconId ? name.trim() : null,
      required: true,
      leading: <HabitIcon iconId={iconId} color={color} size={40} />,
      onPress: openHabitPage,
    },
    {
      key: 'price',
      label: t('habitFlow.field.price'),
      value: priceReady ? t('habitFlow.field.priceValue', { price: formatCurrency(amount) }) : null,
      required: true,
      leading: <GlyphWell icon={Tag} />,
      onPress: () => setView('priceEdit'),
    },
    {
      key: 'colour',
      field: (
        <View className="w-full">
          <FieldLabel className="mb-3">{t('habitFlow.field.colour')}</FieldLabel>
          <HabitColorSwatches value={color} onChange={setColor} />
        </View>
      ),
    },
    {
      key: 'paidWith',
      field: (
        <View className="w-full">
          <FieldLabel className="mb-2">{t('habitFlow.field.paidWith')}</FieldLabel>
          <SourceTilesWithSkip
            sources={sources}
            value={sourceId}
            onChange={(next) => {
              setError(null);
              setSourceId(next);
            }}
          />
        </View>
      ),
    },
    {
      key: 'starts',
      label: saved ? t('habitFlow.field.started') : t('habitFlow.field.starts'),
      // Days can be tapped from the day a habit is made, not from the Monday it is filed under.
      value: saved
        ? formatFullDate(new Date(`${saved.saved_from}T00:00:00`))
        : t('habitFlow.starts.today'),
      leading: <GlyphWell icon={CalendarDays} />,
    },
  ];

  return (
    <EntryReview
      scrollPlace={{ y: reviewY, keep: setReviewY }}
      title={title}
      closePrompt={closePrompt}
      root={isRoot}
      progress={editing ? undefined : { steps: 3, current: 2 }}
      onBack={() => {
        if (isRoot) {
          router.back();
          return;
        }
        // A failed save's line belongs to the final page, not the step it goes back to.
        setError(null);
        setView('price');
      }}
      amountLabel={t('habitFlow.field.price')}
      amount={price}
      onEditAmount={() => setView('priceEdit')}
      topSlot={
        editing ? null : (
          <Text
            accessibilityRole="header"
            className="mt-2 w-full text-center font-app text-[20px] text-muted"
            maxFontSizeMultiplier={TEXT_CAP.heading}
          >
            {t('habitFlow.confirm.question')}
          </Text>
        )
      }
      amountSlot={
        <View className="mt-6 w-full">
          <FieldLabel className="mb-2">{t('habitFlow.confirm.preview')}</FieldLabel>
          <HabitCard
            interactive={false}
            habit={{
              id: saved?.id ?? 'preview',
              name: name.trim(),
              icon_id: iconId ?? '',
              color,
              price: priceReady ? amount : 0,
              started_on: saved?.started_on ?? weekStartOf(today),
              saved_from: saved?.saved_from ?? today,
            }}
            taps={saved ? (taps.data ?? []) : []}
            weekStart={today}
            today={today}
          />
        </View>
      }
      rows={rows}
      bottomSlot={
        priceChanged || sourceChanged ? (
          <Text
            className="w-full text-center font-app text-[13px] text-muted"
            maxFontSizeMultiplier={TEXT_CAP.reading}
          >
            {t('habitFlow.edit.futureOnly')}
          </Text>
        ) : null
      }
      primaryLabel={
        busy
          ? t('receipts.add.saving')
          : editing
            ? t('habitFlow.edit.save')
            : t('habitFlow.confirm.start')
      }
      // Never greyed out for a gap: Save says what is still missing.
      primaryDisabled={busy}
      onPrimary={() => void handleSave()}
      error={error}
      footerSlot={
        editing ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('habitFlow.edit.delete')}
            onPress={handleDelete}
            className="min-h-12 w-full flex-row items-center justify-center gap-2 rounded-full active:bg-ink/5"
          >
            <Trash2 size={17} color={colors.danger} strokeWidth={1.8} />
            <Text
              className="font-app-medium text-[15px] text-danger"
              maxFontSizeMultiplier={TEXT_CAP.row}
            >
              {archiveHabit.isPending ? t('habitFlow.edit.deleting') : t('habitFlow.edit.delete')}
            </Text>
          </Pressable>
        ) : null
      }
    />
  );
}

function NameField({
  value,
  onChange,
  autoFocus = false,
}: {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <View className="mt-2 w-full">
      <TextField
        label={t('habitFlow.name.label')}
        value={value}
        onChangeText={onChange}
        placeholder={t('habitFlow.name.placeholder')}
        autoFocus={autoFocus}
        autoCapitalize="sentences"
        maxLength={40}
      />
    </View>
  );
}

/** Paid with: the person's cards and accounts, and Skip for none, picked on purpose. */
function SourceTilesWithSkip({
  sources,
  value,
  onChange,
}: {
  sources: readonly PaymentSourceRow[];
  value: string | null;
  onChange: (sourceId: string) => void;
}) {
  return (
    <SourceTiles
      sources={sources}
      value={value ?? ''}
      onChange={onChange}
      skip={{
        label: t('receipts.add.skipSource'),
        selected: value === '',
        onPress: () => onChange(''),
      }}
    />
  );
}

/**
 * Step 2's page body: what is being priced, the amount, the chips, then the button and the keypad.
 * The button sits above the keypad, next to the figure it confirms, so it stays in view.
 */
function PriceBody({
  name,
  iconId,
  color,
  value,
  onChange,
  chips,
  action,
}: {
  name: string;
  iconId: string | null;
  color: HabitColor;
  value: string;
  onChange: (value: string) => void;
  chips: readonly number[];
  action: ReactNode;
}) {
  const typed = Number(value);
  return (
    <View className="w-full flex-1">
      <View className="w-full flex-row items-center justify-center gap-2">
        <HabitIcon iconId={iconId} color={color} size={24} />
        <Text
          className="shrink font-app-medium text-[15px] text-body"
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {name}
        </Text>
      </View>

      <View className="mt-4 w-full items-center rounded-[16px] bg-ink/5 px-3 pb-3 pt-4">
        <AmountFigure value={value} />
        <Text
          className="mt-2 w-full text-center font-app text-[13px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.reading}
        >
          {t('habitFlow.price.helper')}
        </Text>
      </View>

      <View className="mt-4 w-full">
        <SegmentedChips
          options={chips.map((chip) => ({
            key: String(chip),
            label: formatCurrency(chip, { cents: false }),
            selected: typed === chip,
            onPress: () => onChange(String(chip)),
          }))}
        />
      </View>

      <View className="mt-auto w-full gap-4 pt-6">
        {action}
        <AmountKeypad onKey={(key) => onChange(applyAmountKey(value, key))} />
      </View>
    </View>
  );
}

/** The final page's Price line: Step 2's body on a page of its own. A zero is not a price, so Done waits. */
function PriceEditPage({
  name,
  iconId,
  color,
  value,
  chips,
  onBack,
  onDone,
}: {
  name: string;
  iconId: string | null;
  color: HabitColor;
  value: string;
  chips: readonly number[];
  onBack: () => void;
  onDone: (value: string) => void;
}) {
  const [text, setText] = useState(value);
  const typed = Number(text);
  return (
    <StepFlow
      title={t('habitFlow.field.price')}
      steps={1}
      current={1}
      onBack={onBack}
      question={t('habitFlow.price.question')}
    >
      <PriceBody
        name={name}
        iconId={iconId}
        color={color}
        value={text}
        onChange={setText}
        chips={chips}
        action={
          <Button
            label={t('common.done')}
            onPress={() => onDone(text)}
            disabled={!(Number.isFinite(typed) && typed > 0)}
          />
        }
      />
    </StepFlow>
  );
}
