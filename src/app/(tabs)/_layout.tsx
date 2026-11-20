import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Tabs } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radii, space, useTheme } from '@/theme';
import { Txt } from '@/ui/components';

const TABS = ['index', 'expenses', 'settings'] as const;

const ICONS: Record<string, { active: 'home' | 'receipt' | 'settings'; idle: 'home-outline' | 'receipt-outline' | 'settings-outline' }> = {
  index: { active: 'home', idle: 'home-outline' },
  expenses: { active: 'receipt', idle: 'receipt-outline' },
  settings: { active: 'settings', idle: 'settings-outline' },
};

const LABELS: Record<string, string> = {
  index: 'Beranda',
  expenses: 'Biaya',
  settings: 'Atur',
};

const PATHS: Record<string, '/' | '/expenses' | '/settings'> = {
  index: '/',
  expenses: '/expenses',
  settings: '/settings',
};

function TabBar({ state }: { state: any }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const activeName = state?.routes?.[state.index]?.name ?? 'index';

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: 'row',
        backgroundColor: theme.card,
        borderTopWidth: 1,
        borderTopColor: theme.border,
        paddingBottom: Math.max(insets.bottom, 10),
        paddingTop: 8,
        paddingHorizontal: space.md,
      }}>
      {TABS.map((name) => {
        const focused = activeName === name;
        const icon = ICONS[name];
        return (
          <Pressable
            key={name}
            onPress={() => {
              if (!focused) router.navigate(PATHS[name]);
            }}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={LABELS[name]}
            style={{ flex: 1, alignItems: 'center' }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: radii.pill,
                backgroundColor: focused ? theme.mint : 'transparent',
              }}>
              <Ionicons
                name={focused ? icon.active : icon.idle}
                size={19}
                color={focused ? theme.primary : theme.textMuted}
              />
              <Txt variant="small" color={focused ? theme.primary : theme.textMuted} style={{ fontWeight: '700' }}>
                {LABELS[name]}
              </Txt>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBar state={(props as any).state} />}>
      <Tabs.Screen name="index" options={{ title: 'Beranda' }} />
      <Tabs.Screen name="expenses" options={{ title: 'Biaya' }} />
      <Tabs.Screen name="settings" options={{ title: 'Atur' }} />
    </Tabs>
  );
}
