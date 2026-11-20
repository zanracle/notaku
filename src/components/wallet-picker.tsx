import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, ScrollView, View } from 'react-native';

import { createWallet, updateWallet, type Wallet } from '@/db/queries';
import { radii, space, useTheme, walletColors } from '@/theme';
import {
  AppButton,
  Chip,
  Field,
  MoneyInput,
  PressableScale,
  SectionTitle,
  Txt,
} from '@/ui/components';

export function WalletFormSheet({
  visible,
  wallet,
  onClose,
  onSaved,
}: {
  visible: boolean;
  wallet?: Wallet | null;
  onClose: () => void;
  onSaved: (wallet: Wallet) => void;
}) {
  const theme = useTheme();
  const editing = Boolean(wallet);
  const [name, setName] = useState(wallet?.name ?? '');
  const [budget, setBudget] = useState<number | null>(wallet?.budget ?? null);
  const [color, setColor] = useState(wallet?.color ?? walletColors[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!name.trim()) {
      setError('Nama dompet wajib diisi.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (wallet) {
        await updateWallet(wallet.id, { name, budget, color });
        onSaved({ ...wallet, name: name.trim(), budget, color });
      } else {
        const created = await createWallet({ name, budget, color });
        onSaved(created);
        setName('');
        setBudget(null);
      }
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <PressableScale
        style={{ flex: 1, backgroundColor: theme.overlay }}
        onPress={onClose}
        accessibilityLabel="Tutup"
      />
      <View
        style={{
          backgroundColor: theme.bg,
          borderTopLeftRadius: radii.xxl,
          borderTopRightRadius: radii.xxl,
          padding: space.xl,
          paddingBottom: space.xxxl,
          gap: space.lg,
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Txt variant="title" style={{ flex: 1 }}>
            {editing ? 'Ubah dompet' : 'Dompet baru'}
          </Txt>
          <PressableScale onPress={onClose} accessibilityLabel="Tutup" haptic="selection">
            <Ionicons name="close" size={22} color={theme.textMuted} />
          </PressableScale>
        </View>

        <Field label="Nama dompet" value={name} onChangeText={setName} placeholder="Dompet Harian" autoFocus />
        <MoneyInput
          label="Saldo awal (opsional)"
          value={budget}
          onChange={setBudget}
          hint="Dipakai untuk menghitung sisa dan progres."
        />

        <View style={{ gap: space.sm }}>
          <SectionTitle>Warna</SectionTitle>
          <View style={{ flexDirection: 'row', gap: space.md }}>
            {walletColors.map((item) => (
              <PressableScale
                key={item}
                onPress={() => setColor(item)}
                haptic="selection"
                accessibilityLabel={`Warna ${item}`}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 14,
                  backgroundColor: item,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: color === item ? 3 : 0,
                  borderColor: theme.text,
                }}>
                {color === item ? <Ionicons name="checkmark" size={18} color="#FFFFFF" /> : null}
              </PressableScale>
            ))}
          </View>
        </View>

        {error ? (
          <Txt variant="small" color={theme.danger}>
            {error}
          </Txt>
        ) : null}

        <AppButton title={editing ? 'Simpan perubahan' : 'Buat dompet'} onPress={save} loading={saving} />
      </View>
    </Modal>
  );
}

export function WalletPicker({
  wallets,
  value,
  onChange,
  onCreated,
}: {
  wallets: Wallet[];
  value: string | null;
  onChange: (id: string) => void;
  onCreated: (wallet: Wallet) => void;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View style={{ gap: space.sm }}>
      <SectionTitle>Dompet</SectionTitle>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        {wallets.map((wallet) => {
          const active = value === wallet.id;
          return (
            <PressableScale
              key={wallet.id}
              onPress={() => onChange(wallet.id)}
              haptic="selection"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 7,
                paddingHorizontal: 13,
                paddingVertical: 9,
                minHeight: 38,
                borderRadius: radii.pill,
                backgroundColor: active ? wallet.color : theme.card,
                borderWidth: 1,
                borderColor: active ? wallet.color : theme.border,
              }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: active ? '#FFFFFF' : wallet.color,
                }}
              />
              <Txt variant="small" color={active ? '#FFFFFF' : theme.textMuted} style={{ fontWeight: '700' }}>
                {wallet.name}
              </Txt>
            </PressableScale>
          );
        })}
        <Chip label="+ Dompet" onPress={() => setOpen(true)} />
      </ScrollView>
      <WalletFormSheet
        visible={open}
        onClose={() => setOpen(false)}
        onSaved={(wallet) => {
          onCreated(wallet);
          onChange(wallet.id);
        }}
      />
    </View>
  );
}
