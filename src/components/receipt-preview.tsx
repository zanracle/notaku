import { Platform, StyleSheet, View } from 'react-native';

import { formatDateID } from '@/lib/dates';
import { formatRupiahExact } from '@/lib/money';
import type { ReceiptData } from '@/receipt/build';
import { space } from '@/theme';
import { Txt } from '@/ui/components';

const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
      <Txt style={[styles.text, bold && { fontWeight: '700' }]}>{label}</Txt>
      <Txt style={[styles.text, bold && { fontWeight: '700' }]}>{value}</Txt>
    </View>
  );
}

/** Tampilan struk 80mm. Dipakai untuk pratinjau dan untuk diekspor jadi gambar. */
export function ReceiptPreview({ receipts }: { receipts: ReceiptData[] }) {
  return (
    <View style={{ gap: space.lg }}>
      {receipts.map(({ expense, items, wallet }) => {
        const subtotal =
          expense.subtotal ?? items.reduce((sum, item) => sum + item.price * (item.qty || 1), 0);
        return (
          <View key={expense.id} style={styles.paper}>
            <Txt style={[styles.merchant]}>{expense.merchant.toUpperCase()}</Txt>
            <Txt style={[styles.text, styles.center, styles.muted]}>{formatDateID(expense.date)}</Txt>
            <View style={styles.rule} />

            {items.length === 0 ? (
              <Row label={expense.merchant} value={formatRupiahExact(expense.amount)} />
            ) : (
              items.map((item) => (
                <View key={item.id} style={{ marginBottom: 4 }}>
                  <Txt style={[styles.text, { fontWeight: '600' }]}>{item.name}</Txt>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Txt style={[styles.small, styles.muted]}>
                      {item.qty && item.qty !== 1 ? `${item.qty} x ${formatRupiahExact(item.price)}` : ''}
                    </Txt>
                    <Txt style={styles.small}>{formatRupiahExact(item.price * (item.qty || 1))}</Txt>
                  </View>
                </View>
              ))
            )}

            <View style={styles.rule} />
            {items.length > 0 ? <Row label="Subtotal" value={formatRupiahExact(subtotal)} /> : null}
            {expense.tax > 0 ? <Row label="Pajak" value={formatRupiahExact(expense.tax)} /> : null}
            <Row label="TOTAL" value={formatRupiahExact(expense.amount)} bold />
            <View style={styles.rule} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Txt style={[styles.small, styles.muted]}>{wallet.name}</Txt>
              <Txt style={[styles.small, styles.muted]}>{expense.category}</Txt>
            </View>
            {expense.note ? <Txt style={[styles.small, styles.muted]}>{expense.note}</Txt> : null}
            <Txt style={[styles.small, styles.muted, styles.center, { marginTop: 8 }]}>
              Dicetak dari NotaKu
            </Txt>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  paper: {
    width: 302,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 2,
  },
  merchant: { fontSize: 13, fontWeight: '700', textAlign: 'center', letterSpacing: 0.4, color: '#111111' },
  text: { fontSize: 10.5, color: '#111111', fontFamily: mono },
  small: { fontSize: 9, color: '#111111', fontFamily: mono },
  muted: { color: '#555555' },
  center: { textAlign: 'center' },
  rule: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#9CA3AF',
    marginVertical: 5,
  },
});

