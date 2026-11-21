import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { formatRupiah } from '@/lib/money';
import { radii, space, useTheme } from '@/theme';
import { Txt } from '@/ui/components';

/* ------------------------------ monthly bars ------------------------------ */

export function MonthBarChart({
  data,
  activeMonth,
  onPressMonth,
  height = 132,
}: {
  data: { month: string; total: number; label: string }[];
  activeMonth?: string;
  onPressMonth?: (month: string) => void;
  height?: number;
}) {
  const theme = useTheme();
  const max = Math.max(1, ...data.map((d) => d.total));
  const average = data.reduce((sum, d) => sum + d.total, 0) / Math.max(1, data.length);

  return (
    <View style={{ gap: space.sm }}>
      <View style={{ height, flexDirection: 'row', alignItems: 'flex-end', gap: space.sm }}>
        {data.map((item) => {
          const active = activeMonth === item.month;
          const h = Math.max(4, Math.round((item.total / max) * (height - 26)));
          const above = item.total > average;
          return (
            <Pressable
              key={item.month}
              onPress={() => onPressMonth?.(item.month)}
              accessibilityLabel={`${item.label} ${formatRupiah(item.total)}`}
              style={{ flex: 1, alignItems: 'center', gap: 6 }}>
              <Txt variant="small" color={theme.textMuted} style={{ fontSize: 9 }} numberOfLines={1}>
                {item.total > 0 ? formatCompact(item.total) : ''}
              </Txt>
              <View
                style={{
                  width: '100%',
                  height: h,
                  borderRadius: 8,
                  backgroundColor: active ? theme.primary : above ? theme.accent : theme.cardAlt,
                }}
              />
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {data.map((item) => (
          <View key={item.month} style={{ flex: 1, alignItems: 'center' }}>
            <Txt
              variant="small"
              color={activeMonth === item.month ? theme.primary : theme.textMuted}
              style={{ fontSize: 10, fontWeight: activeMonth === item.month ? '700' : '400' }}>
              {item.label}
            </Txt>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 14, height: 3, borderRadius: 2, backgroundColor: theme.accent }} />
        <Txt variant="small" color={theme.textMuted} style={{ fontSize: 10 }}>
          di atas rata-rata
        </Txt>
        <View style={{ flex: 1 }} />
        <Txt variant="small" color={theme.textMuted} style={{ fontSize: 10 }}>
          rata-rata {formatCompact(average)}
        </Txt>
      </View>
    </View>
  );
}

/* --------------------------------- donut ---------------------------------- */

export function CategoryDonut({
  segments,
  size = 168,
  thickness = 22,
  centerTop,
  centerBottom,
}: {
  segments: { value: number; color: string }[];
  size?: number;
  thickness?: number;
  centerTop?: string;
  centerBottom?: string;
}) {
  const theme = useTheme();
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const arcs = segments.map((segment, index) => {
    const ratio = total > 0 ? segment.value / total : 0;
    const length = Math.max(0, ratio * circumference - (segments.length > 1 ? 2 : 0));
    const dash = `${length} ${Math.max(0, circumference - length)}`;
    const rotation = (offset / circumference) * 360 - 90;
    offset += ratio * circumference;
    return { dash, rotation, color: segment.color, index };
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={theme.cardAlt} strokeWidth={thickness} fill="none" />
        {total > 0
          ? arcs.map((arc) => (
              <G key={arc.index} rotation={arc.rotation} origin={`${size / 2}, ${size / 2}`}>
                <Circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={arc.color}
                  strokeWidth={thickness}
                  strokeLinecap="butt"
                  strokeDasharray={arc.dash}
                  fill="none"
                />
              </G>
            ))
          : null}
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center', gap: 2 }}>
        {centerTop ? <Txt variant="small" color={theme.textMuted}>{centerTop}</Txt> : null}
        <Txt variant="section" style={{ fontSize: 15 }} numberOfLines={1}>
          {centerBottom ?? ''}
        </Txt>
      </View>
    </View>
  );
}

/* -------------------------------- heatmap --------------------------------- */

export function CalendarHeatmap({
  monthKey,
  daily,
  onPressDay,
  cellSize,
}: {
  monthKey: string;
  daily: Record<string, number>;
  onPressDay?: (date: string) => void;
  cellSize?: number;
}) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  const grid = useMemo(() => {
    const [y, m] = monthKey.split('-').map(Number);
    const first = new Date(Date.UTC(y, m - 1, 1));
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const startWeekday = (first.getUTCDay() + 6) % 7; // Senin = 0
    const cells: { date: string | null; total: number }[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push({ date: null, total: 0 });
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${monthKey}-${String(d).padStart(2, '0')}`;
      cells.push({ date, total: daily[date] ?? 0 });
    }
    return cells;
  }, [monthKey, daily]);

  const max = Math.max(1, ...grid.map((c) => c.total));
  const gaps = 6;
  const size = cellSize ?? Math.max(20, Math.floor((width - gaps * 6) / 7));

  return (
    <View style={{ gap: space.sm }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={{ flexDirection: 'row' }}>
        {['S', 'S', 'R', 'K', 'J', 'S', 'M'].map((label, index) => (
          <View key={`${label}-${index}`} style={{ width: size + gaps, alignItems: 'center' }}>
            <Txt variant="small" color={theme.textMuted} style={{ fontSize: 9 }}>
              {label}
            </Txt>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {grid.map((cell, index) => {
          if (!cell.date) {
            return <View key={`blank-${index}`} style={{ width: size + gaps, height: size + gaps }} />;
          }
          const ratio = cell.total / max;
          const bg =
            cell.total === 0
              ? theme.cardAlt
              : ratio > 0.75
                ? theme.primary
                : ratio > 0.45
                  ? `${theme.primary}BB`
                  : ratio > 0.2
                    ? `${theme.primary}77`
                    : `${theme.primary}33`;
          const isSelected = selected === cell.date;
          return (
            <Pressable
              key={cell.date}
              onPress={() => {
                setSelected(cell.date);
                onPressDay?.(cell.date as string);
              }}
              accessibilityLabel={`${cell.date} ${formatRupiah(cell.total)}`}
              style={{ width: size + gaps, height: size + gaps, alignItems: 'center', justifyContent: 'center' }}>
              <View
                style={{
                  width: size,
                  height: size,
                  borderRadius: 7,
                  backgroundColor: bg,
                  borderWidth: isSelected ? 2 : 0,
                  borderColor: theme.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Txt
                  variant="small"
                  color={cell.total > 0 ? theme.onPrimary : theme.textMuted}
                  style={{ fontSize: Math.max(9, size * 0.34) }}>
                  {Number(cell.date.slice(8))}
                </Txt>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1).replace('.', ',')}jt`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}rb`;
  return String(Math.round(value));
}

export const chartRadii = radii;
