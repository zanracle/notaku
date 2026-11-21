import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Tabs } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radii, space, useTheme } from '@/theme';
import { Txt } from '@/ui/components';

type TabName = 'index' | 'report' | 'expenses' | 'settings';

const ICONS: Record<TabName, { active: 'home' | 'stats-chart' | 'receipt' | 'settings'; idle: 'home-outline' | 'stats-chart-outline' | 'receipt-outline' | 'settings-outline' }> = {
  index: { active: 'home', idle: 'home-outline' },
  report: { active: 'stats-chart', idle: 'stats-chart-outline' },
  expenses: { active: 'receipt', idle: 'receipt-outline' },
  settings: { active: 'settings', idle: 'settings-outline' },
};

const LABELS: Record<TabName, string> = {
  index: 'Beranda',
  report: 'Laporan',
  expenses: 'Biaya',
  settings: 'Atur',
};

const PATHS: Record<TabName, '/' | '/report' | '/expenses' | '/settings'> = {
  index: '/',
  report: '/report',
  expenses: '/expenses',
  settings: '/settings',
};

function TabItem({ name, focused }: { name: TabName; focused: boolean }) {
  const theme = useTheme();
  const icon = ICONS[name];
  return (
    <Pressable
      onPress={() => {
        if (!focused) router.navigate(PATHS[name]);
      }}
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      accessibilityLabel={LABELS[name]}
      style={{ flex: 1, alignItems: 'center' }}>
      <View
        style={{
          alignItems: 'center',
          gap: 3,
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: radii.pill,
          backgroundColor: focused ? theme.mint : 'transparent',
          minWidth: 58,
        }}>
        <Ionicons name={focused ? icon.active : icon.idle} size={19} color={focused ? theme.primary : theme.textMuted} />
        <Txt
          variant="small"
          color={focused ? theme.primary : theme.textMuted}
          style={{ fontWeight: '700', fontSize: 10 }}>
          {LABELS[name]}
        </Txt>
      </View>
    </Pressable>
  );
}

function TabBar({ state }: { state: any }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const activeName: string = state?.routes?.[state.index]?.name ?? 'index';

  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
      <Pressable
        onPress={() => router.navigate('/capture')}
        accessibilityRole="button"
        accessibilityLabel="Foto struk"
        style={{
          position: 'absolute',
          alignSelf: 'center',
          top: -26,
          width: 62,
          height: 62,
          borderRadius: 31,
          backgroundColor: theme.primary,
          borderWidth: 4,
          borderColor: theme.bg,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
        }}>
        <Ionicons name="camera" size={26} color="#FFFFFF" />
      </Pressable>

      <View
        style={{
          flexDirection: 'row',
          backgroundColor: theme.card,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          paddingBottom: Math.max(insets.bottom, 10),
          paddingTop: 8,
          paddingHorizontal: space.sm,
        }}>
        <TabItem name="index" focused={activeName === 'index'} />
        <TabItem name="report" focused={activeName === 'report'} />
        <View style={{ width: 74 }} />
        <TabItem name="expenses" focused={activeName === 'expenses'} />
        <TabItem name="settings" focused={activeName === 'settings'} />
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar state={(props as any).state} />}>
      <Tabs.Screen name="index" options={{ title: 'Beranda' }} />
      <Tabs.Screen name="report" options={{ title: 'Laporan' }} />
      <Tabs.Screen name="expenses" options={{ title: 'Biaya' }} />
      <Tabs.Screen name="settings" options={{ title: 'Atur' }} />
    </Tabs>
  );
}
