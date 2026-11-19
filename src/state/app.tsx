import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SplashScreen from 'expo-splash-screen';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { getDb } from '@/db';
import { getSettings, setSetting } from '@/db/queries';
import { readCategories } from '@/lib/defaults';
import { sweepOrphanFiles } from '@/storage/images';
import { space, useTheme } from '@/theme';
import { AppButton, Txt } from '@/ui/components';

type AppState = {
  ready: boolean;
  fatal: string | null;
  settings: Record<string, string>;
  categories: string[];
  set: (key: string, value: string) => Promise<void>;
  reload: () => Promise<void>;
};

const AppContext = createContext<AppState | null>(null);

export function useApp(): AppState {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp harus dipakai di dalam AppProvider');
  return value;
}

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [locked, setLocked] = useState(false);

  const load = useCallback(async () => {
    await getDb();
    const values = await getSettings();
    setSettings(values);
    return values;
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const values = await load();
        if (!alive) return;
        setLocked(values.app_lock === '1');
        setReady(true);
        SplashScreen.hideAsync().catch(() => undefined);
        sweepOrphanFiles().catch(() => undefined);
      } catch (error) {
        if (!alive) return;
        setFatal((error as Error)?.message ?? 'Database gagal dibuka');
        SplashScreen.hideAsync().catch(() => undefined);
      }
    })();
    return () => {
      alive = false;
    };
  }, [load]);

  const set = useCallback(async (key: string, value: string) => {
    await setSetting(key, value);
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const value = useMemo<AppState>(
    () => ({
      ready,
      fatal,
      settings,
      categories: readCategories(settings.categories),
      set,
      reload: async () => {
        const values = await load();
        setSettings(values);
      },
    }),
    [ready, fatal, settings, set, load],
  );

  if (fatal) return <FatalScreen message={fatal} />;
  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
  if (locked) return <LockScreen onUnlock={() => setLocked(false)} />;

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

function FatalScreen({ message }: { message: string }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.bg,
        alignItems: 'center',
        justifyContent: 'center',
        padding: space.xl,
        gap: space.md,
      }}>
      <Ionicons name="alert-circle-outline" size={42} color={theme.danger} />
      <Txt variant="title" style={{ textAlign: 'center' }}>
        Aplikasi tidak bisa dibuka
      </Txt>
      <Txt variant="small" color={theme.textMuted} style={{ textAlign: 'center' }}>
        {message}
      </Txt>
      <Txt variant="small" color={theme.textMuted} style={{ textAlign: 'center' }}>
        Coba tutup lalu buka lagi aplikasi. Data di penyimpanan tidak dihapus.
      </Txt>
    </View>
  );
}

function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const theme = useTheme();
  const [message, setMessage] = useState<string | null>(null);

  const unlock = useCallback(async () => {
    try {
      const support = await LocalAuthentication.hasHardwareAsync();
      if (!support) {
        onUnlock();
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Buka NotaKu',
        cancelLabel: 'Batal',
      });
      if (result.success) onUnlock();
      else setMessage('Tidak terbuka. Coba lagi.');
    } catch {
      setMessage('Sensor tidak tersedia. Coba lagi.');
    }
  }, [onUnlock]);

  useEffect(() => {
    unlock();
  }, [unlock]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.bg,
        alignItems: 'center',
        justifyContent: 'center',
        padding: space.xl,
        gap: space.md,
      }}>
      <Pressable onPress={unlock} accessibilityRole="button" accessibilityLabel="Buka aplikasi">
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: theme.primarySoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Ionicons name="lock-closed" size={30} color={theme.primary} />
        </View>
      </Pressable>
      <Txt variant="title">NotaKu terkunci</Txt>
      <Txt variant="small" color={theme.textMuted} style={{ textAlign: 'center' }}>
        Buka dengan sidik jari atau PIN perangkat.
      </Txt>
      {message ? (
        <Txt variant="small" color={theme.danger}>
          {message}
        </Txt>
      ) : null}
      <AppButton title="Buka" icon="finger-print" onPress={unlock} style={{ minWidth: 180 }} />
    </View>
  );
}
