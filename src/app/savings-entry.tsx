import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import {
  savingsRefusal,
  useRemoveSavingsPot,
  useSavingsCore,
  useSaveSavingsPot,
} from '@/api/savings';
import { LoanCard, LoanCardRow } from '@/components/calculators/loan-section';
import { potDetail, potTitle } from '@/components/savings/pot-words';
import { QuietAction } from '@/components/savings/quiet-action';
import { refusalLine } from '@/components/savings/refusal-words';
import { shortMoney } from '@/components/savings/savings-words';
import { goBack } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { CurrencyField } from '@/components/ui/currency-field';
import { DatePicker } from '@/components/ui/date-picker';
import { FitRows } from '@/components/ui/fit-group';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { TextField } from '@/components/ui/text-field';
import { t } from '@/i18n';
import { formatFullDate, toIsoDate } from '@/lib/date';
import { failureMessage, failureText } from '@/lib/failure';
import { formatCurrency } from '@/lib/format';
import { success, warn } from '@/lib/haptics';
import { wholeCents } from '@/lib/money';
import { canChangePot, type MoveRow, type PotRow, type PotView } from '@/lib/savings';
import { useToday } from '@/lib/use-today';
import { useConfirm } from '@/providers/dialog-provider';
import { useToast } from '@/providers/toast-context';
import { useArtwork } from '@/theme/artwork';
import { TEXT_CAP } from '@/theme/text-scale';

const LABEL_MAX = 60;
const NOTE_MAX = 200;

/** A typed draft ("1234.5") as an amount in whole cents, or null when it is not one. */
function draftAmount(draft: string): number | null {
  if (draft.trim() === '') return null;
  const value = Number(draft);
  return wholeCents(value) === null || value < 0 ? null : value;
}

/**
 * Adds savings that are not pay (`/savings-entry`), or changes one (`?id=`): a month's amount and
 * note, or an added amount's name, amount, day and note. Removing is here too, refused while any of
 * it is in goals.
 */
export default function SavingsEntryScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const artwork = useArtwork();
  const savings = useSavingsCore();
  const focused = useIsFocused();

  const live = id ? (savings.summary.pots.find((view) => view.id === id) ?? null) : null;
  // The pot as last read: Remove reloads savings before this page leaves, and the form stays drawn
  // until it does, rather than flash the failure page.
  const [kept, setKept] = useState<PotView | null>(null);
  if (live && live !== kept) setKept(live);
  const pot = live ?? kept;

  // An id that matches nothing (removed on another phone before this opened): leave quietly.
  const missing = Boolean(id) && !savings.isPending && !savings.isError && !pot;
  useEffect(() => {
    if (missing && focused) goBack();
  }, [missing, focused]);

  if (!id) return <EntryForm pot={null} pots={savings.pots} moves={savings.moves} />;
  // Keyed, so the form seeds from the pot once it is read.
  if (pot) return <EntryForm key={pot.id} pot={pot} pots={savings.pots} moves={savings.moves} />;

  return (
    <Screen title={t('savings.entry.editTitle')} showBack>
      {savings.isPending ? <SkeletonList rows={3} /> : null}
      {savings.isError ? (
        <PageState
          art={artwork.error}
          title={failureText()}
          actionLabel={t('common.tryAgain')}
          onAction={savings.refetch}
        />
      ) : null}
    </Screen>
  );
}

function EntryForm({
  pot,
  pots,
  moves,
}: {
  pot: PotView | null;
  pots: readonly PotRow[];
  moves: readonly MoveRow[];
}) {
  const { today, todayDate } = useToday();
  const toast = useToast();
  const confirm = useConfirm();
  const save = useSaveSavingsPot();
  const remove = useRemoveSavingsPot();

  const month = pot?.kind === 'month';
  const [name, setName] = useState(pot?.label ?? '');
  const [draft, setDraft] = useState(pot ? String(pot.amount) : '');
  const [day, setDay] = useState(() =>
    pot?.kind === 'added' ? new Date(`${pot.added_on}T00:00:00`) : todayDate,
  );
  const [note, setNote] = useState(pot?.note ?? '');
  const [pickingDay, setPickingDay] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fail = (line: string) => {
    warn();
    setError(line);
  };

  const handleSave = async () => {
    if (save.isPending) return;
    setError(null);
    const amount = draftAmount(draft);
    const missing = [
      !month && !name.trim() && t('savings.entry.name'),
      (amount === null || (!pot && amount <= 0)) && t('savings.entry.amount'),
    ].filter((field): field is string => Boolean(field));
    if (missing.length > 0) {
      fail(t('savings.entry.missing', { fields: missing.join(', ') }));
      return;
    }
    if (!month && toIsoDate(day) > today) {
      fail(t('savings.entry.future'));
      return;
    }
    if (pot) {
      const allowed = canChangePot({ pots, moves, potId: pot.id, newAmount: amount });
      if (!allowed.ok) {
        fail(
          allowed.reason === 'zero'
            ? t('savings.entry.zero', { amount: formatCurrency(0) })
            : t('savings.entry.inGoals', { amount: formatCurrency(allowed.inGoals) }),
        );
        return;
      }
    }

    try {
      await save.mutateAsync({
        id: pot?.id ?? null,
        label: month ? null : name.trim(),
        amount: amount ?? 0,
        addedOn: month ? null : toIsoDate(day),
        note: note.trim(),
      });
      success();
      toast(pot ? 'toast.savings.updated' : 'toast.savings.added');
      goBack();
    } catch (thrown) {
      const refusal = savingsRefusal(thrown);
      // Removed on another phone while this was open: nothing to change, and nothing wrong. Straight
      // to Savings, past its own page, which has nothing left to show.
      if (refusal?.kind === 'gone') {
        router.dismissTo('/savings');
        return;
      }
      fail(refusalLine(refusal) ?? failureMessage(thrown));
    }
  };

  const handleRemove = async () => {
    if (!pot || remove.isPending) return;
    setError(null);
    const allowed = canChangePot({ pots, moves, potId: pot.id, newAmount: null });
    if (!allowed.ok) {
      fail(t('savings.entry.inGoals', { amount: formatCurrency(allowed.inGoals) }));
      return;
    }
    const ok = await confirm({
      title: t('savings.entry.removeTitle', { name: potTitle(pot) }),
      message: t('savings.entry.removeBody', { amount: shortMoney(pot.amount) }),
      confirmLabel: t('savings.entry.remove'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(pot.id);
      toast('toast.savings.removed', 'deleted');
      // Its own page is gone with it, so this lands on Savings.
      router.dismissTo('/savings');
    } catch (thrown) {
      const refusal = savingsRefusal(thrown);
      if (refusal?.kind === 'gone') {
        router.dismissTo('/savings');
        return;
      }
      fail(refusalLine(refusal) ?? failureMessage(thrown));
    }
  };

  const title = pot ? t('savings.entry.editTitle') : t('savings.entry.addTitle');

  return (
    <Screen
      title={title}
      showBack
      avoidKeyboard
      footer={
        <View className="w-full">
          {error ? (
            <Text
              testID="entry-error"
              className="mb-3 text-center font-app text-[13px] text-danger"
              maxFontSizeMultiplier={TEXT_CAP.reading}
            >
              {error}
            </Text>
          ) : null}
          <Button
            label={
              save.isPending
                ? t('savings.entry.saving')
                : pot
                  ? t('savings.entry.saveChanges')
                  : t('savings.entry.add')
            }
            onPress={handleSave}
            disabled={save.isPending}
          />
        </View>
      }
    >
      {pot && month ? (
        <View className="mt-1 w-full items-center">
          <Text
            className="text-center font-app-semibold text-[15px] text-ink"
            maxFontSizeMultiplier={TEXT_CAP.row}
          >
            {potTitle(pot)}
          </Text>
          <Text
            className="mt-[2px] text-center font-app text-[13px] text-muted"
            maxFontSizeMultiplier={TEXT_CAP.row}
          >
            {potDetail(pot)}
          </Text>
          <Text
            className="mt-[10px] text-center font-app text-[14px] leading-5 text-muted"
            maxFontSizeMultiplier={TEXT_CAP.reading}
          >
            {t('savings.entry.monthSubtitle')}
          </Text>
        </View>
      ) : null}
      {!pot ? (
        <Text
          className="mt-1 w-full text-center font-app text-[14px] leading-5 text-muted"
          maxFontSizeMultiplier={TEXT_CAP.reading}
        >
          {t('savings.entry.addSubtitle')}
        </Text>
      ) : null}

      {!month ? (
        <TextField
          className="mt-6"
          filled
          label={t('savings.entry.name')}
          value={name}
          onChangeText={(next) => {
            setError(null);
            setName(next.slice(0, LABEL_MAX));
          }}
          placeholder={t('savings.entry.namePlaceholder')}
          autoCapitalize="sentences"
          returnKeyType="next"
        />
      ) : null}

      <View className="mt-6 w-full">
        <CurrencyField
          filled
          label={t('savings.entry.amount')}
          value={draft}
          onChange={(next) => {
            setError(null);
            setDraft(next);
          }}
          placeholder="0"
        />
      </View>

      {!month ? (
        <View className="mt-6 w-full">
          <LoanCard>
            <FitRows className="w-full" testID="entry-day">
              <LoanCardRow
                id="day"
                first
                label={t('savings.entry.date')}
                value={formatFullDate(day)}
                onPress={() => setPickingDay(true)}
              />
            </FitRows>
          </LoanCard>
        </View>
      ) : null}

      {pot ? (
        <TextField
          className="mt-6"
          filled
          optional
          label={t('savings.entry.note')}
          value={note}
          onChangeText={(next) => {
            setError(null);
            setNote(next.slice(0, NOTE_MAX));
          }}
          placeholder={t('savings.entry.notePlaceholder')}
          autoCapitalize="sentences"
          returnKeyType="done"
        />
      ) : null}

      {pot ? (
        <QuietAction
          className="mb-4 mt-8"
          tone="danger"
          label={t('savings.entry.remove')}
          onPress={handleRemove}
          disabled={remove.isPending}
          testID="entry-remove"
        />
      ) : null}

      {pickingDay ? (
        <DatePicker
          value={day}
          onCancel={() => setPickingDay(false)}
          onConfirm={(picked) => {
            setError(null);
            setDay(picked);
            setPickingDay(false);
          }}
        />
      ) : null}
    </Screen>
  );
}
