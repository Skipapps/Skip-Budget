import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { useArtwork } from '@/theme/artwork';
import { useGradientIcons, type GradientIconName } from '@/theme/gradient-icons';
import { AccountCard } from '@/components/cards/account-card';
import {
  MoneyTile,
  type MoneyTileGroups,
  type MoneyTileValue,
} from '@/components/cards/money-tile';
import { PaymentCard } from '@/components/cards/payment-card';
import { ActionPill } from '@/components/ui/action-pill';
import { FitGroup, useFitGroup } from '@/components/ui/fit-group';
import { PageState } from '@/components/ui/page-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Screen } from '@/components/ui/screen';
import { SectionHeading, Title } from '@/components/ui/typography';
import { useActiveLoans } from '@/api/loans';
import { useBankAccounts, useCards, useSalarySources, useSourceBalances } from '@/api/queries';
import { usePro } from '@/api/pro';
import { useRefreshAll } from '@/api/refresh';
import { incomeForMonth } from '@/lib/pay';
import { useToday } from '@/lib/use-today';
import { t } from '@/i18n';
import { failureText } from '@/lib/failure';
import { formatCurrency } from '@/lib/format';
import { TEXT_CAP } from '@/theme/text-scale';

type SectionHeaderProps = {
  title: string;
  /** What VoiceOver says for the pill, which only reads "Add". */
  actionLabel: string;
  onAction: () => void;
};

function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View className="w-full flex-row items-center justify-between gap-3">
      <View className="min-w-0 flex-1">
        <SectionHeading>{title}</SectionHeading>
      </View>

      <ActionPill
        icon={Plus}
        label={t('cards.list.add')}
        accessibilityLabel={actionLabel}
        onPress={onAction}
        tone="card"
        className="shrink-0"
      />
    </View>
  );
}

/** Stands in for an empty list only; a failed read is answered by the whole page. */
function ListNote({ text }: { text: string }) {
  return (
    <View className="w-full items-center rounded-[16px] border border-line bg-card p-5">
      <Text
        className="text-center font-app text-[14px] text-muted"
        maxFontSizeMultiplier={TEXT_CAP.reading}
      >
        {text}
      </Text>
    </View>
  );
}

type Tile = {
  id: string;
  icon: GradientIconName;
  label: string;
  value: MoneyTileValue;
  note?: string;
  onPress?: () => void;
};

/** "Salary, $3,700.00, Monthly": the tile's lines in the order they are drawn. */
function tileLabel(tile: Tile): string {
  const value = tile.value.kind === 'loading' ? '' : tile.value.text;
  if (!value) return tile.label;
  return tile.note
    ? t('cards.money.tileLabel', { name: tile.label, value, note: tile.note })
    : t('cards.money.tileLabelShort', { name: tile.label, value });
}

export default function CardsScreen() {
  const artwork = useArtwork();
  const icons = useGradientIcons();
  // State, not `new Date()`: a backgrounded tab does not re-render, so a plain date would stay on
  // yesterday after an overnight resume.
  const { today } = useToday();

  const cards = useCards();
  const accounts = useBankAccounts();
  const salary = useSalarySources();
  const loans = useActiveLoans(today);
  const {
    balances,
    updated,
    isError: balancesError,
    refetch: refetchBalances,
  } = useSourceBalances(today);
  const { refresh, refreshing } = useRefreshAll();
  const { pro } = usePro();

  // Each kind of line on the tiles shares one size across all four; the grid stacks to one tile
  // per row as soon as any kind cannot fit two to a row.
  const groups: MoneyTileGroups = {
    labels: useFitGroup({ mode: 'shrink' }),
    figures: useFitGroup({ mode: 'shrink' }),
    pills: useFitGroup({ mode: 'switch' }),
    notes: useFitGroup({ mode: 'shrink' }),
  };
  const tilesStacked =
    !groups.labels.fits || !groups.figures.fits || !groups.pills.fits || !groups.notes.fits;

  // A stale balance is worse than none: if any of the reads behind `balances` fails, the faces
  // would fall back to the balance typed when the card was added. A failed salary or loan read
  // would pass for having none, and offer to add one. After all hooks, so hook order holds.
  if (balancesError || salary.isError || loans.isError) {
    return (
      <Screen onRefresh={refresh} refreshing={refreshing}>
        <PageState
          art={artwork.error}
          title={failureText()}
          actionLabel={t('common.tryAgain')}
          onAction={() => {
            if (balancesError) refetchBalances();
            if (salary.isError) void salary.refetch();
            if (loans.isError) loans.refetch();
          }}
        />
      </Screen>
    );
  }

  // This month's money in: the schedules plus any one-off pays dated this month.
  const monthlySalary = incomeForMonth(
    (salary.data ?? []).map((source) => ({
      amount: source.amount,
      frequency: source.frequency,
      payday: source.last_payday,
    })),
    today,
  );
  const hasSalary = (salary.data?.length ?? 0) > 0;
  const loanList = loans.loans;

  const tiles: Tile[] = [
    {
      id: 'salary',
      icon: 'salary',
      label: t('cards.list.salary'),
      value: salary.isPending
        ? { kind: 'loading' }
        : hasSalary
          ? { kind: 'figure', text: formatCurrency(monthlySalary) }
          : { kind: 'pill', text: t('cards.money.addSalary') },
      note: salary.isPending ? undefined : hasSalary ? t('dates.monthly') : t('cards.money.addPay'),
      onPress: () => router.push('/salary'),
    },
    {
      id: 'savings',
      icon: 'savings',
      label: t('cards.list.savings'),
      // Savings stands on its own while it is redesigned, so its tile carries no figure.
      value: { kind: 'pill', text: t('cards.money.open') },
      note: t('cards.money.startSaving'),
      onPress: () => router.push('/savings'),
    },
    {
      id: 'loans',
      icon: 'loans',
      label: t('cards.money.loans'),
      value: loans.isPending
        ? { kind: 'loading' }
        : loanList.length > 0
          ? { kind: 'figure', text: t('cards.money.loansActive', { count: loanList.length }) }
          : { kind: 'pill', text: t('cards.money.addLoan') },
      note: loans.isPending
        ? undefined
        : loanList.length > 0
          ? loanList.map((loan) => loan.name).join(' · ')
          : t('cards.money.trackLoans'),
      // A loan lives behind its bill, so one loan opens that bill's page. While the loans are still
      // being read, "none" is not known yet, so the press waits rather than open the calculator.
      onPress: () => {
        if (loans.isPending) return;
        if (loanList.length === 0) router.push('/loan-calculator');
        else if (loanList.length === 1) router.push(`/bill/${loanList[0].billId}`);
        else router.push('/bills');
      },
    },
    {
      id: 'goals',
      icon: 'goals',
      label: t('cards.money.goals'),
      value: { kind: 'soon', text: t('cards.money.comingSoon') },
    },
  ];
  const rows = [tiles.slice(0, 2), tiles.slice(2, 4)];

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <Title header>{t('nav.cards')}</Title>
      <Text
        className="mt-[4px] w-full text-center font-app text-[13px] text-muted"
        maxFontSizeMultiplier={TEXT_CAP.reading}
      >
        {t('cards.list.subtitle')}
      </Text>

      <View className="mt-[28px] w-full">
        <SectionHeader
          title={t('cards.list.creditCards')}
          actionLabel={t('cards.list.newCard')}
          onAction={() =>
            // The second of anything is where Pro begins (the database refuses it too).
            !pro && (cards.data?.length ?? 0) >= 1
              ? router.push({ pathname: '/pro-feature', params: { id: 'unlimited' } })
              : router.push('/add-card')
          }
        />
      </View>

      <View className="mt-[12px] w-full gap-[12px]">
        {(cards.data ?? []).map((card, index) => (
          // Wrapped rather than given an onPress: PaymentCard is also used in the add-card preview,
          // where tapping it means nothing.
          <Pressable
            key={card.id}
            accessibilityRole="button"
            accessibilityLabel={
              !pro && index > 0
                ? t('cards.list.cardLocked', { name: card.holder })
                : t('cards.list.viewTransactions', { name: card.holder })
            }
            onPress={() =>
              // Locked, not lost: extras beyond the free allowance survive a downgrade; the oldest
              // stays fully usable.
              !pro && index > 0
                ? router.push({ pathname: '/pro-feature', params: { id: 'unlimited' } })
                : router.push(`/source/${card.id}`)
            }
            className="active:opacity-80"
            style={!pro && index > 0 ? { opacity: 0.45 } : undefined}
          >
            <PaymentCard
              card={{
                id: card.id,
                holder: card.holder,
                // The stored balance is only the starting point; receipts and bills have moved it.
                balance: balances.get(card.id) ?? card.balance,
                last4: card.last4 ?? '',
                network: card.network,
                color: card.color,
                creditLimit: card.credit_limit,
              }}
            />
          </Pressable>
        ))}
        {cards.isPending ? <Skeleton className="h-[186px] w-full rounded-[10px]" /> : null}
        {!cards.isPending && (cards.data?.length ?? 0) === 0 ? (
          <ListNote text={t('cards.list.noCards')} />
        ) : null}
      </View>

      <View className="mt-[28px] w-full">
        <SectionHeader
          title={t('cards.list.bankAccounts')}
          actionLabel={t('cards.list.addAccount')}
          onAction={() =>
            !pro && (accounts.data?.length ?? 0) >= 1
              ? router.push({ pathname: '/pro-feature', params: { id: 'unlimited' } })
              : router.push('/add-account')
          }
        />
      </View>

      <View className="mt-[12px] w-full gap-[12px]">
        {(accounts.data ?? []).map((account, index) => (
          <Pressable
            key={account.id}
            accessibilityRole="button"
            accessibilityLabel={
              !pro && index > 0
                ? t('cards.list.accountLocked', { name: account.nickname || account.bank_name })
                : t('cards.list.viewTransactions', { name: account.nickname || account.bank_name })
            }
            onPress={() =>
              !pro && index > 0
                ? router.push({ pathname: '/pro-feature', params: { id: 'unlimited' } })
                : router.push(`/source/${account.id}`)
            }
            className="active:opacity-80"
            style={!pro && index > 0 ? { opacity: 0.45 } : undefined}
          >
            <AccountCard
              account={{
                id: account.id,
                bankName: account.bank_name,
                nickname: account.nickname ?? '',
                accountType: account.account_type === 'savings' ? 'Savings' : 'Checking',
                balance: balances.get(account.id) ?? account.balance,
                last4: account.last4 ?? '',
                color: account.color,
              }}
              updatedOn={updated.get(account.id) ?? null}
              today={today}
            />
          </Pressable>
        ))}
        {accounts.isPending ? <Skeleton className="h-[186px] w-full rounded-[10px]" /> : null}
        {!accounts.isPending && (accounts.data?.length ?? 0) === 0 ? (
          <ListNote text={t('cards.list.noAccounts')} />
        ) : null}
      </View>

      <View className="mt-[28px] w-full">
        <SectionHeading>{t('cards.list.money')}</SectionHeading>
      </View>

      <FitGroup group={groups.labels} className="mt-[12px] w-full pb-8" testID="money-tile-labels">
        <FitGroup group={groups.figures} className="w-full" testID="money-tile-figures">
          <FitGroup group={groups.pills} className="w-full" testID="money-tile-pills">
            <FitGroup group={groups.notes} className="w-full gap-[12px]" testID="money-tiles">
              {rows.map((row) => (
                <View
                  key={row.map((tile) => tile.id).join('-')}
                  testID="money-tile-row"
                  className={tilesStacked ? 'w-full gap-[12px]' : 'w-full flex-row gap-[12px]'}
                >
                  {row.map((tile) => (
                    <View key={tile.id} className={tilesStacked ? 'w-full' : 'min-w-0 flex-1'}>
                      <MoneyTile
                        id={tile.id}
                        icon={icons[tile.icon]}
                        label={tile.label}
                        value={tile.value}
                        note={tile.note}
                        onPress={tile.onPress}
                        accessibilityLabel={tileLabel(tile)}
                        groups={groups}
                      />
                    </View>
                  ))}
                </View>
              ))}
            </FitGroup>
          </FitGroup>
        </FitGroup>
      </FitGroup>
    </Screen>
  );
}
