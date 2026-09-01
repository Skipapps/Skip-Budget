import '@/global.css';

import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from '@expo-google-fonts/poppins';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useRegisterPush } from '@/api/push';
import { AppLockGate } from '@/components/app-lock-gate';
import { DialogProvider } from '@/providers/dialog-provider';
import { QueryProvider } from '@/providers/query-provider';
import { useConfigurePurchases } from '@/api/pro';
import { FriendRequestPopup } from '@/components/splits/friend-request-popup';
import { RealtimeProvider } from '@/providers/realtime-provider';
import { PreferencesProvider } from '@/providers/preferences-provider';
import { SessionProvider, useSession } from '@/providers/session-provider';
import { ThemeProvider, useColors, useTheme } from '@/providers/theme-provider';

// Hold the splash screen until Poppins is ready, so no frame renders in the
// system font and then reflows once the real face loads.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Outermost, because it paints the surface everything else sits on. */}
      <ThemeProvider>
        <PreferencesProvider>
          {/* Errors count as loaded — a missing font should not leave users on
              a dead splash. */}
          <AppShell fontsReady={fontsLoaded || Boolean(fontError)} />
        </PreferencesProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Everything below the theme, held back until there is a theme to draw it in.
 *
 * The splash waits on the stored colours as well as the fonts. Reading them
 * takes a moment, and without the wait a phone set to dark opens on a white
 * screen and then blinks — which looks like a bug rather than a preference.
 */
function AppShell({ fontsReady }: { fontsReady: boolean }) {
  const { ready, scheme } = useTheme();
  const settled = fontsReady && ready;

  useEffect(() => {
    if (settled) SplashScreen.hideAsync();
  }, [settled]);

  if (!settled) return null;

  return (
    <KeyboardProvider>
      <SafeAreaProvider>
        <QueryProvider>
          <SessionProvider>
            {/* Inside the session because it subscribes per user, and above
                the navigator so one socket serves every screen. */}
            <RealtimeProvider>
              {/* Inside the session so a dialog can outlive a screen, outside
                  the navigator so it draws above every route and modal. */}
              <DialogProvider>
                {/* Inside the session, so signing out cannot strand somebody
                  behind a lock, and above the navigator so no route renders
                  underneath it. */}
                <AppLockGate>
                  {/* Before the navigator: its configure kick starts ahead of
                      any screen effect that talks to the SDK. */}
                  <PurchasesBridge />
                  <RootNavigator />
                  {/* Inside the lock so it never draws on a locked phone, and
                      after the navigator so it sits above every route. */}
                  <FriendRequestPopup />
                </AppLockGate>
                <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
              </DialogProvider>
            </RealtimeProvider>
          </SessionProvider>
        </QueryProvider>
      </SafeAreaProvider>
    </KeyboardProvider>
  );
}

function RootNavigator() {
  const { ready } = useSession();
  const colors = useColors();

  // Inside the session, because a token is stored against a user. Re-runs on
  // every launch: iOS rotates tokens on restore and reinstall, and a stale one
  // fails silently forever.
  useRegisterPush();

  // Render nothing until the stored session has been read, or the first frame
  // would route a signed-in user through onboarding.
  if (!ready) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.surface },
      }}
    />
  );
}

/** Signs RevenueCat in as the Supabase user. Renders nothing; must live
 * inside the session provider, which is why it is a component and not a call. */
function PurchasesBridge() {
  useConfigurePurchases();
  return null;
}
