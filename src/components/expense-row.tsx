import { Image , View } from 'react-native';

import type { Expense } from '@/db/queries';
import { categoryDef } from '@/lib/defaults';
import { formatDateID } from '@/lib/dates';
import { formatRupiah } from '@/lib/money';
import { radii, space, useTheme } from '@/theme';
import { PressableScale, Txt } from '@/ui/components';
import { CategoryIcon } from '@/ui/category-icon';

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
  const def = categoryDef(expense.category);

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
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: radii.md,
            backgroundColor: `${def.color}22`,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <CategoryIcon icon={def.icon} color={def.color} size={23} />
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

      <Txt
        variant="body"
        style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}
        numberOfLines={1}>
        -{formatRupiah(expense.amount)}
      </Txt>
    </PressableScale>
  );
}
