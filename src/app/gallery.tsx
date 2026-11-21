import { Ionicons } from '@expo/vector-icons';
import { useRouter , useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Image, Modal, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { listExpenses, type Expense } from '@/db/queries';
import { formatDateID, monthLabel } from '@/lib/dates';
import { formatRupiah } from '@/lib/money';
import { radii, space, useTheme } from '@/theme';
import { AppButton, Chip, EmptyState, PressableScale, Screen, ScreenHeader, Txt } from '@/ui/components';

export default function GalleryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [month, setMonth] = useState<string | null>(null);
  const [preview, setPreview] = useState<Expense | null>(null);

  const load = useCallback(async () => {
    const rows = await listExpenses({ limit: 400 });
    setExpenses(rows.filter((row) => Boolean(row.receiptPath ?? row.thumbPath)));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => undefined);
    }, [load]),
  );

  const months = useMemo(() => {
    const set = new Set(expenses.map((row) => row.date.slice(0, 7)));
    return [...set].sort().reverse().slice(0, 8);
  }, [expenses]);

  const filtered = month ? expenses.filter((row) => row.date.startsWith(month)) : expenses;
  const gap = 6;
  const columns = 3;
  const cell = Math.floor((width - space.xl * 2 - gap * (columns - 1)) / columns);

  return (
    <Screen edges={['top']}>
      <ScreenHeader title="Galeri struk" subtitle={`${filtered.length} foto`} onBack={() => router.back()} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        <Chip label="Semua" selected={!month} onPress={() => setMonth(null)} />
        {months.map((item) => (
          <Chip key={item} label={monthLabel(item)} selected={month === item} onPress={() => setMonth(item)} />
        ))}
      </ScrollView>

      {filtered.length === 0 ? (
        <EmptyState
          icon="images-outline"
          title="Belum ada foto"
          body="Setiap struk yang kamu foto akan muncul di sini."
          action={<AppButton title="Foto struk" compact onPress={() => router.push('/capture')} />}
        />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
          {filtered.map((expense) => (
            <PressableScale
              key={expense.id}
              onPress={() => setPreview(expense)}
              haptic="selection"
              accessibilityLabel={`${expense.merchant} ${formatRupiah(expense.amount)}`}
              style={{
                width: cell,
                height: cell * 1.18,
                borderRadius: radii.md,
                overflow: 'hidden',
                backgroundColor: theme.cardAlt,
              }}>
              <Image
                source={{ uri: expense.thumbPath ?? expense.receiptPath ?? '' }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </PressableScale>
          ))}
        </View>
      )}

      <Modal visible={preview !== null} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(6,20,16,0.94)', paddingTop: insets.top + space.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xl, gap: space.md }}>
            <PressableScale onPress={() => setPreview(null)} accessibilityLabel="Tutup" haptic="selection">
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </PressableScale>
            <View style={{ flex: 1 }}>
              <Txt variant="section" color="#FFFFFF" numberOfLines={1}>
                {preview?.merchant}
              </Txt>
              <Txt variant="small" color="#9DBDB2">
                {preview ? `${formatDateID(preview.date)} · ${formatRupiah(preview.amount)}` : ''}
              </Txt>
            </View>
            <PressableScale
              onPress={() => {
                const target = preview;
                setPreview(null);
                if (target) router.push({ pathname: '/review', params: { expenseId: target.id } });
              }}
              haptic="selection"
              accessibilityLabel="Buka catatan">
              <Txt variant="small" color={theme.accent} style={{ fontWeight: '700' }}>
                Buka
              </Txt>
            </PressableScale>
          </View>

          <View style={{ flex: 1, padding: space.xl, justifyContent: 'center' }}>
            {preview?.receiptPath ? (
              <Image
                source={{ uri: preview.receiptPath }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="contain"
              />
            ) : null}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

