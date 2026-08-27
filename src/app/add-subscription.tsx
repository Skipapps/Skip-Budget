import { router } from 'expo-router';
import { Calendar, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { useSpendCategories } from '@/api/brands';
import { usePaymentSources } from '@/api/queries';
import { useCreateSubscription } from '@/api/mutations';
import { BrandField, type BrandSelection } from '@/components/brands/brand-field';
import { AmountPad } from '@/components/ui/amount-pad';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Screen } from '@/components/ui/screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { SelectField } from '@/components/ui/select-field';
import { SourceTiles } from '@/components/ui/source-tiles';
import { TextField } from '@/components/ui/text-field';
import { FieldLabel, Title } from '@/components/ui/typography';
import { formatFullDate, toIsoDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';

const CYCLES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
] as const;

type Cycle = (typeof CYCLES)[number]['value'];

export default function AddSubscriptionScreen() {
  const [service, setService] = useState<BrandSelection | null>(null);
  const [amount, setAmount] = useState('');
  const [cycle, setCycle] = useState<Cycle>('monthly');
  const [renewsOn, setRenewsOn] = useState<Date | null>(null);
  const [sourceId, setSourceId] = useState('');
  const [note, setNote] = useState('');

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [amountPadOpen, setAmountPadOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { sources } = usePaymentSources();
  const { data: categories = [] } = useSpendCategories();
  const createSubscription = useCreateSubscription();

  const categoryLabel = service
    ? (categories.find((category) => category.id === service.categoryId)?.label ?? 'Other')
    : null;

  const handleSave = async () => {
    setError(null);

    if (!service) {
      setError('Pick a service first.');
      return;
    }
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter what it costs.');
      return;
    }

    const chosen = sources.find((source) => source.id === sourceId);

    try {
      await createSubscription.mutateAsync({
        brand_id: service.brandId,
        name: service.name,
        amount: value,
        cycle,
        // Optional: plenty of people know the cost but not the renewal date,
        // and refusing to save over that would be the wrong trade.
        next_renewal_on: renewsOn ? toIsoDate(renewsOn) : null,
        category_id: service.categoryId || 'other',
        card_id: chosen?.kind === 'card' ? chosen.id : null,
        bank_account_id: chosen?.kind === 'account' ? chosen.id : null,
        note: note.trim() || null,
        active: true,
      });
      router.back();
    } catch (thrown) {
      setError((thrown as Error).message ?? 'Could not save that subscription.');
    }
  };

  return (
    <Screen showBack avoidKeyboard>
      <Title className="mt-2">Add subscription</Title>

      <View className="mt-8 w-full gap-6">
        <BrandField
          label="Service"
          value={service}
          onChange={setService}
          placeholder="Search for a service"
        />

        <SelectField
          label="Amount"
          value={amount ? formatCurrency(Number(amount)) : ''}
          placeholder="Enter an amount"
          icon={Wallet}
          onPress={() => setAmountPadOpen(true)}
        />

        <View className="w-full">
          <FieldLabel className="mb-2">Billing cycle</FieldLabel>
          <SegmentedControl options={CYCLES} value={cycle} onChange={setCycle} />
        </View>

        <SelectField
          label="Next renewal"
          value={renewsOn ? formatFullDate(renewsOn) : ''}
          placeholder="Choose a date"
          icon={Calendar}
          onPress={() => setDatePickerOpen(true)}
        />

        {sources.length > 0 ? (
          <View className="w-full">
            <FieldLabel className="mb-3">Charged to</FieldLabel>
            <SourceTiles sources={sources} value={sourceId} onChange={setSourceId} />
          </View>
        ) : null}

        <TextField
          label="Note"
          optional
          value={note}
          onChangeText={setNote}
          placeholder="Which plan, for example"
          multiline
          maxLength={200}
          autoCapitalize="sentences"
        />

        {categoryLabel ? (
          <Text className="font-poppins text-[13px] text-muted" maxFontSizeMultiplier={1.4}>
            Filed under {categoryLabel}
          </Text>
        ) : null}

        {error ? (
          <Text className="font-poppins text-[13px] text-red-600" maxFontSizeMultiplier={1.4}>
            {error}
          </Text>
        ) : null}
      </View>

      <View className="mt-auto w-full pt-10">
        <Button
          label={createSubscription.isPending ? 'Saving…' : 'Save subscription'}
          onPress={handleSave}
        />
      </View>

      {datePickerOpen ? (
        <DatePicker
          value={renewsOn ?? new Date()}
          onCancel={() => setDatePickerOpen(false)}
          onConfirm={(next) => {
            setRenewsOn(next);
            setDatePickerOpen(false);
          }}
        />
      ) : null}

      {amountPadOpen ? (
        <AmountPad
          title="Amount"
          caption={service ? service.name : 'Subscription cost'}
          value={amount}
          onCancel={() => setAmountPadOpen(false)}
          onConfirm={(next) => {
            setAmount(next);
            setAmountPadOpen(false);
          }}
        />
      ) : null}
    </Screen>
  );
}
