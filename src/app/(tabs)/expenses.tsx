import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, View } from 'react-native';

import { ExpenseRow } from '@/components/expense-row';
import { categoryDef } from '@/lib/defaults';
import { CategoryIcon } from '@/ui/category-icon';
import { listExpenses, listWallets, type Expense, type Wallet } from '@/db/queries';
import { formatDateID, formatDayMonth, monthLabel, todayISO } from '@/lib/dates';
import { formatRupiah } from '@/lib/money';
import { useApp } from '@/state/app';
import { radii, space, useTheme } from '@/theme';
import {
  AppButton,
  Card,
  DateField,
  EmptyState,
  Field,
  MoneyInput,
  PressableScale,
  Screen,
  Txt,
} from '@/ui/components';

function monthBounds(key: string): { from: string; to: string } {
  const [y, m] = key.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${key}-01`, to: `${key}-${String(last).padStart(2, '0')}` };
}

function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export default function ExpensesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string; from?: string; to?: string; search?: string }>();
  const { categories, categoryDefs } = useApp();
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [minAmount, setMinAmount] = useState<number | null>(null);
  const [maxAmount, setMaxAmount] = useState<number | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [picker, setPicker] = useState<'wallet' | 'category' | null>(null);
  const [draft, setDraft] = useState<{ from: string; to: string; min: number | null; max: number | null }>({
    from: '',
    to: '',
    min: null,
    max: null,
  });

  // Drill-down dari Laporan.
  useEffect(() => {
    let touched = false;
    if (params.category) {
      setCategory(params.category);
      touched = true;
    }
    if (params.search) {
      setSearch(params.search);
      touched = true;
    }
    if (params.from && params.to) {
      setRange({ from: params.from, to: params.to });
      setMonth(params.from.slice(0, 7));
      touched = true;
    }
    if (!touched) return;
  }, [params.category, params.from, params.search, params.to]);

  const load = useCallback(async () => {
    const bounds = range ?? monthBounds(month);
    const [rows, allWallets] = await Promise.all([
      listExpenses({
        from: bounds.from,
        to: bounds.to,
        category: category ?? undefined,
        walletId: walletId ?? undefined,
        search: search || undefined,
        minAmount: minAmount ?? undefined,
        maxAmount: maxAmount ?? undefined,
      }),
      listWallets(),
    ]);
    setExpenses(rows);
    setWallets(allWallets);
  }, [month, category, walletId, search, range, minAmount, maxAmount]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => undefined);
    }, [load]),
  );

  useEffect(() => {
    const timer = setTimeout(() => load().catch(() => undefined), 220);
    return () => clearTimeout(timer);
  }, [load]);

  const grouped = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const expense of expenses) {
      const list = map.get(expense.date) ?? [];
      list.push(expense);
      map.set(expense.date, list);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [expenses]);

  const total = expenses.reduce((sum, item) => sum + item.amount, 0);
  const activeFilters = [range, minAmount, maxAmount].filter(Boolean).length;

  const openFilter = () => {
    setDraft({
      from: range?.from ?? '',
      to: range?.to ?? '',
      min: minAmount,
      max: maxAmount,
    });
    setFilterOpen(true);
  };

  const applyFilter = () => {
    if (draft.from && draft.to && draft.from <= draft.to) setRange({ from: draft.from, to: draft.to });
    else if (!draft.from && !draft.to) setRange(null);
    setMinAmount(draft.min);
    setMaxAmount(draft.max);
    setFilterOpen(false);
  };

  const resetAll = () => {
    setRange(null);
    setMinAmount(null);
    setMaxAmount(null);
    setCategory(null);
    setWalletId(null);
    setSearch('');
    setMonth(todayISO().slice(0, 7));
  };

  return (
    <Screen edges={['top']} withTabs>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: space.sm }}>
        <View style={{ flex: 1 }}>
          <Txt variant="small" color={theme.textMuted}>
            Riwayat
          </Txt>
          <Txt variant="display" style={{ fontSize: 28 }}>
            Biaya
          </Txt>
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 2,
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: radii.pill,
            padding: 4,
          }}>
          <PressableScale
            onPress={() => {
              setRange(null);
              setMonth(shiftMonth(month, -1));
            }}
            haptic="selection"
            accessibilityLabel="Bulan sebelumnya"
            style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="chevron-back" size={16} color={theme.text} />
          </PressableScale>
          <Txt variant="small" style={{ fontWeight: '700' }}>
            {monthLabel(month).split(' ')[0]}
          </Txt>
          <PressableScale
            onPress={() => {
              setRange(null);
              setMonth(shiftMonth(month, 1));
            }}
            haptic="selection"
            accessibilityLabel="Bulan berikutnya"
            style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="chevron-forward" size={16} color={theme.text} />
          </PressableScale>
        </View>
      </View>

      <Card style={{ gap: 2 }}>
        <Txt variant="small" color={theme.textMuted}>
          {range ? `${formatDateID(range.from)} – ${formatDateID(range.to)}` : `Total ${monthLabel(month)}`}
        </Txt>
        <Txt variant="title">{formatRupiah(total)}</Txt>
        <Txt variant="small" color={theme.textMuted}>
          {expenses.length} catatan
        </Txt>
      </Card>

      <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <Field
            label="Cari"
            value={search}
            onChangeText={setSearch}
            placeholder="Nama toko atau catatan"
            autoCorrect={false}
            right={
              search ? (
                <PressableScale onPress={() => setSearch('')} accessibilityLabel="Hapus pencarian">
                  <Ionicons name="close-circle" size={18} color={theme.textMuted} />
                </PressableScale>
              ) : (
                <Ionicons name="search" size={18} color={theme.textMuted} />
              )
            }
          />
        </View>
        <PressableScale
          onPress={openFilter}
          haptic="selection"
          accessibilityLabel="Filter"
          style={{
            width: 52,
            height: 52,
            borderRadius: radii.md,
            backgroundColor: activeFilters > 0 ? theme.primary : theme.card,
            borderWidth: 1,
            borderColor: activeFilters > 0 ? theme.primary : theme.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Ionicons name="options-outline" size={20} color={activeFilters > 0 ? '#FFFFFF' : theme.textMuted} />
        </PressableScale>
      </View>

      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <PressableScale
          onPress={() => setPicker('wallet')}
          haptic="selection"
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: radii.md,
            paddingHorizontal: space.md,
            minHeight: 46,
          }}>
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: wallets.find((wallet) => wallet.id === walletId)?.color ?? theme.textMuted,
            }}
          />
          <Txt variant="small" style={{ flex: 1, fontWeight: '600' }} numberOfLines={1}>
            {wallets.find((wallet) => wallet.id === walletId)?.name ?? 'Semua dompet'}
          </Txt>
          <Ionicons name="chevron-down" size={14} color={theme.textMuted} />
        </PressableScale>

        <PressableScale
          onPress={() => setPicker('category')}
          haptic="selection"
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: radii.md,
            paddingHorizontal: space.md,
            minHeight: 46,
          }}>
          {category ? (
            <CategoryIcon
              icon={(categoryDefs.find((def) => def.name === category) ?? categoryDef(category)).icon}
              color={(categoryDefs.find((def) => def.name === category) ?? categoryDef(category)).color}
              size={18}
            />
          ) : (
            <Ionicons name="pricetags-outline" size={16} color={theme.textMuted} />
          )}
          <Txt variant="small" style={{ flex: 1, fontWeight: '600' }} numberOfLines={1}>
            {category ?? 'Semua kategori'}
          </Txt>
          <Ionicons name="chevron-down" size={14} color={theme.textMuted} />
        </PressableScale>
      </View>

      {activeFilters > 0 || category || walletId || search ? (
        <PressableScale onPress={resetAll} haptic="selection" style={{ alignSelf: 'flex-start' }}>
          <Txt variant="small" color={theme.primary} style={{ fontWeight: '700' }}>
            Reset semua filter
          </Txt>
        </PressableScale>
      ) : null}

      {grouped.length === 0 ? (
        <Card>
          <EmptyState
            icon="receipt-outline"
            title="Tidak ada catatan"
            body="Coba ganti bulan, longgarkan filter, atau catat pengeluaran baru lewat tombol kamera."
          />
        </Card>
      ) : (
        grouped.map(([date, items]) => {
          const dayTotal = items.reduce((sum, item) => sum + item.amount, 0);
          return (
            <View key={date} style={{ gap: space.sm }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Txt variant="label" color={theme.textMuted}>
                  {formatDayMonth(date)}
                </Txt>
                <Txt variant="small" color={theme.textMuted}>
                  {formatRupiah(dayTotal)}
                </Txt>
              </View>
              <Card padded={false} style={{ paddingVertical: 4 }}>
                {items.map((expense, index) => (
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
            </View>
          );
        })
      )}

      <Modal visible={picker !== null} transparent animationType="slide" onRequestClose={() => setPicker(null)}>
        <PressableScale style={{ flex: 1, backgroundColor: theme.overlay }} onPress={() => setPicker(null)} />
        <View
          style={{
            backgroundColor: theme.bg,
            borderTopLeftRadius: radii.xxl,
            borderTopRightRadius: radii.xxl,
            padding: space.xl,
            paddingBottom: space.xxxl,
            gap: space.sm,
            maxHeight: '70%',
          }}>
          <Txt variant="title">{picker === 'wallet' ? 'Pilih dompet' : 'Pilih kategori'}</Txt>
          <ScrollView contentContainerStyle={{ gap: 2 }}>
            <PressableScale
              onPress={() => {
                if (picker === 'wallet') setWalletId(null);
                else setCategory(null);
                setPicker(null);
              }}
              haptic="selection"
              style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 10 }}>
              <Ionicons
                name={picker === 'wallet' ? 'wallet-outline' : 'pricetags-outline'}
                size={20}
                color={theme.textMuted}
              />
              <Txt variant="body" style={{ flex: 1, fontWeight: '600' }}>
                {picker === 'wallet' ? 'Semua dompet' : 'Semua kategori'}
              </Txt>
              {(picker === 'wallet' ? walletId === null : category === null) ? (
                <Ionicons name="checkmark" size={18} color={theme.primary} />
              ) : null}
            </PressableScale>

            {picker === 'wallet'
              ? wallets.map((wallet) => (
                  <PressableScale
                    key={wallet.id}
                    onPress={() => {
                      setWalletId(wallet.id);
                      setPicker(null);
                    }}
                    haptic="selection"
                    style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 10 }}>
                    <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: wallet.color }} />
                    <Txt variant="body" style={{ flex: 1, fontWeight: walletId === wallet.id ? '700' : '400' }}>
                      {wallet.name}
                    </Txt>
                    {walletId === wallet.id ? <Ionicons name="checkmark" size={18} color={theme.primary} /> : null}
                  </PressableScale>
                ))
              : categories.map((item) => {
                  const def = categoryDefs.find((d) => d.name === item) ?? categoryDef(item);
                  return (
                    <PressableScale
                      key={item}
                      onPress={() => {
                        setCategory(item);
                        setPicker(null);
                      }}
                      haptic="selection"
                      style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 10 }}>
                      <CategoryIcon icon={def.icon} color={def.color} size={22} />
                      <Txt variant="body" style={{ flex: 1, fontWeight: category === item ? '700' : '400' }}>
                        {item}
                      </Txt>
                      {category === item ? <Ionicons name="checkmark" size={18} color={theme.primary} /> : null}
                    </PressableScale>
                  );
                })}
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={filterOpen} transparent animationType="slide" onRequestClose={() => setFilterOpen(false)}>
        <PressableScale style={{ flex: 1, backgroundColor: theme.overlay }} onPress={() => setFilterOpen(false)} />
        <View
          style={{
            backgroundColor: theme.bg,
            borderTopLeftRadius: radii.xxl,
            borderTopRightRadius: radii.xxl,
            padding: space.xl,
            paddingBottom: space.xxxl,
            gap: space.lg,
          }}>
          <Txt variant="title">Filter</Txt>
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <View style={{ flex: 1 }}>
              <DateField label="Dari" value={draft.from} onChange={(value) => setDraft((d) => ({ ...d, from: value }))} />
            </View>
            <View style={{ flex: 1 }}>
              <DateField label="Sampai" value={draft.to} onChange={(value) => setDraft((d) => ({ ...d, to: value }))} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <View style={{ flex: 1 }}>
              <MoneyInput label="Nominal min" value={draft.min} onChange={(value) => setDraft((d) => ({ ...d, min: value }))} />
            </View>
            <View style={{ flex: 1 }}>
              <MoneyInput label="Nominal max" value={draft.max} onChange={(value) => setDraft((d) => ({ ...d, max: value }))} />
            </View>
          </View>
          <Txt variant="small" color={theme.textMuted}>
            Kosongkan tanggal untuk memakai bulan yang dipilih.
          </Txt>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <AppButton title="Terapkan" onPress={applyFilter} style={{ flex: 1 }} />
            <AppButton
              title="Hapus"
              variant="secondary"
              onPress={() => {
                setDraft({ from: '', to: '', min: null, max: null });
                setRange(null);
                setMinAmount(null);
                setMaxAmount(null);
                setFilterOpen(false);
              }}
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
