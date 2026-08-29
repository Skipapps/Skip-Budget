import { router, useLocalSearchParams } from 'expo-router';
import { Calendar, Trash2, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import {
  choiceToLead,
  useApplyReminder,
  useReminderChoice,
  type ReminderChoice,
} from '@/api/reminders';
import { useSpendCategories } from '@/api/brands';
import {
  useCreateSubscription,
  useDeleteSubscription,
  useUpdateSubscription,
} from '@/api/mutations';
import { usePaymentSources, useSubscription } from '@/api/queries';
import { BrandField, type BrandSelection } from '@/components/brands/brand-field';
import { AmountPad } from '@/components/ui/amount-pad';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Screen } from '@/components/ui/screen';
import { useConfirm } from '@/providers/dialog-provider';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { ReminderField } from '@/components/ui/reminder-field';
import { SelectField } from '@/components/ui/select-field';
import { SourceTiles } from '@/components/ui/source-tiles';
import { TextField } from '@/components/ui/text-field';
import { FieldLabel, Title } from '@/components/ui/typography';
import { formatFullDate, toIsoDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { useColors } from '@/providers/theme-provider';

const CYCLES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
] as const;

type Cycle = (typeof CYCLES)[number]['value'];

type Initial = {
  service: BrandSelection | null;
  amount: string;
  cycle: Cycle;
  renewsOn: Date | null;
  sourceId: string;
  note: string;
  active: boolean;
};

const BLANK: Initial = {
  service: null,
  amount: '',
  cycle: 'monthly',
  renewsOn: null,
  sourceId: '',
  note: '',
  active: true,
};

/** Loads the row, then seeds the form by remount — see add-receipt for why. */
export default function AddSubscriptionScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data: existing, isLoading } = useSubscription(id);

  if (id && isLoading && !existing) {
    return (
      <Screen showBack>
        <Title className="mt-2">Edit subscription</Title>
        <View className="mt-16 w-full items-center">
          <ActivityIndicator size="small" color={colors.muted} />
        </View>
      </Screen>
    );
  }

  const initial: Initial = existing
    ? {
        service: {
          brandId: existing.brand_id,
          name: existing.name,
          domain: existing.brands?.domain ?? null,
          categoryId: existing.category_id,
        },
        amount: String(existing.amount),
        cycle: existing.cycle,
        renewsOn: existing.next_renewal_on
          ? new Date(`${existing.next_renewal_on}T00:00:00`)
          : null,
        sourceId: existing.card_id ?? existing.bank_account_id ?? '',
        note: existing.note ?? '',
        active: existing.active,
      }
    : BLANK;

  return <SubscriptionForm key={existing?.id ?? 'new'} id={id} initial={initial} />;
}

function SubscriptionForm({ id, initial }: { id?: string; initial: Initial }) {
  const editing = Boolean(id);

  const [service, setService] = useState<BrandSelection | null>(initial.service);
  const [amount, setAmount] = useState(initial.amount);
  const [cycle, setCycle] = useState<Cycle>(initial.cycle);
  const [renewsOn, setRenewsOn] = useState<Date | null>(initial.renewsOn);
  const [sourceId, setSourceId] = useState(initial.sourceId);
  const [note, setNote] = useState(initial.note);
  const [active, setActive] = useState(initial.active);

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [amountPadOpen, setAmountPadOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { sources } = usePaymentSources();
  const { data: categories = [] } = useSpendCategories();

  const createSubscription = useCreateSubscription();
  const updateSubscription = useUpdateSubscription();
  const deleteSubscription = useDeleteSubscription();
  const confirm = useConfirm();

  const categoryLabel = service
    ? (categories.find((category) => category.id === service.categoryId)?.label ?? 'Other')
    : null;

  const savedReminder = useReminderChoice('subscription', id);
  const [reminderDraft, setReminderDraft] = useState<ReminderChoice | null>(null);
  const [timeDraft, setTimeDraft] = useState<string | null>(null);
  const reminder = reminderDraft ?? savedReminder.choice;
  const remindAt = timeDraft ?? savedReminder.remindAt;
  const applyReminder = useApplyReminder();

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
    const values = {
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
      active,
    };

    try {
      const subscriptionId =
        editing && id
          ? (await updateSubscription.mutateAsync({ id, values }), id)
          : (await createSubscription.mutateAsync(values)).id;

      // After the row exists, because a reminder points at one.
      await applyReminder('subscription', subscriptionId, choiceToLead(reminder), remindAt);
      router.back();
    } catch (thrown) {
      setError((thrown as Error).message ?? 'Could not save that subscription.');
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    const ok = await confirm({
      title: 'Delete this subscription?',
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;

    try {
      await deleteSubscription.mutateAsync(id);
      router.back();
    } catch (thrown) {
      setError((thrown as Error).message ?? 'Could not delete that subscription.');
    }
  };

  const busy = createSubscription.isPending || updateSubscription.isPending;

  return (
    <Screen showBack avoidKeyboard>
      <Title className="mt-2">{editing ? 'Edit subscription' : 'Add subscription'}</Title>

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

        <ReminderField
          kind="subscription"
          value={reminder}
          onChange={setReminderDraft}
          time={remindAt}
          onTimeChange={setTimeDraft}
        />

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

        {/* Cancelling keeps the history. Only offered on something that
            already exists — nobody adds a subscription as cancelled. */}
        {editing ? (
          <View className="w-full">
            <FieldLabel className="mb-2">Status</FieldLabel>
            <SegmentedControl
              options={[
                { value: 'active', label: 'Active' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
              value={active ? 'active' : 'cancelled'}
              onChange={(next) => setActive(next === 'active')}
            />
          </View>
        ) : null}

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

      <View className="mt-auto w-full gap-3 pt-10">
        <Button
          label={busy ? 'Saving…' : editing ? 'Save changes' : 'Save subscription'}
          onPress={handleSave}
        />
        {editing ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete this subscription"
            onPress={handleDelete}
            className="min-h-12 w-full flex-row items-center justify-center gap-2 rounded-[10px] active:bg-ink/5"
          >
            <Trash2 size={17} color="#DC2626" strokeWidth={1.9} />
            <Text
              className="font-poppins-medium text-[15px] text-red-600"
              maxFontSizeMultiplier={1.4}
            >
              {deleteSubscription.isPending ? 'Deleting…' : 'Delete subscription'}
            </Text>
          </Pressable>
        ) : null}
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
