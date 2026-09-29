import { router } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextLink } from '@/components/ui/text-link';
import { Title } from '@/components/ui/typography';

/**
 * The beat after the first credit card saves on the setup walk-in: one page,
 * one question — the bank account the pay lands in. A page rather than a
 * dialog, because a dialog over a half-finished wizard read as an
 * interruption; this is the next step of the same story.
 *
 * Skip goes back to the checklist with the step already ticked. No
 * reassurance copy about that — the checklist itself is the reassurance.
 */
export default function AccountOfferScreen() {
  return (
    <Screen
      footer={
        <View className="w-full gap-2">
          <Button
            label="Add bank account"
            onPress={() => router.replace('/add-account?from=setup')}
          />
          {/* Back, not another replace: the checklist is right beneath this
              screen, and replacing stacked a second copy of it. */}
          <TextLink
            label="Skip"
            variant="subtle"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/setup'))}
          />
        </View>
      }
    >
      {/* No artwork: the question alone, centred in the space above the
          buttons. */}
      <View className="flex-1 justify-center">
        <Title flush>Add your bank account</Title>
      </View>
    </Screen>
  );
}
