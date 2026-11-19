import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';

import { ExpenseRow } from '@/components/expense-row';
import { TripFormSheet } from '@/components/trip-picker';
import {
  activeTrip,
  countNotReported,
  listExpenses,
  listTrips,
  totals,
  type Expense,
  type Totals,
  type Trip,
} from '@/db/queries';
import { currentMonthKey, formatDateID, monthLabel } from '@/lib/dates';
import { formatRupiah } from '@/lib/money';
import { useApp } from '@/state/app';
import { radii, space, useTheme } from '@/theme';
import { AppButton, Card, EmptyState, Screen, SectionTitle, Txt } from '@/ui/components';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 19) return 'Selamat sore';
  return 'Selamat malam';
}

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { settings } = useApp();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [month, setMonth] = useState<Totals>({ total: 0, count: 0, tax: 0 });
  const [tripTotals, setTripTotals] = useState<Totals>({ total: 0, count: 0, tax: 0 });
  const [pending, setPending] = useState(0);
  const [recent, setRecent] = useState<Expense[]>([]);
  const [tripSheet, setTripSheet] = useState(false);
  const [pendingBackup, setPendingBackup] = useState(false);

  const load = useCallback(async () => {
    const key = currentMonthKey();
    const from = `${key}-01`;
    const to = `${key}-31`;
    const [allTrips, current, monthTotal, pendingCount, latest] = await Promise.all([
      listTrips(),
      activeTrip(),
      totals({ from, to }),
      countNotReported(),
      listExpenses({ limit: 5 }),
    ]);
    setTrips(allTrips);
    setTrip(current);
    setMonth(monthTotal);
    setPending(pendingCount);
    setRecent(latest);
    setTripTotals(current ? await totals({ tripId: current.id }) : { total: 0, count: 0, tax: 0 });
    const lastBackup = settings.last_backup_at ? new Date(settings.last_backup_at).getTime() : 0;
    setPendingBackup(monthTotal.count > 0 && Date.now() - lastBackup > 7 * 86_400_000);
  }, [settings.last_backup_at]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => undefined);
    }, [load]),
  );

  return (
    <Screen edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md, paddingTop: space.sm }}>
        <View style={{ flex: 1 }}>
          <Txt variant="small" color={theme.textMuted}>
            {greeting()}
            {settings.nama ? `, ${settings.nama.split(' ')[0]}` : ''}
          </Txt>
          <Txt variant="display">NotaKu</Txt>
        </View>
        <Pressable
          onPress={() => router.push('/(tabs)/settings')}
          accessibilityLabel="Pengaturan"
          hitSlop={10}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Ionicons name="person-outline" size={19} color={theme.text} />
        </Pressable>
      </View>

      <Card style={{ backgroundColor: theme.primary, borderColor: theme.primary, gap: space.xs }}>
        <Txt variant="label" color={theme.onPrimary} style={{ opacity: 0.75 }}>
          Total {monthLabel(currentMonthKey())}
        </Txt>
        <Txt variant="display" color={theme.onPrimary}>
          {formatRupiah(month.total)}
        </Txt>
        <Txt variant="small" color={theme.onPrimary} style={{ opacity: 0.85 }}>
          {month.count} catatan · pajak {formatRupiah(month.tax)}
        </Txt>
      </Card>

      <View style={{ flexDirection: 'row', gap: space.md }}>
        <AppButton
          title="Foto Struk"
          icon="camera"
          onPress={() => router.push('/capture')}
          style={{ flex: 1.2 }}
        />
        <AppButton
          title="Input Manual"
          icon="create-outline"
          variant="secondary"
          onPress={() => router.push('/review')}
          style={{ flex: 1 }}
        />
      </View>

      {pending > 0 ? (
        <Pressable
          onPress={() => router.push('/(tabs)/expenses')}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.md,
            backgroundColor: theme.warningSoft,
            borderRadius: radii.md,
            padding: space.md,
            opacity: pressed ? 0.75 : 1,
          })}>
          <Ionicons name="alert-circle-outline" size={20} color={theme.warning} />
          <Txt variant="small" color={theme.warning} style={{ flex: 1, fontWeight: '600' }}>
            {pending} biaya belum ditandai terkirim
          </Txt>
          <Ionicons name="chevron-forward" size={16} color={theme.warning} />
        </Pressable>
      ) : null}

      {pendingBackup ? (
        <Pressable
          onPress={() => router.push('/backup')}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.md,
            backgroundColor: theme.cardAlt,
            borderRadius: radii.md,
            padding: space.md,
            opacity: pressed ? 0.75 : 1,
          })}>
          <Ionicons name="cloud-upload-outline" size={20} color={theme.textMuted} />
          <Txt variant="small" color={theme.textMuted} style={{ flex: 1 }}>
            Sudah lebih dari 7 hari tanpa backup. Data hanya ada di HP ini.
          </Txt>
          <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
        </Pressable>
      ) : null}

      <SectionTitle
        right={
          trips.length > 0 ? (
            <Pressable onPress={() => setTripSheet(true)} hitSlop={8} accessibilityLabel="Dinas baru">
              <Txt variant="small" color={theme.primary} style={{ fontWeight: '600' }}>
                + Dinas
              </Txt>
            </Pressable>
          ) : null
        }>
        Dinas aktif
      </SectionTitle>

      {trip ? (
        <Card onPress={() => router.push({ pathname: '/trip/[id]', params: { id: trip.id } })}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: theme.primarySoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Ionicons name="briefcase-outline" size={20} color={theme.primary} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="section" numberOfLines={1}>
                {trip.name}
              </Txt>
              <Txt variant="small" color={theme.textMuted}>
                {formatDateID(trip.startDate)} – {formatDateID(trip.endDate)}
                {trip.city ? ` · ${trip.city}` : ''}
              </Txt>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </View>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginTop: space.md,
              paddingTop: space.md,
              borderTopWidth: 1,
              borderTopColor: theme.border,
            }}>
            <View>
              <Txt variant="small" color={theme.textMuted}>
                Total dinas
              </Txt>
              <Txt variant="section">{formatRupiah(tripTotals.total)}</Txt>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Txt variant="small" color={theme.textMuted}>
                Jumlah biaya
              </Txt>
              <Txt variant="section">{tripTotals.count}</Txt>
            </View>
          </View>
        </Card>
      ) : (
        <Card>
          <EmptyState
            icon="briefcase-outline"
            title="Belum ada dinas"
            body="Buat dinas supaya biaya bisa dikelompokkan dan dilaporkan ke finance."
            action={<AppButton title="Buat dinas" compact onPress={() => setTripSheet(true)} />}
          />
        </Card>
      )}

      <SectionTitle
        right={
          recent.length > 0 ? (
            <Pressable onPress={() => router.push('/(tabs)/expenses')} hitSlop={8}>
              <Txt variant="small" color={theme.primary} style={{ fontWeight: '600' }}>
                Lihat semua
              </Txt>
            </Pressable>
          ) : null
        }>
        Terakhir dicatat
      </SectionTitle>

      {recent.length > 0 ? (
        <Card padded={false} style={{ paddingHorizontal: space.md }}>
          {recent.map((expense, index) => (
            <View key={expense.id}>
              <ExpenseRow
                expense={expense}
                onPress={() =>
                  router.push({ pathname: '/review', params: { expenseId: expense.id } })
                }
              />
              {index < recent.length - 1 ? (
                <View style={{ height: 1, backgroundColor: theme.border }} />
              ) : null}
            </View>
          ))}
        </Card>
      ) : (
        <Card>
          <EmptyState
            icon="scan-outline"
            title="Belum ada catatan"
            body="Foto struk pertama, atau isi manual kalau struknya tidak ada."
          />
        </Card>
      )}

      <TripFormSheet
        visible={tripSheet}
        onClose={() => setTripSheet(false)}
        onSaved={() => {
          load().catch(() => undefined);
        }}
      />
    </Screen>
  );
}
