import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import type { ComponentRef } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { captureReportImage, shareReportPdf } from '@/report/export';
import type { ReportMeta } from '@/report/html';
import { space, useTheme } from '@/theme';
import { AppButton, Txt } from '@/ui/components';
import { ReportPreview } from './report-preview';

/**
 * Pratinjau laporan 1:1 di dalam modal. Dipakai sekaligus sebagai sumber
 * gambar JPG, jadi tidak ada render ganda dan hasil capture tidak buram.
 */
export function ReportSheet({
  visible,
  meta,
  onClose,
}: {
  visible: boolean;
  meta: ReportMeta;
  onClose: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reportRef = useRef<ComponentRef<typeof View>>(null);
  const [busy, setBusy] = useState<'image' | 'pdf' | null>(null);

  const run = async (kind: 'image' | 'pdf') => {
    setBusy(kind);
    try {
      if (kind === 'image') await captureReportImage(reportRef, meta);
      else await shareReportPdf(meta);
    } catch (error) {
      Alert.alert('Gagal', (error as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.md,
            paddingHorizontal: space.lg,
            paddingVertical: space.md,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}>
          <Pressable onPress={onClose} accessibilityLabel="Tutup pratinjau" hitSlop={10}>
            <Ionicons name="close" size={22} color={theme.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Txt variant="section">Pratinjau laporan</Txt>
            <Txt variant="small" color={theme.textMuted}>
              Geser ke samping dan ke bawah
            </Txt>
          </View>
          {busy ? <ActivityIndicator color={theme.primary} /> : null}
        </View>

        <ScrollView horizontal style={{ flex: 1 }} contentContainerStyle={{ paddingRight: space.lg }}>
          <ScrollView style={{ width: 794 }} contentContainerStyle={{ padding: space.md }}>
            <View ref={reportRef} collapsable={false}>
              <ReportPreview meta={meta} />
            </View>
          </ScrollView>
        </ScrollView>

        <View
          style={{
            flexDirection: 'row',
            gap: space.sm,
            padding: space.lg,
            paddingBottom: Math.max(insets.bottom, space.lg),
            borderTopWidth: 1,
            borderTopColor: theme.border,
          }}>
          <AppButton
            title="Simpan gambar"
            icon="image-outline"
            loading={busy === 'image'}
            onPress={() => run('image')}
            style={{ flex: 1 }}
          />
          <AppButton
            title="Kirim PDF"
            icon="document-text-outline"
            variant="secondary"
            loading={busy === 'pdf'}
            onPress={() => run('pdf')}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </Modal>
  );
}
