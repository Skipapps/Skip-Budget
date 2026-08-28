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

import { DialogProvider } from '@/providers/dialog-provider';
import { QueryProvider } from '@/providers/query-provider';
import { SessionProvider, useSession } from '@/providers/session-provider';
import { colors } from '@/theme/colors';

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

  useEffect(() => {
    // Hide on error too — a missing font should not leave users on a dead splash.
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <SafeAreaProvider>
          <QueryProvider>
            <SessionProvider>
              {/* Inside the session so a dialog can outlive a screen, outside
                  the navigator so it draws above every route and modal. */}
              <DialogProvider>
                <RootNavigator />
                <StatusBar style="dark" />
              </DialogProvider>
            </SessionProvider>
          </QueryProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { ready } = useSession();

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
