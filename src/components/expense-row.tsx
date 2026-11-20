import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { View } from 'react-native';

import type { Expense } from '@/db/queries';
import { formatDateID } from '@/lib/dates';
import { formatRupiah } from '@/lib/money';
import { radii, space, useTheme, colorForCategory } from '@/theme';
import { PressableScale, Txt } from '@/ui/components';
import type { IconName } from '@/ui/components';

const ICONS: Record<string, IconName> = {
  Makan: 'restaurant',
  Transport: 'car',
  Belanja: 'bag-handle',
  Penginapan: 'bed',
  Parkir: 'car-sport',
  BBM: 'flame',
  ATK: 'pencil',
  'Lain-lain': 'ellipsis-horizontal',
};

export function categoryIcon(category: string): IconName {
  return ICONS[category] ?? 'pricetag';
}

export function ExpenseRow({
  expense,
  onPress,
  subtitle,
}: {
  expense: Expense;
  onPress: () => void;
  subtitle?: string;
}) {
  const theme = useTheme();
  const tint = colorForCategory(expense.category);

  return (
    <PressableScale
      onPress={onPress}
      haptic="selection"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        paddingVertical: 10,
        paddingHorizontal: space.md,
      }}>
      {expense.thumbPath || expense.receiptPath ? (
        <Image
          source={{ uri: expense.thumbPath ?? expense.receiptPath ?? '' }}
          style={{ width: 44, height: 44, borderRadius: radii.md, backgroundColor: theme.cardAlt }}
          contentFit="cover"
        />
      ) : (
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: radii.md,
            backgroundColor: `${tint}22`,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Ionicons name={categoryIcon(expense.category)} size={20} color={tint} />
        </View>
      )}

      <View style={{ flex: 1, gap: 1 }}>
        <Txt variant="body" numberOfLines={1} style={{ fontWeight: '600' }}>
          {expense.merchant}
        </Txt>
        <Txt variant="small" color={theme.textMuted} numberOfLines={1}>
          {subtitle ?? `${formatDateID(expense.date)} Â· ${expense.category}`}
        </Txt>
      </View>

      <Txt variant="body" style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}>
        -{formatRupiah(expense.amount)}
      </Txt>
    </PressableScale>
  );
}

