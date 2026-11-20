import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, View } from 'react-native';

import { WalletFormSheet } from '@/components/wallet-picker';
import { deleteWallet, listWallets, totals, type Wallet } from '@/db/queries';
import { formatRupiah } from '@/lib/money';
import { radii, space, useTheme } from '@/theme';
import {
  AppButton,
  Card,
  EmptyState,
  PressableScale,
  Screen,
  ScreenHeader,
  Txt,
} from '@/ui/components';

export default function WalletsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [stats, setStats] = useState<Record<string, { total: number; count: number }>>({});
  const [sheet, setSheet] = useState(false);
  const [editing, setEditing] = useState<Wallet | null>(null);

  const load = useCallback(async () => {
    const list = await listWallets();
    setWallets(list);
    const map: Record<string, { total: number; count: number }> = {};
    await Promise.all(
      list.map(async (wallet) => {
        map[wallet.id] = await totals({ walletId: wallet.id });
      }),
    );
    setStats(map);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => undefined);
    }, [load]),
  );

  const remove = (wallet: Wallet) => {
    Alert.alert('Hapus dompet?', `"${wallet.name}" hanya bisa dihapus kalau tidak punya catatan.`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteWallet(wallet.id);
            await load();
          } catch (error) {
            Alert.alert('Tidak bisa dihapus', (error as Error).message);
          }
        },
      },
    ]);
  };

  return (
    <Screen
      edges={['top']}
      footer={<AppButton title="Tambah dompet" icon="add" onPress={() => setSheet(true)} />}>
      <ScreenHeader title="Dompet" subtitle="Tempat menaruh catatan" onBack={() => router.back()} />

      {wallets.length === 0 ? (
        <Card>
          <EmptyState
            icon="wallet-outline"
            title="Belum ada dompet"
            body="Buat dompet untuk memisahkan uang harian, kantor, atau tabungan."
            action={<AppButton title="Buat dompet" compact onPress={() => setSheet(true)} />}
          />
        </Card>
      ) : (
        wallets.map((wallet) => {
          const stat = stats[wallet.id] ?? { total: 0, count: 0 };
          return (
            <PressableScale
              key={wallet.id}
              onPress={() => router.push({ pathname: '/wallet/[id]', params: { id: wallet.id } })}
              haptic="light"
              style={{
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: radii.xxl,
                padding: space.lg,
                gap: space.sm,
              }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 15,
                    backgroundColor: `${wallet.color}22`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Ionicons name="wallet" size={20} color={wallet.color} />
                </View>
                <View style={{ flex: 1, gap: 1 }}>
                  <Txt variant="section">{wallet.name}</Txt>
                  <Txt variant="small" color={theme.textMuted}>
                    {stat.count} catatan
                    {wallet.budget ? ` · saldo awal ${formatRupiah(wallet.budget)}` : ''}
                  </Txt>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTopWidth: 1,
                  borderTopColor: theme.border,
                  paddingTop: space.sm,
                }}>
                <Txt variant="amount">{formatRupiah(stat.total)}</Txt>
                <View style={{ flexDirection: 'row', gap: space.lg }}>
                  <PressableScale
                    onPress={() => {
                      setEditing(wallet);
                      setSheet(true);
                    }}
                    haptic="selection"
                    accessibilityLabel={`Ubah ${wallet.name}`}>
                    <Txt variant="small" color={theme.primary} style={{ fontWeight: '700' }}>
                      Ubah
                    </Txt>
                  </PressableScale>
                  <PressableScale onPress={() => remove(wallet)} haptic="selection" accessibilityLabel="Hapus dompet">
                    <Txt variant="small" color={theme.danger} style={{ fontWeight: '700' }}>
                      Hapus
                    </Txt>
                  </PressableScale>
                </View>
              </View>
            </PressableScale>
          );
        })
      )}

      <WalletFormSheet
        visible={sheet}
        wallet={editing}
        onClose={() => {
          setSheet(false);
          setEditing(null);
        }}
        onSaved={() => {
          load().catch(() => undefined);
        }}
      />
    </Screen>
  );
}
