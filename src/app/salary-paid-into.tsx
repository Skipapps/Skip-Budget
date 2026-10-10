import { router, useLocalSearchParams } from 'expo-router';
import { Check, Plus } from 'lucide-react-native';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useBankAccounts } from '@/api/queries';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { t } from '@/i18n';
import { accountLabel } from '@/lib/account-label';
import { cn } from '@/lib/cn';
import { failureText } from '@/lib/failure';
import { selection } from '@/lib/haptics';
import { pickPaidInto } from '@/lib/paid-into-pick';
import { useNavigateOnce } from '@/lib/use-navigate-once';
import { useColors } from '@/providers/theme-provider';
import { useArtwork } from '@/theme/artwork';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * Which account a salary lands in, picked on a page of its own. The salary is not saved yet, so the
 * choice goes back to the editor that opened this page, which saves it with everything else. An
 * account added from here is listed when the person comes back, ready to pick.
 */
export default function SalaryPaidIntoScreen() {
  const colors = useColors();
  const artwork = useArtwork();
  const params = useLocalSearchParams<{ editor?: string; source?: string; selected?: string }>();
  const accounts = useBankAccounts();
  const list = accounts.data ?? [];
  // An account that has since been deleted is no choice; the salary reads as landing nowhere.
  const chosen = list.some((account) => account.id === params.selected) ? params.selected : null;
  const once = useNavigateOnce();

  const choose = (accountId: string | null) =>
    once(() => {
      selection();
      if (params.editor && params.source) {
        pickPaidInto({ editor: params.editor, source: params.source, accountId });
      }
      router.back();
    });

  // The account form asks no pay questions from here: the Salary page underneath is setting the pay.
  const addAccount = () =>
    once(() => router.push({ pathname: '/add-account', params: { from: 'salary' } }));

  if (accounts.isPending) {
    return (
      <Screen title={t('salary.paidInto')} showBack>
        <View className="mt-16 w-full items-center">
          <ActivityIndicator size="small" color={colors.muted} />
        </View>
      </Screen>
    );
  }

  if (accounts.isError) {
    return (
      <Screen title={t('salary.paidInto')} showBack>
        <PageState
          art={artwork.error}
          title={failureText()}
          actionLabel={t('common.tryAgain')}
          onAction={() => void accounts.refetch()}
        />
      </Screen>
    );
  }

  const choices = [
    ...list.map((account) => ({
      id: account.id as string | null,
      label: accountLabel(account),
      color: account.color as string | null,
    })),
    { id: null, label: t('salary.noAccount'), color: null },
  ];

  return (
    <Screen title={t('salary.paidInto')} showBack>
      <Text
        className="mt-2 w-full font-app text-[14px] text-muted"
        maxFontSizeMultiplier={TEXT_CAP.reading}
      >
        {t('salary.linkAccountHint')}
      </Text>

      <View
        accessibilityRole="radiogroup"
        className="mb-4 mt-5 w-full rounded-[20px] border border-line bg-card px-4"
      >
        {choices.map((choice, index) => {
          const selected = choice.id === chosen;
          return (
            <Pressable
              key={choice.id ?? 'none'}
              accessibilityRole="radio"
              accessibilityLabel={choice.label}
              accessibilityState={{ selected, checked: selected }}
              onPress={() => choose(choice.id)}
              className={cn(
                'min-h-[56px] w-full flex-row items-center gap-3 py-3 active:opacity-70',
                index < choices.length - 1 && 'border-b border-line',
              )}
            >
              {choice.color ? (
                <View
                  style={{ backgroundColor: choice.color }}
                  className="h-6 w-6 rounded-[6px] border border-ink/10"
                />
              ) : null}
              <Text
                className={cn(
                  'min-w-0 flex-1 text-[15px]',
                  selected ? 'font-app-semibold text-ink' : 'font-app text-body',
                )}
                maxFontSizeMultiplier={TEXT_CAP.row}
              >
                {choice.label}
              </Text>
              {selected ? <Check size={20} color={colors.accentInk} strokeWidth={2.2} /> : null}
            </Pressable>
          );
        })}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('salary.addAccount')}
        accessibilityHint={t('salary.addAccountHint')}
        onPress={addAccount}
        className="mb-4 min-h-14 w-full flex-row items-center justify-center gap-2 rounded-full border border-line active:bg-ink/5"
      >
        <Plus size={18} color={colors.accentInk} strokeWidth={1.8} />
        <Text
          className="shrink text-center font-app-medium text-[14px] text-accent-ink"
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {t('salary.addAccount')}
        </Text>
      </Pressable>
    </Screen>
  );
}
