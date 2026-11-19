import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { ExpenseRow } from '@/components/expense-row';
import { listExpenses, listTrips, type Expense, type Trip } from '@/db/queries';
import { formatDayMonth, monthLabel, todayISO } from '@/lib/dates';
import { formatRupiah } from '@/lib/money';
import { useApp } from '@/state/app';
import { radii, space, useTheme } from '@/theme';
import { Card, Chip, EmptyState, Field, Screen, Txt } from '@/ui/components';

function monthBounds(key: string): { from: string; to: string } {
  const from = `${key}-01`;
  const [y, m] = key.split('-').map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from, to: `${key}-${String(lastDay).padStart(2, '0')}` };
}

function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export default function ExpensesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { categories } = useApp();
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [tripId, setTripId] = useState<string | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const load = useCallback(async () => {
    const bounds = monthBounds(month);
    const [rows, allTrips] = await Promise.all([
      listExpenses({
        from: bounds.from,
        to: bounds.to,
        category: category ?? undefined,
        tripId: tripId ?? undefined,
        search: search || undefined,
      }),
      listTrips(),
    ]);
    setExpenses(rows);
    setTrips(allTrips);
  }, [month, category, tripId, search]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => undefined);
    }, [load]),
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      load().catch(() => undefined);
    }, 250);
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

  return (
    <Screen edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: space.sm }}>
        <View style={{ flex: 1 }}>
          <Txt variant="small" color={theme.textMuted}>
            Daftar biaya
          </Txt>
          <Txt variant="title">{monthLabel(month)}</Txt>
        </View>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Chip label="‹" onPress={() => setMonth(shiftMonth(month, -1))} />
          <Chip label="›" onPress={() => setMonth(shiftMonth(month, 1))} />
        </View>
      </View>

      <Card style={{ gap: space.sm }}>
        <Txt variant="small" color={theme.textMuted}>
          Total bulan ini
        </Txt>
        <Txt variant="title">{formatRupiah(total)}</Txt>
        <Txt variant="small" color={theme.textMuted}>
          {expenses.length} catatan
        </Txt>
      </Card>

      <Field
        label="Cari"
        value={search}
        onChangeText={setSearch}
        placeholder="Nama toko atau catatan"
        autoCorrect={false}
        right={
          search ? (
            <Ionicons name="close-circle" size={18} color={theme.textMuted} onPress={() => setSearch('')} />
          ) : (
            <Ionicons name="search" size={18} color={theme.textMuted} />
          )
        }
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        <Chip label="Semua" selected={!category} onPress={() => setCategory(null)} />
        {categories.map((item) => (
          <Chip key={item} label={item} selected={category === item} onPress={() => setCategory(item)} />
        ))}
      </ScrollView>

      {trips.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          <Chip label="Semua dinas" selected={!tripId} onPress={() => setTripId(null)} />
          {trips.map((trip) => (
            <Chip key={trip.id} label={trip.name} selected={tripId === trip.id} onPress={() => setTripId(trip.id)} />
          ))}
        </ScrollView>
      ) : null}

      {grouped.length === 0 ? (
        <Card>
          <EmptyState
            icon="receipt-outline"
            title="Tidak ada biaya"
            body="Coba ganti bulan, hapus filter, atau catat biaya baru."
          />
        </Card>
      ) : (
        grouped.map(([date, items]) => {
          const dayTotal = items.reduce((sum, item) => sum + item.amount, 0);
          return (
            <View key={date} style={{ gap: space.xs }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Txt variant="label" color={theme.textMuted}>
                  {formatDayMonth(date)}
                </Txt>
                <Txt variant="small" color={theme.textMuted}>
                  {formatRupiah(dayTotal)}
                </Txt>
              </View>
              <Card padded={false} style={{ paddingHorizontal: space.md }}>
                {items.map((expense, index) => (
                  <View key={expense.id}>
                    {index > 0 ? <View style={{ height: 1, backgroundColor: theme.border }} /> : null}
                    <ExpenseRow
                      expense={expense}
                      onPress={() =>
                        router.push({ pathname: '/review', params: { expenseId: expense.id } })
                      }
                    />
                  </View>
                ))}
              </Card>
            </View>
          );
        })
      )}

      {expenses.length > 0 ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: theme.cardAlt,
            borderRadius: radii.md,
            padding: space.md,
          }}>
          <Txt variant="small" color={theme.textMuted}>
            Total ditampilkan
          </Txt>
          <Txt variant="section">{formatRupiah(total)}</Txt>
        </View>
      ) : null}
    </Screen>
  );
}
