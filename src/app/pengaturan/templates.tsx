import { Ionicons } from '@expo/vector-icons';
import { useRouter , useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Modal, ScrollView, View } from 'react-native';

import {
  createTemplate,
  deleteTemplate,
  listTemplates,
  listWallets,
  type Template,
  type Wallet,
} from '@/db/queries';
import { formatRupiah } from '@/lib/money';
import { useApp } from '@/state/app';
import { radii, space, useTheme } from '@/theme';
import {
  AppButton,
  Card,
  Chip,
  EmptyState,
  Field,
  MoneyInput,
  PressableScale,
  Screen,
  ScreenHeader,
  Txt,
} from '@/ui/components';
import { CategoryIcon } from '@/ui/category-icon';

export default function TemplatesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { categories, categoryDefs, settings } = useApp();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState<number | null>(null);
  const [category, setCategory] = useState(settings.default_category || 'Makan');
  const [walletId, setWalletId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [rows, walletRows] = await Promise.all([listTemplates(), listWallets()]);
    setTemplates(rows);
    setWallets(walletRows);
    if (!walletId) setWalletId(walletRows[0]?.id ?? null);
  }, [walletId]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => undefined);
    }, [load]),
  );

  const save = async () => {
    if (!name.trim() || !amount || !walletId) return;
    await createTemplate({ name, amount, category, walletId });
    setName('');
    setAmount(null);
    setOpen(false);
    await load();
  };

  return (
    <Screen
      edges={['top']}
      footer={<AppButton title="Template baru" icon="add" onPress={() => setOpen(true)} />}>
      <ScreenHeader title="Template cepat" subtitle="Sekali tap langsung tercatat" onBack={() => router.back()} />

      {templates.length === 0 ? (
        <Card>
          <EmptyState
            icon="flash-outline"
            title="Belum ada template"
            body="Contoh: Kopi 25rb, Parkir 5rb, Tol 12rb. Template muncul di Beranda."
            action={<AppButton title="Buat template" compact onPress={() => setOpen(true)} />}
          />
        </Card>
      ) : (
        <Card padded={false} style={{ paddingHorizontal: space.lg }}>
          {templates.map((template, index) => {
            const def = categoryDefs.find((item) => item.name === template.category);
            return (
              <View key={template.id}>
                {index > 0 ? <View style={{ height: 1, backgroundColor: theme.border, marginLeft: 52 }} /> : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md }}>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      backgroundColor: `${def?.color ?? theme.primary}22`,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <CategoryIcon icon={def?.icon ?? 'tag'} color={def?.color ?? theme.primary} size={20} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt variant="body" style={{ fontWeight: '600' }}>
                      {template.name}
                    </Txt>
                    <Txt variant="small" color={theme.textMuted}>
                      {template.category}
                    </Txt>
                  </View>
                  <Txt variant="body" style={{ fontWeight: '700' }}>
                    {formatRupiah(template.amount)}
                  </Txt>
                  <PressableScale
                    onPress={async () => {
                      await deleteTemplate(template.id);
                      await load();
                    }}
                    accessibilityLabel="Hapus template"
                    haptic="selection">
                    <Ionicons name="trash-outline" size={17} color={theme.danger} />
                  </PressableScale>
                </View>
              </View>
            );
          })}
        </Card>
      )}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <PressableScale style={{ flex: 1, backgroundColor: theme.overlay }} onPress={() => setOpen(false)} />
        <View
          style={{
            backgroundColor: theme.bg,
            borderTopLeftRadius: radii.xxl,
            borderTopRightRadius: radii.xxl,
            padding: space.xl,
            paddingBottom: space.xxxl,
            maxHeight: '85%',
            gap: space.lg,
          }}>
          <ScrollView contentContainerStyle={{ gap: space.lg }}>
            <Txt variant="title">Template baru</Txt>
            <Field label="Nama" value={name} onChangeText={setName} placeholder="Kopi" autoFocus />
            <MoneyInput label="Nominal" value={amount} onChange={setAmount} />
            <View style={{ gap: space.sm }}>
              <Txt variant="label" color={theme.textMuted}>
                Kategori
              </Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                {categories.map((item) => (
                  <Chip key={item} label={item} selected={category === item} onPress={() => setCategory(item)} />
                ))}
              </View>
            </View>
            <View style={{ gap: space.sm }}>
              <Txt variant="label" color={theme.textMuted}>
                Dompet
              </Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                {wallets.map((wallet) => (
                  <Chip
                    key={wallet.id}
                    label={wallet.name}
                    selected={walletId === wallet.id}
                    color={wallet.color}
                    onPress={() => setWalletId(wallet.id)}
                  />
                ))}
              </View>
            </View>
            <AppButton title="Simpan" onPress={save} disabled={!name.trim() || !amount} />
          </ScrollView>
        </View>
      </Modal>
    </Screen>
  );
}
