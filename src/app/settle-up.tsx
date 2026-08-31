import { router, useLocalSearchParams } from 'expo-router';
import { ArrowRight, Calendar, Check, Wallet } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  memberName,
  useGroup,
  useGroupBalances,
  useGroupMembers,
  useRecordSettlement,
} from '@/api/splits';
import { AmountPad } from '@/components/ui/amount-pad';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { useProGate } from '@/components/pro/pro-gate';
import { Screen } from '@/components/ui/screen';
import { SelectField } from '@/components/ui/select-field';
import { TextField } from '@/components/ui/text-field';
import { Subtitle, Title } from '@/components/ui/typography';
import { formatFullDate, toIsoDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { simplifyDebts } from '@/lib/split';
import { useUserId } from '@/providers/session-provider';
import { useColors } from '@/providers/theme-provider';

/**
 * Writing down that a debt was paid.
 *
 * No money moves — Skip has no bank connection and never will. That has to be
 * said on the screen rather than assumed, because a button called "Settle up"
 * in a budgeting app reads like a transfer, and somebody will otherwise sit
 * waiting for one.
 */
export default function SettleUpScreen() {
  // A wrapper, not an inline return: the screen below runs its own
  // hooks, and an early return above them would change the hook count
  // the moment the entitlement answer arrives — which React forbids.
  const gate = useProGate('splits');
  if (gate) return gate;
  return <SettleUpScreenInner />;
}

function SettleUpScreenInner() {
  const colors = useColors();
  const userId = useUserId();
  const { group: groupId } = useLocalSearchParams<{ group?: string }>();

  const { data: group } = useGroup(groupId);
  const { data: members = [] } = useGroupMembers(groupId);
  const { data: balances = [] } = useGroupBalances(groupId);

  const me = members.find((member) => member.id && member.user_id === userId);

  // What the group would suggest, so the form opens on the payment somebody
  // actually came here to record rather than on an empty pair.
  const suggested = useMemo(() => {
    const payments = simplifyDebts(
      balances.map((row) => ({ id: row.member_id, balance: Number(row.balance) })),
    );
    return payments.find((payment) => payment.from === me?.id) ?? payments[0] ?? null;
  }, [balances, me?.id]);

  const [fromMember, setFromMember] = useState(suggested?.from ?? me?.id ?? '');
  const [toMember, setToMember] = useState(suggested?.to ?? '');
  const [amount, setAmount] = useState(suggested ? String(suggested.amount) : '');
  const [settledOn, setSettledOn] = useState(new Date());
  const [note, setNote] = useState('');

  const [picking, setPicking] = useState<'from' | 'to' | null>(null);
  const [padOpen, setPadOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recordSettlement = useRecordSettlement();
  const total = Number(amount) || 0;

  const handleSave = async () => {
    setError(null);
    if (!groupId) return;
    if (!fromMember || !toMember) {
      setError('Pick who paid and who was paid.');
      return;
    }
    if (fromMember === toMember) {
      setError('A payment needs two different people.');
      return;
    }
    if (total <= 0) {
      setError('Enter how much was paid.');
      return;
    }

    try {
      await recordSettlement.mutateAsync({
        groupId,
        fromMember,
        toMember,
        amount: total,
        settledOn: toIsoDate(settledOn),
        note: note.trim() || null,
      });
      router.back();
    } catch (thrown) {
      setError((thrown as Error).message);
    }
  };

  return (
    <Screen showBack avoidKeyboard>
      <Title className="mt-2">Settle up</Title>
      <Subtitle className="mt-3">
        Records a payment that happened somewhere else — cash, a bank transfer, a round of drinks.
        Skip does not move any money.
      </Subtitle>

      <View className="mt-7 w-full flex-row items-center gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Who paid: ${memberName(members.find((m) => m.id === fromMember))}`}
          onPress={() => setPicking(picking === 'from' ? null : 'from')}
          className="min-h-12 min-w-0 flex-1 items-center justify-center rounded-[10px] border border-line px-3 active:bg-ink/5"
        >
          <Text
            className="font-poppins-medium text-[14px] text-ink"
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
          >
            {memberName(members.find((member) => member.id === fromMember))}
          </Text>
        </Pressable>

        <ArrowRight size={18} color={colors.muted} strokeWidth={2} />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Who was paid: ${memberName(members.find((m) => m.id === toMember))}`}
          onPress={() => setPicking(picking === 'to' ? null : 'to')}
          className="min-h-12 min-w-0 flex-1 items-center justify-center rounded-[10px] border border-line px-3 active:bg-ink/5"
        >
          <Text
            className="font-poppins-medium text-[14px] text-ink"
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
          >
            {memberName(members.find((member) => member.id === toMember))}
          </Text>
        </Pressable>
      </View>

      {picking ? (
        <View className="mt-3 w-full rounded-[10px] border border-line">
          {members.map((member) => {
            const chosen = picking === 'from' ? fromMember : toMember;
            return (
              <Pressable
                key={member.id}
                accessibilityRole="button"
                accessibilityLabel={memberName(member)}
                accessibilityState={{ selected: member.id === chosen }}
                onPress={() => {
                  if (picking === 'from') setFromMember(member.id);
                  else setToMember(member.id);
                  setPicking(null);
                }}
                className="min-h-12 w-full flex-row items-center justify-between gap-3 px-4 py-3 active:bg-ink/5"
              >
                <Text className="font-poppins text-[15px] text-ink" maxFontSizeMultiplier={1.3}>
                  {memberName(member)}
                </Text>
                {member.id === chosen ? (
                  <Check size={18} color={colors.ink} strokeWidth={2.4} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View className="mt-7 w-full gap-6">
        <SelectField
          label="Amount"
          value={total > 0 ? formatCurrency(total) : ''}
          placeholder="Enter an amount"
          icon={Wallet}
          onPress={() => setPadOpen(true)}
        />

        <SelectField
          label="When"
          value={formatFullDate(settledOn)}
          icon={Calendar}
          onPress={() => setDateOpen(true)}
        />

        <TextField
          label="Note"
          optional
          value={note}
          onChangeText={setNote}
          placeholder="Bank transfer, cash, anything worth remembering"
          maxLength={200}
          autoCapitalize="sentences"
        />
      </View>

      {error ? (
        <Text
          className="mt-5 w-full font-poppins text-[13px] text-red-600"
          maxFontSizeMultiplier={1.4}
        >
          {error}
        </Text>
      ) : null}

      <View className="mt-auto w-full pb-8 pt-10">
        <Button
          label={recordSettlement.isPending ? 'Saving…' : 'Record payment'}
          onPress={handleSave}
          disabled={recordSettlement.isPending}
        />
        <Text
          className="mt-4 w-full text-center font-poppins text-[12px] text-muted"
          maxFontSizeMultiplier={1.4}
        >
          Everyone in {group?.name ?? 'the group'} will see this.
        </Text>
      </View>

      {padOpen ? (
        <AmountPad
          title="Amount paid"
          caption="What actually changed hands"
          value={amount}
          onCancel={() => setPadOpen(false)}
          onConfirm={(next) => {
            setAmount(next);
            setPadOpen(false);
          }}
        />
      ) : null}

      {dateOpen ? (
        <DatePicker
          value={settledOn}
          onCancel={() => setDateOpen(false)}
          onConfirm={(next) => {
            setSettledOn(next);
            setDateOpen(false);
          }}
        />
      ) : null}
    </Screen>
  );
}
