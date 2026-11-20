import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { ComponentProps, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated as RNAnimated,
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

type TextVariant = 'display' | 'title' | 'section' | 'body' | 'small' | 'label' | 'amount';

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

/* -------------------------------- pressable ------------------------------- */

const AnimatedPressable = RNAnimated.createAnimatedComponent(Pressable);

export function PressableScale({
  children,
  onPress,
  style,
  haptic = 'none',
  disabled,
  accessibilityLabel,
  accessibilityRole = 'button',
}: {
  children?: ReactNode;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
  haptic?: 'none' | 'selection' | 'light' | 'medium';
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'link';
}) {
  const [scale] = useState(() => new RNAnimated.Value(1));

  const animate = (to: number) => {
    RNAnimated.timing(scale, { toValue: to, duration: 110, useNativeDriver: true }).start();
  };

  const fire = () => {
    if (haptic === 'none') return;
    if (haptic === 'selection') Haptics.selectionAsync().catch(() => undefined);
    else if (haptic === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };

  return (
    <AnimatedPressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPressIn={() => animate(0.97)}
      onPressOut={() => animate(1)}
      onPress={() => {
        fire();
        onPress?.();
      }}
      style={[
        style as ViewStyle,
        { transform: [{ scale }] },
        disabled ? { opacity: 0.5 } : null,
      ] as never}>
      {children}
    </AnimatedPressable>
  );
}

/* --------------------------------- screen --------------------------------- */

export function Screen({
  children,
  scroll = true,
  padded = true,
  footer,
  edges = ['bottom'],
  withTabs = false,
}: {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  footer?: ReactNode;
  edges?: ('top' | 'bottom')[];
  withTabs?: boolean;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const bottom = (edges.includes('bottom') ? insets.bottom : 0) + (withTabs ? 74 : 0);
  const content = (
    <View style={[padded && { paddingHorizontal: space.xl }, { gap: space.lg }]}>{children}</View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: edges.includes('top') ? insets.top + 6 : 0 }}>
      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingTop: space.md,
            paddingBottom: footer ? space.xl : bottom + 28,
            gap: space.lg,
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
            paddingHorizontal: space.xl,
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
  large,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
  large?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.xs }}>
      {onBack ? (
        <PressableScale
          onPress={onBack}
          haptic="selection"
          accessibilityLabel="Kembali"
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.border,
          }}>
          <Ionicons name="chevron-back" size={19} color={theme.text} />
        </PressableScale>
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant={large ? 'display' : 'title'} numberOfLines={1}>
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
    borderRadius: radii.xxl,
    borderWidth: 1,
    borderColor: theme.border,
    padding: padded ? space.lg : 0,
    boxShadow: theme.shadow,
  };
  if (!onPress) return <View style={[base, style] as ViewStyle[]}>{children}</View>;
  return (
    <PressableScale onPress={onPress} haptic="selection" style={[base, style] as ViewStyle[]}>
      {children}
    </PressableScale>
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
    <PressableScale
      onPress={onPress}
      disabled={off}
      haptic={variant === 'primary' ? 'medium' : 'selection'}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: space.sm,
        backgroundColor: tone.bg,
        borderColor: tone.border,
        borderWidth: 1,
        borderRadius: radii.lg,
        paddingVertical: compact ? 10 : 16,
        paddingHorizontal: space.xl,
        minHeight: compact ? 42 : 56,
        ...(style ?? {}),
      }}>
      {loading ? (
        <ActivityIndicator size="small" color={tone.fg} />
      ) : icon ? (
        <Ionicons name={icon} size={compact ? 16 : 19} color={tone.fg} />
      ) : null}
      <Txt variant={compact ? 'small' : 'body'} color={tone.fg} style={{ fontWeight: '700' }}>
        {title}
      </Txt>
    </PressableScale>
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
    <View style={{ gap: 7 }}>
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
          minHeight: 52,
        }}>
        <TextInput
          placeholderTextColor={theme.textMuted}
          style={{
            flex: 1,
            color: theme.text,
            fontSize: 15,
            paddingVertical: 13,
            textAlignVertical: props.multiline ? 'top' : 'center',
            minHeight: props.multiline ? 88 : undefined,
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
  compact,
}: {
  label?: string;
  value: number | null;
  onChange: (value: number | null) => void;
  error?: string;
  hint?: string;
  compact?: boolean;
}) {
  const theme = useTheme();
  const [text, setText] = useState(value ? groupDigits(value) : '');

  useEffect(() => {
    setText(value ? groupDigits(value) : '');
  }, [value]);

  if (compact) {
    return (
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Txt variant="small" color={theme.textMuted}>
          Rp
        </Txt>
        <TextInput
          value={text}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={theme.textMuted}
          onChangeText={(next) => {
            const digits = onlyDigits(next).slice(0, 11);
            setText(groupDigits(digits));
            onChange(digits ? Number(digits) : null);
          }}
          style={{
            flex: 1,
            color: theme.text,
            fontSize: 15,
            fontWeight: '700',
            textAlign: 'right',
            fontVariant: ['tabular-nums'],
            paddingVertical: 6,
          }}
        />
      </View>
    );
  }

  return (
    <Field
      label={label ?? 'Nominal'}
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
    <View style={{ gap: 7 }}>
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
          if (digits.length > 6)
            formatted = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
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
  color,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  tone?: 'default' | 'danger';
  color?: string;
}) {
  const theme = useTheme();
  const bg = selected ? (tone === 'danger' ? theme.danger : color ?? theme.primary) : theme.card;
  const fg = selected ? '#FFFFFF' : theme.textMuted;
  return (
    <PressableScale
      onPress={onPress}
      haptic="selection"
      style={{
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: radii.pill,
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: selected ? bg : theme.border,
        minHeight: 38,
        justifyContent: 'center',
      }}>
      <Txt variant="small" color={fg} style={{ fontWeight: '700' }}>
        {label}
      </Txt>
    </PressableScale>
  );
}

/* ------------------------------- misc bits -------------------------------- */

export function Divider({ inset = 0 }: { inset?: number }) {
  const theme = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.border, marginLeft: inset }} />;
}

export function EmptyState({
  icon = 'file-tray-outline',
  title,
  body,
  action,
  color,
}: {
  icon?: IconName;
  title: string;
  body?: string;
  action?: ReactNode;
  color?: string;
}) {
  const theme = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: space.sm, paddingVertical: space.xxl }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 22,
          backgroundColor: theme.mint,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Ionicons name={icon} size={28} color={color ?? theme.primary} />
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
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'accent';
}) {
  const theme = useTheme();
  const map: Record<string, { bg: string; fg: string }> = {
    neutral: { bg: theme.cardAlt, fg: theme.textMuted },
    success: { bg: theme.mint, fg: theme.primary },
    warning: { bg: theme.accentSoft, fg: theme.warning },
    danger: { bg: theme.dangerSoft, fg: theme.danger },
    accent: { bg: theme.accent, fg: theme.primaryDeep },
  };
  const tone2 = map[tone];
  return (
    <View style={{ backgroundColor: tone2.bg, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radii.pill }}>
      <Txt variant="small" color={tone2.fg} style={{ fontWeight: '700', fontSize: 10.5 }}>
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

export function ListRow({
  icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  right,
  onPress,
  chevron = true,
}: {
  icon: IconName;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
}) {
  const theme = useTheme();
  const content = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 13 }}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: iconBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Ionicons name={icon} size={19} color={iconColor} />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Txt variant="body" style={{ fontWeight: '600' }}>
          {title}
        </Txt>
        {subtitle ? (
          <Txt variant="small" color={theme.textMuted} numberOfLines={1}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {right}
      {onPress && chevron ? <Ionicons name="chevron-forward" size={16} color={theme.textMuted} /> : null}
    </View>
  );

  if (!onPress) return content;
  return (
    <PressableScale onPress={onPress} haptic="selection">
      {content}
    </PressableScale>
  );
}

export function useThemeSafe(): Theme {
  return useTheme();
}

export function ProgressBar({ value, color }: { value: number; color?: string }) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: theme.cardAlt, overflow: 'hidden' }}>
      <View
        style={{
          width: `${Math.round(clamped * 100)}%`,
          height: 8,
          borderRadius: 4,
          backgroundColor: color ?? theme.accent,
        }}
      />
    </View>
  );
}

export const UI = StyleSheet.create({
  indexLetter: { fontSize: 12, fontWeight: '700' },
});

const styles = StyleSheet.create({
  display: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.4 },
  section: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  body: { fontSize: 14, fontWeight: '400' },
  small: { fontSize: 12, fontWeight: '400' },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },
  amount: { fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
});


