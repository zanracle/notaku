import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { ExpenseRow } from '@/components/expense-row';
import { WalletFormSheet } from '@/components/wallet-picker';
import {
  dailyTotals,
  ensureDefaultWallet,
  listExpenses,
  listWallets,
  monthRange,
  totals,
  type Expense,
  type Wallet,
} from '@/db/queries';
import { addDays, currentMonthKey, formatDayMonth, monthLabel, todayISO } from '@/lib/dates';
import { formatRupiah, formatRupiahCompact } from '@/lib/money';
import { useApp } from '@/state/app';
import { radii, space, useTheme } from '@/theme';
import {
  AppButton,
  Card,
  EmptyState,
  PressableScale,
  Screen,
  SectionTitle,
  Txt,
} from '@/ui/components';

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { settings } = useApp();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [walletTotals, setWalletTotals] = useState<Record<string, { total: number; count: number }>>({});
  const [month, setMonth] = useState({ total: 0, count: 0 });
  const [daily, setDaily] = useState<{ date: string; total: number }[]>([]);
  const [recent, setRecent] = useState<Expense[]>([]);
  const [pendingBackup, setPendingBackup] = useState(false);
  const [walletSheet, setWalletSheet] = useState(false);

  const load = useCallback(async () => {
    let list = await listWallets();
    if (list.length === 0) {
      const created = await ensureDefaultWallet();
      list = [created];
    }
    setWallets(list);

    const range = monthRange();
    const [monthTotals, dailyRows, latest] = await Promise.all([
      totals(range),
      dailyTotals(addDays(todayISO(), -6), todayISO()),
      listExpenses({ limit: 4 }),
    ]);

    const perWallet: Record<string, { total: number; count: number }> = {};
    await Promise.all(
      list.map(async (wallet) => {
        perWallet[wallet.id] = await totals({ ...range, walletId: wallet.id });
      }),
    );

    setWalletTotals(perWallet);
    setMonth({ total: monthTotals.total, count: monthTotals.count });
    setDaily(dailyRows);
    setRecent(latest);

    const lastBackup = settings.last_backup_at ? new Date(settings.last_backup_at).getTime() : 0;
    setPendingBackup(monthTotals.count > 0 && Date.now() - lastBackup > 7 * 86_400_000);
  }, [settings.last_backup_at]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => undefined);
    }, [load]),
  );

  const first = settings.nama?.trim().split(' ')[0];
  const maxDaily = Math.max(1, ...daily.map((d) => d.total));
  const bars = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(todayISO(), i - 6);
    const found = daily.find((d) => d.date === date);
    return { date, total: found?.total ?? 0 };
  });

  return (
    <Screen edges={['top']} withTabs>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: space.sm }}>
        <View style={{ flex: 1 }}>
          <Txt variant="small" color={theme.textMuted}>
            {first ? `Halo, ${first}` : 'Selamat datang'}
          </Txt>
          <Txt variant="display">NotaKu</Txt>
        </View>
        <PressableScale
          onPress={() => router.push('/(tabs)/settings')}
          haptic="selection"
          accessibilityLabel="Pengaturan"
          style={{
            width: 44,
            height: 44,
            borderRadius: 16,
            backgroundColor: theme.primaryDeep,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Txt variant="section" color="#F0A83C">
            {(settings.nama || 'N').trim().charAt(0).toUpperCase()}
          </Txt>
        </PressableScale>
      </View>

      <View
        style={{
          backgroundColor: theme.primaryDeep,
          borderRadius: radii.xxl,
          padding: space.xl,
          gap: space.sm,
          overflow: 'hidden',
        }}>
        <Txt variant="label" color="#9DBDB2">
          Pengeluaran {monthLabel(currentMonthKey())}
        </Txt>
        <Txt variant="display" color="#FFFFFF" style={{ letterSpacing: -1 }}>
          {formatRupiah(month.total)}
        </Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: 4 }}>
          <View style={{ backgroundColor: '#145C49', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 }}>
            <Txt variant="small" color="#CDE7DE" style={{ fontWeight: '700' }}>
              {month.count} struk
            </Txt>
          </View>
          <Txt variant="small" color="#9DBDB2">
            rata-rata {formatRupiahCompact(month.count ? Math.round(month.total / month.count) : 0)}
          </Txt>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 7, height: 54, marginTop: space.sm }}>
          {bars.map((bar, index) => (
            <View key={bar.date} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <View
                style={{
                  width: '100%',
                  height: Math.max(5, Math.round((bar.total / maxDaily) * 38)),
                  borderRadius: 4,
                  backgroundColor: index === 6 ? theme.accent : '#2C6B58',
                }}
              />
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Txt variant="small" color="#9DBDB2" style={{ fontSize: 10 }}>
            {formatDayMonth(bars[0].date)}
          </Txt>
          <Txt variant="small" color="#9DBDB2" style={{ fontSize: 10 }}>
            Hari ini
          </Txt>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: space.md }}>
        <PressableScale
          onPress={() => router.push('/capture')}
          haptic="medium"
          style={{
            flex: 1,
            backgroundColor: theme.mint,
            borderRadius: radii.xxl,
            padding: space.lg,
            gap: space.md,
          }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              backgroundColor: theme.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Ionicons name="camera" size={20} color={theme.onPrimary} />
          </View>
          <Txt variant="section" color={theme.primaryDeep}>
            Foto struk
          </Txt>
        </PressableScale>

        <PressableScale
          onPress={() => router.push('/review')}
          haptic="medium"
          style={{
            flex: 1,
            backgroundColor: theme.accentSoft,
            borderRadius: radii.xxl,
            padding: space.lg,
            gap: space.md,
          }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              backgroundColor: theme.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Ionicons name="create" size={20} color={theme.primaryDeep} />
          </View>
          <Txt variant="section">Input manual</Txt>
        </PressableScale>
      </View>

      {pendingBackup ? (
        <PressableScale
          onPress={() => router.push('/backup')}
          haptic="selection"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.md,
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: radii.lg,
            padding: space.md,
          }}>
          <Ionicons name="cloud-upload-outline" size={18} color={theme.textMuted} />
          <Txt variant="small" color={theme.textMuted} style={{ flex: 1 }}>
            Sudah seminggu tanpa backup. Data hanya ada di HP ini.
          </Txt>
          <Ionicons name="chevron-forward" size={15} color={theme.textMuted} />
        </PressableScale>
      ) : null}

      <View style={{ gap: space.sm }}>
        <SectionTitle
          right={
            <PressableScale onPress={() => router.push('/settings/wallets')} haptic="selection">
              <Txt variant="small" color={theme.primary} style={{ fontWeight: '700' }}>
                Kelola
              </Txt>
            </PressableScale>
          }>
          Dompet
        </SectionTitle>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          {wallets.map((wallet) => {
            const stat = walletTotals[wallet.id] ?? { total: 0, count: 0 };
            return (
              <PressableScale
                key={wallet.id}
                onPress={() => router.push({ pathname: '/wallet/[id]', params: { id: wallet.id } })}
                haptic="light"
                style={{
                  width: 170,
                  backgroundColor: theme.card,
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: radii.xl,
                  padding: space.lg,
                  gap: 6,
                }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: wallet.color }} />
                  <Txt variant="small" style={{ fontWeight: '700' }} numberOfLines={1}>
                    {wallet.name}
                  </Txt>
                </View>
                <Txt variant="amount" style={{ fontSize: 17 }}>
                  {formatRupiah(stat.total)}
                </Txt>
                <Txt variant="small" color={theme.textMuted} style={{ fontSize: 11 }}>
                  {stat.count} struk bulan ini
                </Txt>
              </PressableScale>
            );
          })}
          <PressableScale
            onPress={() => setWalletSheet(true)}
            haptic="selection"
            style={{
              width: 92,
              borderRadius: radii.xl,
              borderWidth: 1.5,
              borderStyle: 'dashed',
              borderColor: theme.border,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}>
            <Ionicons name="add" size={20} color={theme.textMuted} />
            <Txt variant="small" color={theme.textMuted} style={{ fontSize: 11 }}>
              Tambah
            </Txt>
          </PressableScale>
        </ScrollView>
      </View>

      <View style={{ gap: space.sm }}>
        <SectionTitle
          right={
            recent.length > 0 ? (
              <PressableScale onPress={() => router.push('/(tabs)/expenses')} haptic="selection">
                <Txt variant="small" color={theme.primary} style={{ fontWeight: '700' }}>
                  Lihat semua
                </Txt>
              </PressableScale>
            ) : null
          }>
          Terakhir
        </SectionTitle>

        {recent.length === 0 ? (
          <Card>
            <EmptyState
              icon="receipt-outline"
              title="Belum ada catatan"
              body="Foto struk pertamamu, atau input manual kalau struknya tidak ada."
              action={<AppButton title="Foto struk" compact onPress={() => router.push('/capture')} />}
            />
          </Card>
        ) : (
          <Card padded={false} style={{ paddingVertical: 4 }}>
            {recent.map((expense, index) => (
              <View key={expense.id}>
                {index > 0 ? (
                  <View style={{ height: 1, backgroundColor: theme.border, marginLeft: 68 }} />
                ) : null}
                <ExpenseRow
                  expense={expense}
                  onPress={() => router.push({ pathname: '/review', params: { expenseId: expense.id } })}
                />
              </View>
            ))}
          </Card>
        )}
      </View>

      <WalletFormSheet
        visible={walletSheet}
        onClose={() => setWalletSheet(false)}
        onSaved={() => {
          load().catch(() => undefined);
        }}
      />
    </Screen>
  );
}

