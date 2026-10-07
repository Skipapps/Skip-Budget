import { openBrowserAsync } from 'expo-web-browser';
import { router } from 'expo-router';
import { CircleHelp, Coffee, Compass, Lightbulb, ListChecks, Mail } from 'lucide-react-native';

import { useUpdateProfile } from '@/api/mutations';
import { CoffeeMark } from '@/components/settings/coffee-mark';
import { SettingsPage } from '@/components/settings/settings-page';
import { SettingsRow } from '@/components/settings/settings-row';
import { t } from '@/i18n';

export default function SupportScreen() {
  const updateProfile = useUpdateProfile();

  return (
    <SettingsPage title={t('settings.pages.support')}>
      <SettingsRow
        icon={ListChecks}
        title={t('support.gettingStarted')}
        subtitle={t('support.gettingStartedDetail')}
        onPress={() => {
          // Clearing the dismissal is enough: the card derives its steps live.
          updateProfile.mutate({ getting_started_dismissed_at: null });
          // Home is a tab under this page: pushing it would stack a second tab bar on top.
          router.dismissTo('/home');
        }}
      />
      <SettingsRow
        icon={CircleHelp}
        title={t('support.faq')}
        subtitle={t('support.faqDetail')}
        onPress={() => router.push('/faq')}
      />
      <SettingsRow
        icon={Compass}
        title={t('support.tour')}
        subtitle={t('support.tourDetail')}
        onPress={() => router.push('/tour')}
      />
      <SettingsRow
        icon={Mail}
        title={t('support.email')}
        subtitle={t('support.emailDetail')}
        onPress={() => router.push('/contact?topic=support')}
      />
      <SettingsRow
        icon={Lightbulb}
        title={t('support.idea')}
        subtitle={t('support.ideaDetail')}
        onPress={() => router.push('/contact?topic=idea')}
      />
      <SettingsRow
        icon={Coffee}
        // Their mark in their colours; tinting someone else's logo would misrepresent it.
        artwork={<CoffeeMark width={22} height={22} />}
        title={t('support.coffee')}
        subtitle={t('support.coffeeDetail')}
        onPress={() => openBrowserAsync('https://buymeacoffee.com/Weknd_team')}
        last
      />
    </SettingsPage>
  );
}
