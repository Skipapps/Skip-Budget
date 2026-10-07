import { router } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextLink } from '@/components/ui/text-link';
import { Title } from '@/components/ui/typography';
import { t } from '@/i18n';

/** Offered after the first card saves on the setup walk-in; Skip goes back to the checklist. */
export default function AccountOfferScreen() {
  return (
    <Screen
      footer={
        <View className="w-full gap-2">
          <Button
            label={t('onboarding.accountOffer.add')}
            onPress={() => router.replace('/add-account?from=setup')}
          />
          {/* Back, not replace: the checklist is right beneath this screen, and replace would
              stack a second copy of it. */}
          <TextLink
            label={t('onboarding.skip')}
            variant="subtle"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/setup'))}
          />
        </View>
      }
    >
      <View className="flex-1 justify-center">
        <Title flush>{t('onboarding.accountOffer.title')}</Title>
      </View>
    </Screen>
  );
}
