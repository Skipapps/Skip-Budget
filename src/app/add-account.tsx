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
import {
  useBankAccounts,
  useBankAccount,
  useSalaryAccountIds,
  useSalarySources,
} from '@/api/queries';
import { useConfirm } from '@/providers/dialog-provider';
import { useToast } from '@/providers/toast-context';
import { ReminderField } from '@/components/ui/reminder-field';
import { SelectField } from '@/components/ui/select-field';
import { SwitchControl } from '@/components/ui/switch-control';
import { TextField } from '@/components/ui/text-field';
import { FieldLabel } from '@/components/ui/typography';
import {
  useCreateBankAccount,
  useCreateSalarySource,
  useLinkAccountToSalaries,
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
import { ACCOUNT_TYPES, type AccountType } from '@/data/accounts';
import {
  PAY_FREQUENCIES,
  PAY_SCHEDULES,
  formatFullDate,
  getNextPayday,
  toIsoDate,
  type PayFrequency,
} from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { t } from '@/i18n';
import { success, warn } from '@/lib/haptics';
import { failureMessage, failureText } from '@/lib/failure';
import { DEFAULT_CARD_COLOR } from '@/theme/card-colors';

/** The value stays the stored "Checking"/"Savings"; the label is read when the chips draw. */
const TYPE_OPTIONS = ACCOUNT_TYPES.map((type) => ({
  value: type,
  get label() {
    return t(type === 'Savings' ? 'accounts.type.savings' : 'accounts.type.checking');
  },
}));

/** "Acme", "Acme and Side gig", "Acme, Side gig and Rent". */
function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  const last = names[names.length - 1];
  const params = { list: names.slice(0, -1).join(', '), last };
  // An "i" sound ("IBM", "Hilton", not "Hielo") takes the Spanish "e" for "and".
  return /^h?i(?![aeiouáéíóú])/i.test(last)
    ? t('accounts.link.namesBeforeI', params)
    : t('accounts.link.names', params);
}

/** "monthly", "every 2 weeks" — reads on after an amount. */
function frequencyLabel(frequency: PayFrequency): string {
  const match = PAY_FREQUENCIES.find((option) => option.value === frequency);
  return (match?.label ?? frequency).toLowerCase();
}

export default function AddAccountScreen() {
  // Deep-link guard: creating past the free allowance opens Pro instead of a form the database
  // would refuse; editing is untouched. Wrapper-shaped so the hook count never changes. Decided
  // once on arrival: the count changes the moment the form saves, and a live check would shove the
  // person who just added their first account onto the Pro page.
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { pro, ready } = usePro();
  const existing = useBankAccounts();

  const [walled, setWalled] = useState<boolean | null>(null);
  let decided = walled;
  if (decided === null && (id || (ready && !existing.isPending))) {
    decided = !id && !pro && (existing.data?.length ?? 0) >= 1;
    setWalled(decided);
  }
  if (decided) {
    return <Redirect href={{ pathname: '/pro-feature', params: { id: 'unlimited' } }} />;
  }
  return <AddAccountScreenInner />;
}

/**
 * An edit only runs on a record it has: `id` makes Save an update, so a form mounted after a failed
 * read would put a blank bank name and $0 over a real account. Loading, unreadable and gone are
 * separate answers; none is a blank form.
 */
function AddAccountScreenInner() {
  const { id, from: origin } = useLocalSearchParams<{ id?: string; from?: string }>();
  const artwork = useArtwork();
  const account = useBankAccount(id);
  const existing = account.data ?? null;

  if (id && !existing) {
    if (account.isError) {
      return (
        <Screen showBack>
          <PageState
            art={artwork.error}
            title={failureText()}
            actionLabel={t('common.tryAgain')}
            onAction={() => {
              void account.refetch();
            }}
            secondaryLabel={t('cards.form.goBack')}
            onSecondary={() => router.back()}
          />
        </Screen>
      );
    }

    if (!account.isFetched) {
      return (
        <StepFlow
          title={t('accounts.add.editTitle')}
          closePrompt={t('accounts.add.closeEditing')}
          steps={3}
          current={0}
          onBack={() => router.back()}
          primaryLabel={t('common.continue')}
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
          title={failureText()}
          actionLabel={t('cards.form.goBack')}
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  return <AccountForm key={existing?.id ?? 'new'} id={id} existing={existing} origin={origin} />;
}

function AccountForm({
  id,
  existing,
  origin,
}: {
  id?: string;
  existing: ReturnType<typeof useBankAccount>['data'] | null;
  /** 'setup' when the walk-in flow sent us; changes only where Save lands. */
  origin?: string;
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

  const [step, setStep] = useState(0);
  const [incomePadOpen, setIncomePadOpen] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);

  const nextPayday = lastPayday ? getNextPayday(lastPayday, payFrequency) : null;

  const [error, setError] = useState<{ message: string; step: number } | null>(null);

  const createAccount = useCreateBankAccount();
  const updateAccount = useUpdateBankAccount();
  const deleteAccount = useDeleteBankAccount();
  const confirm = useConfirm();
  const toast = useToast();

  const handleDelete = async () => {
    if (!id) return;
    const ok = await confirm({
      title: t('accounts.add.deleteTitle'),
      message: t('accounts.add.deleteMessage'),
      confirmLabel: t('common.delete'),
      destructive: true,
    });
    if (!ok) return;

    try {
      await deleteAccount.mutateAsync(id);
      toast('toast.account.deleted', 'deleted');
      router.back();
    } catch (thrown) {
      setError({ message: failureMessage(thrown), step });
    }
  };
  const createSalary = useCreateSalarySource();
  const setSalaryAccounts = useSetSalaryAccounts();
  const linkSalaries = useLinkAccountToSalaries();
  const salarySources = useSalarySources();
  // Pay already set up (the walk-in's first step) turns the question into "does it land in this
  // account": a switch, on by default from setup. Linked pay brings its own payday and cycle;
  // switched off, income, payday and cycle are asked for pay of this account's own.
  // Schedules only: a one-off pay has landed already and is no account's "my pay".
  const salaries = (salarySources.data ?? []).filter((source) => source.frequency !== 'once');
  const hasSalary = salaries.length > 0;
  const [linkPay, setLinkPay] = useState(origin === 'setup');
  const payLinked = !editing && hasSalary && linkPay;
  const salaryNames = joinNames(salaries.map((source) => source.name.trim()).filter(Boolean));
  const linkTitle = salaryNames
    ? t('accounts.link.lands', { names: salaryNames, count: salaries.length })
    : t('accounts.link.myPay');
  const onlySalary = salaries.length === 1 ? salaries[0] : null;
  const linkCaption = onlySalary
    ? t(onlySalary.last_payday ? 'accounts.link.payWithPayday' : 'accounts.link.pay', {
        amount: formatCurrency(Number(onlySalary.amount)),
        frequency: frequencyLabel(onlySalary.frequency),
      })
    : t('accounts.link.paydaysSet');
  // Income and payday belong to pay, not the account: asked only when adding, where they make a
  // salary source. An edit never saved them.
  const askPay = !editing && !payLinked;

  const savedReminder = useReminderChoice('account', id);
  const [reminderDraft, setReminderDraft] = useState<ReminderChoice | null>(null);
  const [timeDraft, setTimeDraft] = useState<string | null>(null);
  const reminder = reminderDraft ?? savedReminder.choice;
  const remindAt = timeDraft ?? savedReminder.remindAt;
  const applyReminder = useApplyReminder();

  const salaryAccounts = useSalaryAccountIds();
  // An account reminder is about pay arriving, so it needs something paid in: the income typed here
  // on a new account, whatever is already linked on an existing one.
  const payLandsHere = editing ? salaryAccounts.ids.has(id ?? '') : payLinked || Number(income) > 0;
  // Only while editing: a read that has not landed or has failed gives an empty set, which looks
  // like "nothing is paid in" and would make the reminder vanish with a false explanation.
  const payLookupPending = Boolean(editing) && salaryAccounts.isLoading;
  const payLookupFailed = Boolean(editing) && salaryAccounts.isError;
  const payLookupUnknown = payLookupPending || payLookupFailed;

  const fail = (message: string, atStep: number) => {
    warn();
    setError({ message, step: atStep });
    setStep(atStep);
  };

  const handleSave = async () => {
    setError(null);
    if (!bankName.trim()) {
      fail(t('accounts.add.bankNameMissing'), 1);
      return;
    }

    try {
      const values = {
        bank_name: bankName.trim(),
        nickname: nickname.trim() || null,
        // The picker's value is "Checking"; the column is a lowercase enum.
        account_type: accountType.toLowerCase() as 'checking' | 'savings',
        last4: last4.length === 4 ? last4 : null,
        color,
        balance: Number(balance) || 0,
        // An edit that leaves the balance alone keeps its day: re-dating it would drop every
        // charge and pay since.
        balance_as_of:
          existing && Number(balance) === Number(existing.balance)
            ? (existing.balance_as_of ?? null)
            : balance
              ? toIsoDate(new Date())
              : null,
      };

      const accountId =
        editing && id
          ? (await updateAccount.mutateAsync({ id, values }), id)
          : (await createAccount.mutateAsync(values)).id;

      // Income entered here becomes a salary source pointed at this account (without the link the
      // money would land nowhere). Not while existing pay is linked: a figure typed before the
      // switch went back on would mint a second salary.
      const pay = Number(income);
      if (!editing && !payLinked && Number.isFinite(pay) && pay > 0) {
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

      // Existing pay is pointed at this account rather than retyped; additive, so links made on the
      // salary screen survive.
      if (payLinked) {
        await linkSalaries.mutateAsync(accountId);
      }

      // Untouched while the link is unknown: `payLandsHere` is false for an empty set and
      // `applyReminder(…, null)` deletes the row, so a failed or pending read would silently remove
      // an existing reminder.
      if (!payLookupUnknown) {
        await applyReminder(
          'account',
          accountId,
          payLandsHere ? choiceToLead(reminder) : null,
          remindAt,
        );
      }

      success();
      toast(editing ? 'toast.account.updated' : 'toast.account.added');
      if (!editing && origin === 'setup') {
        if (router.canGoBack()) router.back();
        else router.replace('/setup');
      } else router.back();
    } catch (thrown) {
      warn();
      setError({ message: failureMessage(thrown), step: 2 });
    }
  };

  const busy = createAccount.isPending || updateAccount.isPending;

  // Zero is a real balance, so only the bank name blocks.
  const stepValid = step === 1 ? Boolean(bankName.trim()) : !busy;

  const question =
    step === 0
      ? t('accounts.add.balanceQuestion')
      : step === 2
        ? askPay
          ? t('accounts.add.lastPaydayQuestion')
          : t('accounts.add.reminderQuestion')
        : undefined;
  const primaryLabel =
    step < 2
      ? t('common.continue')
      : busy
        ? t('cards.form.saving')
        : editing
          ? t('cards.form.saveChanges')
          : t('accounts.add.saveAccount');
  const stepError = error && error.step === step ? error.message : null;

  return (
    <StepFlow
      title={editing ? t('accounts.add.editTitle') : t('accounts.add.addTitle')}
      closePrompt={editing ? t('accounts.add.closeEditing') : t('accounts.add.closeAdding')}
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
            accessibilityLabel={t('accounts.add.deleteLabel')}
            onPress={handleDelete}
            className="min-h-12 w-full flex-row items-center justify-center gap-2 rounded-full active:bg-ink/5"
          >
            <Trash2 size={17} color={colors.danger} strokeWidth={1.8} />
            <Text className="font-app-medium text-[15px] text-danger" maxFontSizeMultiplier={1.4}>
              {deleteAccount.isPending ? t('cards.form.deleting') : t('accounts.add.deleteAccount')}
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
            placeholderName={t('accounts.add.bankName')}
          />

          <TextField
            label={t('accounts.add.bankName')}
            value={bankName}
            onChangeText={setBankName}
            autoCapitalize="words"
            returnKeyType="next"
          />

          <View className="w-full">
            <FieldLabel className="mb-2">{t('accounts.add.accountType')}</FieldLabel>
            <ChoiceChips options={TYPE_OPTIONS} value={accountType} onChange={setAccountType} />
          </View>

          <TextField
            label={t('accounts.add.accountName')}
            value={nickname}
            onChangeText={setNickname}
            autoCapitalize="words"
            returnKeyType="done"
          />

          <View className="w-full">
            <FieldLabel className="mb-3">{t('cards.form.cardColour')}</FieldLabel>
            <ColorPicker value={color} onChange={setColor} />
          </View>

          <TextField
            label={t('cards.form.last4')}
            value={last4}
            onChangeText={(text) => setLast4(text.replace(/\D/g, '').slice(0, 4))}
            keyboardType="number-pad"
            returnKeyType="done"
          />

          {!editing && hasSalary ? (
            <View className="w-full flex-row items-center gap-4 rounded-[16px] bg-ink/5 px-4 py-4">
              <View className="min-w-0 flex-1">
                <Text className="font-app-medium text-[15px] text-ink" maxFontSizeMultiplier={1.3}>
                  {linkTitle}
                </Text>
                <Text
                  className="mt-1 font-app text-[12px] leading-[17px] text-muted"
                  maxFontSizeMultiplier={1.3}
                >
                  {linkCaption}
                </Text>
              </View>
              <SwitchControl
                value={linkPay}
                onValueChange={setLinkPay}
                accessibilityLabel={linkTitle}
              />
            </View>
          ) : null}

          {askPay ? (
            <SelectField
              label={t('accounts.add.expectedIncome')}
              variant="pill"
              value={income ? formatCurrency(Number(income)) : ''}
              placeholder={t('accounts.add.enterAmount')}
              icon={Calculator}
              onPress={() => setIncomePadOpen(true)}
              onIconPress={() => setCalculatorOpen(true)}
              iconAccessibilityLabel={t('accounts.add.openCalculator')}
            />
          ) : null}

          {stepError ? (
            <Text className="w-full font-app text-[13px] text-danger" maxFontSizeMultiplier={1.4}>
              {stepError}
            </Text>
          ) : null}
        </View>
      ) : null}

      {step === 2 ? (
        <View className="w-full gap-6">
          {askPay ? (
            <>
              <View className="w-full">
                <InlineCalendar value={lastPayday} onChange={setLastPayday} />
                {nextPayday ? (
                  <Text
                    className="mt-2 w-full text-center font-app text-[13px] text-muted"
                    maxFontSizeMultiplier={1.4}
                  >
                    {t('accounts.add.nextPayday', { date: formatFullDate(nextPayday) })}
                  </Text>
                ) : null}
              </View>

              <View className="w-full">
                <FieldLabel className="mb-2">{t('accounts.add.payFrequency')}</FieldLabel>
                <ChoiceChips
                  options={PAY_SCHEDULES}
                  value={payFrequency}
                  onChange={setPayFrequency}
                />
              </View>
            </>
          ) : null}

          <ReminderField
            kind="account"
            value={reminder}
            onChange={setReminderDraft}
            time={remindAt}
            onTimeChange={setTimeDraft}
            unavailable={
              payLookupPending
                ? t('accounts.add.checkingPay')
                : payLookupFailed
                  ? failureText()
                  : payLandsHere
                    ? null
                    : t('accounts.add.reminderNeedsPay')
            }
            onRetry={payLookupFailed ? () => void salaryAccounts.refetch() : undefined}
          />
        </View>
      ) : null}

      {calculatorOpen ? (
        <CalculatorPad
          title={t('accounts.add.calculator')}
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
          title={t('accounts.add.expectedIncome')}
          // The pay frequency is asked on the next step, so a cycle named here would state a choice
          // nobody has made.
          caption={t('accounts.add.eachPayPeriod')}
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
