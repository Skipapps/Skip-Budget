import { router } from 'expo-router';
import { Calendar, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

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
import { formatFullDate } from '@/lib/date';
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

export default function AddCardScreen() {
  const [network, setNetwork] = useState<string>(NETWORKS[0]);
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(DEFAULT_CARD_COLOR);

  const [last4, setLast4] = useState('');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [reminder, setReminder] = useState<Reminder>('3');
  const [balance, setBalance] = useState('');

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [amountPadOpen, setAmountPadOpen] = useState(false);

  // Saving waits on the data layer; this only closes the screen.
  const handleSave = () => router.back();

  return (
    <Screen showBack avoidKeyboard>
      <Title className="mt-2">Adding New credit card</Title>

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

      <View className="mt-auto w-full pt-10">
        <Button label="Add card" onPress={handleSave} />
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
