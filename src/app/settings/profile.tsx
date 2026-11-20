import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { useApp } from '@/state/app';
import { space, useTheme } from '@/theme';
import { AppButton, Card, Field, Screen, ScreenHeader, Txt } from '@/ui/components';

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { settings, set } = useApp();
  const [nama, setNama] = useState(settings.nama);
  const [email, setEmail] = useState(settings.email);

  const save = async () => {
    await Promise.all([set('nama', nama.trim()), set('email', email.trim())]);
    Alert.alert('Tersimpan', 'Nama dan email diperbarui.');
  };

  return (
    <Screen edges={['top']}>
      <ScreenHeader title="Identitas" subtitle="Dipakai di sapaan dan struk" onBack={() => router.back()} />

      <Card style={{ alignItems: 'center', gap: space.sm, paddingVertical: space.xxl }}>
        <View
          style={{
            width: 76,
            height: 76,
            borderRadius: 26,
            backgroundColor: theme.primaryDeep,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Txt variant="display" color={theme.accent}>
            {(nama || 'N').trim().charAt(0).toUpperCase()}
          </Txt>
        </View>
        <Txt variant="section">{nama || 'Belum ada nama'}</Txt>
        <Txt variant="small" color={theme.textMuted}>
          {email || 'Email belum diisi'}
        </Txt>
      </Card>

      <Card style={{ gap: space.lg }}>
        <Field label="Nama" value={nama} onChangeText={setNama} placeholder="Nama kamu" />
        <Field
          label="Email (opsional)"
          value={email}
          onChangeText={setEmail}
          placeholder="nama@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <AppButton title="Simpan" onPress={save} />
      </Card>

      <Txt variant="small" color={theme.textMuted} style={{ textAlign: 'center' }}>
        Nama ini tidak dikirim ke mana pun. Hanya dipakai di layar dan judul ekspor.
      </Txt>
    </Screen>
  );
}
