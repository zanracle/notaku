import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

import type { Expense } from '@/db/queries';
import { formatDateID } from '@/lib/dates';
import { formatRupiah } from '@/lib/money';
import { radii, space, useTheme } from '@/theme';
import { Txt } from '@/ui/components';

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
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        paddingVertical: 10,
        opacity: pressed ? 0.65 : 1,
      })}>
      {expense.thumbPath || expense.receiptPath ? (
        <Image
          source={{ uri: expense.thumbPath ?? expense.receiptPath ?? '' }}
          style={{ width: 44, height: 44, borderRadius: radii.sm, backgroundColor: theme.cardAlt }}
          contentFit="cover"
        />
      ) : (
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: radii.sm,
            backgroundColor: theme.cardAlt,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Ionicons name="document-text-outline" size={19} color={theme.textMuted} />
        </View>
      )}

      <View style={{ flex: 1, gap: 1 }}>
        <Txt variant="body" numberOfLines={1} style={{ fontWeight: '600' }}>
          {expense.merchant}
        </Txt>
        <Txt variant="small" color={theme.textMuted} numberOfLines={1}>
          {subtitle ?? `${formatDateID(expense.date)} · ${expense.category}`}
        </Txt>
      </View>

      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Txt variant="body" style={{ fontWeight: '600' }}>
          {formatRupiah(expense.amount)}
        </Txt>
        {expense.status === 'terkirim' ? (
          <Txt variant="small" color={theme.success} style={{ fontSize: 10.5 }}>
            terkirim
          </Txt>
        ) : expense.source === 'ai' ? (
          <Txt variant="small" color={theme.primary} style={{ fontSize: 10.5 }}>
            AI
          </Txt>
        ) : expense.source === 'ocr' ? (
          <Txt variant="small" color={theme.textMuted} style={{ fontSize: 10.5 }}>
            OCR
          </Txt>
        ) : null}
      </View>
    </Pressable>
  );
}
