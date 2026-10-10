import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Pencil,
  Plus,
  Trash2,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useId, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { InlineCalendar } from '@/components/flow/inline-calendar';
import { AmountBox } from '@/components/salary/amount-box';
import { PayRow } from '@/components/salary/pay-row';
import { SalaryTotalCard } from '@/components/salary/salary-total-card';
import { AmountPad } from '@/components/ui/amount-pad';
import { Button } from '@/components/ui/button';
import { CalculatorPad } from '@/components/ui/calculator-pad';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { FitFigure } from '@/components/ui/fit-group';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { TogglePill } from '@/components/ui/toggle-pill';
import { FieldLabel } from '@/components/ui/typography';
import {
  useCreateSalarySource,
  useDeleteSalarySource,
  useSetSalaryAccounts,
  useUpdateSalarySource,
  type SalaryValues,
} from '@/api/mutations';
import { recordDuePay, usePastPay, type CarriedPay } from '@/api/pay';
import { useBankAccounts, useSalaryDetails } from '@/api/queries';
import { PageState } from '@/components/ui/page-state';
import { type SalarySource } from '@/data/salary';
import { t } from '@/i18n';
import {
  PAY_FREQUENCIES,
  formatFullDate,
  getNextPayday,
  toIsoDate,
  type PayFrequency,
} from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { landingAccount, oneOffsInMonth, scheduledPerMonth, type PayLine } from '@/lib/pay';
import { toCents } from '@/lib/money';
import { useToday } from '@/lib/use-today';
import { useConfirm } from '@/providers/dialog-provider';
import { useToast } from '@/providers/toast-context';
import { useUserId } from '@/providers/session-provider';
import { useColors } from '@/providers/theme-provider';
import { failureMessage, failureText } from '@/lib/failure';
import { OVERTIME_RATES, estimateHourlyPay, hourlyProblem, type HourlyPay } from '@/lib/hourly-pay';
import { accountLabel } from '@/lib/account-label';
import { onPaidIntoPicked } from '@/lib/paid-into-pick';
import { useNavigateOnce } from '@/lib/use-navigate-once';
import { useArtwork } from '@/theme/artwork';
import { TEXT_CAP } from '@/theme/text-scale';

/** Labels are read when drawn, never at import, so they follow the language on screen. */
const PAY_TYPES = [
  {
    value: 'fixed',
    get label() {
      return t('salary.payType.fixed');
    },
  },
  {
    value: 'hourly',
    get label() {
      return t('salary.payType.hourly');
    },
  },
] as const;

const OVERTIME_CHOICES = [
  {
    value: 'none',
    get label() {
      return t('salary.overtime.none');
    },
  },
  {
    value: 'yes',
    get label() {
      return t('common.yes');
    },
  },
] as const;

/** Hours as typed. A comma is a decimal point to half the world. */
function parseHours(text: string | undefined): number {
  const value = Number((text ?? '').trim().replace(',', '.'));
  return Number.isFinite(value) ? value : 0;
}

function hourlyOf(source: SalarySource): HourlyPay {
  return {
    rate: source.hourlyRate ?? 0,
    hoursPerWeek: parseHours(source.hoursPerWeek),
    overtimeHoursPerWeek: source.overtime ? parseHours(source.overtimeHours) : 0,
    overtimeMultiplier: source.overtimeMultiplier ?? 1.5,
    // No tax field: hourly pay is counted before tax, and the estimate says so.
    deductionPercent: 0,
    frequency: source.frequency,
  };
}

/** What lands each payday: typed in when fixed, worked out when hourly. */
function paycheckOf(source: SalarySource): number {
  if (source.payType !== 'hourly') return source.amount;
  const pay = hourlyOf(source);
  return hourlyProblem(pay) ? 0 : estimateHourlyPay(pay).takeHomePerPaycheck;
}

/**
 * What Save writes: a source with a name and its pay. An hourly source counts once named, its pay
 * checked on Save with a reason; a one-off pay needs no name, as it shows as income on its day.
 */
function keptOnSave(source: SalarySource): boolean {
  return (
    Boolean(source.name.trim() || source.frequency === 'once') &&
    (source.payType === 'hourly' || source.amount > 0)
  );
}

/** The source as the shared income maths reads it. */
function payLineOf(source: SalarySource): PayLine {
  return { amount: paycheckOf(source), frequency: source.frequency, payday: source.lastPayday };
}

/** A one-off pay that landed before this month: kept, and shown in Activity, not in the editor. */
function earlierOneOff(frequency: PayFrequency, payday: string | null, today: string): boolean {
  return frequency === 'once' && Boolean(payday) && payday!.slice(0, 7) < today.slice(0, 7);
}

/** The hourly columns as saved: emptied out for a fixed source. */
function hourlyValues(source: SalarySource): Partial<SalaryValues> {
  if (source.payType !== 'hourly') {
    return {
      pay_type: 'fixed',
      hourly_rate: null,
      hours_per_week: null,
      overtime_hours_per_week: 0,
      overtime_multiplier: 1.5,
      deduction_percent: 0,
    };
  }
  const pay = hourlyOf(source);
  return {
    pay_type: 'hourly',
    hourly_rate: pay.rate,
    hours_per_week: pay.hoursPerWeek,
    overtime_hours_per_week: pay.overtimeHoursPerWeek,
    overtime_multiplier: pay.overtimeMultiplier,
    deduction_percent: 0,
  };
}

type PadTarget = {
  sourceId: string;
  mode: 'pad' | 'calculator';
  field: 'amount' | 'rate';
} | null;

/** Dates cross this screen as yyyy-mm-dd; the picker wants a Date. */
function asDate(iso: string | null | undefined): Date | null {
  return iso ? new Date(`${iso}T00:00:00`) : null;
}

/**
 * Loads what exists, then hands it to the editor as initial state. The editor is keyed on the saved
 * ids so it remounts when data lands: seeding state from an effect fights mid-typing edits.
 */
export default function SalaryScreen() {
  const colors = useColors();
  const artwork = useArtwork();
  const details = useSalaryDetails();
  const { today } = useToday();
  const rows = details.data?.rows ?? [];
  // Every pay as it comes would grow this page without end: earlier months' one-off pays wait
  // behind one row until asked for, and the editor never deletes what it does not show.
  const saved = rows.filter((row) => !earlierOneOff(row.frequency, row.last_payday, today));
  const earlier = rows
    .filter((row) => earlierOneOff(row.frequency, row.last_payday, today))
    .sort((a, b) => (b.last_payday ?? '').localeCompare(a.last_payday ?? ''));

  if (details.isPending) {
    return (
      <Screen title={t('salary.title')} showBack>
        <View className="mt-16 w-full items-center">
          <ActivityIndicator size="small" color={colors.muted} />
        </View>
      </Screen>
    );
  }

  // Never an empty editor on failure: Save from there would delete every source.
  if (details.isError) {
    return (
      <Screen title={t('salary.title')} showBack>
        <PageState
          art={artwork.error}
          title={failureText()}
          actionLabel={t('common.tryAgain')}
          onAction={() => void details.refetch()}
        />
      </Screen>
    );
  }

  const toSource = (row: (typeof rows)[number]): SalarySource => ({
    id: row.id,
    name: row.name,
    amount: row.amount,
    frequency: row.frequency,
    lastPayday: row.last_payday,
    // The links as saved: Save rewrites them, so starting empty would unlink every account.
    accountIds: row.account_ids,
    payType: row.pay_type,
    hourlyRate: row.hourly_rate ?? 0,
    hoursPerWeek: row.hours_per_week ? String(row.hours_per_week) : '',
    overtime: row.overtime_hours_per_week > 0,
    overtimeHours: row.overtime_hours_per_week > 0 ? String(row.overtime_hours_per_week) : '',
    overtimeMultiplier: row.overtime_multiplier || 1.5,
  });

  return (
    <SalaryEditor
      key={saved.map((row) => row.id).join('|') || 'empty'}
      initial={saved.map(toSource)}
      earlier={earlier.map(toSource)}
      hourlyAvailable={details.data?.hourlyAvailable ?? false}
    />
  );
}

function SalaryEditor({
  initial,
  earlier,
  hourlyAvailable,
}: {
  initial: SalarySource[];
  /** One-off pays from earlier months, newest first: saved, and shown only when asked for. */
  earlier: SalarySource[];
  /** False until the database has the hourly columns; fixed pay only until then. */
  hourlyAvailable: boolean;
}) {
  const colors = useColors();
  // Names this editor to the Paid into page, so the account picked there comes back here.
  const editorId = useId();
  const navigateOnce = useNavigateOnce();
  const [sources, setSources] = useState<SalarySource[]>(initial);
  const [padTarget, setPadTarget] = useState<PadTarget>(null);
  // One row control open at a time: a source's frequency choices or its calendar.
  const [open, setOpen] = useState<{ id: string; panel: 'frequency' | 'payday' } | null>(null);
  // Earlier months' one-off pays open folded, so a long run of them stays short until one is wanted.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  // A name is a field while there is none to show, and while it is being renamed.
  const [naming, setNaming] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      initial.filter((source) => !source.name.trim()).map((source) => [source.id, true]),
    ),
  );
  const [focusName, setFocusName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Monotonic so ids stay unique even after sources are removed.
  const nextId = useRef(initial.length + 1);
  // Ids in the database: anything else on screen is new, and any missing from screen was removed.
  const savedIds = useRef(new Set(initial.map((source) => source.id)));
  // Each pay as the database holds it, for what a change of frequency really is.
  const savedPays = useRef(new Map(initial.map((source) => [source.id, source])));
  const [earlierShown, setEarlierShown] = useState(false);

  const showEarlier = () => {
    for (const source of earlier) {
      savedIds.current.add(source.id);
      savedPays.current.set(source.id, source);
    }
    setCollapsed((current) => ({
      ...current,
      ...Object.fromEntries(earlier.map((source) => [source.id, true])),
    }));
    setNaming((current) => ({
      ...current,
      ...Object.fromEntries(
        earlier.filter((source) => !source.name.trim()).map((source) => [source.id, true]),
      ),
    }));
    setSources((current) => [...current, ...earlier]);
    setEarlierShown(true);
  };

  const { data: accounts = [] } = useBankAccounts();
  // The account the pay lands in: of several saved links, the first in account order.
  const landingOf = (source: SalarySource) =>
    accounts.find((account) => source.accountIds.includes(account.id)) ?? null;

  useEffect(
    () =>
      onPaidIntoPicked((pick) => {
        if (pick.editor !== editorId) return;
        setSources((current) =>
          current.map((source) =>
            source.id === pick.source
              ? { ...source, accountIds: pick.accountId ? [pick.accountId] : [] }
              : source,
          ),
        );
      }),
    [editorId],
  );

  const createSource = useCreateSalarySource();
  const updateSource = useUpdateSalarySource();
  const deleteSource = useDeleteSalarySource();
  const confirm = useConfirm();
  const setAccounts = useSetSalaryAccounts();
  const pastPay = usePastPay();
  const toast = useToast();
  const client = useQueryClient();
  const userId = useUserId();

  const { today } = useToday();
  const pays = sources.map(payLineOf);
  const monthlyTotal = scheduledPerMonth(pays);
  const onceThisMonth = oneOffsInMonth(pays, today).reduce((sum, pay) => sum + pay.amount, 0);
  // Only what Save would keep: a source just added and still blank is not one yet.
  const schedules = sources.filter((source) => source.frequency !== 'once' && keptOnSave(source));
  const nextPayday =
    schedules
      .filter((source) => source.lastPayday)
      .map((source) => toIsoDate(getNextPayday(asDate(source.lastPayday)!, source.frequency)))
      .sort()[0] ?? null;

  const update = (id: string, patch: Partial<SalarySource>) => {
    setSources((current) =>
      current.map((source) => (source.id === id ? { ...source, ...patch } : source)),
    );
  };

  const addSource = () => {
    const id = `salary-${nextId.current++}`;
    setNaming((current) => ({ ...current, [id]: true }));
    setSources((current) => [
      ...current,
      {
        id,
        name: '',
        amount: 0,
        frequency: 'monthly',
        lastPayday: null,
        accountIds: [],
        payType: 'fixed',
        hourlyRate: 0,
        hoursPerWeek: '',
        overtime: false,
        overtimeHours: '',
        overtimeMultiplier: 1.5,
      },
    ]);
  };

  // A name typed in becomes the card's title once the field is left; an empty one stays a field.
  const finishNaming = (source: SalarySource) => {
    if (source.name.trim()) setNaming((current) => ({ ...current, [source.id]: false }));
  };

  const toggle = (id: string, panel: 'frequency' | 'payday') =>
    setOpen((current) => (current?.id === id && current.panel === panel ? null : { id, panel }));

  const changeFrequency = (source: SalarySource, frequency: PayFrequency) => {
    const held = savedPays.current.get(source.id);
    let lastPayday = source.lastPayday;
    // A pay just this time is usually the one that landed today; back on its schedule, a saved pay
    // gets its own last payday again.
    if (frequency === 'once' && source.frequency !== 'once') lastPayday = today;
    else if (
      frequency !== 'once' &&
      source.frequency === 'once' &&
      held &&
      held.frequency !== 'once'
    )
      lastPayday = held.lastPayday;
    update(source.id, { frequency, lastPayday });
  };

  // Removing a source drops its income from every projection, so it asks first. The row is deleted
  // on Save, not on the tap.
  const removeSource = async (id: string) => {
    const source = sources.find((row) => row.id === id);
    const name = source?.name.trim();

    const ok = await confirm({
      title: name ? t('salary.remove.title', { name }) : t('salary.remove.titleUnnamed'),
      message: t('salary.remove.message'),
      confirmLabel: t('common.remove'),
      cancelLabel: t('salary.remove.keep'),
      destructive: true,
    });
    if (!ok) return;

    setSources((current) => current.filter((row) => row.id !== id));
  };

  const activeSource = sources.find((source) => source.id === padTarget?.sourceId);

  const handleSave = async () => {
    setError(null);
    const named = sources.filter(keptOnSave);
    if (sources.length > 0 && named.length === 0) {
      setError(t('salary.needNameAndPay'));
      return;
    }
    // A saved pay left without a name would be dropped, and so deleted, on Save: ask for it instead.
    if (sources.some((source) => savedIds.current.has(source.id) && !named.includes(source))) {
      setError(t('salary.needNameAndPay'));
      return;
    }
    for (const source of named) {
      if (source.payType !== 'hourly') continue;
      const problem = hourlyProblem(hourlyOf(source));
      if (problem) {
        setError(
          t('salary.sourceProblem', {
            name: source.name.trim() || t('salary.oneOffNumber'),
            problem,
          }),
        );
        return;
      }
    }
    // Paydays are counted forward from the last one; without it the income never lands anywhere.
    const undated = named.find((source) => !source.lastPayday);
    if (undated) {
      setError(undated.frequency === 'once' ? t('salary.needPaidOn') : t('salary.needLastPayday'));
      return;
    }

    try {
      // Pay that has already come due is written down as it was, before any change below can
      // reprice it, and before a removed salary takes its unwritten paydays with it.
      if (userId && (await recordDuePay(userId, today)) > 0) {
        client.invalidateQueries({ queryKey: ['pay_received'] });
      }

      // A changed name, amount or account reaches pay already received only if the person says so.
      const accountOrder = accounts.map((account) => account.id);
      const carried = (source: SalarySource): CarriedPay => ({
        label: source.name.trim(),
        amount: paycheckOf(source),
        bank_account_id: landingAccount(source.accountIds, accountOrder),
      });
      const carryBack = new Map<string, CarriedPay>();
      for (const source of named) {
        const before = savedPays.current.get(source.id);
        if (!before || !savedIds.current.has(source.id)) continue;
        const was = carried(before);
        const now = carried(source);
        if (
          was.label === now.label &&
          toCents(was.amount) === toCents(now.amount) &&
          was.bank_account_id === now.bank_account_id
        ) {
          continue;
        }
        const scope = await pastPay.choose(source.id, now.label || t('salary.oneOffNumber'));
        if (scope === null) return;
        if (scope === 'all') carryBack.set(source.id, now);
      }

      // Deletes first, so a delete plus a re-add of the same name cannot collide.
      const stillPresent = new Set(named.map((source) => source.id));
      for (const id of savedIds.current) {
        if (!stillPresent.has(id)) await deleteSource.mutateAsync(id);
      }

      for (const source of named) {
        const values: SalaryValues = {
          name: source.name.trim(),
          amount: paycheckOf(source),
          frequency: source.frequency,
          last_payday: source.lastPayday,
          ...(hourlyAvailable ? hourlyValues(source) : {}),
        };
        const id = savedIds.current.has(source.id)
          ? (await updateSource.mutateAsync({ id: source.id, values }), source.id)
          : (await createSource.mutateAsync(values)).id;

        await setAccounts.mutateAsync({ salaryId: id, accountIds: source.accountIds });
      }

      for (const [id, values] of carryBack) await pastPay.apply(id, values);

      toast('toast.pay.saved');
      router.back();
    } catch (thrown) {
      setError(failureMessage(thrown));
    }
  };

  return (
    <Screen
      title={t('salary.title')}
      showBack
      avoidKeyboard
      footer={
        <View className="w-full">
          {error ? (
            <Text
              className="mb-3 w-full text-center font-app text-[13px] text-danger"
              maxFontSizeMultiplier={TEXT_CAP.reading}
            >
              {error}
            </Text>
          ) : null}
          <Button
            label={createSource.isPending ? t('salary.saving') : t('common.save')}
            onPress={handleSave}
          />
        </View>
      }
    >
      <SalaryTotalCard
        total={monthlyTotal}
        onceThisMonth={onceThisMonth}
        nextPayday={nextPayday}
        sources={schedules.length}
      />

      <View className="mt-4 w-full gap-4">
        {sources.map((source, index) => {
          const once = source.frequency === 'once';
          const name = source.name.trim();
          const folded = collapsed[source.id];
          const nameField = !folded && (naming[source.id] || !name);
          const hourly = source.payType === 'hourly';
          const paycheck = paycheckOf(source);
          const landing = landingOf(source);
          const frequencyOpen = open?.id === source.id && open.panel === 'frequency';
          const paydayOpen = open?.id === source.id && open.panel === 'payday';

          return (
            <View
              key={source.id}
              className="w-full rounded-[20px] border border-line bg-card px-[18px] pb-[6px] pt-[18px]"
            >
              <View className="w-full flex-row items-start justify-between gap-3">
                <View className="min-w-0 flex-1">
                  <Text
                    className="font-app text-[13px] text-muted"
                    maxFontSizeMultiplier={TEXT_CAP.row}
                  >
                    {once
                      ? t('salary.oneOffNumber')
                      : t('salary.sourceNumber', {
                          number: sources
                            .slice(0, index + 1)
                            .filter((other) => other.frequency !== 'once').length,
                        })}
                  </Text>
                  {folded ? (
                    <Text
                      className="mt-0.5 font-app-semibold text-[15px] text-ink"
                      maxFontSizeMultiplier={TEXT_CAP.row}
                    >
                      {[
                        name || null,
                        paycheck ? formatCurrency(paycheck) : null,
                        hourly ? t('salary.payType.hourly') : null,
                        source.lastPayday ? formatFullDate(asDate(source.lastPayday)!) : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  ) : nameField ? null : (
                    <Text
                      className="mt-0.5 font-app-bold text-[17px] text-ink"
                      maxFontSizeMultiplier={TEXT_CAP.row}
                    >
                      {name}
                    </Text>
                  )}
                </View>

                <View className="flex-row items-center gap-2">
                  {folded ? (
                    <CircleButton
                      icon={ChevronDown}
                      label={t('salary.expandSource', { number: index + 1 })}
                      expanded={false}
                      onPress={() =>
                        setCollapsed((current) => ({ ...current, [source.id]: false }))
                      }
                    />
                  ) : nameField ? null : (
                    <CircleButton
                      icon={Pencil}
                      label={t('salary.rename', { name })}
                      onPress={() => {
                        setFocusName(source.id);
                        setNaming((current) => ({ ...current, [source.id]: true }));
                      }}
                    />
                  )}
                  <CircleButton
                    icon={Trash2}
                    label={t('salary.removeSource', { number: index + 1 })}
                    onPress={() => void removeSource(source.id)}
                  />
                </View>
              </View>

              {folded ? (
                <View className="h-[12px]" />
              ) : (
                <View className="mt-4 w-full gap-4">
                  {nameField ? (
                    <TextField
                      label={t('salary.name')}
                      value={source.name}
                      onChangeText={(text) => update(source.id, { name: text })}
                      // A one-off pay shows as income on its day without one.
                      optional={once}
                      autoCapitalize="words"
                      returnKeyType="done"
                      autoFocus={focusName === source.id}
                      onSubmitEditing={() => finishNaming(source)}
                      onBlur={() => finishNaming(source)}
                    />
                  ) : null}

                  {hourlyAvailable ? (
                    <TogglePill
                      tone="segment"
                      options={PAY_TYPES}
                      value={source.payType ?? 'fixed'}
                      onChange={(payType) => update(source.id, { payType })}
                    />
                  ) : null}

                  {hourly ? (
                    <>
                      <AmountBox
                        label={t('salary.hourlyRate')}
                        value={
                          source.hourlyRate
                            ? t('salary.perHour', { amount: formatCurrency(source.hourlyRate) })
                            : ''
                        }
                        placeholder={t('salary.hourlyRatePlaceholder')}
                        onPress={() =>
                          setPadTarget({ sourceId: source.id, mode: 'pad', field: 'rate' })
                        }
                      />

                      <TextField
                        label={once ? t('salary.hoursWorked') : t('salary.hoursAWeek')}
                        value={source.hoursPerWeek ?? ''}
                        onChangeText={(text) => update(source.id, { hoursPerWeek: text })}
                        placeholder="40"
                        keyboardType="decimal-pad"
                        maxLength={5}
                        trailing={<HoursUnit />}
                      />

                      <View className="w-full">
                        <FieldLabel className="mb-2">{t('salary.overtime')}</FieldLabel>
                        <ChoiceChips
                          options={OVERTIME_CHOICES}
                          value={source.overtime ? 'yes' : 'none'}
                          onChange={(choice) => update(source.id, { overtime: choice === 'yes' })}
                        />
                      </View>

                      {source.overtime ? (
                        <>
                          <TextField
                            label={once ? t('salary.overtimeWorked') : t('salary.overtimeHours')}
                            value={source.overtimeHours ?? ''}
                            onChangeText={(text) => update(source.id, { overtimeHours: text })}
                            placeholder="5"
                            keyboardType="decimal-pad"
                            maxLength={5}
                            trailing={<HoursUnit />}
                          />
                          <View className="w-full">
                            <FieldLabel className="mb-2">{t('salary.overtimePays')}</FieldLabel>
                            <ChoiceChips
                              options={OVERTIME_RATES}
                              value={String(source.overtimeMultiplier ?? 1.5) as '1.5' | '2'}
                              onChange={(rate) =>
                                update(source.id, { overtimeMultiplier: Number(rate) })
                              }
                            />
                          </View>
                        </>
                      ) : null}

                      <HourlyEstimateCard source={source} />
                    </>
                  ) : (
                    <AmountBox
                      label={t('salary.amount')}
                      value={source.amount ? formatCurrency(source.amount) : ''}
                      placeholder={t('salary.enterAmount')}
                      onPress={() =>
                        setPadTarget({ sourceId: source.id, mode: 'pad', field: 'amount' })
                      }
                      onCalculator={() =>
                        setPadTarget({ sourceId: source.id, mode: 'calculator', field: 'amount' })
                      }
                      calculatorLabel={t('salary.openCalculator')}
                    />
                  )}

                  <View className="w-full">
                    <PayRow
                      label={t('salary.howOften')}
                      value={
                        PAY_FREQUENCIES.find((option) => option.value === source.frequency)
                          ?.label ?? ''
                      }
                      icon={frequencyOpen ? ChevronUp : ChevronDown}
                      expanded={frequencyOpen}
                      hint={t('salary.showChoices')}
                      onPress={() => toggle(source.id, 'frequency')}
                    >
                      {frequencyOpen ? (
                        <View className="w-full pb-4">
                          <ChoiceChips
                            options={PAY_FREQUENCIES}
                            value={source.frequency}
                            onChange={(frequency) => {
                              changeFrequency(source, frequency);
                              setOpen(null);
                            }}
                          />
                        </View>
                      ) : null}
                    </PayRow>

                    <PayRow
                      label={once ? t('salary.paidOn') : t('salary.lastPayday')}
                      note={
                        !source.lastPayday
                          ? undefined
                          : once
                            ? t('salary.countsThisMonth')
                            : t('salary.nextPayday', {
                                date: formatFullDate(
                                  getNextPayday(asDate(source.lastPayday)!, source.frequency),
                                ),
                              })
                      }
                      value={
                        source.lastPayday
                          ? formatFullDate(asDate(source.lastPayday)!)
                          : once
                            ? t('salary.paidOnPlaceholder')
                            : t('salary.lastPaydayPlaceholder')
                      }
                      empty={!source.lastPayday}
                      icon={Calendar}
                      expanded={paydayOpen}
                      hint={t('salary.showCalendar')}
                      onPress={() => toggle(source.id, 'payday')}
                    >
                      {paydayOpen ? (
                        <View className="w-full pb-4">
                          <InlineCalendar
                            value={asDate(source.lastPayday)}
                            onChange={(date) => {
                              update(source.id, { lastPayday: toIsoDate(date) });
                              setOpen(null);
                            }}
                          />
                        </View>
                      ) : null}
                    </PayRow>

                    {/* One account: pay lands in it on each payday, so it cannot land in two. A
                        salary saved with several shows the one its pay lands in. */}
                    <PayRow
                      last
                      label={t('salary.paidInto')}
                      value={landing ? accountLabel(landing) : t('salary.noAccount')}
                      empty={!landing}
                      leading={
                        landing ? (
                          <View
                            style={{ backgroundColor: landing.color }}
                            className="h-6 w-6 rounded-[6px] border border-ink/10"
                          />
                        ) : null
                      }
                      icon={ChevronRight}
                      hint={t('salary.paidIntoHint')}
                      onPress={() =>
                        navigateOnce(() =>
                          router.push({
                            pathname: '/salary-paid-into',
                            params: {
                              editor: editorId,
                              source: source.id,
                              selected: landing?.id ?? '',
                            },
                          }),
                        )
                      }
                    >
                      {landing ? null : (
                        <Text
                          className="-mt-1 w-full pb-3 font-app text-[13px] text-muted"
                          maxFontSizeMultiplier={TEXT_CAP.reading}
                        >
                          {t('salary.linkAccountHint')}
                        </Text>
                      )}
                    </PayRow>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {earlier.length > 0 && !earlierShown ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('salary.earlierOneOffs', { count: earlier.length })}
          accessibilityHint={t('salary.earlierHint')}
          onPress={showEarlier}
          className="mt-4 min-h-14 w-full flex-row items-center justify-between gap-3 rounded-[16px] border border-line bg-card px-4 active:bg-ink/5"
        >
          <Text
            className="min-w-0 flex-1 font-app-medium text-[14px] text-ink"
            maxFontSizeMultiplier={TEXT_CAP.row}
          >
            {t('salary.earlierOneOffs', { count: earlier.length })}
          </Text>
          <ChevronDown size={18} color={colors.muted} strokeWidth={2} />
        </Pressable>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('salary.addSource')}
        onPress={addSource}
        className="mb-4 mt-4 min-h-14 w-full flex-row items-center justify-center gap-2 rounded-full border border-line active:bg-ink/5"
      >
        <Plus size={18} color={colors.accentInk} strokeWidth={1.8} />
        <Text
          className="shrink text-center font-app-medium text-[14px] text-accent-ink"
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {t('salary.addSource')}
        </Text>
      </Pressable>

      {padTarget && activeSource && padTarget.field === 'rate' ? (
        <AmountPad
          title={t('salary.hourlyRate')}
          caption={t('salary.ratePadCaption')}
          value={activeSource.hourlyRate ? String(activeSource.hourlyRate) : ''}
          onCancel={() => setPadTarget(null)}
          onConfirm={(next) => {
            update(activeSource.id, { hourlyRate: Number(next) || 0 });
            setPadTarget(null);
          }}
        />
      ) : null}

      {padTarget && activeSource && padTarget.field === 'amount' ? (
        padTarget.mode === 'calculator' ? (
          <CalculatorPad
            value={activeSource.amount ? String(activeSource.amount) : ''}
            onCancel={() => setPadTarget(null)}
            onConfirm={(next) => {
              update(activeSource.id, { amount: Number(next) || 0 });
              setPadTarget(null);
            }}
          />
        ) : (
          <AmountPad
            title={t('salary.amountPadTitle')}
            caption={
              PAY_FREQUENCIES.find((option) => option.value === activeSource.frequency)?.caption ??
              t('salary.eachPayPeriod')
            }
            value={activeSource.amount ? String(activeSource.amount) : ''}
            onCancel={() => setPadTarget(null)}
            onConfirm={(next) => {
              update(activeSource.id, { amount: Number(next) || 0 });
              setPadTarget(null);
            }}
          />
        )
      ) : null}
    </Screen>
  );
}

/** A source card's round header button: rename, unfold or remove. */
function CircleButton({
  icon: Icon,
  label,
  onPress,
  expanded,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  expanded?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={expanded === undefined ? undefined : { expanded }}
      // 36pt plus 4pt all round clears the 44pt target floor.
      hitSlop={4}
      onPress={onPress}
      className="h-9 w-9 items-center justify-center rounded-full bg-ink/5 active:bg-ink/10"
    >
      <Icon size={17} color={colors.body} strokeWidth={1.8} />
    </Pressable>
  );
}

function HoursUnit() {
  return (
    <Text className="font-app text-[14px] text-muted" maxFontSizeMultiplier={TEXT_CAP.row}>
      {t('salary.hoursUnit')}
    </Text>
  );
}

/** The hourly estimate as typed: each paycheck and the month it adds up to, shown as before tax. */
function HourlyEstimateCard({ source }: { source: SalarySource }) {
  const pay = hourlyOf(source);
  const problem = hourlyProblem(pay);

  if (problem) {
    return (
      <View className="w-full rounded-[16px] bg-accent/10 px-4 py-3.5">
        <Text className="font-app text-[13px] text-muted" maxFontSizeMultiplier={TEXT_CAP.reading}>
          {problem}
        </Text>
      </View>
    );
  }

  const estimate = estimateHourlyPay(pay);
  const once = source.frequency === 'once';
  const perMonth = scheduledPerMonth([
    { amount: estimate.grossPerPaycheck, frequency: source.frequency, payday: null },
  ]);

  return (
    <View
      accessible
      accessibilityLabel={
        once
          ? `${t('salary.thisPay')}: ${formatCurrency(estimate.grossPerPaycheck)}. ${t('salary.countsThisMonth')}`
          : t('salary.estimateA11y', {
              paycheck: formatCurrency(estimate.grossPerPaycheck),
              perMonth: formatCurrency(perMonth),
            })
      }
      className="w-full rounded-[16px] bg-accent/10 px-4 py-3.5"
    >
      <Text className="font-app text-[13px] text-muted" maxFontSizeMultiplier={TEXT_CAP.control}>
        {once ? t('salary.thisPay') : t('salary.eachPaycheck')}
      </Text>
      <FitFigure
        id="paycheck"
        size={22}
        className="font-app-semibold text-ink"
        boxClassName="mt-0.5"
      >
        {formatCurrency(estimate.grossPerPaycheck)}
      </FitFigure>
      <Text
        className="mt-1 font-app text-[13px] text-muted"
        maxFontSizeMultiplier={TEXT_CAP.reading}
      >
        {once
          ? t('salary.countsThisMonth')
          : t('salary.aboutPerMonth', { amount: formatCurrency(perMonth) })}
      </Text>
    </View>
  );
}
