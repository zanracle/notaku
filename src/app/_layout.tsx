import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { AppProvider } from '@/state/app';
import { useTheme } from '@/theme';

export { ErrorBoundary } from 'expo-router';

export default function RootLayout() {
  const scheme = useColorScheme();
  const theme = useTheme();

  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AppProvider>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.bg },
            animation: 'slide_from_right',
          }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="capture" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="review" />
          <Stack.Screen name="wallet/[id]" />
          <Stack.Screen name="backup" />
          <Stack.Screen name="pengaturan/profile" />
          <Stack.Screen name="pengaturan/ai" />
          <Stack.Screen name="pengaturan/wallets" />
          <Stack.Screen name="pengaturan/categories" />
        </Stack>
      </AppProvider>
    </ThemeProvider>
  );
}
