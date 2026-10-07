import { router } from 'expo-router';
import { Bell, ScanFace, SunMoon, Vibrate } from 'lucide-react-native';

import { SettingsPage } from '@/components/settings/settings-page';
import { SettingsRow } from '@/components/settings/settings-row';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { authenticate, lockCapability, unavailableMessage } from '@/lib/app-lock';
import { useDialog } from '@/providers/dialog-provider';
import { usePreferences } from '@/providers/preferences-provider';
import { useTheme } from '@/providers/theme-provider';
import type { ModeKey } from '@/theme/palette';

const MODE_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
] as const;

const MODE_CAPTIONS: Record<ModeKey, string> = {
  light: 'Always light',
  dark: 'Always dark',
  system: 'Follows your phone',
};

export default function PreferencesScreen() {
  const ask = useDialog();
  const { mode, setMode } = useTheme();
  const { haptics, setHaptics, appLock, setAppLock } = usePreferences();

  /**
   * Turning the lock on must pass a scan first, or a broken lock could shut someone out of their
   * own budget. Turning it off needs nothing: reaching the switch meant passing the lock.
   */
  const handleAppLock = async (next: boolean) => {
    if (!next) {
      setAppLock(false);
      return;
    }

    const capability = await lockCapability();
    if (!capability.available) {
      await ask({
        title: 'App lock is not available',
        message: unavailableMessage(capability.reason),
        cancelLabel: null,
      });
      return;
    }

    if (await authenticate(`Turn on ${capability.label} for Skip`)) setAppLock(true);
  };

  return (
    <SettingsPage title="Preferences">
      <SettingsRow icon={SunMoon} title="Appearance" subtitle={MODE_CAPTIONS[mode]}>
        <ChoiceChips options={MODE_OPTIONS} value={mode} onChange={setMode} />
      </SettingsRow>
      <SettingsRow
        icon={Vibrate}
        title="Haptics"
        subtitle="A tap when you press something"
        toggle={{ value: haptics, onChange: setHaptics }}
      />
      <SettingsRow
        icon={ScanFace}
        title="App lock"
        subtitle="Face ID before Skip opens"
        toggle={{ value: appLock, onChange: (next) => void handleAppLock(next) }}
      />
      <SettingsRow
        icon={Bell}
        title="Reminders"
        subtitle="Before a renewal, a bill or payday"
        onPress={() => router.push('/reminders')}
        last
      />
    </SettingsPage>
  );
}
