import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import type { ComponentRef } from 'react';
import { ActivityIndicator, Alert, Modal, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatRupiahExact } from '@/lib/money';
import { captureViewImage } from '@/receipt/export';
import { radii, space, useTheme } from '@/theme';
import { AppButton, PressableScale, Txt } from '@/ui/components';

/** Kartu ringkasan 4:5 untuk dibagikan. Angka selalu tampil walau privasi aktif. */
export function ShareSummary({
  visible,
  onClose,
  monthLabel,
  total,
  count,
  categories,
}: {
  visible: boolean;
  onClose: () => void;
  monthLabel: string;
  total: number;
  count: number;
  categories: { label: string; value: number }[];
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const cardRef = useRef<ComponentRef<typeof View>>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await captureViewImage(cardRef, `NotaKu-ringkasan-${new Date().toISOString().slice(0, 10)}.jpg`);
    } catch (error) {
      Alert.alert('Gagal', (error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const max = Math.max(1, ...categories.map((row) => row.value));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: theme.overlay,
          alignItems: 'center',
          justifyContent: 'center',
          padding: space.xl,
          gap: space.lg,
        }}>
        <View ref={cardRef} collapsable={false} style={{ width: 320, backgroundColor: theme.primaryDeep, borderRadius: 28, padding: 24, gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: theme.accent }} />
            <Txt variant="small" color="#9DBDB2" style={{ fontWeight: '700', letterSpacing: 1 }}>
              NOTAKU
            </Txt>
            <View style={{ flex: 1 }} />
            <Txt variant="small" color="#9DBDB2">
              {monthLabel}
            </Txt>
          </View>

          <Txt variant="small" color="#9DBDB2">
            Total pengeluaran
          </Txt>
          <Txt variant="display" color="#FFFFFF" style={{ fontSize: 34, letterSpacing: -1.2 }}>
            {formatRupiahExact(total)}
          </Txt>
          <Txt variant="small" color="#9DBDB2">
            {count} catatan
          </Txt>

          <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.14)', marginVertical: 6 }} />

          {categories.map((row) => (
            <View key={row.label} style={{ gap: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Txt variant="small" color="#EAF3EF" style={{ fontWeight: '600' }}>
                  {row.label}
                </Txt>
                <Txt variant="small" color="#9DBDB2">
                  {formatRupiahExact(row.value)}
                </Txt>
              </View>
              <View style={{ height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.14)' }}>
                <View
                  style={{
                    width: `${Math.max(6, Math.round((row.value / max) * 100))}%`,
                    height: 5,
                    borderRadius: 3,
                    backgroundColor: theme.accent,
                  }}
                />
              </View>
            </View>
          ))}

          <Txt variant="small" color="#9DBDB2" style={{ fontSize: 10, marginTop: 6 }}>
            dicatat dengan NotaKu
          </Txt>
        </View>

        <View style={{ flexDirection: 'row', gap: space.sm, width: 320 }}>
          <AppButton
            title="Simpan gambar"
            icon="download-outline"
            loading={busy}
            onPress={save}
            style={{ flex: 1 }}
          />
          <PressableScale
            onPress={onClose}
            haptic="selection"
            accessibilityLabel="Tutup"
            style={{
              width: 56,
              height: 56,
              borderRadius: radii.lg,
              backgroundColor: theme.card,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Ionicons name="close" size={20} color={theme.text} />
          </PressableScale>
        </View>

        {busy ? <ActivityIndicator color={theme.accent} /> : null}
        <View style={{ height: insets.bottom }} />
      </View>
    </Modal>
  );
}
