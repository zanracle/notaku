import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, View } from 'react-native';

import { createDemoData } from '@/db/queries';
import { radii, space, useTheme } from '@/theme';
import { AppButton, PressableScale, Txt } from '@/ui/components';
import { CategoryIcon } from '@/ui/category-icon';

const SLIDES = [
  {
    icon: 'camera' as const,
    title: 'Foto struknya saja',
    body: 'Kamera membaca nama toko, tanggal, item, dan total. Struk kertas tidak perlu disimpan.',
  },
  {
    icon: 'sparkles' as const,
    title: 'Rapi otomatis',
    body: 'Semua masuk ke dompet. Kamu bisa koreksi item, atur anggaran, dan lihat laporan.',
  },
  {
    icon: 'checkmark-done' as const,
    title: 'Siap kapan saja',
    body: 'Cetak struk, ekspor CSV, atau backup ZIP. Data tinggal di HP, tanpa akun.',
  },
];

export function Onboarding({
  visible,
  onDone,
  onReload,
}: {
  visible: boolean;
  onDone: () => void;
  onReload: () => void;
}) {
  const theme = useTheme();
  const [index, setIndex] = useState(0);
  const [seeding, setSeeding] = useState(false);
  const slide = SLIDES[index];
  const last = index === SLIDES.length - 1;

  const seed = async () => {
    setSeeding(true);
    try {
      await createDemoData();
      onReload();
      onDone();
    } finally {
      setSeeding(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDone}>
      <View style={{ flex: 1, backgroundColor: theme.overlay, justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: theme.bg,
            borderTopLeftRadius: radii.xxl,
            borderTopRightRadius: radii.xxl,
            padding: space.xl,
            paddingBottom: space.xxxl,
            gap: space.lg,
          }}>
          <View style={{ alignItems: 'center', gap: space.md, marginTop: space.sm }}>
            <View
              style={{
                width: 84,
                height: 84,
                borderRadius: 28,
                backgroundColor: theme.primaryDeep,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              {index === 0 ? (
                <CategoryIcon icon="bag" color={theme.accent} size={40} ink="#FDF8EC" />
              ) : (
                <Ionicons name={slide.icon} size={38} color={theme.accent} />
              )}
            </View>
            <Txt variant="title" style={{ textAlign: 'center' }}>
              {slide.title}
            </Txt>
            <Txt variant="small" color={theme.textMuted} style={{ textAlign: 'center', maxWidth: 300 }}>
              {slide.body}
            </Txt>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={{
                  width: i === index ? 20 : 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: i === index ? theme.primary : theme.border,
                }}
              />
            ))}
          </View>

          <AppButton
            title={last ? 'Mulai catat' : 'Lanjut'}
            onPress={() => (last ? onDone() : setIndex((i) => i + 1))}
          />

          {last ? (
            <AppButton
              title="Isi data contoh dulu"
              variant="secondary"
              loading={seeding}
              onPress={seed}
            />
          ) : null}

          <PressableScale onPress={onDone} haptic="selection" style={{ alignSelf: 'center' }}>
            <Txt variant="small" color={theme.textMuted}>
              Lewati
            </Txt>
          </PressableScale>
        </View>
      </View>
    </Modal>
  );
}
