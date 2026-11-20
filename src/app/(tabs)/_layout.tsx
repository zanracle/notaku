import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radii, space, useTheme } from '@/theme';
import { Txt } from '@/ui/components';

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

function TabBar({ state, navigation }: { state: any; navigation: any }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

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
      {state.routes.map((route: any, index: number) => {
        const focused = state.index === index;
        const icon = ICONS[route.name] ?? ICONS.index;
        const label = LABELS[route.name] ?? route.name;
        return (
          <Pressable
            key={route.key}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={label}
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
              <Txt
                variant="small"
                color={focused ? theme.primary : theme.textMuted}
                style={{ fontWeight: '700' }}>
                {label}
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
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...(props as any)} />}>
      <Tabs.Screen name="index" options={{ title: 'Beranda' }} />
      <Tabs.Screen name="expenses" options={{ title: 'Biaya' }} />
      <Tabs.Screen name="settings" options={{ title: 'Atur' }} />
    </Tabs>
  );
}

