import '@/global.css';

import * as Sentry from '@sentry/react-native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useWindowDimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useRegisterPush } from '@/api/push';
import { AppLockGate } from '@/components/app-lock-gate';
import { LaunchSplash } from '@/components/launch-splash';
import { DialogProvider } from '@/providers/dialog-provider';
import { QueryProvider } from '@/providers/query-provider';
import { useConfigurePurchases } from '@/api/pro';
import { RealtimeProvider } from '@/providers/realtime-provider';
import { PreferencesProvider } from '@/providers/preferences-provider';
import { SessionProvider, useSession } from '@/providers/session-provider';
import { ThemeProvider, useColors, useTheme } from '@/providers/theme-provider';
import { APP_FONTS } from '@/theme/fonts';

// Hold the splash until the app font is ready, so no frame renders in the system font and reflows.
SplashScreen.preventAutoHideAsync();

// At module load so a startup crash is still caught. Off in development: red boxes are already
// louder, and dev-session noise would bury real reports.
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: !__DEV__,
  sendDefaultPii: false,
});

function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(APP_FONTS);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Outermost: it paints the surface everything else sits on. */}
      <ThemeProvider>
        <PreferencesProvider>
          {/* A font error counts as loaded, so a missing font cannot strand users. */}
          <AppShell fontsReady={fontsLoaded || Boolean(fontError)} />
        </PreferencesProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Held back until fonts and the stored theme mode are both read, so someone who chose dark does not
 * open on a white flash. Then LaunchSplash takes over from the native splash (it is what hides it).
 */
function AppShell({ fontsReady }: { fontsReady: boolean }) {
  const { ready, scheme } = useTheme();
  const settled = fontsReady && ready;

  if (!settled) return null;

  return (
    <KeyboardProvider>
      <SafeAreaProvider>
        <QueryProvider>
          <SessionProvider>
            {/* Inside the session (subscribes per user), above the navigator so one socket serves
                every screen. */}
            <RealtimeProvider>
              {/* Inside the session so a dialog can outlive a screen; outside the navigator so it
                  draws above every route and modal. */}
              <DialogProvider>
                {/* Inside the session, so signing out cannot strand somebody behind a lock; above
                  the navigator so no route renders underneath it. */}
                <AppLockGate>
                  {/* Before the navigator: its configure call must start ahead of any screen effect
                      that talks to the SDK. */}
                  <PurchasesBridge />
                  <RootNavigator />
                </AppLockGate>
                <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
              </DialogProvider>
            </RealtimeProvider>
          </SessionProvider>
        </QueryProvider>
        {/* After the app, so it draws over every route and popup until it fades. */}
        <LaunchSplash />
      </SafeAreaProvider>
    </KeyboardProvider>
  );
}

function RootNavigator() {
  const { ready } = useSession();
  const colors = useColors();
  // Remount the navigator when the phone's text size changes: React Native re-measures glyphs but
  // keeps stale text-container layouts, so headings truncate until a full relaunch.
  const { fontScale } = useWindowDimensions();

  // Inside the session, because a token is stored against a user. Re-runs on every launch: iOS
  // rotates tokens on restore and reinstall, and a stale one fails silently.
  useRegisterPush();

  // Until the stored session is read, the first frame would route a signed-in user to onboarding.
  if (!ready) return null;

  return (
    <Stack
      key={`fontscale-${fontScale}`}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.surface },
      }}
    />
  );
}

/** Signs RevenueCat in as the Supabase user. Renders nothing; lives inside the session provider. */
function PurchasesBridge() {
  useConfigurePurchases();
  return null;
}

// The wrap ties uncaught render errors to Sentry; without it only errors outside React arrive.
export default Sentry.wrap(RootLayout);
