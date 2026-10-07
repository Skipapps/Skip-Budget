import Constants from 'expo-constants';
import { router } from 'expo-router';
import { FileText, ScrollText, Shield } from 'lucide-react-native';

import { SettingsPage } from '@/components/settings/settings-page';
import { SettingsRow } from '@/components/settings/settings-row';

export default function AboutScreen() {
  return (
    <SettingsPage title="About">
      <SettingsRow
        icon={Shield}
        title="Privacy policy"
        subtitle="What is stored, and who else can see it"
        onPress={() => router.push('/privacy')}
      />
      <SettingsRow icon={FileText} title="Terms of service" onPress={() => router.push('/terms')} />
      <SettingsRow
        icon={ScrollText}
        title="Version"
        value={Constants.expoConfig?.version ?? '—'}
        last
      />
    </SettingsPage>
  );
}
