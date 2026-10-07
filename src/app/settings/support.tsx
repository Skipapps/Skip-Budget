import { openBrowserAsync } from 'expo-web-browser';
import { router } from 'expo-router';
import { CircleHelp, Coffee, Compass, Lightbulb, ListChecks, Mail } from 'lucide-react-native';

import { useUpdateProfile } from '@/api/mutations';
import { CoffeeMark } from '@/components/settings/coffee-mark';
import { SettingsPage } from '@/components/settings/settings-page';
import { SettingsRow } from '@/components/settings/settings-row';

export default function SupportScreen() {
  const updateProfile = useUpdateProfile();

  return (
    <SettingsPage title="Support">
      <SettingsRow
        icon={ListChecks}
        title="Getting started"
        subtitle="Put the setup steps back on Home"
        onPress={() => {
          // Clearing the dismissal is enough: the card derives its steps live.
          updateProfile.mutate({ getting_started_dismissed_at: null });
          // Home is a tab under this page: pushing it would stack a second tab bar on top.
          router.dismissTo('/home');
        }}
      />
      <SettingsRow
        icon={CircleHelp}
        title="Common questions"
        subtitle="Short answers, no waiting"
        onPress={() => router.push('/faq')}
      />
      <SettingsRow
        icon={Compass}
        title="What Skip can do"
        subtitle="The five things, each a tap away"
        onPress={() => router.push('/tour')}
      />
      <SettingsRow
        icon={Mail}
        title="Email support"
        subtitle="Something is wrong or unclear"
        onPress={() => router.push('/contact?topic=support')}
      />
      <SettingsRow
        icon={Lightbulb}
        title="Share an idea"
        subtitle="What should Skip do next?"
        onPress={() => router.push('/contact?topic=idea')}
      />
      <SettingsRow
        icon={Coffee}
        // Their mark in their colours; tinting someone else's logo would misrepresent it.
        artwork={<CoffeeMark width={22} height={22} />}
        title="Buy a coffee for team"
        subtitle="Keep Skip brewing"
        onPress={() => openBrowserAsync('https://buymeacoffee.com/Weknd_team')}
        last
      />
    </SettingsPage>
  );
}
