import { ArrowRight, Calculator, Plus, Trash2 } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AmountPad } from '@/components/ui/amount-pad';
import { Button } from '@/components/ui/button';
import { CalculatorPad } from '@/components/ui/calculator-pad';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { FieldLabel, Title } from '@/components/ui/typography';
import { formatCurrency } from '@/lib/format';
import { splitBill, type Participant } from '@/lib/split';
import { colors } from '@/theme/colors';

type PadTarget = { kind: 'total' } | { kind: 'paid'; id: string } | { kind: 'calculator' } | null;

const INITIAL: Participant[] = [
  { id: 'p1', name: 'You', paid: 0 },
  { id: 'p2', name: '', paid: 0 },
];

export default function SplitCalculatorScreen() {
  const [total, setTotal] = useState(0);
  const [people, setPeople] = useState<Participant[]>(INITIAL);
  const [padTarget, setPadTarget] = useState<PadTarget>(null);
  const nextId = useRef(INITIAL.length + 1);

  const named = people.map((person, index) => ({
    ...person,
    name: person.name.trim() || `Person ${index + 1}`,
  }));

  const { shareMin, shareMax, roundedUpCount, balances, settlements, paidTotal } = splitBill(
    named,
    total,
  );
  const unevenShare = shareMax !== shareMin;
  // Contributions that do not add up to the bill make every balance wrong.
  const mismatch = Math.round((paidTotal - total) * 100) / 100;

  const update = (id: string, patch: Partial<Participant>) => {
    setPeople((current) =>
      current.map((person) => (person.id === id ? { ...person, ...patch } : person)),
    );
  };

  const addPerson = () => {
    setPeople((current) => [...current, { id: `p${nextId.current++}`, name: '', paid: 0 }]);
  };

  const removePerson = (id: string) => {
    setPeople((current) => current.filter((person) => person.id !== id));
  };

  // Saving waits on the data layer.
  const handleSave = () => {};

  return (
    <Screen showBack avoidKeyboard>
      <Title align="left" className="mt-2">
        Split calculator
      </Title>

      <View className="mt-6 w-full items-center rounded-[10px] border border-line bg-white px-5 py-6">
        <Text className="font-poppins text-[13px] text-muted" maxFontSizeMultiplier={1.3}>
          Each person owes
        </Text>
        <Text
          className="mt-1 font-poppins-bold text-[40px] text-ink"
          numberOfLines={1}
          adjustsFontSizeToFit
          maxFontSizeMultiplier={1.2}
        >
          {unevenShare
            ? `${formatCurrency(shareMin)} – ${formatCurrency(shareMax)}`
            : formatCurrency(shareMin)}
        </Text>
        <Text className="mt-1 font-poppins text-[13px] text-muted" maxFontSizeMultiplier={1.3}>
          {formatCurrency(total)} split {people.length} way{people.length === 1 ? '' : 's'}
        </Text>
        {unevenShare ? (
          // Explain the odd cent rather than let it look like a rounding bug.
          <Text
            className="mt-2 text-center font-poppins text-[12px] text-muted"
            maxFontSizeMultiplier={1.3}
          >
            {formatCurrency(total)} does not divide evenly — {roundedUpCount}{' '}
            {roundedUpCount === 1 ? 'person pays' : 'people pay'} a cent more so it adds up exactly.
          </Text>
        ) : null}
      </View>

      <View className="mt-7 w-full">
        <FieldLabel className="mb-2">Total bill</FieldLabel>
        <View className="w-full flex-row gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Total bill, ${formatCurrency(total)}. Edit`}
            onPress={() => setPadTarget({ kind: 'total' })}
            className="min-h-14 flex-1 justify-center rounded-[10px] border border-line px-5 active:bg-black/5"
          >
            <Text className="font-poppins text-[16px] text-ink" maxFontSizeMultiplier={1.4}>
              {formatCurrency(total)}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open calculator"
            onPress={() => setPadTarget({ kind: 'calculator' })}
            className="min-h-14 w-14 items-center justify-center rounded-[10px] border border-line active:bg-black/5"
          >
            <Calculator size={20} color={colors.ink} strokeWidth={1.8} />
          </Pressable>
        </View>
      </View>

      <View className="mt-7 w-full">
        <FieldLabel className="mb-3">Who paid</FieldLabel>

        <View className="w-full gap-3">
          {people.map((person, index) => {
            const balance = balances[index]?.balance ?? 0;
            const personShare = balances[index]?.share ?? 0;

            return (
              <View key={person.id} className="w-full rounded-[10px] border border-line p-3.5">
                <View className="w-full flex-row items-center gap-2">
                  <View className="flex-1">
                    <TextField
                      label=""
                      value={person.name}
                      onChangeText={(name) => update(person.id, { name })}
                      placeholder={`Person ${index + 1}`}
                      autoCapitalize="words"
                      returnKeyType="done"
                    />
                  </View>

                  {people.length > 1 ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove person ${index + 1}`}
                      hitSlop={8}
                      onPress={() => removePerson(person.id)}
                      className="h-9 w-9 items-center justify-center rounded-[8px] active:bg-black/5"
                    >
                      <Trash2 size={18} color={colors.muted} strokeWidth={1.8} />
                    </Pressable>
                  ) : null}
                </View>

                <View className="mt-3 w-full flex-row items-center justify-between gap-3">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Paid ${formatCurrency(person.paid)}. Edit`}
                    onPress={() => setPadTarget({ kind: 'paid', id: person.id })}
                    className="min-h-11 flex-1 justify-center rounded-[8px] border border-line px-3 active:bg-black/5"
                  >
                    <Text className="font-poppins text-[11px] text-muted">Paid</Text>
                    <Text className="font-poppins-semibold text-[15px] text-ink">
                      {formatCurrency(person.paid)}
                    </Text>
                  </Pressable>

                  <View className="min-h-11 flex-1 justify-center rounded-[8px] bg-black/[0.03] px-3">
                    <Text className="font-poppins text-[11px] text-muted">
                      {balance >= 0 ? 'Gets back' : 'Owes'} · share {formatCurrency(personShare)}
                    </Text>
                    <Text
                      className="font-poppins-semibold text-[15px]"
                      style={{ color: balance >= 0 ? '#059669' : colors.accent }}
                    >
                      {formatCurrency(Math.abs(balance))}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add person"
          onPress={addPerson}
          className="mt-3 w-full flex-row items-center justify-center gap-2 rounded-[10px] border border-dashed border-line py-4 active:bg-black/5"
        >
          <Plus size={18} color={colors.ink} strokeWidth={2.2} />
          <Text className="font-poppins-medium text-[15px] text-ink" maxFontSizeMultiplier={1.3}>
            Add person
          </Text>
        </Pressable>
      </View>

      {mismatch !== 0 && total > 0 ? (
        <View className="mt-5 w-full rounded-[10px] border border-accent/40 bg-accent/10 p-4">
          <Text
            className="font-poppins text-[13px] leading-5 text-body"
            maxFontSizeMultiplier={1.4}
          >
            Contributions add up to {formatCurrency(paidTotal)} —{' '}
            {mismatch > 0
              ? `${formatCurrency(mismatch)} more than`
              : `${formatCurrency(-mismatch)} short of`}{' '}
            the bill.
          </Text>
        </View>
      ) : null}

      <View className="mt-7 w-full">
        <FieldLabel className="mb-3">Settle up</FieldLabel>

        {settlements.length === 0 ? (
          <View className="w-full rounded-[10px] border border-line p-4">
            <Text className="font-poppins text-[14px] text-muted" maxFontSizeMultiplier={1.4}>
              {total > 0
                ? 'Everyone is square.'
                : 'Add the bill and who paid to see who owes whom.'}
            </Text>
          </View>
        ) : (
          <View className="w-full gap-2">
            {settlements.map((settlement, index) => (
              <View
                key={`${settlement.from}-${settlement.to}-${index}`}
                className="w-full flex-row items-center gap-2 rounded-[10px] border border-line p-4"
              >
                <Text
                  className="shrink font-poppins-medium text-[14px] text-ink"
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.3}
                >
                  {settlement.from}
                </Text>
                <ArrowRight size={16} color={colors.muted} strokeWidth={2} />
                <Text
                  className="shrink font-poppins-medium text-[14px] text-ink"
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.3}
                >
                  {settlement.to}
                </Text>
                <Text
                  className="ml-auto font-poppins-bold text-[15px] text-ink"
                  maxFontSizeMultiplier={1.3}
                >
                  {formatCurrency(settlement.amount)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View className="mt-auto w-full pb-8 pt-8">
        <Button label="Save" onPress={handleSave} />
      </View>

      {padTarget?.kind === 'calculator' ? (
        <CalculatorPad
          title="Calculator"
          value={total ? String(total) : ''}
          onCancel={() => setPadTarget(null)}
          onConfirm={(next) => {
            setTotal(Number(next) || 0);
            setPadTarget(null);
          }}
        />
      ) : null}

      {padTarget?.kind === 'total' ? (
        <AmountPad
          title="Total bill"
          caption="What the whole thing cost"
          value={total ? String(total) : ''}
          onCancel={() => setPadTarget(null)}
          onConfirm={(next) => {
            setTotal(Number(next) || 0);
            setPadTarget(null);
          }}
        />
      ) : null}

      {padTarget?.kind === 'paid' ? (
        <AmountPad
          title="Amount paid"
          caption="What this person put in"
          value={String(people.find((person) => person.id === padTarget.id)?.paid ?? '')}
          onCancel={() => setPadTarget(null)}
          onConfirm={(next) => {
            update(padTarget.id, { paid: Number(next) || 0 });
            setPadTarget(null);
          }}
        />
      ) : null}
    </Screen>
  );
}
