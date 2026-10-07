import Constants from 'expo-constants';
import { router } from 'expo-router';
import { FileText, ScrollText, Shield } from 'lucide-react-native';

import { SettingsPage } from '@/components/settings/settings-page';
import { SettingsRow } from '@/components/settings/settings-row';
import { t } from '@/i18n';

export default function AboutScreen() {
  return (
    <SettingsPage title={t('settings.pages.about')}>
      <SettingsRow
        icon={Shield}
        title={t('settings.about.privacy')}
        subtitle={t('settings.about.privacyDetail')}
        onPress={() => router.push('/privacy')}
      />
      <SettingsRow
        icon={FileText}
        title={t('settings.about.terms')}
        onPress={() => router.push('/terms')}
      />
      <SettingsRow
        icon={ScrollText}
        title={t('settings.about.version')}
        value={Constants.expoConfig?.version ?? '—'}
        last
      />
    </SettingsPage>
  );
}
