import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Modal, View } from 'react-native';

import { serializeCategories } from '@/lib/defaults';
import { useApp } from '@/state/app';
import { radii, space, useTheme, walletColors } from '@/theme';
import { AppButton, Card, Field, PressableScale, Screen, ScreenHeader, Txt } from '@/ui/components';
import { CategoryIcon } from '@/ui/category-icon';

const ICON_OPTIONS = ['food', 'car', 'bag', 'bed', 'parking', 'fuel', 'pencil', 'tag'];

export default function CategoriesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { categoryDefs, set } = useApp();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('tag');
  const [color, setColor] = useState(walletColors[0]);

  const add = async () => {
    const value = name.trim();
    if (!value) return;
    if (categoryDefs.some((item) => item.name.toLowerCase() === value.toLowerCase())) {
      Alert.alert('Sudah ada', 'Gunakan nama lain.');
      return;
    }
    await set('categories', serializeCategories([...categoryDefs, { name: value, icon, color }]));
    setName('');
    setIcon('tag');
    setAdding(false);
  };

  const remove = (target: string) => {
    if (categoryDefs.length <= 1) {
      Alert.alert('Minimal satu kategori', 'Sisakan minimal satu kategori.');
      return;
    }
    Alert.alert('Hapus kategori?', `Catatan lama dengan kategori "${target}" tetap ada.`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: () =>
          set('categories', serializeCategories(categoryDefs.filter((item) => item.name !== target))),
      },
    ]);
  };

  return (
    <Screen edges={['top']}>
      <ScreenHeader title="Kategori" subtitle="Nama, ilustrasi, dan warna" onBack={() => router.back()} />

      <Card padded={false} style={{ paddingHorizontal: space.lg }}>
        {categoryDefs.map((def, index) => (
          <View key={def.name}>
            {index > 0 ? <View style={{ height: 1, backgroundColor: theme.border, marginLeft: 56 }} /> : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 13,
                  backgroundColor: `${def.color}22`,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <CategoryIcon icon={def.icon} color={def.color} size={22} />
              </View>
              <Txt variant="body" style={{ flex: 1, fontWeight: '600' }}>
                {def.name}
              </Txt>
              <PressableScale onPress={() => remove(def.name)} haptic="selection" accessibilityLabel={`Hapus ${def.name}`}>
                <Ionicons name="close" size={17} color={theme.textMuted} />
              </PressableScale>
            </View>
          </View>
        ))}
      </Card>

      <AppButton title="Tambah kategori" variant="secondary" icon="add" onPress={() => setAdding(true)} />

      <Txt variant="small" color={theme.textMuted} style={{ textAlign: 'center' }}>
        Ilustrasi dan warna dipakai di daftar, laporan, dan anggaran. Menghapus kategori tidak
        menghapus catatan lama.
      </Txt>

      <Modal visible={adding} transparent animationType="slide" onRequestClose={() => setAdding(false)}>
        <PressableScale style={{ flex: 1, backgroundColor: theme.overlay }} onPress={() => setAdding(false)} />
        <View
          style={{
            backgroundColor: theme.bg,
            borderTopLeftRadius: radii.xxl,
            borderTopRightRadius: radii.xxl,
            padding: space.xl,
            paddingBottom: space.xxxl,
            gap: space.lg,
          }}>
          <Txt variant="title">Kategori baru</Txt>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 18,
                backgroundColor: `${color}22`,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <CategoryIcon icon={icon} color={color} size={28} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Nama" value={name} onChangeText={setName} autoFocus placeholder="Kesehatan" />
            </View>
          </View>

          <View style={{ gap: space.sm }}>
            <Txt variant="label" color={theme.textMuted}>
              Ilustrasi
            </Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {ICON_OPTIONS.map((option) => (
                <PressableScale
                  key={option}
                  onPress={() => setIcon(option)}
                  haptic="selection"
                  accessibilityLabel={`Ilustrasi ${option}`}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 15,
                    backgroundColor: icon === option ? theme.mint : theme.card,
                    borderWidth: 1,
                    borderColor: icon === option ? theme.primary : theme.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <CategoryIcon icon={option} color={color} size={26} />
                </PressableScale>
              ))}
            </View>
          </View>

          <View style={{ gap: space.sm }}>
            <Txt variant="label" color={theme.textMuted}>
              Warna
            </Txt>
            <View style={{ flexDirection: 'row', gap: space.md }}>
              {walletColors.map((item) => (
                <PressableScale
                  key={item}
                  onPress={() => setColor(item)}
                  haptic="selection"
                  accessibilityLabel={`Warna ${item}`}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: item,
                    borderWidth: color === item ? 3 : 0,
                    borderColor: theme.text,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  {color === item ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}
                </PressableScale>
              ))}
            </View>
          </View>

          <AppButton title="Tambah" onPress={add} disabled={!name.trim()} />
        </View>
      </Modal>
    </Screen>
  );
}
