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
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { SelectField } from '@/components/ui/select-field';
import { Skeleton } from '@/components/ui/skeleton';
import { TextField } from '@/components/ui/text-field';
import { Subtitle, Title } from '@/components/ui/typography';
import { formatFullDate, toIsoDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { simplifyDebts } from '@/lib/split';
import { useUserId } from '@/providers/session-provider';
import { useColors } from '@/providers/theme-provider';
import { useArtwork } from '@/theme/artwork';

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

type MemberRecord = NonNullable<ReturnType<typeof useGroupMembers>['data']>[number];
type BalanceRecord = NonNullable<ReturnType<typeof useGroupBalances>['data']>[number];

/**
 * Waits for the group before the form exists, then seeds it by remount.
 *
 * Who paid, who was paid and how much are all `useState` initial values taken
 * from the suggestion, and an initial value is read once. On a cold cache the
 * balances land after the first render, so without the key this screen opens
 * blank — losing the suggested payment, which is the only reason it exists,
 * and leaving somebody to pick two names and retype a figure the app already
 * knew. The key is the group rather than the suggestion: a later refetch must
 * not remount the form and wipe what has been typed over it.
 */
function SettleUpScreenInner() {
  const artwork = useArtwork();
  const { group: groupId } = useLocalSearchParams<{ group?: string }>();

  const group = useGroup(groupId);
  const members = useGroupMembers(groupId);
  const balances = useGroupBalances(groupId);

  if (group.isLoading || members.isLoading || balances.isLoading) {
    return (
      <Screen showBack>
        <Title>Settle up</Title>
        <View className="mt-7 w-full gap-6" accessibilityLabel="Loading">
          <Skeleton className="h-12 w-full rounded-full" />
          <Skeleton className="h-14 w-full rounded-[12px]" />
          <Skeleton className="h-14 w-full rounded-[12px]" />
        </View>
      </Screen>
    );
  }

  // A failed read is not an empty group. Guessing past it would offer a
  // payment between two people it could not name, for an amount nobody owes.
  if (group.isError || members.isError || balances.isError) {
    return (
      <Screen showBack>
        <PageState
          art={artwork.error}
          title="Could not open this group"
          message="Check your connection and try again. Nothing has been recorded."
          actionLabel="Try again"
          onAction={() => {
            void group.refetch();
            void members.refetch();
            void balances.refetch();
          }}
        />
      </Screen>
    );
  }

  return (
    <SettleUpForm
      key={groupId ?? 'none'}
      groupId={groupId}
      groupName={group.data?.name ?? null}
      members={members.data ?? []}
      balances={balances.data ?? []}
    />
  );
}

function SettleUpForm({
  groupId,
  groupName,
  members,
  balances,
}: {
  groupId?: string;
  groupName: string | null;
  members: MemberRecord[];
  balances: BalanceRecord[];
}) {
  const colors = useColors();
  const userId = useUserId();

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
      <Title>Settle up</Title>
      <Subtitle className="mt-3">
        Records a payment that happened somewhere else — cash, a bank transfer, a round of drinks.
        Skip does not move any money.
      </Subtitle>

      <View className="mt-7 w-full flex-row items-center gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Who paid: ${memberName(members.find((m) => m.id === fromMember))}`}
          onPress={() => setPicking(picking === 'from' ? null : 'from')}
          className="min-h-12 min-w-0 flex-1 items-center justify-center rounded-full bg-ink/5 px-3 active:bg-ink/10"
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
          className="min-h-12 min-w-0 flex-1 items-center justify-center rounded-full bg-ink/5 px-3 active:bg-ink/10"
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
        <View className="mt-3 w-full overflow-hidden rounded-[16px] bg-ink/5">
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
          className="mt-5 w-full font-poppins text-[13px] text-danger"
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
          Everyone in {groupName ?? 'the group'} will see this.
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
