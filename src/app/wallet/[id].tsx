import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter , useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Modal, View } from 'react-native';

import { ExpenseRow } from '@/components/expense-row';
import { WalletFormSheet } from '@/components/wallet-picker';
import {
  getWallet,
  listExpenses,
  listItemsFor,
  totals,
  totalsByCategory,
  type CategoryTotal,
  type Expense,
  type ExpenseItem,
  type Wallet,
} from '@/db/queries';
import { formatDateID } from '@/lib/dates';
import { formatRupiah } from '@/lib/money';
import { printReceipts, shareReceiptCsv, shareReceiptPdf } from '@/receipt/export';
import type { ReceiptData } from '@/receipt/build';
import { useApp } from '@/state/app';
import { colorForCategory, radii, space, useTheme } from '@/theme';
import {
  AppButton,
  Card,
  Divider,
  EmptyState,
  PressableScale,
  ProgressBar,
  Screen,
  ScreenHeader,
  SectionTitle,
  Txt,
} from '@/ui/components';

export default function WalletDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { settings } = useApp();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState({ total: 0, count: 0, tax: 0 });
  const [byCategory, setByCategory] = useState<CategoryTotal[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [working, setWorking] = useState<'pdf' | 'csv' | 'print' | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const [found, rows, sum, cats] = await Promise.all([
      getWallet(id),
      listExpenses({ walletId: id }),
      totals({ walletId: id }),
      totalsByCategory({ walletId: id }),
    ]);
    setWallet(found);
    setExpenses(rows);
    setSummary(sum);
    setByCategory(cats);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load().catch((error) => Alert.alert('Gagal memuat', (error as Error).message));
    }, [load]),
  );

  const buildData = async (): Promise<ReceiptData[]> => {
    if (!wallet) return [];
    const items = await listItemsFor(expenses.map((e) => e.id));
    return expenses.map((expense) => ({
      wallet,
      expense,
      items: items[expense.id] ?? ([] as ExpenseItem[]),
      settings,
    }));
  };

  const runExport = async (kind: 'pdf' | 'csv' | 'print') => {
    setExportOpen(false);
    setWorking(kind);
    try {
      const data = await buildData();
      if (data.length === 0) throw new Error('Belum ada struk untuk diekspor.');
      if (kind === 'csv') await shareReceiptCsv(data, wallet?.name ?? 'Dompet');
      if (kind === 'pdf') await shareReceiptPdf(data, wallet?.name ?? 'Dompet');
      if (kind === 'print') await printReceipts(data);
    } catch (error) {
      Alert.alert('Gagal', (error as Error).message);
    } finally {
      setWorking(null);
    }
  };

  if (!wallet) {
    return (
      <Screen edges={['top']}>
        <ScreenHeader title="Dompet" onBack={() => router.back()} />
        <View style={{ paddingTop: space.xxxl, alignItems: 'center' }}>
          <ActivityIndicator />
        </View>
      </Screen>
    );
  }

  const ratio = wallet.budget && wallet.budget > 0 ? summary.total / wallet.budget : null;

  return (
    <Screen
      edges={['top']}
      footer={
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <AppButton
            title="Tambah"
            icon="add"
            onPress={() => router.push({ pathname: '/review', params: { walletId: wallet.id } })}
            style={{ flex: 1 }}
          />
          <AppButton
            title="Ekspor"
            icon="share-outline"
            variant="secondary"
            onPress={() => setExportOpen(true)}
            style={{ flex: 1 }}
          />
        </View>
      }>
      <ScreenHeader
        title={wallet.name}
        subtitle={`${expenses.length} catatan`}
        onBack={() => router.back()}
        right={
          <PressableScale
            onPress={() => setEditOpen(true)}
            haptic="selection"
            accessibilityLabel="Ubah dompet"
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Ionicons name="pencil" size={16} color={theme.text} />
          </PressableScale>
        }
      />

      <View
        style={{
          backgroundColor: theme.primaryDeep,
          borderRadius: radii.xxl,
          padding: space.xl,
          gap: space.sm,
        }}>
        <Txt variant="label" color="#9DBDB2">
          Total pengeluaran
        </Txt>
        <Txt variant="display" color="#FFFFFF" style={{ letterSpacing: -1 }}>
          {formatRupiah(summary.total)}
        </Txt>
        {ratio != null ? (
          <View style={{ gap: 6, marginTop: space.sm }}>
            <ProgressBar value={ratio} color={ratio > 0.9 ? theme.danger : theme.accent} />
            <Txt variant="small" color="#9DBDB2">
              {Math.round(ratio * 100)}% dari saldo {formatRupiah(wallet.budget ?? 0)}
            </Txt>
          </View>
        ) : (
          <Txt variant="small" color="#9DBDB2">
            {summary.count} struk · pajak {formatRupiah(summary.tax)}
          </Txt>
        )}
      </View>

      {byCategory.length > 0 ? (
        <View style={{ gap: space.sm }}>
          <SectionTitle>Per kategori</SectionTitle>
          <Card style={{ gap: space.md }}>
            {byCategory.slice(0, 6).map((row) => {
              const tint = colorForCategory(row.category);
              return (
                <View key={row.category} style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Txt variant="small" style={{ fontWeight: '600' }}>
                      {row.category}
                    </Txt>
                    <Txt variant="small" color={theme.textMuted}>
                      {formatRupiah(row.total)}
                    </Txt>
                  </View>
                  <ProgressBar value={row.total / Math.max(summary.total, 1)} color={tint} />
                </View>
              );
            })}
          </Card>
        </View>
      ) : null}

      <View style={{ gap: space.sm }}>
        <SectionTitle right={<Txt variant="small" color={theme.textMuted}>{formatDateID(expenses[0]?.date ?? '')}</Txt>}>
          Catatan
        </SectionTitle>
        {expenses.length === 0 ? (
          <Card>
            <EmptyState
              icon="receipt-outline"
              title="Belum ada catatan"
              body="Foto struk atau input manual untuk dompet ini."
              action={
                <AppButton
                  title="Tambah catatan"
                  compact
                  onPress={() => router.push({ pathname: '/review', params: { walletId: wallet.id } })}
                />
              }
            />
          </Card>
        ) : (
          <Card padded={false} style={{ paddingVertical: 4 }}>
            {expenses.map((expense, index) => (
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

      <Modal visible={exportOpen} transparent animationType="slide" onRequestClose={() => setExportOpen(false)}>
        <PressableScale style={{ flex: 1, backgroundColor: theme.overlay }} onPress={() => setExportOpen(false)} />
        <View
          style={{
            backgroundColor: theme.bg,
            borderTopLeftRadius: radii.xxl,
            borderTopRightRadius: radii.xxl,
            padding: space.xl,
            paddingBottom: space.xxxl,
            gap: space.sm,
          }}>
          <Txt variant="title">Ekspor</Txt>
          <Txt variant="small" color={theme.textMuted}>
            {summary.count} struk · {formatRupiah(summary.total)}
          </Txt>
          <Divider />
          <ExportRow
            icon="receipt-outline"
            title="Cetak semua struk"
            hint="Satu struk per halaman, gaya struk kasir"
            loading={working === 'pdf'}
            onPress={() => runExport('pdf')}
          />
          <ExportRow
            icon="print-outline"
            title="Print langsung"
            hint="Lewat printer atau simpan PDF"
            loading={working === 'print'}
            onPress={() => runExport('print')}
          />
          <ExportRow
            icon="grid-outline"
            title="CSV untuk Excel"
            hint="Rekap angka, tanpa gambar"
            loading={working === 'csv'}
            onPress={() => runExport('csv')}
          />
        </View>
      </Modal>

      <WalletFormSheet
        visible={editOpen}
        wallet={wallet}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          load().catch(() => undefined);
        }}
      />
    </Screen>
  );
}

function ExportRow({
  icon,
  title,
  hint,
  onPress,
  loading,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  hint: string;
  onPress: () => void;
  loading: boolean;
}) {
  const theme = useTheme();
  return (
    <PressableScale onPress={onPress} disabled={loading} haptic="selection" style={{ paddingVertical: space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: theme.mint,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          {loading ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <Ionicons name={icon} size={19} color={theme.primary} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Txt variant="body" style={{ fontWeight: '600' }}>
            {title}
          </Txt>
          <Txt variant="small" color={theme.textMuted}>
            {hint}
          </Txt>
        </View>
        <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
      </View>
    </PressableScale>
  );
}
