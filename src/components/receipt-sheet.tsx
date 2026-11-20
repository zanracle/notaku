import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import type { ComponentRef } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ReceiptData } from '@/receipt/build';
import { captureReceiptImage, printReceipts, shareReceiptPdf } from '@/receipt/export';
import { space, useTheme } from '@/theme';
import { AppButton, Txt } from '@/ui/components';
import { ReceiptPreview } from './receipt-preview';

export function ReceiptSheet({
  visible,
  receipts,
  walletName,
  onClose,
}: {
  visible: boolean;
  receipts: ReceiptData[];
  walletName: string;
  onClose: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const ref = useRef<ComponentRef<typeof View>>(null);
  const [busy, setBusy] = useState<'image' | 'pdf' | 'print' | null>(null);

  const run = async (kind: 'image' | 'pdf' | 'print') => {
    setBusy(kind);
    try {
      if (kind === 'image') await captureReceiptImage(ref, receipts, walletName);
      if (kind === 'pdf') await shareReceiptPdf(receipts, walletName);
      if (kind === 'print') await printReceipts(receipts);
    } catch (error) {
      Alert.alert('Gagal', (error as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: theme.primaryDeep, paddingTop: insets.top }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.md,
            paddingHorizontal: space.xl,
            paddingVertical: space.md,
          }}>
          <Pressable onPress={onClose} accessibilityLabel="Tutup" hitSlop={10}>
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </Pressable>
          <Txt variant="section" color="#FFFFFF" style={{ flex: 1 }}>
            Pratinjau struk
          </Txt>
          {busy ? <ActivityIndicator color={theme.accent} /> : null}
        </View>

        <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.xl, alignItems: 'center' }}>
          <View ref={ref} collapsable={false} style={{ backgroundColor: '#FFFFFF' }}>
            <ReceiptPreview receipts={receipts} />
          </View>
        </ScrollView>

        <View
          style={{
            flexDirection: 'row',
            gap: space.sm,
            padding: space.lg,
            paddingBottom: Math.max(insets.bottom, space.lg),
          }}>
          <AppButton
            title="PDF"
            icon="document-text-outline"
            loading={busy === 'pdf'}
            onPress={() => run('pdf')}
            style={{ flex: 1 }}
          />
          <AppButton
            title="Gambar"
            icon="image-outline"
            variant="secondary"
            loading={busy === 'image'}
            onPress={() => run('image')}
            style={{ flex: 1 }}
          />
          <AppButton
            title="Print"
            icon="print-outline"
            variant="secondary"
            loading={busy === 'print'}
            onPress={() => run('print')}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </Modal>
  );
}
