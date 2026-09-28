import { router } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Illustration } from '@/components/ui/illustration';
import { Screen } from '@/components/ui/screen';
import { TextLink } from '@/components/ui/text-link';
import { Title } from '@/components/ui/typography';
import { useArtwork } from '@/theme/artwork';

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
  const artwork = useArtwork();

  return (
    <Screen
      footer={
        <View className="w-full gap-2">
          <Button
            label="Add bank account"
            onPress={() => router.replace('/add-account?from=setup')}
          />
          <TextLink label="Skip" variant="subtle" onPress={() => router.replace('/setup')} />
        </View>
      }
    >
      <Title>Add your bank account</Title>

      <View className="flex-1 items-center justify-center">
        <Illustration source={artwork.emptyWallet} widthRatio={0.6} maxWidth={240} />
      </View>
    </Screen>
  );
}
