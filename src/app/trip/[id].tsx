import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, View } from 'react-native';

import { ExpenseRow } from '@/components/expense-row';
import { ReportSheet } from '@/components/report-sheet';
import { TripFormSheet } from '@/components/trip-picker';
import {
  getTrip,
  listExpenses,
  markTripSent,
  totals,
  totalsByCategory,
  updateTrip,
  type CategoryTotal,
  type Expense,
  type Totals,
  type Trip,
} from '@/db/queries';
import { formatDateID } from '@/lib/dates';
import { formatRupiah } from '@/lib/money';
import { printReport, shareReportCsv, shareReportPdf } from '@/report/export';
import type { ReportMeta } from '@/report/html';
import { useApp } from '@/state/app';
import { radii, space, useTheme } from '@/theme';
import {
  AppButton,
  Card,
  Divider,
  EmptyState,
  Screen,
  ScreenHeader,
  SectionTitle,
  Txt,
} from '@/ui/components';

type ExportKind = 'pdf' | 'ringkas' | 'gambar' | 'csv' | 'print';

export default function TripDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { settings } = useApp();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<Totals>({ total: 0, count: 0, tax: 0 });
  const [byCategory, setByCategory] = useState<CategoryTotal[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [working, setWorking] = useState<ExportKind | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const [found, rows, sum, cats] = await Promise.all([
      getTrip(id),
      listExpenses({ tripId: id }),
      totals({ tripId: id }),
      totalsByCategory(id),
    ]);
    setTrip(found);
    setExpenses(rows);
    setSummary(sum);
    setByCategory(cats);
  }, [id]);

  useEffect(() => {
    load().catch((error) => Alert.alert('Gagal memuat', (error as Error).message));
  }, [load]);

  const meta: ReportMeta | null = useMemo(
    () => (trip ? { trip, expenses, settings, mode: 'lengkap' } : null),
    [trip, expenses, settings],
  );

  const runExport = async (kind: ExportKind) => {
    if (!trip) return;
    setExportOpen(false);
    setWorking(kind);
    try {
      if (kind === 'gambar') {
        setPreviewOpen(true);
        return;
      }
      const target: ReportMeta = { trip, expenses, settings, mode: kind === 'ringkas' ? 'ringkas' : 'lengkap' };
      if (kind === 'pdf') await shareReportPdf(target);
      if (kind === 'ringkas') await shareReportPdf(target);
      if (kind === 'csv') await shareReportCsv(target);
      if (kind === 'print') await printReport(target);
    } catch (error) {
      Alert.alert('Gagal', (error as Error).message);
    } finally {
      setWorking(null);
    }
  };

  const markSent = () => {
    if (!trip) return;
    Alert.alert(
      'Tandai sudah dikirim?',
      'Semua biaya di dinas ini akan ditandai terkirim dan dinas ditutup. Kamu masih bisa membukanya lagi nanti.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Tandai',
          onPress: async () => {
            await markTripSent(trip.id);
            await load();
          },
        },
      ],
    );
  };

  if (!trip) {
    return (
      <Screen edges={['top']}>
        <ScreenHeader title="Dinas" onBack={() => router.back()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      </Screen>
    );
  }

  const budgetRatio = trip.budget && trip.budget > 0 ? Math.min(summary.total / trip.budget, 1) : null;

  return (
    <Screen
      edges={['top']}
      footer={
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <AppButton
            title="Export laporan"
            icon="share-outline"
            onPress={() => setExportOpen(true)}
            style={{ flex: 1 }}
          />
          <AppButton
            title="Tandai terkirim"
            variant="secondary"
            onPress={markSent}
            style={{ flex: 1 }}
          />
        </View>
      }>
      <ScreenHeader
        title={trip.name}
        subtitle={`${formatDateID(trip.startDate)} â€“ ${formatDateID(trip.endDate)}`}
        onBack={() => router.back()}
        right={
          <Pressable
            onPress={() => setEditOpen(true)}
            accessibilityLabel="Ubah dinas"
            hitSlop={10}
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
            <Ionicons name="pencil" size={17} color={theme.text} />
          </Pressable>
        }
      />

      <Card style={{ gap: space.sm, backgroundColor: theme.primary, borderColor: theme.primary }}>
        <Txt variant="label" color={theme.onPrimary} style={{ opacity: 0.75 }}>
          Total dinas
        </Txt>
        <Txt variant="display" color={theme.onPrimary}>
          {formatRupiah(summary.total)}
        </Txt>
        <Txt variant="small" color={theme.onPrimary} style={{ opacity: 0.85 }}>
          {summary.count} biaya Â· pajak {formatRupiah(summary.tax)}
        </Txt>
        {budgetRatio != null ? (
          <View style={{ gap: 4, marginTop: space.sm }}>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.28)' }}>
              <View
                style={{
                  width: `${Math.round(budgetRatio * 100)}%`,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: budgetRatio > 0.9 ? theme.danger : '#FFFFFF',
                }}
              />
            </View>
            <Txt variant="small" color={theme.onPrimary} style={{ opacity: 0.85 }}>
              {Math.round(budgetRatio * 100)}% dari anggaran {formatRupiah(trip.budget ?? 0)}
            </Txt>
          </View>
        ) : null}
      </Card>

      {trip.city || trip.refNo || trip.purpose || trip.status === 'closed' ? (
        <Card style={{ gap: 6 }}>
          {trip.city ? (
            <Txt variant="small" color={theme.textMuted}>
              Kota: {trip.city}
            </Txt>
          ) : null}
          {trip.refNo ? (
            <Txt variant="small" color={theme.textMuted}>
              Referensi: {trip.refNo}
            </Txt>
          ) : null}
          {trip.purpose ? (
            <Txt variant="small" color={theme.textMuted}>
              Tujuan: {trip.purpose}
            </Txt>
          ) : null}
          <Txt variant="small" color={trip.status === 'closed' ? theme.success : theme.textMuted}>
            Status: {trip.status === 'closed' ? 'ditutup / terkirim' : 'terbuka'}
          </Txt>
          {trip.status === 'closed' ? (
            <AppButton
              title="Buka dinas lagi"
              variant="ghost"
              compact
              onPress={async () => {
                await updateTrip(trip.id, { status: 'open' });
                await load();
              }}
            />
          ) : null}
        </Card>
      ) : null}

      {byCategory.length > 0 ? (
        <View style={{ gap: space.sm }}>
          <SectionTitle>Per kategori</SectionTitle>
          <Card style={{ gap: space.md }}>
            {byCategory.map((row) => (
              <View key={row.category} style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Txt variant="small">{row.category}</Txt>
                  <Txt variant="small" color={theme.textMuted}>
                    {formatRupiah(row.total)}
                  </Txt>
                </View>
                <View style={{ height: 5, borderRadius: 3, backgroundColor: theme.cardAlt }}>
                  <View
                    style={{
                      width: `${Math.max(4, (row.total / Math.max(summary.total, 1)) * 100)}%`,
                      height: 5,
                      borderRadius: 3,
                      backgroundColor: theme.primary,
                    }}
                  />
                </View>
              </View>
            ))}
          </Card>
        </View>
      ) : null}

      <SectionTitle right={<Txt variant="small" color={theme.textMuted}>{expenses.length} catatan</Txt>}>
        Rincian
      </SectionTitle>

      {expenses.length === 0 ? (
        <Card>
          <EmptyState
            icon="receipt-outline"
            title="Belum ada biaya"
            body="Foto struk atau input manual untuk dinas ini."
            action={
              <AppButton title="Foto struk" compact onPress={() => router.push('/capture')} />
            }
          />
        </Card>
      ) : (
        <Card padded={false} style={{ paddingHorizontal: space.md }}>
          {expenses.map((expense, index) => (
            <View key={expense.id}>
              {index > 0 ? <View style={{ height: 1, backgroundColor: theme.border }} /> : null}
              <ExpenseRow
                expense={expense}
                onPress={() => router.push({ pathname: '/review', params: { expenseId: expense.id } })}
              />
            </View>
          ))}
        </Card>
      )}

      {expenses.some((expense) => !expense.receiptPath) ? (
        <Txt variant="small" color={theme.warning} style={{ textAlign: 'center' }}>
          Ada biaya tanpa foto struk. Finance bisa menolak klaim itu.
        </Txt>
      ) : null}

      <Modal visible={exportOpen} transparent animationType="slide" onRequestClose={() => setExportOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: theme.overlay }} onPress={() => setExportOpen(false)} />
        <View
          style={{
            backgroundColor: theme.bg,
            borderTopLeftRadius: radii.xl,
            borderTopRightRadius: radii.xl,
            padding: space.xl,
            paddingBottom: space.xxl,
            gap: space.sm,
          }}>
          <Txt variant="title">Export laporan</Txt>
          <Txt variant="small" color={theme.textMuted}>
            {summary.count} biaya Â· {formatRupiah(summary.total)}
          </Txt>
          <Divider />
          <ExportOption
            icon="document-text-outline"
            title="PDF lengkap"
            hint="Kop, tanda tangan, dan lampiran semua foto struk"
            loading={working === 'pdf'}
            onPress={() => runExport('pdf')}
          />
          <ExportOption
            icon="reader-outline"
            title="PDF ringkas"
            hint="Satu halaman, tabel biaya saja"
            loading={working === 'ringkas'}
            onPress={() => runExport('ringkas')}
          />
          <ExportOption
            icon="image-outline"
            title="Gambar JPG"
            hint="Untuk finance yang minta format gambar"
            loading={working === 'gambar'}
            onPress={() => runExport('gambar')}
          />
          <ExportOption
            icon="grid-outline"
            title="CSV untuk Excel"
            hint="Rekap angka, tanpa foto"
            loading={working === 'csv'}
            onPress={() => runExport('csv')}
          />
          <ExportOption
            icon="print-outline"
            title="Cetak langsung"
            hint="Lewat printer atau simpan sebagai PDF dari dialog print"
            loading={working === 'print'}
            onPress={() => runExport('print')}
          />
        </View>
      </Modal>

      <TripFormSheet
        visible={editOpen}
        trip={trip}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          load().catch(() => undefined);
        }}
      />

      {meta ? (
        <ReportSheet visible={previewOpen} meta={meta} onClose={() => setPreviewOpen(false)} />
      ) : null}
    </Screen>
  );
}

function ExportOption({
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
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        paddingVertical: space.md,
        opacity: pressed || loading ? 0.6 : 1,
      })}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: theme.card,
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
    </Pressable>
  );
}
