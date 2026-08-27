import { router } from 'expo-router';
import { Calculator, Plus, Trash2 } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AmountPad } from '@/components/ui/amount-pad';
import { Button } from '@/components/ui/button';
import { CalculatorPad } from '@/components/ui/calculator-pad';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { MultiChoiceChips } from '@/components/ui/multi-choice-chips';
import { Screen } from '@/components/ui/screen';
import { SelectField } from '@/components/ui/select-field';
import { TextField } from '@/components/ui/text-field';
import { FieldLabel, Subtitle, Title } from '@/components/ui/typography';
import { accounts } from '@/data/accounts-mock';
import { salarySources, type SalarySource } from '@/data/salary-mock';
import { PAY_FREQUENCIES, type PayFrequency } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { colors } from '@/theme/colors';

const ACCOUNT_OPTIONS = accounts.map((account) => ({
  value: account.id,
  label: `${account.bankName} ••${account.last4}`,
}));

/** Normalised to monthly so sources on different cycles can be summed. */
const PER_MONTH: Record<PayFrequency, number> = {
  weekly: 52 / 12,
  biweekly: 26 / 12,
  semimonthly: 2,
  monthly: 1,
};

type PadTarget = { sourceId: string; mode: 'pad' | 'calculator' } | null;

export default function SalaryScreen() {
  const [sources, setSources] = useState<SalarySource[]>(salarySources);
  const [padTarget, setPadTarget] = useState<PadTarget>(null);
  // Monotonic so ids stay unique even after sources are removed.
  const nextId = useRef(salarySources.length + 1);

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
        accountIds: [],
      },
    ]);
  };

  const removeSource = (id: string) => {
    setSources((current) => current.filter((source) => source.id !== id));
  };

  const activeSource = sources.find((source) => source.id === padTarget?.sourceId);

  // Saving waits on the data layer; this only closes the screen.
  const handleSave = () => router.back();

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

              {sources.length > 1 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove source ${index + 1}`}
                  hitSlop={8}
                  onPress={() => removeSource(source.id)}
                  className="h-9 w-9 items-center justify-center rounded-[8px] active:bg-black/5"
                >
                  <Trash2 size={18} color={colors.muted} strokeWidth={1.8} />
                </Pressable>
              ) : null}
            </View>

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

              <View className="w-full">
                <FieldLabel className="mb-2">Paid into</FieldLabel>
                <MultiChoiceChips
                  options={ACCOUNT_OPTIONS}
                  values={source.accountIds}
                  onChange={(accountIds) => update(source.id, { accountIds })}
                  emptyHint="Link at least one account so Skip knows where this lands."
                />
              </View>
            </View>
          </View>
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add salary source"
        onPress={addSource}
        className="mt-4 w-full flex-row items-center justify-center gap-2 rounded-[10px] border border-dashed border-line py-4 active:bg-black/5"
      >
        <Plus size={18} color={colors.ink} strokeWidth={2.2} />
        <Text className="font-poppins-medium text-[15px] text-ink" maxFontSizeMultiplier={1.3}>
          Add salary source
        </Text>
      </Pressable>

      <View className="mt-auto w-full pt-10">
        <Button label="Save" onPress={handleSave} />
      </View>

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
