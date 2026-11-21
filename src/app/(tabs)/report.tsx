import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';

import { ShareSummary } from '@/components/share-summary';
import { shareMonthlyPdf } from '@/receipt/monthly';
import {
  dailyTotals,
  listBudgets,
  listExpenses,
  listWallets,
  monthlyTotals,
  topMerchants,
  totals,
  totalsByCategory,
  type Budget,
  type CategoryTotal,
  type Expense,
  type MerchantTotal,
  type Totals,
  type Wallet,
} from '@/db/queries';
import { currentMonthKey, monthLabel, todayISO } from '@/lib/dates';
import { formatRupiah } from '@/lib/money';
import { useApp } from '@/state/app';
import { colorForCategory, radii, space, useTheme } from '@/theme';
import { AppButton, Card, Chip, PressableScale, Screen, SectionTitle, Txt } from '@/ui/components';
import { CalendarHeatmap, CategoryDonut, MonthBarChart } from '@/ui/charts';
import { CategoryIcon } from '@/ui/category-icon';

function monthBounds(key: string): { from: string; to: string } {
  const [y, m] = key.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${key}-01`, to: `${key}-${String(last).padStart(2, '0')}` };
}

function shortMonth(key: string): string {
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const m = Number(key.slice(5, 7));
  return names[m - 1] ?? key;
}

export default function ReportScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { categoryDefs, settings } = useApp();
  const [month, setMonth] = useState(currentMonthKey());
  const [walletId, setWalletId] = useState<string | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [months, setMonths] = useState<{ month: string; total: number; label: string }[]>([]);
  const [summary, setSummary] = useState<Totals>({ total: 0, count: 0, tax: 0 });
  const [cats, setCats] = useState<CategoryTotal[]>([]);
  const [daily, setDaily] = useState<Record<string, number>>({});
  const [merchants, setMerchants] = useState<MerchantTotal[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [biggest, setBiggest] = useState<Expense | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  const sharePdf = async () => {
    setPdfBusy(true);
    try {
      await shareMonthlyPdf({
        name: settings.nama,
        monthLabel: monthLabel(month),
        total: summary.total,
        count: summary.count,
        months: months.map((row) => ({ label: row.label, total: row.total })),
        categories: cats.map((row) => ({
          label: row.category,
          total: row.total,
          count: row.count,
          color: categoryDefs.find((def) => def.name === row.category)?.color ?? colorForCategory(row.category),
        })),
        merchants: merchants.map((row) => ({ merchant: row.merchant, total: row.total, count: row.count })),
      });
    } catch (error) {
      Alert.alert('Gagal membuat PDF', (error as Error).message);
    } finally {
      setPdfBusy(false);
    }
  };

  const load = useCallback(async () => {
    const range = monthBounds(month);
    const [allWallets, monthTotals, catRows, dailyRows, topRows, budgetRows, biggestRows] = await Promise.all([
      listWallets(),
      monthlyTotals(6, walletId ?? undefined),
      totalsByCategory({ ...range, walletId: walletId ?? undefined }),
      dailyTotals(range.from, range.to, walletId ?? undefined),
      topMerchants(range.from, range.to, 5),
      listBudgets(walletId ?? undefined),
      listExpenses({ ...range, walletId: walletId ?? undefined }),
    ]);
    const monthSum = await totals({ ...range, walletId: walletId ?? undefined });
    setWallets(allWallets);
    setMonths(monthTotals.map((row) => ({ ...row, label: shortMonth(row.month) })));
    setSummary(monthSum);
    setCats(catRows);
    setDaily(Object.fromEntries(dailyRows.map((row) => [row.date, row.total])));
    setMerchants(topRows);
    setBudgets(budgetRows);
    setBiggest(biggestRows.reduce<Expense | null>((top, row) => (!top || row.amount > top.amount ? row : top), null));
  }, [month, walletId]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => undefined);
    }, [load]),
  );

  const monthIndex = months.findIndex((row) => row.month === month);
  const prev = monthIndex > 0 ? months[monthIndex - 1] : null;
  const delta = prev && prev.total > 0 ? (summary.total - prev.total) / prev.total : null;

  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const isCurrent = month === currentMonthKey();
  const elapsedDays = isCurrent ? Number(todayISO().slice(8)) : daysInMonth;
  const projection = elapsedDays > 0 ? Math.round((summary.total / elapsedDays) * daysInMonth) : 0;
  const dailyAverage = elapsedDays > 0 ? Math.round(summary.total / elapsedDays) : 0;

  let noSpendDays = 0;
  for (let d = 1; d <= elapsedDays; d++) {
    const key = `${month}-${String(d).padStart(2, '0')}`;
    if (!daily[key]) noSpendDays += 1;
  }

  const topCategory = cats[0] ?? null;
  const topShare = topCategory && summary.total > 0 ? Math.round((topCategory.total / summary.total) * 100) : 0;

  const donutSegments = cats.slice(0, 5).map((row) => ({
    value: row.total,
    color: categoryDefs.find((d) => d.name === row.category)?.color ?? colorForCategory(row.category),
  }));
  const restTotal = cats.slice(5).reduce((sum, row) => sum + row.total, 0);
  if (restTotal > 0) donutSegments.push({ value: restTotal, color: theme.cardAlt });

  const openExpenses = (params: Record<string, string>) => {
    router.push({ pathname: '/(tabs)/expenses', params });
  };

  return (
    <Screen edges={['top']} withTabs>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingTop: space.sm }}>
        <View style={{ flex: 1 }}>
          <Txt variant="small" color={theme.textMuted}>
            Analisis
          </Txt>
          <Txt variant="display" style={{ fontSize: 28 }}>
            Laporan
          </Txt>
        </View>
        <PressableScale
          onPress={() => router.push('/gallery')}
          haptic="selection"
          accessibilityLabel="Galeri struk"
          style={{
            width: 42,
            height: 42,
            borderRadius: 15,
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Ionicons name="images-outline" size={20} color={theme.text} />
        </PressableScale>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        <Chip label="Semua dompet" selected={!walletId} onPress={() => setWalletId(null)} />
        {wallets.map((wallet) => (
          <Chip
            key={wallet.id}
            label={wallet.name}
            selected={walletId === wallet.id}
            color={wallet.color}
            onPress={() => setWalletId(wallet.id)}
          />
        ))}
      </ScrollView>

      <View style={{ backgroundColor: theme.primaryDeep, borderRadius: radii.xxl, padding: space.xl, gap: 6 }}>
        <Txt variant="label" color="#9DBDB2">
          {monthLabel(month)}
        </Txt>
        <Txt variant="display" color="#FFFFFF" style={{ letterSpacing: -1 }}>
          {formatRupiah(summary.total)}
        </Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
          {delta != null ? (
            <View
              style={{
                backgroundColor: delta > 0 ? 'rgba(240,168,60,0.18)' : 'rgba(255,255,255,0.12)',
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 999,
              }}>
              <Txt variant="small" color={delta > 0 ? '#F0A83C' : '#CDE7DE'} style={{ fontWeight: '700' }}>
              {delta > 0 ? '↑' : '↓'} {Math.abs(Math.round(delta * 100))}% vs bulan lalu
              </Txt>
            </View>
          ) : null}
          <Txt variant="small" color="#9DBDB2">
            {summary.count} catatan · rata-rata {formatRupiah(dailyAverage)}/hari
          </Txt>
        </View>
        {isCurrent ? (
          <Txt variant="small" color="#9DBDB2">
            Perkiraan akhir bulan {formatRupiah(projection)}
          </Txt>
        ) : null}
      </View>

      <Card style={{ gap: space.lg }}>
        <SectionTitle right={<Txt variant="small" color={theme.textMuted}>6 bulan</Txt>}>Tren</SectionTitle>
        <MonthBarChart
          data={months}
          activeMonth={month}
          onPressMonth={(next) => setMonth(next)}
        />
      </Card>

      {cats.length > 0 ? (
        <Card style={{ gap: space.lg }}>
          <SectionTitle>Kategori</SectionTitle>
          <View style={{ alignItems: 'center', gap: space.lg }}>
            <CategoryDonut
              segments={donutSegments}
              centerTop="total"
              centerBottom={formatRupiah(summary.total)}
            />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: space.sm }}>
              {cats.slice(0, 4).map((row) => {
                const def = categoryDefs.find((d) => d.name === row.category);
                const percent = Math.round((row.total / Math.max(summary.total, 1)) * 100);
                return (
                  <PressableScale
                    key={row.category}
                    onPress={() => openExpenses({ category: row.category, from: monthBounds(month).from, to: monthBounds(month).to })}
                    haptic="selection"
                    style={{
                      width: '50%',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: space.sm,
                      paddingRight: space.sm,
                      paddingVertical: 4,
                    }}>
                    <CategoryIcon icon={def?.icon ?? 'tag'} color={def?.color ?? theme.textMuted} size={20} />
                    <View style={{ flex: 1 }}>
                      <Txt variant="small" style={{ fontWeight: '600' }} numberOfLines={1}>
                        {row.category}
                      </Txt>
                      <Txt variant="small" color={theme.textMuted} style={{ fontSize: 10 }}>
                        {percent}% · {row.count}x
                      </Txt>
                    </View>
                    <Txt variant="small" color={theme.textMuted} style={{ fontSize: 10 }}>
                      {formatRupiah(row.total)}
                    </Txt>
                  </PressableScale>
                );
              })}
            </View>
          </View>
        </Card>
      ) : null}

      {budgets.length > 0 ? (
        <Card style={{ gap: space.md }}>
          <SectionTitle right={<Txt variant="small" color={theme.textMuted}>bulan ini</Txt>}>Anggaran</SectionTitle>
          {budgets.slice(0, 4).map((budget) => {
            const spent = cats.find((row) => row.category === budget.category)?.total ?? 0;
            const ratio = budget.amount > 0 ? spent / budget.amount : 0;
            const def = categoryDefs.find((d) => d.name === budget.category);
            const barColor = ratio > 1 ? theme.danger : ratio > 0.8 ? theme.accent : theme.primary;
            return (
              <View key={budget.id} style={{ gap: 5 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                  <CategoryIcon icon={def?.icon ?? 'tag'} color={def?.color ?? theme.textMuted} size={18} />
                  <Txt variant="small" style={{ flex: 1, fontWeight: '600' }}>
                    {budget.category}
                  </Txt>
                  <Txt variant="small" color={ratio > 1 ? theme.danger : theme.textMuted} style={{ fontSize: 11 }}>
                    {formatRupiah(spent)} / {formatRupiah(budget.amount)}
                  </Txt>
                </View>
                <View style={{ height: 7, borderRadius: 4, backgroundColor: theme.cardAlt }}>
                  <View
                    style={{
                      width: `${Math.min(100, Math.round(ratio * 100))}%`,
                      height: 7,
                      borderRadius: 4,
                      backgroundColor: barColor,
                    }}
                  />
                </View>
              </View>
            );
          })}
        </Card>
      ) : null}

      <Card style={{ gap: space.md }}>
        <SectionTitle right={<Txt variant="small" color={theme.textMuted}>tap tanggal</Txt>}>Kalender</SectionTitle>
        <CalendarHeatmap
          monthKey={month}
          daily={daily}
          onPressDay={(date) => openExpenses({ from: date, to: date })}
        />
      </Card>

      {merchants.length > 0 ? (
        <Card style={{ gap: space.sm }}>
          <SectionTitle>Tokoh paling sering</SectionTitle>
          {merchants.map((row, index) => (
            <PressableScale
              key={row.merchant}
              onPress={() => openExpenses({ search: row.merchant, from: monthBounds(month).from, to: monthBounds(month).to })}
              haptic="selection"
              style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 6 }}>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 8,
                  backgroundColor: theme.cardAlt,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Txt variant="small" style={{ fontSize: 11, fontWeight: '700' }}>
                  {index + 1}
                </Txt>
              </View>
              <View style={{ flex: 1 }}>
                <Txt variant="small" style={{ fontWeight: '600' }} numberOfLines={1}>
                  {row.merchant}
                </Txt>
                <Txt variant="small" color={theme.textMuted} style={{ fontSize: 10 }}>
                  {row.count}x
                </Txt>
              </View>
              <Txt variant="small" style={{ fontVariant: ['tabular-nums'] }}>
                {formatRupiah(row.total)}
              </Txt>
            </PressableScale>
          ))}
        </Card>
      ) : null}

      <Card style={{ gap: space.sm }}>
        <SectionTitle>Insight</SectionTitle>
        {topCategory ? (
          <Txt variant="small" color={theme.textMuted}>
            • {topCategory.category} menyerap {topShare}% pengeluaran bulan ini.
          </Txt>
        ) : null}
        <Txt variant="small" color={theme.textMuted}>
            • {noSpendDays} hari tanpa pengeluaran dari {elapsedDays} hari.
        </Txt>
        {biggest ? (
          <Txt variant="small" color={theme.textMuted}>
            • Terbesar: {biggest.merchant} {formatRupiah(biggest.amount)}.
          </Txt>
        ) : null}
        {delta != null ? (
          <Txt variant="small" color={theme.textMuted}>
            • Total {delta > 0 ? 'naik' : 'turun'} {Math.abs(Math.round(delta * 100))}% dibanding bulan lalu.
          </Txt>
        ) : null}
      </Card>

      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <AppButton
          title="Bagikan ringkasan"
          icon="share-social-outline"
          variant="secondary"
          onPress={() => setShareOpen(true)}
          style={{ flex: 1 }}
        />
        <AppButton
          title="PDF bulanan"
          icon="document-text-outline"
          loading={pdfBusy}
          onPress={sharePdf}
          style={{ flex: 1 }}
        />
      </View>

      <ShareSummary
        visible={shareOpen}
        onClose={() => setShareOpen(false)}
        monthLabel={monthLabel(month)}
        total={summary.total}
        count={summary.count}
        categories={cats.slice(0, 3).map((row) => ({ label: row.category, value: row.total }))}
      />
    </Screen>
  );
}


