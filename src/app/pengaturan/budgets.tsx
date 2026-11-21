import { Ionicons } from '@expo/vector-icons';
import { useRouter , useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Modal, ScrollView, View } from 'react-native';

import {
  listBudgets,
  listWallets,
  setBudget,
  totalsByCategory,
  type Budget,
  type Wallet,
} from '@/db/queries';
import { monthRange } from '@/db/queries';
import { formatRupiah } from '@/lib/money';
import { useApp } from '@/state/app';
import { radii, space, useTheme } from '@/theme';
import {
  AppButton,
  Card,
  Chip,
  EmptyState,
  MoneyInput,
  PressableScale,
  Screen,
  ScreenHeader,
  Txt,
} from '@/ui/components';
import { CategoryIcon } from '@/ui/category-icon';

export default function BudgetsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { categories, categoryDefs } = useApp();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [spent, setSpent] = useState<Record<string, number>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<number | null>(null);

  const load = useCallback(async () => {
    const list = await listWallets();
    const active = walletId ?? list[0]?.id ?? null;
    setWallets(list);
    if (active !== walletId) setWalletId(active);
    if (!active) return;
    const [budgetRows, catRows] = await Promise.all([
      listBudgets(active),
      totalsByCategory({ walletId: active, ...monthRange() }),
    ]);
    setBudgets(budgetRows);
    setSpent(Object.fromEntries(catRows.map((row) => [row.category, row.total])));
  }, [walletId]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => undefined);
    }, [load]),
  );

  const openEdit = (category: string) => {
    const current = budgets.find((row) => row.category === category);
    setEditing(category);
    setDraft(current?.amount ?? null);
  };

  const save = async () => {
    if (!editing || !walletId) return;
    await setBudget(walletId, editing, draft ?? 0);
    setEditing(null);
    setDraft(null);
    await load();
  };

  if (wallets.length === 0) {
    return (
      <Screen edges={['top']}>
        <ScreenHeader title="Anggaran" onBack={() => router.back()} />
        <Card>
          <EmptyState icon="wallet-outline" title="Belum ada dompet" body="Buat dompet dulu di Pengaturan → Dompet." />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen edges={['top']}>
      <ScreenHeader
        title="Anggaran"
        subtitle="Batas pengeluaran per kategori tiap bulan"
        onBack={() => router.back()}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        {wallets.map((wallet) => (
          <Chip
            key={wallet.id}
            label={wallet.name}
            selected={walletId === wallet.id}
            color={wallet.color}
            onPress={() => setWalletId(wallet.id)}
          />
        ))}
      </ScrollView>

      <Card padded={false} style={{ paddingHorizontal: space.lg }}>
        {categories.map((category, index) => {
          const def = categoryDefs.find((item) => item.name === category);
          const budget = budgets.find((row) => row.category === category);
          const used = spent[category] ?? 0;
          const ratio = budget && budget.amount > 0 ? used / budget.amount : 0;
          const color = ratio > 1 ? theme.danger : ratio > 0.8 ? theme.accent : def?.color ?? theme.primary;
          return (
            <View key={category}>
              {index > 0 ? <View style={{ height: 1, backgroundColor: theme.border, marginLeft: 56 }} /> : null}
              <PressableScale
                onPress={() => openEdit(category)}
                haptic="selection"
                style={{ paddingVertical: space.md, gap: 7 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 13,
                      backgroundColor: `${def?.color ?? theme.primary}22`,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <CategoryIcon icon={def?.icon ?? 'tag'} color={def?.color ?? theme.primary} size={21} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt variant="body" style={{ fontWeight: '600' }}>
                      {category}
                    </Txt>
                    <Txt variant="small" color={theme.textMuted}>
                      {budget ? `${formatRupiah(used)} dari ${formatRupiah(budget.amount)}` : 'Belum diatur'}
                    </Txt>
                  </View>
                  {budget ? (
                    <Txt variant="small" color={ratio > 1 ? theme.danger : theme.textMuted} style={{ fontWeight: '700' }}>
                      {Math.round(ratio * 100)}%
                    </Txt>
                  ) : (
                    <Ionicons name="add-circle-outline" size={20} color={theme.textMuted} />
                  )}
                </View>
                {budget ? (
                  <View style={{ height: 7, borderRadius: 4, backgroundColor: theme.cardAlt, marginLeft: 56 }}>
                    <View
                      style={{
                        width: `${Math.min(100, Math.round(ratio * 100))}%`,
                        height: 7,
                        borderRadius: 4,
                        backgroundColor: color,
                      }}
                    />
                  </View>
                ) : null}
              </PressableScale>
            </View>
          );
        })}
      </Card>

      <Txt variant="small" color={theme.textMuted} style={{ textAlign: 'center' }}>
        Isi 0 untuk menghapus anggaran kategori. Anggaran berlaku tiap bulan.
      </Txt>

      <Modal visible={editing !== null} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <PressableScale style={{ flex: 1, backgroundColor: theme.overlay }} onPress={() => setEditing(null)} />
        <View
          style={{
            backgroundColor: theme.bg,
            borderTopLeftRadius: radii.xxl,
            borderTopRightRadius: radii.xxl,
            padding: space.xl,
            paddingBottom: space.xxxl,
            gap: space.lg,
          }}>
          <Txt variant="title">{editing}</Txt>
          <MoneyInput label="Anggaran per bulan" value={draft} onChange={setDraft} />
          <AppButton title="Simpan" onPress={save} />
        </View>
      </Modal>
    </Screen>
  );
}
