import { router } from 'expo-router';
import { Calculator, Calendar, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { AccountCard } from '@/components/cards/account-card';
import { AmountPad } from '@/components/ui/amount-pad';
import { Button } from '@/components/ui/button';
import { CalculatorPad } from '@/components/ui/calculator-pad';
import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { ColorPicker } from '@/components/ui/color-picker';
import { DatePicker } from '@/components/ui/date-picker';
import { Screen } from '@/components/ui/screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { SelectField } from '@/components/ui/select-field';
import { TextField } from '@/components/ui/text-field';
import { FieldLabel, Title } from '@/components/ui/typography';
import { useCreateBankAccount, useCreateSalarySource } from '@/api/mutations';
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

export default function AddAccountScreen() {
  const [bankName, setBankName] = useState('');
  const [nickname, setNickname] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('Checking');
  const [color, setColor] = useState<string>(DEFAULT_CARD_COLOR);

  const [last4, setLast4] = useState('');
  const [balance, setBalance] = useState('');
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
  const createSalary = useCreateSalarySource();

  const handleSave = async () => {
    setError(null);
    if (!bankName.trim()) {
      setError('Enter the bank name.');
      return;
    }

    try {
      await createAccount.mutateAsync({
        bank_name: bankName.trim(),
        nickname: nickname.trim() || null,
        // The picker shows "Checking"; the column is a lowercase enum.
        account_type: accountType.toLowerCase() as 'checking' | 'savings',
        last4: last4.length === 4 ? last4 : null,
        color,
        balance: Number(balance) || 0,
      });

      // Income entered here is a salary source in its own right, so it is
      // saved as one rather than being dropped with the rest of the screen.
      const pay = Number(income);
      if (Number.isFinite(pay) && pay > 0) {
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
      <Title className="mt-2">Adding New bank account</Title>

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

      <View className="mt-auto w-full pt-10">
        <Button label={createAccount.isPending ? 'Saving…' : 'Add account'} onPress={handleSave} />
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
