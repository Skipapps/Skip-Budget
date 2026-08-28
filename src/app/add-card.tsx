import { router, useLocalSearchParams } from 'expo-router';
import { Calendar, Trash2, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { useCreateCard, useDeleteCard, useUpdateCard } from '@/api/mutations';
import { useCard } from '@/api/queries';
import { colors } from '@/theme/colors';
import { NetworkPicker } from '@/components/cards/network-picker';
import { PaymentCard } from '@/components/cards/payment-card';
import { Button } from '@/components/ui/button';
import { AmountPad } from '@/components/ui/amount-pad';
import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { DatePicker } from '@/components/ui/date-picker';
import { ColorPicker } from '@/components/ui/color-picker';
import { Screen } from '@/components/ui/screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { SelectField } from '@/components/ui/select-field';
import { TextField } from '@/components/ui/text-field';
import { FieldLabel, Title } from '@/components/ui/typography';
import { NETWORKS } from '@/data/cards-mock';
import { formatCurrency } from '@/lib/format';
import { formatFullDate, toIsoDate } from '@/lib/date';
import { DEFAULT_CARD_COLOR } from '@/theme/card-colors';

const REMINDER_OPTIONS = [
  { value: 'off', label: 'Off' },
  { value: '1', label: '1 day' },
  { value: '3', label: '3 days' },
  { value: '7', label: '1 week' },
] as const;

type Reminder = (typeof REMINDER_OPTIONS)[number]['value'];

const MORE_SETUP_INFO =
  'Adding more details helps Skip calculate accurate balances and predict future transactions made with this card.';

/** Loads the card being edited, then seeds the form by remount. */
export default function AddCardScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data: existing, isLoading } = useCard(id);

  if (id && isLoading && !existing) {
    return (
      <Screen showBack>
        <Title className="mt-2">Edit card</Title>
        <View className="mt-16 w-full items-center">
          <ActivityIndicator size="small" color={colors.muted} />
        </View>
      </Screen>
    );
  }

  return <CardForm key={existing?.id ?? 'new'} id={id} existing={existing ?? null} />;
}

function CardForm({
  id,
  existing,
}: {
  id?: string;
  existing: ReturnType<typeof useCard>['data'] | null;
}) {
  const editing = Boolean(id);

  const [network, setNetwork] = useState<string>(existing?.network ?? NETWORKS[0]);
  const [name, setName] = useState(existing?.holder ?? '');
  const [color, setColor] = useState<string>(existing?.color ?? DEFAULT_CARD_COLOR);

  const [last4, setLast4] = useState(existing?.last4 ?? '');
  // Stored as a day of the month; the picker wants a Date, so it is placed in
  // the current month purely to give the wheel something to open on.
  const [dueDate, setDueDate] = useState<Date | null>(
    existing?.bill_due_day
      ? new Date(new Date().getFullYear(), new Date().getMonth(), existing.bill_due_day)
      : null,
  );
  const [reminder, setReminder] = useState<Reminder>(
    existing?.reminder_days == null ? 'off' : (String(existing.reminder_days) as Reminder),
  );
  const [balance, setBalance] = useState(existing ? String(existing.balance) : '');

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [amountPadOpen, setAmountPadOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCard = useCreateCard();
  const updateCard = useUpdateCard();
  const deleteCard = useDeleteCard();

  const handleDelete = () => {
    if (!id) return;
    Alert.alert(
      'Delete this card?',
      'Receipts, bills and subscriptions paid with it are kept, but stop showing this card.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCard.mutateAsync(id);
              router.back();
            } catch (thrown) {
              setError((thrown as Error).message ?? 'Could not delete that card.');
            }
          },
        },
      ],
    );
  };

  const handleSave = async () => {
    setError(null);
    if (!name.trim()) {
      setError('Give the card a name so you can tell it apart.');
      return;
    }

    try {
      const values = {
        holder: name.trim(),
        network,
        last4: last4.length === 4 ? last4 : null,
        color,
        balance: Number(balance) || 0,
        // Stamped whenever a balance is stated, so charges before today are
        // treated as already included rather than counted twice.
        balance_as_of: balance ? toIsoDate(new Date()) : null,
        // The bill day is what recurs, not the specific date picked.
        bill_due_day: dueDate ? dueDate.getDate() : null,
        reminder_days: reminder === 'off' ? null : Number(reminder),
      };

      if (editing && id) {
        await updateCard.mutateAsync({ id, values });
      } else {
        await createCard.mutateAsync(values);
      }
      router.back();
    } catch (thrown) {
      setError((thrown as Error).message ?? 'Could not save that card.');
    }
  };

  return (
    <Screen showBack avoidKeyboard>
      <Title className="mt-2">{editing ? 'Edit card' : 'Adding New credit card'}</Title>

      {/* Live preview — the colour picker is otherwise a blind choice. */}
      <View className="mt-6 w-full">
        <PaymentCard
          card={{
            id: 'preview',
            holder: name,
            balance: Number(balance) || 0,
            last4,
            network,
            color,
          }}
          placeholderHolder="Name of the card"
        />
      </View>

      <View className="mt-8 w-full">
        <FieldLabel className="mb-3">Select Network provider</FieldLabel>
        <NetworkPicker networks={NETWORKS} value={network} onChange={setNetwork} />
      </View>

      <View className="mt-8 w-full">
        <TextField
          label="Name of the card"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          returnKeyType="done"
        />
      </View>

      <View className="mt-6 w-full">
        <FieldLabel className="mb-3">Card colour</FieldLabel>
        <ColorPicker value={color} onChange={setColor} />
      </View>

      <View className="mt-8 w-full border-t border-line pt-4">
        <CollapsibleSection
          title="More setup"
          badgeLabel="Recommended"
          infoTitle="Why add these?"
          infoMessage={MORE_SETUP_INFO}
        >
          <View className="w-full gap-5">
            <TextField
              label="Last 4 digits"
              value={last4}
              onChangeText={(text) => setLast4(text.replace(/\D/g, '').slice(0, 4))}
              keyboardType="number-pad"
              returnKeyType="next"
            />

            <SelectField
              label="Bill due date"
              value={dueDate ? formatFullDate(dueDate) : ''}
              placeholder="Choose a date"
              icon={Calendar}
              onPress={() => setDatePickerOpen(true)}
            />

            <View className="w-full">
              <FieldLabel className="mb-2">Reminder</FieldLabel>
              <SegmentedControl
                options={REMINDER_OPTIONS}
                value={reminder}
                onChange={setReminder}
              />
            </View>

            <SelectField
              label="Today's balance"
              value={balance ? formatCurrency(Number(balance)) : ''}
              placeholder="Enter an amount"
              icon={Wallet}
              onPress={() => setAmountPadOpen(true)}
            />
          </View>
        </CollapsibleSection>
      </View>

      {error ? (
        <Text
          className="mt-6 w-full text-center font-poppins text-[13px] text-red-600"
          maxFontSizeMultiplier={1.4}
        >
          {error}
        </Text>
      ) : null}

      <View className="mt-auto w-full gap-3 pt-10">
        <Button
          label={
            createCard.isPending || updateCard.isPending
              ? 'Saving…'
              : editing
                ? 'Save changes'
                : 'Add card'
          }
          onPress={handleSave}
        />
        {editing ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete this card"
            onPress={handleDelete}
            className="min-h-12 w-full flex-row items-center justify-center gap-2 rounded-[10px] active:bg-black/5"
          >
            <Trash2 size={17} color="#DC2626" strokeWidth={1.9} />
            <Text
              className="font-poppins-medium text-[15px] text-red-600"
              maxFontSizeMultiplier={1.4}
            >
              {deleteCard.isPending ? 'Deleting…' : 'Delete card'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {datePickerOpen ? (
        <DatePicker
          value={dueDate ?? new Date()}
          onCancel={() => setDatePickerOpen(false)}
          onConfirm={(date) => {
            setDueDate(date);
            setDatePickerOpen(false);
          }}
        />
      ) : null}

      {amountPadOpen ? (
        <AmountPad
          title="Balance today"
          caption="Card balance"
          value={balance}
          onCancel={() => setAmountPadOpen(false)}
          onConfirm={(next) => {
            setBalance(next);
            setAmountPadOpen(false);
          }}
        />
      ) : null}
    </Screen>
  );
}
