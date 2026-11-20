import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Switch, View } from 'react-native';

import { getApiKey } from '@/ai/gemini';
import { listWallets } from '@/db/queries';
import { useApp } from '@/state/app';
import { radii, space, useTheme } from '@/theme';
import {
  Badge,
  Card,
  Divider,
  ListRow,
  PressableScale,
  Screen,
  SectionTitle,
  Txt,
} from '@/ui/components';

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { settings, set } = useApp();
  const [hasKey, setHasKey] = useState(false);
  const [walletCount, setWalletCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [key, wallets] = await Promise.all([getApiKey(), listWallets()]);
        setHasKey(Boolean(key));
        setWalletCount(wallets.length);
      })().catch(() => undefined);
    }, []),
  );

  const initial = (settings.nama || 'N').trim().charAt(0).toUpperCase();

  return (
    <Screen edges={['top']} withTabs>
      <View style={{ paddingTop: space.sm }}>
        <Txt variant="display" style={{ fontSize: 28 }}>
          Pengaturan
        </Txt>
      </View>

      <PressableScale
        onPress={() => router.push('/pengaturan/profile')}
        haptic="selection"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.lg,
          backgroundColor: theme.primaryDeep,
          borderRadius: radii.xxl,
          padding: space.lg,
        }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 20,
            backgroundColor: theme.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Txt variant="title" color={theme.primaryDeep}>
            {initial}
          </Txt>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="section" color="#FFFFFF" numberOfLines={1}>
            {settings.nama || 'Belum ada nama'}
          </Txt>
          <Txt variant="small" color="#9DBDB2" numberOfLines={1}>
            {settings.email || 'Tambahkan email (opsional)'}
          </Txt>
        </View>
        <Txt variant="small" color={theme.accent} style={{ fontWeight: '700' }}>
          Edit
        </Txt>
      </PressableScale>

      <SectionTitle>Keuangan</SectionTitle>
      <Card padded={false} style={{ paddingHorizontal: space.lg }}>
        <ListRow
          icon="wallet"
          iconColor={theme.primary}
          iconBg={theme.mint}
          title="Dompet"
          subtitle={`${walletCount} dompet aktif`}
          onPress={() => router.push('/pengaturan/wallets')}
        />
        <Divider inset={56} />
        <ListRow
          icon="pricetags"
          iconColor={theme.warning}
          iconBg={theme.accentSoft}
          title="Kategori"
          subtitle="Atur label pengeluaran"
          onPress={() => router.push('/pengaturan/categories')}
        />
        <Divider inset={56} />
        <ListRow
          icon="cloud-upload"
          iconColor={theme.primary}
          iconBg={theme.mint}
          title="Backup & ekspor"
          subtitle="Simpan ZIP atau cetak struk"
          onPress={() => router.push('/backup')}
        />
      </Card>

      <SectionTitle>Pembaca struk</SectionTitle>
      <Card padded={false} style={{ paddingHorizontal: space.lg }}>
        <ListRow
          icon="sparkles"
          iconColor={hasKey ? theme.primary : theme.textMuted}
          iconBg={hasKey ? theme.mint : theme.cardAlt}
          title="Gemini"
          subtitle="Kunci API milikmu sendiri"
          right={
            <Badge
              label={hasKey ? 'Aktif' : 'Nonaktif'}
              tone={hasKey ? 'success' : 'neutral'}
            />
          }
          onPress={() => router.push('/pengaturan/ai')}
          chevron={false}
        />
      </Card>

      <SectionTitle>Privasi</SectionTitle>
      <Card style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: theme.cardAlt,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Ionicons name="lock-closed" size={18} color={theme.textMuted} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="body" style={{ fontWeight: '600' }}>
              Kunci aplikasi
            </Txt>
            <Txt variant="small" color={theme.textMuted}>
              Minta sidik jari atau PIN saat dibuka
            </Txt>
          </View>
          <Switch
            value={settings.app_lock === '1'}
            onValueChange={(next) => set('app_lock', next ? '1' : '0')}
            trackColor={{ true: theme.primary, false: theme.cardAlt }}
            thumbColor="#FFFFFF"
          />
        </View>
      </Card>

      <SectionTitle>Tentang</SectionTitle>
      <Card style={{ gap: space.xs }}>
        <Txt variant="body" style={{ fontWeight: '600' }}>
          NotaKu 1.1.0
        </Txt>
        <Txt variant="small" color={theme.textMuted}>
          Data tersimpan di HP ini. Tidak ada akun, tidak ada cloud.
        </Txt>
        <Txt variant="small" color={theme.textMuted}>
          Foto struk hanya dikirim ke Google saat kamu memakai fitur Gemini.
        </Txt>
      </Card>
    </Screen>
  );
}

