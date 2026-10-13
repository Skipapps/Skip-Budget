import { Redirect, router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { Pencil } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

import { useLoanDetail } from '@/api/loans';
import { useDeleteBill, useDeletePayoff } from '@/api/mutations';
import { usePastCharges } from '@/api/past-charges';
import { LoanViewCard } from '@/components/loans/view/loan-view-card';
import { loanViewOf, spokenDate, type HistoryRow } from '@/components/loans/view/loan-view-data';
import { LoanViewFooter } from '@/components/loans/view/loan-view-footer';
import { HistoryCard, UpcomingCard } from '@/components/loans/view/loan-view-lists';
import { goBack } from '@/components/ui/back-button';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { t } from '@/i18n';
import { failureMessage, failureText } from '@/lib/failure';
import { formatCurrency } from '@/lib/format';
import { success, warn } from '@/lib/haptics';
import { useToday } from '@/lib/use-today';
import { useConfirm, useDialog } from '@/providers/dialog-provider';
import { useToast } from '@/providers/toast-context';
import { useArtwork } from '@/theme/artwork';

/**
 * One saved loan: what is left to pay and how far along it is, the next payments, the payments
 * made, and the way to change it. Every loan opens here, wherever it is listed; `id` is its bill's.
 * A finished loan (paid off or stopped) is final: its history to read, and Delete in Edit's place.
 */
export default function LoanScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { today } = useToday();
  const artwork = useArtwork();
  const detail = useLoanDetail(id || undefined);
  const read = detail.data;
  const loan = read?.kind === 'loan' ? read.loan : null;

  const view = useMemo(() => (loan ? loanViewOf(loan, today) : null), [loan, today]);
  const refetch = () => void detail.refetch();
  const confirm = useConfirm();
  const ask = useDialog();
  const toast = useToast();
  const deletePayoff = useDeletePayoff();
  // One removal at a time: a second tap while the first is asked or sent would remove twice.
  const removing = useRef(false);
  const pastCharges = usePastCharges('loan', id || undefined);
  const deleteBill = useDeleteBill();
  // Held from the press until the loan is gone: the page leaves once the read no longer finds it.
  const [deleting, setDeleting] = useState(false);

  // Deleted from its edit page or on another phone. Only while this page is on top: under the edit
  // page, that page makes the one navigation its Delete calls for.
  const focused = useIsFocused();
  const gone = read?.kind === 'gone';
  useEffect(() => {
    if (gone && focused) goBack();
  }, [gone, focused]);

  // A Loans bill with no loan behind it, added by hand before loans were saved. The bill page goes
  // on to here on the same read finding a loan, so the two never pass one between them.
  if (read?.kind === 'bill') {
    return <Redirect href={{ pathname: '/bill/[id]', params: { id } }} />;
  }

  const openEdit = () => router.push({ pathname: '/add-loan', params: { id } });

  const removeLoan = async () => {
    if (!loan || !view || deleting) return;
    // The question counts the payments, so it waits for them.
    if (!pastCharges.ready) {
      pastCharges.retry();
      warn();
      await ask({ title: failureText() });
      return;
    }
    const choice = await pastCharges.chooseDelete(view.name, {
      stopped: true,
      extra: loan.payoffs.length,
    });
    if (choice !== 'everything') return;
    setDeleting(true);
    try {
      await deleteBill.mutateAsync(id);
      toast('toast.loan.deleted', 'deleted');
    } catch (thrown) {
      setDeleting(false);
      warn();
      await ask({ title: failureMessage(thrown) });
    }
  };
  const openPayoff = () => router.push({ pathname: '/loan-payoff', params: { id } });

  const removePayoff = async (payoff: Extract<HistoryRow, { kind: 'payoff' }>) => {
    if (!payoff.id || removing.current) return;
    removing.current = true;
    try {
      // Taking out an earlier one would leave the later ones posted on a loan that never had it.
      if (!payoff.latest) {
        const later = view?.history.latestPayoffOn;
        await ask({
          title: t('loanFlow.view.removeLaterFirst'),
          message: later
            ? t('loanFlow.view.removeLaterFirstMessage', { date: spokenDate(later) })
            : undefined,
        });
        return;
      }
      const ok = await confirm({
        title: t('loanFlow.view.removeTitle'),
        message: t('loanFlow.view.removeMessage', {
          amount: formatCurrency(payoff.amount),
          date: spokenDate(payoff.date),
        }),
        confirmLabel: t('common.remove'),
        destructive: true,
      });
      if (!ok) return;
      await deletePayoff.mutateAsync({
        billId: id,
        payoffId: payoff.id,
        lastPaymentOn: payoff.endsWithout,
      });
      success();
      toast('toast.loan.paymentRemoved', 'deleted');
    } catch (thrown) {
      warn();
      await ask({ title: failureMessage(thrown) });
    } finally {
      removing.current = false;
    }
  };

  if (!view) {
    return (
      <Screen showBack>
        {/* A failed reload behind a page already drawn keeps the page; here there is none. A loan
            with no schedule to read cannot be drawn either. */}
        {detail.isError || read?.kind === 'loan' ? (
          <PageState
            art={artwork.error}
            title={failureText()}
            actionLabel={t('common.tryAgain')}
            onAction={refetch}
          />
        ) : (
          <SkeletonList rows={4} />
        )}
      </Screen>
    );
  }

  const scheduleParams = view.scheduleParams;
  const finished = view.ending !== null;

  return (
    <Screen
      title={view.name}
      showBack
      onRefresh={refetch}
      headerActions={
        finished
          ? []
          : [
              {
                icon: Pencil,
                label: t('loanFlow.view.editA11y', { name: view.name }),
                onPress: openEdit,
              },
            ]
      }
      footer={
        <LoanViewFooter
          primary={
            view.ending
              ? undefined
              : {
                  label: t('loanFlow.payoff.action'),
                  hint: t('loanFlow.payoff.actionHint'),
                  onPress: openPayoff,
                }
          }
          onEdit={finished ? undefined : openEdit}
          onDelete={finished ? { onPress: () => void removeLoan(), busy: deleting } : undefined}
        />
      }
    >
      <LoanViewCard view={view} today={today} />
      <UpcomingCard
        payments={view.upcoming}
        onSeeAll={
          scheduleParams
            ? () =>
                router.push({
                  pathname: '/loan-schedule',
                  params: { ...scheduleParams, name: view.name },
                })
            : undefined
        }
      />
      <HistoryCard
        history={view.history}
        paidFrom={view.paidFrom}
        today={today}
        onRemovePayoff={(payoff) => void removePayoff(payoff)}
        // A finished loan is final, but the full payoff that finished it can still be taken back:
        // that undoes a payoff typed by mistake rather than changing the loan.
        canRemovePayoff={(payoff) =>
          !finished || (view.ending === 'paid' && payoff.full && payoff.latest)
        }
      />
      <View className="mb-4 w-full" />
    </Screen>
  );
}
