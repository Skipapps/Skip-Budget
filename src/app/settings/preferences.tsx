import { router } from 'expo-router';
import { Bell, Languages, ScanFace, SunMoon, Vibrate } from 'lucide-react-native';

import { SettingsPage } from '@/components/settings/settings-page';
import { SettingsRow } from '@/components/settings/settings-row';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { t, useLocale } from '@/i18n';
import { LANGUAGE_NATIVE_NAMES, LANGUAGES, type Language } from '@/i18n/config';
import { setLanguage } from '@/i18n/store';
import { authenticate, lockCapability, unavailableMessage } from '@/lib/app-lock';
import { useDialog } from '@/providers/dialog-provider';
import { usePreferences } from '@/providers/preferences-provider';
import { useTheme } from '@/providers/theme-provider';
import type { ModeKey } from '@/theme/palette';

const AUTOMATIC = 'automatic';

const MODE_VALUES = ['light', 'dark', 'system'] as const;

export default function PreferencesScreen() {
  const ask = useDialog();
  const { mode, setMode } = useTheme();
  const { haptics, setHaptics, appLock, setAppLock } = usePreferences();
  const { language, chosenLanguage } = useLocale();

  const modeOptions = MODE_VALUES.map((value) => ({
    value,
    label: t(`preferences.appearance.${value}`),
  }));
  const modeCaptions: Record<ModeKey, string> = {
    light: t('preferences.appearance.lightCaption'),
    dark: t('preferences.appearance.darkCaption'),
    system: t('preferences.appearance.systemCaption'),
  };

  const languageOptions = [
    { value: AUTOMATIC, label: t('locale.automatic') },
    ...LANGUAGES.map((value) => ({ value, label: LANGUAGE_NATIVE_NAMES[value] })),
  ];

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
        title: t('preferences.lock.unavailable'),
        message: unavailableMessage(capability.reason),
        cancelLabel: null,
      });
      return;
    }

    if (await authenticate(t('preferences.lock.turnOn', { label: capability.label }))) {
      setAppLock(true);
    }
  };

  return (
    <SettingsPage title={t('preferences.title')}>
      <SettingsRow
        icon={SunMoon}
        title={t('preferences.appearance.title')}
        subtitle={modeCaptions[mode]}
      >
        <ChoiceChips options={modeOptions} value={mode} onChange={setMode} />
      </SettingsRow>
      <SettingsRow
        icon={Languages}
        title={t('locale.language.title')}
        subtitle={LANGUAGE_NATIVE_NAMES[language]}
      >
        <ChoiceChips
          options={languageOptions}
          value={chosenLanguage ?? AUTOMATIC}
          onChange={(value) => setLanguage(value === AUTOMATIC ? null : (value as Language))}
        />
      </SettingsRow>
      <SettingsRow
        icon={Vibrate}
        title={t('preferences.haptics.title')}
        subtitle={t('preferences.haptics.caption')}
        toggle={{ value: haptics, onChange: setHaptics }}
      />
      <SettingsRow
        icon={ScanFace}
        title={t('preferences.lock.title')}
        subtitle={t('preferences.lock.caption')}
        toggle={{ value: appLock, onChange: (next) => void handleAppLock(next) }}
      />
      <SettingsRow
        icon={Bell}
        title={t('preferences.reminders.title')}
        subtitle={t('preferences.reminders.caption')}
        onPress={() => router.push('/reminders')}
        last
      />
    </SettingsPage>
  );
}
