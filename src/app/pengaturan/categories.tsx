import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Modal, View } from 'react-native';

import { useApp } from '@/state/app';
import { colorForCategory, radii, space, useTheme } from '@/theme';
import {
  AppButton,
  Card,
  Field,
  PressableScale,
  Screen,
  ScreenHeader,
  Txt,
} from '@/ui/components';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function CategoriesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { categories, set } = useApp();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  const add = async () => {
    const value = name.trim();
    if (!value) return;
    if (categories.some((item) => item.toLowerCase() === value.toLowerCase())) {
      Alert.alert('Sudah ada', 'Gunakan nama lain.');
      return;
    }
    await set('categories', JSON.stringify([...categories, value]));
    setName('');
    setAdding(false);
  };

  const remove = (category: string) => {
    if (categories.length <= 1) {
      Alert.alert('Minimal satu kategori', 'Sisakan minimal satu kategori.');
      return;
    }
    Alert.alert('Hapus kategori?', `Catatan lama dengan kategori "${category}" tetap ada.`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: () => set('categories', JSON.stringify(categories.filter((item) => item !== category))),
      },
    ]);
  };

  return (
    <Screen edges={['top']}>
      <ScreenHeader title="Kategori" subtitle="Label untuk setiap catatan" onBack={() => router.back()} />

      <Card padded={false} style={{ paddingHorizontal: space.lg }}>
        {categories.map((category, index) => {
          const tint = colorForCategory(category);
          return (
            <View key={category}>
              {index > 0 ? <View style={{ height: 1, backgroundColor: theme.border, marginLeft: 52 }} /> : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: `${tint}22`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <View style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: tint }} />
                </View>
                <Txt variant="body" style={{ flex: 1, fontWeight: '600' }}>
                  {category}
                </Txt>
                <PressableScale onPress={() => remove(category)} haptic="selection" accessibilityLabel={`Hapus ${category}`}>
                  <Ionicons name="close" size={17} color={theme.textMuted} />
                </PressableScale>
              </View>
            </View>
          );
        })}
      </Card>

      <AppButton title="Tambah kategori" variant="secondary" icon="add" onPress={() => setAdding(true)} />

      <Txt variant="small" color={theme.textMuted} style={{ textAlign: 'center' }}>
        Kategori hanya label. Menghapus kategori tidak menghapus catatan lama.
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
          <Field label="Nama" value={name} onChangeText={setName} autoFocus placeholder="Kesehatan" />
          <AppButton title="Tambah" onPress={add} disabled={!name.trim()} />
        </View>
      </Modal>
    </Screen>
  );
}

