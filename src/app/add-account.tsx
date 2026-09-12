import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Calculator, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AccountCard } from '@/components/cards/account-card';
import { AmountPad } from '@/components/ui/amount-pad';
import { AmountStep } from '@/components/flow/amount-step';
import { InlineCalendar } from '@/components/flow/inline-calendar';
import { StepFlow } from '@/components/flow/step-flow';
import { CalculatorPad } from '@/components/ui/calculator-pad';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { ColorPicker } from '@/components/ui/color-picker';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { Skeleton } from '@/components/ui/skeleton';
import { usePro } from '@/api/pro';
import { useBankAccounts, useBankAccount, useSalaryAccountIds } from '@/api/queries';
import { useConfirm } from '@/providers/dialog-provider';
import { ReminderField } from '@/components/ui/reminder-field';
import { SelectField } from '@/components/ui/select-field';
import { TextField } from '@/components/ui/text-field';
import { FieldLabel } from '@/components/ui/typography';
import {
  useCreateBankAccount,
  useCreateSalarySource,
  useSetSalaryAccounts,
  useDeleteBankAccount,
  useUpdateBankAccount,
} from '@/api/mutations';
import {
  choiceToLead,
  useApplyReminder,
  useReminderChoice,
  type ReminderChoice,
} from '@/api/reminders';
import { useColors } from '@/providers/theme-provider';
import { useArtwork } from '@/theme/artwork';
import { ACCOUNT_TYPES, type AccountType } from '@/data/accounts-mock';
import {
  PAY_FREQUENCIES,
  formatFullDate,
  getNextPayday,
  toIsoDate,
  type PayFrequency,
} from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { success, warn } from '@/lib/haptics';
import { saveErrorMessage } from '@/lib/save-error';
import { DEFAULT_CARD_COLOR } from '@/theme/card-colors';

const TYPE_OPTIONS = ACCOUNT_TYPES.map((type) => ({ value: type, label: type }));

/** Loads the account being edited, then seeds the form by remount. */
export default function AddAccountScreen() {
  // Deep-link guard: creating past the free allowance opens the case
  // for Pro instead of a form the database would refuse. Editing is
  // untouched. Wrapper-shaped so the hook count never changes.
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { pro, ready } = usePro();
  const existing = useBankAccounts();
  if (!id && ready && !pro && (existing.data?.length ?? 0) >= 1) {
    return <Redirect href={{ pathname: '/pro-feature', params: { id: 'unlimited' } }} />;
  }
  return <AddAccountScreenInner />;
}

/**
 * An edit only ever runs on a record it actually has.
 *
 * `id` is what makes Save an update, so a form mounted while the read failed
 * would put a blank bank name and a $0 balance over a real account. Loading,
 * could not be read and no longer there are three separate answers; none of
 * them is a blank form, and a failed read never turns into a new account.
 */
function AddAccountScreenInner() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const artwork = useArtwork();
  const account = useBankAccount(id);
  const existing = account.data ?? null;

  if (id && !existing) {
    if (account.isError) {
      return (
        <Screen showBack>
          <PageState
            art={artwork.error}
            title="Could not open this account"
            message="Check your connection and try again. Your balance has not been touched."
            actionLabel="Try again"
            onAction={() => {
              void account.refetch();
            }}
            secondaryLabel="Go back"
            onSecondary={() => router.back()}
          />
        </Screen>
      );
    }

    if (!account.isFetched) {
      return (
        <StepFlow
          title="Edit account"
          steps={3}
          current={1}
          onBack={() => router.back()}
          primaryLabel="Continue"
          primaryDisabled
          onPrimary={() => {}}
        >
          <View className="w-full gap-6">
            <Skeleton className="h-[180px] w-full rounded-[16px]" />
            <Skeleton className="h-14 w-full rounded-[12px]" />
          </View>
        </StepFlow>
      );
    }

    return (
      <Screen showBack>
        <PageState
          art={artwork.error}
          title="That account is not here"
          message="It may have been removed. Nothing has been changed."
          actionLabel="Go back"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  return <AccountForm key={existing?.id ?? 'new'} id={id} existing={existing} />;
}

function AccountForm({
  id,
  existing,
}: {
  id?: string;
  existing: ReturnType<typeof useBankAccount>['data'] | null;
}) {
  const colors = useColors();
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

  // Editing opens on the details, not the keypad.
  const [step, setStep] = useState(editing ? 1 : 0);
  const [incomePadOpen, setIncomePadOpen] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);

  // Only meaningful once a last pay day is known.
  const nextPayday = lastPayday ? getNextPayday(lastPayday, payFrequency) : null;

  // Saving waits on the data layer; this only closes the screen.
  const [error, setError] = useState<{ message: string; step: number } | null>(null);

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
      setError({ message: saveErrorMessage(thrown, 'Could not delete that account.'), step });
    }
  };
  const createSalary = useCreateSalarySource();
  const setSalaryAccounts = useSetSalaryAccounts();

  const savedReminder = useReminderChoice('account', id);
  const [reminderDraft, setReminderDraft] = useState<ReminderChoice | null>(null);
  const [timeDraft, setTimeDraft] = useState<string | null>(null);
  const reminder = reminderDraft ?? savedReminder.choice;
  const remindAt = timeDraft ?? savedReminder.remindAt;
  const applyReminder = useApplyReminder();

  const salaryAccounts = useSalaryAccountIds();
  // An account reminder is about pay arriving, so it means nothing until
  // something is paid in. On a new account that is the income being entered
  // right here; on an existing one it is whatever is already linked.
  const payLandsHere = editing ? salaryAccounts.ids.has(id ?? '') : Number(income) > 0;
  // Only while editing: a new account's answer comes from the figure typed on
  // the step before, which no read can fail. An empty set from a read that has
  // not landed — or has failed — is indistinguishable from "nothing is paid in
  // here", and the reminder would simply vanish with an explanation that is
  // not true.
  const payLookupPending = Boolean(editing) && salaryAccounts.isLoading;
  const payLookupFailed = Boolean(editing) && salaryAccounts.isError;
  const payLookupUnknown = payLookupPending || payLookupFailed;

  /** A check for a field on an earlier step sends you back to that step. */
  const fail = (message: string, atStep: number) => {
    warn();
    setError({ message, step: atStep });
    setStep(atStep);
  };

  const handleSave = async () => {
    setError(null);
    if (!bankName.trim()) {
      fail('Enter the bank name.', 1);
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

      const accountId =
        editing && id
          ? (await updateAccount.mutateAsync({ id, values }), id)
          : (await createAccount.mutateAsync(values)).id;

      // Income entered here is a salary source in its own right, so it is
      // saved as one rather than being dropped with the rest of the screen —
      // and pointed at this account, which is the whole reason it was typed on
      // this form. Without the link the money existed but landed nowhere.
      const pay = Number(income);
      if (!editing && Number.isFinite(pay) && pay > 0) {
        const salary = await createSalary.mutateAsync({
          name: nickname.trim() || bankName.trim(),
          amount: pay,
          frequency: payFrequency,
          last_payday: lastPayday ? toIsoDate(lastPayday) : null,
        });
        await setSalaryAccounts.mutateAsync({
          salaryId: salary.id,
          accountIds: [accountId],
        });
      }

      // Untouched while the link is unknown. `payLandsHere` is false for an
      // empty set, and `applyReminder(…, null)` deletes the row — so saving
      // during a read that failed or has not landed would quietly remove a
      // payday reminder set weeks ago, on a step that was not even offering
      // the controls.
      if (!payLookupUnknown) {
        await applyReminder(
          'account',
          accountId,
          payLandsHere ? choiceToLead(reminder) : null,
          remindAt,
        );
      }

      success();
      router.back();
    } catch (thrown) {
      warn();
      setError({ message: saveErrorMessage(thrown, 'Could not save that account.'), step: 2 });
    }
  };

  const busy = createAccount.isPending || updateAccount.isPending;

  // A balance of zero is a real answer for an account, so step 1 never blocks
  // on the figure — only on the one field the mutation itself insists on.
  const stepValid = step === 1 ? Boolean(bankName.trim()) : !busy;

  const question =
    step === 0
      ? 'What is in the account today?'
      : step === 2
        ? 'When was the last pay day?'
        : undefined;
  const primaryLabel =
    step < 2 ? 'Continue' : busy ? 'Saving…' : editing ? 'Save changes' : 'Save account';
  const stepError = error && error.step === step ? error.message : null;

  return (
    <StepFlow
      title={editing ? 'Edit account' : 'Add an account'}
      steps={3}
      current={step}
      onBack={() => {
        setError(null);
        if (step === 0) router.back();
        else setStep((current) => current - 1);
      }}
      question={question}
      primaryLabel={primaryLabel}
      primaryDisabled={!stepValid}
      onPrimary={() => {
        if (step < 2) {
          setError(null);
          setStep((current) => current + 1);
          return;
        }
        void handleSave();
      }}
      error={step === 1 ? null : stepError}
      avoidKeyboard={step === 1}
      footerSlot={
        editing ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete this account"
            onPress={handleDelete}
            className="min-h-12 w-full flex-row items-center justify-center gap-2 rounded-full active:bg-ink/5"
          >
            <Trash2 size={17} color={colors.danger} strokeWidth={1.8} />
            <Text
              className="font-poppins-medium text-[15px] text-danger"
              maxFontSizeMultiplier={1.4}
            >
              {deleteAccount.isPending ? 'Deleting…' : 'Delete account'}
            </Text>
          </Pressable>
        ) : null
      }
    >
      {step === 0 ? <AmountStep value={balance} onChange={setBalance} /> : null}

      {step === 1 ? (
        <View className="w-full gap-6">
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

          <TextField
            label="Bank name"
            value={bankName}
            onChangeText={setBankName}
            autoCapitalize="words"
            returnKeyType="next"
          />

          <View className="w-full">
            <FieldLabel className="mb-2">Account type</FieldLabel>
            <ChoiceChips options={TYPE_OPTIONS} value={accountType} onChange={setAccountType} />
          </View>

          <TextField
            label="Name of the account"
            value={nickname}
            onChangeText={setNickname}
            autoCapitalize="words"
            returnKeyType="done"
          />

          <View className="w-full">
            <FieldLabel className="mb-3">Card colour</FieldLabel>
            <ColorPicker value={color} onChange={setColor} />
          </View>

          <TextField
            label="Last 4 digits"
            value={last4}
            onChangeText={(text) => setLast4(text.replace(/\D/g, '').slice(0, 4))}
            keyboardType="number-pad"
            returnKeyType="done"
          />

          <SelectField
            label="Expected income"
            variant="pill"
            value={income ? formatCurrency(Number(income)) : ''}
            placeholder="Enter an amount"
            icon={Calculator}
            onPress={() => setIncomePadOpen(true)}
            onIconPress={() => setCalculatorOpen(true)}
            iconAccessibilityLabel="Open calculator"
          />

          {stepError ? (
            <Text
              className="w-full font-poppins text-[13px] text-danger"
              maxFontSizeMultiplier={1.4}
            >
              {stepError}
            </Text>
          ) : null}
        </View>
      ) : null}

      {step === 2 ? (
        <View className="w-full gap-6">
          <View className="w-full">
            <InlineCalendar value={lastPayday} onChange={setLastPayday} />
            {nextPayday ? (
              <Text
                className="mt-2 w-full text-center font-poppins text-[13px] text-muted"
                maxFontSizeMultiplier={1.4}
              >
                Next payday: {formatFullDate(nextPayday)}
              </Text>
            ) : null}
          </View>

          <View className="w-full">
            <FieldLabel className="mb-2">How often are you paid?</FieldLabel>
            <ChoiceChips
              options={PAY_FREQUENCIES}
              value={payFrequency}
              onChange={setPayFrequency}
            />
          </View>

          <ReminderField
            kind="account"
            value={reminder}
            onChange={setReminderDraft}
            time={remindAt}
            onTimeChange={setTimeDraft}
            unavailable={
              payLookupPending
                ? 'Checking what is paid into this account…'
                : payLookupFailed
                  ? 'Skip could not check what is paid into this account, so it cannot set this up yet.'
                  : payLandsHere
                    ? null
                    : 'Add the income paid into this account and Skip can tell you when it lands.'
            }
            onRetry={payLookupFailed ? () => void salaryAccounts.refetch() : undefined}
          />
        </View>
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
          // The pay frequency is asked for on the step after this one, so
          // naming a cycle here would state a choice nobody has made yet.
          caption="Each pay period"
          value={income}
          onCancel={() => setIncomePadOpen(false)}
          onConfirm={(next) => {
            setIncome(next);
            setIncomePadOpen(false);
          }}
        />
      ) : null}
    </StepFlow>
  );
}
