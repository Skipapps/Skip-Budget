import { router } from 'expo-router';
import { Calculator, Calendar, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { AmountPad } from '@/components/ui/amount-pad';
import { Button } from '@/components/ui/button';
import { CalculatorPad } from '@/components/ui/calculator-pad';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { DatePicker } from '@/components/ui/date-picker';
import { FitFigure } from '@/components/ui/fit-group';
import { MultiChoiceChips } from '@/components/ui/multi-choice-chips';
import { usePro } from '@/api/pro';
import { Screen } from '@/components/ui/screen';
import { SelectField } from '@/components/ui/select-field';
import { TextField } from '@/components/ui/text-field';
import { FieldLabel } from '@/components/ui/typography';
import {
  useCreateSalarySource,
  useDeleteSalarySource,
  useSetSalaryAccounts,
  useUpdateSalarySource,
  type SalaryValues,
} from '@/api/mutations';
import { useBankAccounts, useSalaryDetails } from '@/api/queries';
import { PageState } from '@/components/ui/page-state';
import { type SalarySource } from '@/data/salary-mock';
import { t } from '@/i18n';
import {
  PAY_FREQUENCIES,
  formatFullDate,
  getNextPayday,
  toIsoDate,
  type PayFrequency,
} from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { useConfirm } from '@/providers/dialog-provider';
import { useColors } from '@/providers/theme-provider';
import { failureMessage, failureText } from '@/lib/failure';
import { OVERTIME_RATES, estimateHourlyPay, hourlyProblem, type HourlyPay } from '@/lib/hourly-pay';
import { useArtwork } from '@/theme/artwork';
import { TEXT_CAP } from '@/theme/text-scale';

/** Normalised to monthly so sources on different cycles can be summed. */
const PER_MONTH: Record<PayFrequency, number> = {
  weekly: 52 / 12,
  biweekly: 26 / 12,
  semimonthly: 2,
  monthly: 1,
};

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
  const saved = details.data?.rows ?? [];

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

  const initial: SalarySource[] = saved.map((row) => ({
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
  }));

  return (
    <SalaryEditor
      key={saved.map((row) => row.id).join('|') || 'empty'}
      initial={initial}
      hourlyAvailable={details.data?.hourlyAvailable ?? false}
    />
  );
}

function SalaryEditor({
  initial,
  hourlyAvailable,
}: {
  initial: SalarySource[];
  /** False until the database has the hourly columns; fixed pay only until then. */
  hourlyAvailable: boolean;
}) {
  const colors = useColors();
  const [sources, setSources] = useState<SalarySource[]>(initial);
  const [padTarget, setPadTarget] = useState<PadTarget>(null);
  const [dateTarget, setDateTarget] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  // Monotonic so ids stay unique even after sources are removed.
  const nextId = useRef(initial.length + 1);
  // Ids in the database: anything else on screen is new, and any missing from screen was removed.
  const savedIds = useRef(new Set(initial.map((source) => source.id)));

  const { data: accounts = [] } = useBankAccounts();
  const accountOptions = accounts.map((account) => ({
    value: account.id,
    label: account.last4
      ? `${account.nickname || account.bank_name} ••${account.last4}`
      : account.nickname || account.bank_name,
  }));

  const createSource = useCreateSalarySource();
  const updateSource = useUpdateSalarySource();
  const deleteSource = useDeleteSalarySource();
  const confirm = useConfirm();
  const setAccounts = useSetSalaryAccounts();

  const monthlyTotal = sources.reduce(
    (sum, source) => sum + paycheckOf(source) * PER_MONTH[source.frequency],
    0,
  );

  const update = (id: string, patch: Partial<SalarySource>) => {
    setSources((current) =>
      current.map((source) => (source.id === id ? { ...source, ...patch } : source)),
    );
  };

  const { pro } = usePro();

  const addSource = () => {
    // One income is free; the second is Pro. The database refuses it too, so this just says why.
    if (!pro && sources.length >= 1) {
      router.push({ pathname: '/pro-feature', params: { id: 'unlimited' } });
      return;
    }
    setSources((current) => [
      ...current,
      {
        id: `salary-${nextId.current++}`,
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
    // Hourly sources count once named: their pay is checked below, with a reason.
    const named = sources.filter(
      (source) => source.name.trim() && (source.payType === 'hourly' || source.amount > 0),
    );
    if (sources.length > 0 && named.length === 0) {
      setError(t('salary.needNameAndPay'));
      return;
    }
    for (const source of named) {
      if (source.payType !== 'hourly') continue;
      const problem = hourlyProblem(hourlyOf(source));
      if (problem) {
        setError(t('salary.sourceProblem', { name: source.name.trim(), problem }));
        return;
      }
    }
    // Paydays are counted forward from the last one; without it the income never lands anywhere.
    if (named.some((source) => !source.lastPayday)) {
      setError(t('salary.needLastPayday'));
      return;
    }

    try {
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

      router.back();
    } catch (thrown) {
      setError(failureMessage(thrown));
    }
  };

  return (
    <Screen title={t('salary.title')} showBack avoidKeyboard>
      <View className="mt-3 w-full items-center">
        <Text
          className="text-center font-app text-[13px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.control}
        >
          {t('salary.totalPerMonth')}
        </Text>
        <FitFigure
          id="monthly-total"
          size={24}
          className="text-center font-app-semibold text-ink"
          boxClassName="mt-0.5"
        >
          {formatCurrency(monthlyTotal)}
        </FitFigure>
      </View>

      <View className="mt-6 w-full gap-4">
        {sources.map((source, index) => (
          <View key={source.id} className="w-full rounded-[16px] border border-line bg-card p-4">
            <View className="mb-3 w-full flex-row items-center justify-between gap-3">
              <Text
                className="min-w-0 flex-1 font-app-medium text-[15px] text-ink"
                maxFontSizeMultiplier={TEXT_CAP.heading}
              >
                {t('salary.sourceNumber', { number: index + 1 })}
              </Text>

              <View className="flex-row items-center gap-1">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('salary.removeSource', { number: index + 1 })}
                  hitSlop={8}
                  onPress={() => void removeSource(source.id)}
                  className="h-9 w-9 items-center justify-center rounded-full active:bg-ink/5"
                >
                  <Trash2 size={18} color={colors.muted} strokeWidth={1.8} />
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    collapsed[source.id]
                      ? t('salary.expandSource', { number: index + 1 })
                      : t('salary.collapseSource', { number: index + 1 })
                  }
                  accessibilityState={{ expanded: !collapsed[source.id] }}
                  hitSlop={8}
                  onPress={() =>
                    setCollapsed((current) => ({
                      ...current,
                      [source.id]: !current[source.id],
                    }))
                  }
                  className="h-9 w-9 items-center justify-center rounded-full active:bg-ink/5"
                >
                  {collapsed[source.id] ? (
                    <ChevronDown size={18} color={colors.ink} strokeWidth={2} />
                  ) : (
                    <ChevronUp size={18} color={colors.ink} strokeWidth={2} />
                  )}
                </Pressable>
              </View>
            </View>

            {collapsed[source.id] ? (
              <Text
                className="font-app text-[13px] text-muted"
                maxFontSizeMultiplier={TEXT_CAP.row}
              >
                {[
                  source.name.trim() || t('salary.unnamed'),
                  paycheckOf(source) ? formatCurrency(paycheckOf(source)) : null,
                  source.payType === 'hourly' ? t('salary.payType.hourly') : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            ) : (
              <View className="w-full gap-5">
                <TextField
                  label={t('salary.name')}
                  value={source.name}
                  onChangeText={(text) => update(source.id, { name: text })}
                  autoCapitalize="words"
                  returnKeyType="done"
                />

                {hourlyAvailable ? (
                  <View className="w-full">
                    <FieldLabel className="mb-2">{t('salary.howPaid')}</FieldLabel>
                    <ChoiceChips
                      options={PAY_TYPES}
                      value={source.payType ?? 'fixed'}
                      onChange={(payType) => update(source.id, { payType })}
                    />
                  </View>
                ) : null}

                {source.payType === 'hourly' ? (
                  <>
                    <SelectField
                      label={t('salary.hourlyRate')}
                      value={
                        source.hourlyRate
                          ? t('salary.perHour', { amount: formatCurrency(source.hourlyRate) })
                          : ''
                      }
                      placeholder={t('salary.hourlyRatePlaceholder')}
                      icon={Calculator}
                      variant="pill"
                      onPress={() =>
                        setPadTarget({ sourceId: source.id, mode: 'pad', field: 'rate' })
                      }
                    />

                    <TextField
                      label={t('salary.hoursAWeek')}
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
                          label={t('salary.overtimeHours')}
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
                  </>
                ) : (
                  <SelectField
                    label={t('salary.amount')}
                    value={source.amount ? formatCurrency(source.amount) : ''}
                    placeholder={t('salary.enterAmount')}
                    icon={Calculator}
                    variant="pill"
                    onPress={() =>
                      setPadTarget({ sourceId: source.id, mode: 'pad', field: 'amount' })
                    }
                    onIconPress={() =>
                      setPadTarget({ sourceId: source.id, mode: 'calculator', field: 'amount' })
                    }
                    iconAccessibilityLabel={t('salary.openCalculator')}
                  />
                )}

                <View className="w-full">
                  <FieldLabel className="mb-2">{t('salary.howOften')}</FieldLabel>
                  <ChoiceChips
                    options={PAY_FREQUENCIES}
                    value={source.frequency}
                    onChange={(frequency) => update(source.id, { frequency })}
                  />
                </View>

                {source.payType === 'hourly' ? <HourlyEstimateCard source={source} /> : null}

                <SelectField
                  label={t('salary.lastPayday')}
                  value={source.lastPayday ? formatFullDate(asDate(source.lastPayday)!) : ''}
                  placeholder={t('salary.lastPaydayPlaceholder')}
                  icon={Calendar}
                  variant="pill"
                  onPress={() => setDateTarget(source.id)}
                />

                {source.lastPayday ? (
                  <Text
                    className="-mt-3 ml-4 font-app text-[13px] text-muted"
                    maxFontSizeMultiplier={TEXT_CAP.reading}
                  >
                    {t('salary.nextPayday', {
                      date: formatFullDate(
                        getNextPayday(asDate(source.lastPayday)!, source.frequency),
                      ),
                    })}
                  </Text>
                ) : null}

                <View className="w-full">
                  <FieldLabel className="mb-2">{t('salary.paidInto')}</FieldLabel>
                  <MultiChoiceChips
                    options={accountOptions}
                    values={source.accountIds}
                    onChange={(accountIds) => update(source.id, { accountIds })}
                    emptyHint={t('salary.linkAccountHint')}
                  />
                </View>
              </View>
            )}
          </View>
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('salary.addSource')}
        onPress={addSource}
        className="mt-4 min-h-14 w-full flex-row items-center justify-center gap-2 rounded-full bg-ink/5 active:bg-ink/10"
      >
        <Plus size={18} color={colors.ink} strokeWidth={1.8} />
        <Text
          className="shrink text-center font-app-medium text-[14px] text-ink"
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {t('salary.addSource')}
        </Text>
      </Pressable>

      <View className="mt-auto w-full pt-10">
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

      {dateTarget ? (
        <DatePicker
          value={asDate(sources.find((s) => s.id === dateTarget)?.lastPayday) ?? new Date()}
          onCancel={() => setDateTarget(null)}
          onConfirm={(date) => {
            update(dateTarget, { lastPayday: toIsoDate(date) });
            setDateTarget(null);
          }}
        />
      ) : null}

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
  const perMonth = estimate.grossPerPaycheck * PER_MONTH[source.frequency];

  return (
    <View
      accessible
      accessibilityLabel={t('salary.estimateA11y', {
        paycheck: formatCurrency(estimate.grossPerPaycheck),
        perMonth: formatCurrency(perMonth),
      })}
      className="w-full rounded-[16px] bg-accent/10 px-4 py-3.5"
    >
      <Text className="font-app text-[13px] text-muted" maxFontSizeMultiplier={TEXT_CAP.control}>
        {t('salary.eachPaycheck')}
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
        {t('salary.aboutPerMonth', { amount: formatCurrency(perMonth) })}
      </Text>
    </View>
  );
}
