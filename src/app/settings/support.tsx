import { router } from 'expo-router';
import { CircleHelp, Lightbulb, ListChecks, Mail } from 'lucide-react-native';

import { useUpdateProfile } from '@/api/mutations';
import { SettingsPage } from '@/components/settings/settings-page';
import { SettingsRow } from '@/components/settings/settings-row';
import { t } from '@/i18n';
import { useToast } from '@/providers/toast-context';

export default function SupportScreen() {
  const updateProfile = useUpdateProfile();
  const toast = useToast();

  return (
    <SettingsPage title={t('settings.pages.support')}>
      <SettingsRow
        icon={ListChecks}
        title={t('support.gettingStarted')}
        subtitle={t('support.gettingStartedDetail')}
        onPress={() => {
          // Clearing the dismissal is enough: the card derives its steps live.
          updateProfile.mutate(
            { getting_started_dismissed_at: null },
            { onSuccess: () => toast('toast.gettingStarted') },
          );
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
        last
      />
    </SettingsPage>
  );
}
