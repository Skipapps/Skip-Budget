import { router } from 'expo-router';
import { Calculator, Calendar, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { AmountPad } from '@/components/ui/amount-pad';
import { Button } from '@/components/ui/button';
import { CalculatorPad } from '@/components/ui/calculator-pad';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { DatePicker } from '@/components/ui/date-picker';
import { MultiChoiceChips } from '@/components/ui/multi-choice-chips';
import { Screen } from '@/components/ui/screen';
import { SelectField } from '@/components/ui/select-field';
import { TextField } from '@/components/ui/text-field';
import { FieldLabel, Subtitle, Title } from '@/components/ui/typography';
import {
  useCreateSalarySource,
  useDeleteSalarySource,
  useSetSalaryAccounts,
  useUpdateSalarySource,
} from '@/api/mutations';
import { useBankAccounts, useSalarySources } from '@/api/queries';
import { type SalarySource } from '@/data/salary-mock';
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

/** Normalised to monthly so sources on different cycles can be summed. */
const PER_MONTH: Record<PayFrequency, number> = {
  weekly: 52 / 12,
  biweekly: 26 / 12,
  semimonthly: 2,
  monthly: 1,
};

type PadTarget = { sourceId: string; mode: 'pad' | 'calculator' } | null;

/** Dates cross this screen as yyyy-mm-dd; the picker wants a Date. */
function asDate(iso: string | null | undefined): Date | null {
  return iso ? new Date(`${iso}T00:00:00`) : null;
}

/**
 * Loads what exists, then hands it to the editor as initial state.
 *
 * Keyed on the row count so the editor remounts once the data lands — the same
 * reason the receipt form does it: seeding state from a query inside an effect
 * fights the user's own edits when a refetch arrives mid-typing.
 */
export default function SalaryScreen() {
  const colors = useColors();
  const { data: saved = [], isLoading } = useSalarySources();

  if (isLoading) {
    return (
      <Screen showBack>
        <Title className="mt-2">Salary</Title>
        <View className="mt-16 w-full items-center">
          <ActivityIndicator size="small" color={colors.muted} />
        </View>
      </Screen>
    );
  }

  const initial: SalarySource[] = saved.map((row) => ({
    id: row.id,
    name: row.name,
    amount: row.amount,
    frequency: row.frequency,
    lastPayday: row.last_payday,
    accountIds: [],
  }));

  return <SalaryEditor key={saved.map((row) => row.id).join('|') || 'empty'} initial={initial} />;
}

function SalaryEditor({ initial }: { initial: SalarySource[] }) {
  const colors = useColors();
  const [sources, setSources] = useState<SalarySource[]>(initial);
  const [padTarget, setPadTarget] = useState<PadTarget>(null);
  // Which source's payday is being picked, or null when the picker is closed.
  const [dateTarget, setDateTarget] = useState<string | null>(null);
  // Collapsed by id. Everything starts open — a source you just added is a
  // source you are still filling in.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  // Monotonic so ids stay unique even after sources are removed.
  const nextId = useRef(initial.length + 1);
  // Ids that exist in the database; anything else on screen is new, and
  // anything here but no longer on screen has been removed.
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
    (sum, source) => sum + source.amount * PER_MONTH[source.frequency],
    0,
  );

  const update = (id: string, patch: Partial<SalarySource>) => {
    setSources((current) =>
      current.map((source) => (source.id === id ? { ...source, ...patch } : source)),
    );
  };

  const addSource = () => {
    setSources((current) => [
      ...current,
      {
        id: `salary-${nextId.current++}`,
        name: '',
        amount: 0,
        frequency: 'monthly',
        lastPayday: null,
        accountIds: [],
      },
    ]);
  };

  /**
   * Removing a source takes its income out of every projection with it.
   *
   * That is a bigger change than the bin icon suggests — paydays are what the
   * dashboard measures spending against — so it asks first. The row goes on
   * Save with the rest of the screen, not on the tap.
   */
  const removeSource = async (id: string) => {
    const source = sources.find((row) => row.id === id);
    const name = source?.name.trim();

    const ok = await confirm({
      title: name ? `Remove ${name}?` : 'Remove this source?',
      message:
        'Its paydays stop being counted as money coming in, on the dashboard and ' +
        'everywhere else. Nothing you have spent changes.',
      confirmLabel: 'Remove',
      cancelLabel: 'Keep it',
      destructive: true,
    });
    if (!ok) return;

    setSources((current) => current.filter((row) => row.id !== id));
  };

  const activeSource = sources.find((source) => source.id === padTarget?.sourceId);

  const handleSave = async () => {
    setError(null);
    const named = sources.filter((source) => source.name.trim() && source.amount > 0);
    if (sources.length > 0 && named.length === 0) {
      setError('Give each source a name and an amount.');
      return;
    }
    // Every payday is counted forward from the last one, so without that date
    // the income is saved but never lands anywhere.
    if (named.some((source) => !source.lastPayday)) {
      setError('Pick the last payday for each source, so Skip can work out the next ones.');
      return;
    }

    try {
      // Removed first, so a delete plus a re-add of the same name cannot
      // collide on the way through.
      const stillPresent = new Set(named.map((source) => source.id));
      for (const id of savedIds.current) {
        if (!stillPresent.has(id)) await deleteSource.mutateAsync(id);
      }

      for (const source of named) {
        const values = {
          name: source.name.trim(),
          amount: source.amount,
          frequency: source.frequency,
          last_payday: source.lastPayday,
        };
        const id = savedIds.current.has(source.id)
          ? (await updateSource.mutateAsync({ id: source.id, values }), source.id)
          : (await createSource.mutateAsync(values)).id;

        await setAccounts.mutateAsync({ salaryId: id, accountIds: source.accountIds });
      }

      router.back();
    } catch (thrown) {
      setError((thrown as Error).message ?? 'Could not save your income.');
    }
  };

  return (
    <Screen showBack avoidKeyboard>
      <Title className="mt-2">Salary</Title>
      <Subtitle className="mt-3">Track every source of income and where each one is paid.</Subtitle>

      <View className="mt-6 w-full rounded-[10px] border border-line px-4 py-3">
        <Text className="font-poppins text-[13px] text-muted" maxFontSizeMultiplier={1.3}>
          Total per month
        </Text>
        <Text
          className="mt-0.5 font-poppins-bold text-[24px] text-ink"
          numberOfLines={1}
          adjustsFontSizeToFit
          maxFontSizeMultiplier={1.2}
        >
          {formatCurrency(monthlyTotal)}
        </Text>
      </View>

      <View className="mt-6 w-full gap-4">
        {sources.map((source, index) => (
          <View key={source.id} className="w-full rounded-[10px] border border-line p-4">
            <View className="mb-3 w-full flex-row items-center justify-between">
              <Text
                className="font-poppins-medium text-[15px] text-ink"
                maxFontSizeMultiplier={1.3}
              >
                Source {index + 1}
              </Text>

              <View className="flex-row items-center gap-1">
                {/* Offered on the only source too. Someone who added income by
                    mistake, or who has stopped being paid from somewhere, had
                    no way to take it back out. */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove source ${index + 1}`}
                  hitSlop={8}
                  onPress={() => void removeSource(source.id)}
                  className="h-9 w-9 items-center justify-center rounded-[8px] active:bg-ink/5"
                >
                  <Trash2 size={18} color={colors.muted} strokeWidth={1.8} />
                </Pressable>

                {/* Several sources fill the screen fast, and most of the time
                    you are editing one of them. Folding the rest away keeps
                    the one you are working on in view. */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    collapsed[source.id]
                      ? `Expand source ${index + 1}`
                      : `Collapse source ${index + 1}`
                  }
                  accessibilityState={{ expanded: !collapsed[source.id] }}
                  hitSlop={8}
                  onPress={() =>
                    setCollapsed((current) => ({
                      ...current,
                      [source.id]: !current[source.id],
                    }))
                  }
                  className="h-9 w-9 items-center justify-center rounded-[8px] active:bg-ink/5"
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
              // Folded: enough to tell one source from another without opening it.
              <Text className="font-poppins text-[13px] text-muted" maxFontSizeMultiplier={1.3}>
                {[
                  source.name.trim() || 'Unnamed',
                  source.amount ? formatCurrency(source.amount) : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            ) : (
              <View className="w-full gap-5">
                <TextField
                  label="Name"
                  value={source.name}
                  onChangeText={(text) => update(source.id, { name: text })}
                  autoCapitalize="words"
                  returnKeyType="done"
                />

                <SelectField
                  label="Amount"
                  value={source.amount ? formatCurrency(source.amount) : ''}
                  placeholder="Enter an amount"
                  icon={Calculator}
                  onPress={() => setPadTarget({ sourceId: source.id, mode: 'pad' })}
                  onIconPress={() => setPadTarget({ sourceId: source.id, mode: 'calculator' })}
                  iconAccessibilityLabel="Open calculator"
                />

                <View className="w-full">
                  <FieldLabel className="mb-2">How often</FieldLabel>
                  <ChoiceChips
                    options={PAY_FREQUENCIES}
                    value={source.frequency}
                    onChange={(frequency) => update(source.id, { frequency })}
                  />
                </View>

                <SelectField
                  label="Last payday"
                  value={source.lastPayday ? formatFullDate(asDate(source.lastPayday)!) : ''}
                  placeholder="Pick the most recent one"
                  icon={Calendar}
                  onPress={() => setDateTarget(source.id)}
                />

                {source.lastPayday ? (
                  <Text className="-mt-3 ml-4 font-poppins text-[13px] text-muted">
                    Next payday{' '}
                    {formatFullDate(getNextPayday(asDate(source.lastPayday)!, source.frequency))}
                  </Text>
                ) : null}

                <View className="w-full">
                  <FieldLabel className="mb-2">Paid into</FieldLabel>
                  <MultiChoiceChips
                    options={accountOptions}
                    values={source.accountIds}
                    onChange={(accountIds) => update(source.id, { accountIds })}
                    emptyHint="Link at least one account so Skip knows where this lands."
                  />
                </View>
              </View>
            )}
          </View>
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add salary source"
        onPress={addSource}
        className="mt-4 w-full flex-row items-center justify-center gap-2 rounded-[10px] border border-dashed border-line py-4 active:bg-ink/5"
      >
        <Plus size={18} color={colors.ink} strokeWidth={2.2} />
        <Text className="font-poppins-medium text-[15px] text-ink" maxFontSizeMultiplier={1.3}>
          Add salary source
        </Text>
      </Pressable>

      <View className="mt-auto w-full pt-10">
        {error ? (
          <Text
            className="mb-3 w-full text-center font-poppins text-[13px] text-red-600"
            maxFontSizeMultiplier={1.4}
          >
            {error}
          </Text>
        ) : null}
        <Button label={createSource.isPending ? 'Saving…' : 'Save'} onPress={handleSave} />
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

      {padTarget && activeSource ? (
        padTarget.mode === 'calculator' ? (
          <CalculatorPad
            title="Calculator"
            value={activeSource.amount ? String(activeSource.amount) : ''}
            onCancel={() => setPadTarget(null)}
            onConfirm={(next) => {
              update(activeSource.id, { amount: Number(next) || 0 });
              setPadTarget(null);
            }}
          />
        ) : (
          <AmountPad
            title="Salary amount"
            caption={
              PAY_FREQUENCIES.find((option) => option.value === activeSource.frequency)?.caption ??
              'Each pay period'
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
