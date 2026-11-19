import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { formatDateID } from '@/lib/dates';
import { formatRupiah } from '@/lib/money';
import type { ReportMeta } from '@/report/html';
import { reportTotals } from '@/report/html';
import { radii, space, useTheme } from '@/theme';
import { Txt } from '@/ui/components';

/**
 * Representasi native dari laporan. Dipakai untuk pratinjau di layar
 * dan untuk diekspor menjadi gambar, sehingga tidak ada renderer kedua.
 */
export function ReportPreview({ meta }: { meta: ReportMeta }) {
  const theme = useTheme();
  const totals = reportTotals(meta);
  const { trip, expenses, settings, mode } = meta;
  const identity: [string, string][] = [
    ['Nama', settings.nama ?? ''],
    ['NIP / ID', settings.nip ?? ''],
    ['Jabatan', settings.jabatan ?? ''],
    ['Departemen', settings.departemen ?? ''],
  ].filter(([, value]) => value.trim().length > 0) as [string, string][];

  return (
    <View style={previewStyles.page}>
      <View style={previewStyles.header}>
        {settings.logo_path ? (
          <Image source={{ uri: settings.logo_path }} style={previewStyles.logo} contentFit="contain" />
        ) : null}
        <View style={{ flex: 1 }}>
          <Txt style={previewStyles.company}>{settings.perusahaan || 'Laporan Reimburse'}</Txt>
          <Txt style={previewStyles.companySub}>Laporan Pengeluaran Dinas</Txt>
        </View>
      </View>

      <Txt style={previewStyles.title}>{trip.name}</Txt>
      <Txt style={previewStyles.muted}>
        {formatDateID(trip.startDate)} – {formatDateID(trip.endDate)}
        {trip.city ? ` · ${trip.city}` : ''}
        {trip.refNo ? ` · Ref ${trip.refNo}` : ''}
      </Txt>

      <View style={previewStyles.metaRow}>
        {identity.map(([label, value]) => (
          <Txt key={label} style={previewStyles.metaItem}>
            <Txt style={previewStyles.muted}>{label}: </Txt>
            {value}
          </Txt>
        ))}
        <Txt style={previewStyles.metaItem}>
          <Txt style={previewStyles.muted}>Jumlah biaya: </Txt>
          {totals.count}
        </Txt>
      </View>

      <View style={previewStyles.tableHead}>
        <Txt style={[previewStyles.th, { width: 26 }]}>No</Txt>
        <Txt style={[previewStyles.th, { width: 92 }]}>Tanggal</Txt>
        <Txt style={[previewStyles.th, { flex: 1 }]}>Keterangan</Txt>
        <Txt style={[previewStyles.th, { width: 84 }]}>Kategori</Txt>
        <Txt style={[previewStyles.th, { width: 96, textAlign: 'right' }]}>Nominal</Txt>
      </View>

      {expenses.map((expense, index) => (
        <View key={expense.id} style={previewStyles.tableRow}>
          <Txt style={[previewStyles.td, { width: 26 }]}>{index + 1}</Txt>
          <Txt style={[previewStyles.td, { width: 92 }]}>{formatDateID(expense.date)}</Txt>
          <View style={{ flex: 1 }}>
            <Txt style={[previewStyles.td, { fontWeight: '600' }]}>{expense.merchant}</Txt>
            {expense.note ? <Txt style={previewStyles.tdSmall}>{expense.note}</Txt> : null}
            {!expense.receiptPath ? <Txt style={previewStyles.tdWarn}>tanpa struk</Txt> : null}
          </View>
          <Txt style={[previewStyles.td, { width: 84 }]}>{expense.category}</Txt>
          <Txt style={[previewStyles.td, { width: 96, textAlign: 'right' }]}>
            {formatRupiah(expense.amount)}
          </Txt>
        </View>
      ))}

      <View style={previewStyles.totalRow}>
        <Txt style={[previewStyles.totalLabel]}>Total</Txt>
        <Txt style={[previewStyles.totalValue]}>{formatRupiah(totals.total)}</Txt>
      </View>

      <View style={previewStyles.signRow}>
        <View style={previewStyles.signBox}>
          <Txt style={previewStyles.muted}>{settings.ttd_pemohon || 'Pemohon'}</Txt>
          <View style={previewStyles.signLine}>
            <Txt>{settings.nama}</Txt>
            {settings.nip ? <Txt style={previewStyles.muted}>NIP. {settings.nip}</Txt> : null}
          </View>
        </View>
        <View style={previewStyles.signBox}>
          <Txt style={previewStyles.muted}>{settings.ttd_mengetahui || 'Mengetahui'}</Txt>
          <View style={previewStyles.signLine}>
            <Txt> </Txt>
          </View>
        </View>
      </View>

      {mode === 'lengkap' ? (
        <View style={previewStyles.attachments}>
          <Txt style={previewStyles.sectionTitle}>Lampiran struk</Txt>
          <View style={previewStyles.grid}>
            {expenses.map((expense, index) => (
              <View key={expense.id} style={previewStyles.figure}>
                <Txt style={previewStyles.caption}>
                  {index + 1}. {expense.merchant} — {formatRupiah(expense.amount)}
                </Txt>
                {expense.receiptPath ? (
                  <Image
                    source={{ uri: expense.receiptPath }}
                    style={previewStyles.receipt}
                    contentFit="contain"
                  />
                ) : (
                  <View style={previewStyles.noImage}>
                    <Txt style={[previewStyles.tdSmall, { color: theme.textMuted }]}>
                      Foto struk tidak tersedia
                    </Txt>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const previewStyles = StyleSheet.create({
  page: {
    width: 794,
    backgroundColor: '#FFFFFF',
    padding: 42,
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#0F766E',
    paddingBottom: 10,
  },
  logo: { width: 56, height: 56 },
  company: { fontSize: 17, fontWeight: '700', color: '#111827' },
  companySub: { fontSize: 12, color: '#4B5563', marginTop: 2 },
  title: { fontSize: 18, fontWeight: '700', color: '#111827', marginTop: 14 },
  muted: { fontSize: 12, color: '#6B7280' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 18, rowGap: 4, marginTop: 8, marginBottom: 10 },
  metaItem: { fontSize: 12.5, color: '#111827' },
  tableHead: {
    flexDirection: 'row',
    borderBottomWidth: 1.5,
    borderBottomColor: '#D1D5DB',
    paddingBottom: 6,
  },
  th: { fontSize: 10.5, fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.4 },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    alignItems: 'flex-start',
  },
  td: { fontSize: 12.5, color: '#111827' },
  tdSmall: { fontSize: 10.5, color: '#6B7280' },
  tdWarn: { fontSize: 10.5, color: '#B45309' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 2,
    borderTopColor: '#0F766E',
    paddingTop: 10,
    marginTop: 4,
  },
  totalLabel: { fontSize: 13, fontWeight: '700', color: '#111827' },
  totalValue: { fontSize: 15, fontWeight: '700', color: '#111827' },
  signRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 26 },
  signBox: { width: '42%', alignItems: 'center', gap: 4 },
  signLine: {
    marginTop: 52,
    borderTopWidth: 1,
    borderTopColor: '#9CA3AF',
    paddingTop: 5,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  attachments: { marginTop: 26, gap: 10 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#D1D5DB',
    paddingBottom: 6,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  figure: { width: '31.6%', gap: 3 },
  caption: { fontSize: 9.5, color: '#374151' },
  receipt: {
    width: '100%',
    height: 150,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: radii.sm,
    backgroundColor: '#FAFAFA',
  },
  noImage: {
    height: 90,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.sm,
  },
});
