import { router, type Href } from 'expo-router';

import { useSendMessage } from '@/api/contact';
import { useProPrices } from '@/api/pro';
import { useProfile } from '@/api/queries';
import { AskSamChat } from '@/components/ask-sam/ask-sam-chat';
import { proMonthlyAmount, proYearlyAmount } from '@/lib/wall';
import { useToast } from '@/providers/toast-context';
import { useUserEmail } from '@/providers/session-provider';

/** Ask Sam, the help chat, opened from the bottom of Settings. */
export default function AskSamScreen() {
  const prices = useProPrices();
  const profile = useProfile();
  const email = useUserEmail();
  const sendMessage = useSendMessage();
  const toast = useToast();

  return (
    <AskSamChat
      // The store's own prices for this storefront; the US dollar fallback only until it answers.
      prices={{
        proMonthly: prices.data?.monthly?.product.priceString ?? proMonthlyAmount(),
        proYearly: prices.data?.yearly?.product.priceString ?? proYearlyAmount(),
      }}
      email={email ?? undefined}
      name={profile.data?.display_name ?? undefined}
      onOpenRoute={(route) => router.push(route as Href)}
      onSendContact={async (message) => {
        await sendMessage.mutateAsync(message);
        toast('toast.message.sent');
      }}
    />
  );
}
