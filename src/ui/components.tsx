import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { groupDigits, onlyDigits } from '@/lib/money';
import { radii, space, useTheme, type Theme } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

/* ---------------------------------- text ---------------------------------- */

type TextVariant = 'display' | 'title' | 'section' | 'body' | 'small' | 'label';

export function Txt({
  children,
  variant = 'body',
  color,
  style,
  numberOfLines,
  onPress,
}: {
  children: ReactNode;
  variant?: TextVariant;
  color?: string;
  style?: TextInputProps['style'];
  numberOfLines?: number;
  onPress?: () => void;
}) {
  const theme = useTheme();
  return (
    <Text
      onPress={onPress}
      numberOfLines={numberOfLines}
      style={[styles[variant], { color: color ?? theme.text }, style]}>
      {children}
    </Text>
  );
}

/* --------------------------------- screen --------------------------------- */

export function Screen({
  children,
  scroll = true,
  padded = true,
  footer,
  edges = ['bottom'],
}: {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  footer?: ReactNode;
  edges?: ('top' | 'bottom')[];
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const bottom = edges.includes('bottom') ? insets.bottom : 0;
  const content = (
    <View style={[padded && { paddingHorizontal: space.lg }, { gap: space.md }]}>{children}</View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: edges.includes('top') ? insets.top : 0 }}>
      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingTop: space.md,
            paddingBottom: footer ? space.xl : bottom + 110,
            gap: space.md,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingTop: space.md }}>{content}</View>
      )}
      {footer ? (
        <View
          style={{
            paddingHorizontal: space.lg,
            paddingTop: space.md,
            paddingBottom: Math.max(bottom, space.md),
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: theme.border,
            backgroundColor: theme.bg,
          }}>
          {footer}
        </View>
      ) : null}
    </View>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={uiStyles.headerRow}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Kembali"
          style={({ pressed }) => [
            uiStyles.iconButton,
            { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.6 : 1 },
          ]}>
          <Ionicons name="chevron-back" size={20} color={theme.text} />
        </Pressable>
      ) : null}
      <View style={{ flex: 1 }}>
        <Txt variant="title" numberOfLines={1}>
          {title}
        </Txt>
        {subtitle ? (
          <Txt variant="small" color={theme.textMuted} numberOfLines={1}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {right}
    </View>
  );
}

/* ---------------------------------- card ---------------------------------- */

export function Card({
  children,
  onPress,
  style,
  padded = true,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  padded?: boolean;
}) {
  const theme = useTheme();
  const base: ViewStyle = {
    backgroundColor: theme.card,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    padding: padded ? space.lg : 0,
  };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [base, style, { opacity: pressed ? 0.75 : 1 }]}>
      {children}
    </Pressable>
  );
}

/* --------------------------------- button --------------------------------- */

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  compact,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const palette: Record<string, { bg: string; fg: string; border: string }> = {
    primary: { bg: theme.primary, fg: theme.onPrimary, border: theme.primary },
    secondary: { bg: theme.card, fg: theme.text, border: theme.border },
    ghost: { bg: 'transparent', fg: theme.textMuted, border: 'transparent' },
    danger: { bg: theme.dangerSoft, fg: theme.danger, border: theme.dangerSoft },
  };
  const tone = palette[variant];
  const off = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(off), busy: Boolean(loading) }}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: space.sm,
          backgroundColor: tone.bg,
          borderColor: tone.border,
          borderWidth: 1,
          borderRadius: radii.md,
          paddingVertical: compact ? 9 : 14,
          paddingHorizontal: space.lg,
          minHeight: compact ? 40 : 50,
          opacity: off ? 0.5 : pressed ? 0.8 : 1,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator size="small" color={tone.fg} />
      ) : icon ? (
        <Ionicons name={icon} size={compact ? 16 : 19} color={tone.fg} />
      ) : null}
      <Txt variant={compact ? 'small' : 'body'} color={tone.fg} style={{ fontWeight: '600' }}>
        {title}
      </Txt>
    </Pressable>
  );
}

/* ---------------------------------- field --------------------------------- */

export function Field({
  label,
  hint,
  error,
  right,
  ...props
}: TextInputProps & {
  label: string;
  hint?: string;
  error?: string;
  right?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Txt variant="label" color={theme.textMuted}>
        {label}
      </Txt>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.sm,
          backgroundColor: theme.card,
          borderWidth: 1,
          borderColor: error ? theme.danger : theme.border,
          borderRadius: radii.md,
          paddingHorizontal: space.md,
          minHeight: 48,
        }}>
        <TextInput
          placeholderTextColor={theme.textMuted}
          style={{
            flex: 1,
            color: theme.text,
            fontSize: 15,
            paddingVertical: 12,
            textAlignVertical: props.multiline ? 'top' : 'center',
            minHeight: props.multiline ? 84 : undefined,
          }}
          {...props}
        />
        {right}
      </View>
      {error ? (
        <Txt variant="small" color={theme.danger}>
          {error}
        </Txt>
      ) : hint ? (
        <Txt variant="small" color={theme.textMuted}>
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

export function MoneyInput({
  label,
  value,
  onChange,
  error,
  hint,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  error?: string;
  hint?: string;
}) {
  const theme = useTheme();
  const [text, setText] = useState(value ? groupDigits(value) : '');

  useEffect(() => {
    setText(value ? groupDigits(value) : '');
  }, [value]);

  return (
    <Field
      label={label}
      value={text}
      error={error}
      hint={hint}
      keyboardType="number-pad"
      placeholder="0"
      onChangeText={(next) => {
        const digits = onlyDigits(next).slice(0, 11);
        setText(groupDigits(digits));
        onChange(digits ? Number(digits) : null);
      }}
      right={
        <Txt variant="small" color={theme.textMuted}>
          Rp
        </Txt>
      }
    />
  );
}

export function DateField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const theme = useTheme();
  const today = new Date();
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const yesterday = new Date(today.getTime() - 86_400_000);

  return (
    <View style={{ gap: 6 }}>
      <Field
        label={label}
        value={value}
        error={error}
        placeholder="YYYY-MM-DD"
        keyboardType="number-pad"
        maxLength={10}
        onChangeText={(next) => {
          const digits = next.replace(/\D/g, '').slice(0, 8);
          let formatted = digits;
          if (digits.length > 4) formatted = `${digits.slice(0, 4)}-${digits.slice(4, 6)}`;
          if (digits.length > 6) formatted = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
          onChange(formatted);
        }}
      />
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Chip label="Hari ini" onPress={() => onChange(iso(today))} />
        <Chip label="Kemarin" onPress={() => onChange(iso(yesterday))} />
      </View>
      <Txt variant="small" color={theme.textMuted} style={{ fontSize: 11 }}>
        Format tahun-bulan-tanggal
      </Txt>
    </View>
  );
}

/* ---------------------------------- chip ---------------------------------- */

export function Chip({
  label,
  selected,
  onPress,
  tone = 'default',
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  tone?: 'default' | 'danger';
}) {
  const theme = useTheme();
  const bg = selected ? (tone === 'danger' ? theme.danger : theme.primary) : theme.card;
  const fg = selected ? (tone === 'danger' ? '#FFFFFF' : theme.onPrimary) : theme.textMuted;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      style={({ pressed }) => ({
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: radii.pill,
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: selected ? bg : theme.border,
        opacity: pressed ? 0.7 : 1,
        minHeight: 36,
        justifyContent: 'center',
      })}>
      <Txt variant="small" color={fg} style={{ fontWeight: '600' }}>
        {label}
      </Txt>
    </Pressable>
  );
}

/* ------------------------------- misc bits -------------------------------- */

export function Divider() {
  const theme = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.border }} />;
}

export function EmptyState({
  icon = 'file-tray-outline',
  title,
  body,
  action,
}: {
  icon?: IconName;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: space.sm, paddingVertical: space.xxl }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: theme.cardAlt,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Ionicons name={icon} size={26} color={theme.textMuted} />
      </View>
      <Txt variant="section" style={{ textAlign: 'center' }}>
        {title}
      </Txt>
      {body ? (
        <Txt variant="small" color={theme.textMuted} style={{ textAlign: 'center', maxWidth: 280 }}>
          {body}
        </Txt>
      ) : null}
      {action ? <View style={{ marginTop: space.sm }}>{action}</View> : null}
    </View>
  );
}

export function Badge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
}) {
  const theme = useTheme();
  const map: Record<string, { bg: string; fg: string }> = {
    neutral: { bg: theme.cardAlt, fg: theme.textMuted },
    success: { bg: theme.successSoft, fg: theme.success },
    warning: { bg: theme.warningSoft, fg: theme.warning },
    danger: { bg: theme.dangerSoft, fg: theme.danger },
  };
  const tone2 = map[tone];
  return (
    <View style={{ backgroundColor: tone2.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.pill }}>
      <Txt variant="small" color={tone2.fg} style={{ fontWeight: '600', fontSize: 11 }}>
        {label}
      </Txt>
    </View>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Txt variant="label" color={theme.textMuted}>
        {children}
      </Txt>
      {right}
    </View>
  );
}

export function useThemeSafe(): Theme {
  return useTheme();
}

export const uiStyles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});

const styles = StyleSheet.create({
  display: { fontSize: 30, fontWeight: '700', letterSpacing: -0.6 },
  title: { fontSize: 21, fontWeight: '700', letterSpacing: -0.3 },
  section: { fontSize: 15, fontWeight: '600' },
  body: { fontSize: 14, fontWeight: '400' },
  small: { fontSize: 12, fontWeight: '400' },
  label: { fontSize: 11.5, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' },
});
