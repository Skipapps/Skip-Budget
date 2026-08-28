import { router, useLocalSearchParams } from 'expo-router';
import { Calculator, Calendar, Trash2, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { AccountCard } from '@/components/cards/account-card';
import { AmountPad } from '@/components/ui/amount-pad';
import { Button } from '@/components/ui/button';
import { CalculatorPad } from '@/components/ui/calculator-pad';
import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { ColorPicker } from '@/components/ui/color-picker';
import { DatePicker } from '@/components/ui/date-picker';
import { Screen } from '@/components/ui/screen';
import { useConfirm } from '@/providers/dialog-provider';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { SelectField } from '@/components/ui/select-field';
import { TextField } from '@/components/ui/text-field';
import { FieldLabel, Title } from '@/components/ui/typography';
import {
  useCreateBankAccount,
  useCreateSalarySource,
  useDeleteBankAccount,
  useUpdateBankAccount,
} from '@/api/mutations';
import { useBankAccount } from '@/api/queries';
import { colors } from '@/theme/colors';
import { ACCOUNT_TYPES, type AccountType } from '@/data/accounts-mock';
import {
  PAY_FREQUENCIES,
  formatFullDate,
  getNextPayday,
  toIsoDate,
  type PayFrequency,
} from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { DEFAULT_CARD_COLOR } from '@/theme/card-colors';

const TYPE_OPTIONS = ACCOUNT_TYPES.map((type) => ({ value: type, label: type }));

const MORE_SETUP_INFO =
  'Adding more details helps Skip calculate accurate balances and predict future transactions made with this account.';

/** Loads the account being edited, then seeds the form by remount. */
export default function AddAccountScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data: existing, isLoading } = useBankAccount(id);

  if (id && isLoading && !existing) {
    return (
      <Screen showBack>
        <Title className="mt-2">Edit account</Title>
        <View className="mt-16 w-full items-center">
          <ActivityIndicator size="small" color={colors.muted} />
        </View>
      </Screen>
    );
  }

  return <AccountForm key={existing?.id ?? 'new'} id={id} existing={existing ?? null} />;
}

function AccountForm({
  id,
  existing,
}: {
  id?: string;
  existing: ReturnType<typeof useBankAccount>['data'] | null;
}) {
  const editing = Boolean(id);
  const [bankName, setBankName] = useState(existing?.bank_name ?? '');
  const [nickname, setNickname] = useState(existing?.nickname ?? '');
  const [accountType, setAccountType] = useState<AccountType>(
    existing
      ? ((existing.account_type === 'savings' ? 'Savings' : 'Checking') as AccountType)
      : 'Checking',
  );
  const [color, setColor] = useState<string>(existing?.color ?? DEFAULT_CARD_COLOR);

  const [last4, setLast4] = useState(existing?.last4 ?? '');
  const [balance, setBalance] = useState(existing ? String(existing.balance) : '');
  const [income, setIncome] = useState('');
  const [payFrequency, setPayFrequency] = useState<PayFrequency>('monthly');
  const [lastPayday, setLastPayday] = useState<Date | null>(null);

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [balancePadOpen, setBalancePadOpen] = useState(false);
  const [incomePadOpen, setIncomePadOpen] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);

  const frequencyMeta = PAY_FREQUENCIES.find((option) => option.value === payFrequency);
  // Only meaningful once a last pay day is known.
  const nextPayday = lastPayday ? getNextPayday(lastPayday, payFrequency) : null;

  // Saving waits on the data layer; this only closes the screen.
  const [error, setError] = useState<string | null>(null);

  const createAccount = useCreateBankAccount();
  const updateAccount = useUpdateBankAccount();
  const deleteAccount = useDeleteBankAccount();
  const confirm = useConfirm();

  const handleDelete = async () => {
    if (!id) return;
    const ok = await confirm({
      title: 'Delete this account?',
      message:
        'Receipts, bills and subscriptions paid from it are kept, but stop showing this account.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;

    try {
      await deleteAccount.mutateAsync(id);
      router.back();
    } catch (thrown) {
      setError((thrown as Error).message ?? 'Could not delete that account.');
    }
  };
  const createSalary = useCreateSalarySource();

  const handleSave = async () => {
    setError(null);
    if (!bankName.trim()) {
      setError('Enter the bank name.');
      return;
    }

    try {
      const values = {
        bank_name: bankName.trim(),
        nickname: nickname.trim() || null,
        // The picker shows "Checking"; the column is a lowercase enum.
        account_type: accountType.toLowerCase() as 'checking' | 'savings',
        last4: last4.length === 4 ? last4 : null,
        color,
        balance: Number(balance) || 0,
        balance_as_of: balance ? toIsoDate(new Date()) : null,
      };

      if (editing && id) {
        await updateAccount.mutateAsync({ id, values });
      } else {
        await createAccount.mutateAsync(values);
      }

      // Income entered here is a salary source in its own right, so it is
      // saved as one rather than being dropped with the rest of the screen.
      const pay = Number(income);
      if (!editing && Number.isFinite(pay) && pay > 0) {
        await createSalary.mutateAsync({
          name: nickname.trim() || bankName.trim(),
          amount: pay,
          frequency: payFrequency,
          last_payday: lastPayday ? toIsoDate(lastPayday) : null,
        });
      }

      router.back();
    } catch (thrown) {
      setError((thrown as Error).message ?? 'Could not save that account.');
    }
  };

  return (
    <Screen showBack avoidKeyboard>
      <Title className="mt-2">{editing ? 'Edit account' : 'Adding New bank account'}</Title>

      <View className="mt-6 w-full">
        <AccountCard
          account={{
            id: 'preview',
            bankName,
            nickname,
            accountType,
            balance: Number(balance) || 0,
            last4,
            color,
          }}
          placeholderName="Bank name"
        />
      </View>

      <View className="mt-8 w-full">
        <TextField
          label="Bank name"
          value={bankName}
          onChangeText={setBankName}
          autoCapitalize="words"
          returnKeyType="next"
        />
      </View>

      <View className="mt-6 w-full">
        <FieldLabel className="mb-2">Account type</FieldLabel>
        <SegmentedControl options={TYPE_OPTIONS} value={accountType} onChange={setAccountType} />
      </View>

      <View className="mt-6 w-full">
        <TextField
          label="Name of the account"
          value={nickname}
          onChangeText={setNickname}
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
              returnKeyType="done"
            />

            <SelectField
              label="Today's balance"
              value={balance ? formatCurrency(Number(balance)) : ''}
              placeholder="Enter an amount"
              icon={Wallet}
              onPress={() => setBalancePadOpen(true)}
            />

            <SelectField
              label="Expected income"
              value={income ? formatCurrency(Number(income)) : ''}
              placeholder="Enter an amount"
              icon={Calculator}
              onPress={() => setIncomePadOpen(true)}
              onIconPress={() => setCalculatorOpen(true)}
              iconAccessibilityLabel="Open calculator"
            />

            <View className="w-full">
              <FieldLabel className="mb-2">How often are you paid?</FieldLabel>
              <ChoiceChips
                options={PAY_FREQUENCIES}
                value={payFrequency}
                onChange={setPayFrequency}
              />
            </View>

            <View className="w-full">
              <SelectField
                label="Last pay day"
                value={lastPayday ? formatFullDate(lastPayday) : ''}
                placeholder="Choose a date"
                icon={Calendar}
                onPress={() => setDatePickerOpen(true)}
              />
              {nextPayday ? (
                <Text
                  className="ml-5 mt-1.5 font-poppins text-[13px] text-muted"
                  maxFontSizeMultiplier={1.4}
                >
                  Next payday: {formatFullDate(nextPayday)}
                </Text>
              ) : null}
            </View>
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
            createAccount.isPending || updateAccount.isPending
              ? 'Saving…'
              : editing
                ? 'Save changes'
                : 'Add account'
          }
          onPress={handleSave}
        />
        {editing ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete this account"
            onPress={handleDelete}
            className="min-h-12 w-full flex-row items-center justify-center gap-2 rounded-[10px] active:bg-black/5"
          >
            <Trash2 size={17} color="#DC2626" strokeWidth={1.9} />
            <Text
              className="font-poppins-medium text-[15px] text-red-600"
              maxFontSizeMultiplier={1.4}
            >
              {deleteAccount.isPending ? 'Deleting…' : 'Delete account'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {datePickerOpen ? (
        <DatePicker
          value={lastPayday ?? new Date()}
          onCancel={() => setDatePickerOpen(false)}
          onConfirm={(date) => {
            setLastPayday(date);
            setDatePickerOpen(false);
          }}
        />
      ) : null}

      {balancePadOpen ? (
        <AmountPad
          title="Balance today"
          caption="Account balance"
          value={balance}
          onCancel={() => setBalancePadOpen(false)}
          onConfirm={(next) => {
            setBalance(next);
            setBalancePadOpen(false);
          }}
        />
      ) : null}

      {calculatorOpen ? (
        <CalculatorPad
          title="Calculator"
          value={income}
          onCancel={() => setCalculatorOpen(false)}
          onConfirm={(next) => {
            setIncome(next);
            setCalculatorOpen(false);
          }}
        />
      ) : null}

      {incomePadOpen ? (
        <AmountPad
          title="Expected income"
          caption={frequencyMeta?.caption ?? 'Each pay period'}
          value={income}
          onCancel={() => setIncomePadOpen(false)}
          onConfirm={(next) => {
            setIncome(next);
            setIncomePadOpen(false);
          }}
        />
      ) : null}
    </Screen>
  );
}
