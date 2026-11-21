import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Switch, View } from 'react-native';

import {
  clearApiKey,
  getApiKey,
  saveApiKey,
  testGeminiKey,
} from '@/ai/gemini';
import { aiUsageThisMonth } from '@/db/queries';
import { useApp } from '@/state/app';
import { radii, space, useTheme } from '@/theme';
import {
  AppButton,
  Badge,
  Card,
  Divider,
  Field,
  Screen,
  ScreenHeader,
  SectionTitle,
  Txt,
} from '@/ui/components';

export default function AiSettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { settings, set } = useApp();
  const [keyState, setKeyState] = useState<'loading' | 'none' | 'saved'>('loading');
  const [keyInput, setKeyInput] = useState('');
  const [model, setModel] = useState(settings.ai_model);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [usage, setUsage] = useState({ calls: 0, failed: 0 });

  const refresh = useCallback(async () => {
    const key = await getApiKey();
    setKeyState(key ? 'saved' : 'none');
    setUsage(await aiUsageThisMonth());
  }, []);

  useEffect(() => {
    refresh().catch(() => setKeyState('none'));
  }, [refresh]);

  const saveKey = async () => {
    if (!keyInput.trim()) return;
    await saveApiKey(keyInput.trim());
    await set('ai_model', model.trim() || 'gemini-3.5-flash-lite');
    setKeyInput('');
    setKeyState('saved');
    setTestResult(null);
    Alert.alert('Kunci disimpan', 'Foto struk akan otomatis dibaca Gemini saat kamu memotret.');
  };

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    const key = (await getApiKey()) ?? keyInput.trim();
    const result = await testGeminiKey(key, model.trim() || 'gemini-3.5-flash-lite');
    setTesting(false);
    setTestResult(result.ok ? { ok: true, message: 'Kunci valid. Gemini siap dipakai.' } : { ok: false, message: result.message });
  };

  const removeKey = () => {
    Alert.alert('Hapus kunci?', 'Struk akan dibaca dengan OCR lokal saja.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          await clearApiKey();
          setKeyState('none');
          setTestResult(null);
        },
      },
    ]);
  };

  return (
    <Screen edges={['top']}>
      <ScreenHeader title="Gemini" subtitle="Pembaca struk otomatis" onBack={() => router.back()} />

      <Card style={{ gap: space.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Txt variant="section" style={{ flex: 1 }}>
            Status
          </Txt>
          <Badge label={keyState === 'saved' ? 'Aktif' : 'Nonaktif'} tone={keyState === 'saved' ? 'success' : 'neutral'} />
        </View>
        <Txt variant="small" color={theme.textMuted}>
          {keyState === 'saved'
            ? 'Setiap foto struk langsung dibaca Gemini. Tanpa koneksi, isi item manual.'
            : 'Tanpa kunci, foto tetap tersimpan sebagai bukti dan item diisi manual.'}
        </Txt>
      </Card>

      <Card style={{ gap: space.lg }}>
        <Field
          label="Kunci API Gemini"
          value={keyInput}
          onChangeText={setKeyInput}
          placeholder={keyState === 'saved' ? 'Ganti kunci (opsional)' : 'Tempel kunci dari Google AI Studio'}
          secureTextEntry
          autoCapitalize="none"
        />
        <Field
          label="Model"
          value={model}
          onChangeText={setModel}
          autoCapitalize="none"
          hint="Bisa diganti kalau Google merilis model baru."
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          <AppButton title="Simpan kunci" compact onPress={saveKey} disabled={!keyInput.trim()} />
          <AppButton title="Tes kunci" compact variant="secondary" loading={testing} onPress={runTest} />
          {keyState === 'saved' ? <AppButton title="Hapus" compact variant="danger" onPress={removeKey} /> : null}
        </View>
        {testResult ? (
          <Txt variant="small" color={testResult.ok ? theme.success : theme.danger}>
            {testResult.message}
          </Txt>
        ) : null}
      </Card>

      <SectionTitle>Perilaku</SectionTitle>
      <Card style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="body" style={{ fontWeight: '600' }}>
              Baca otomatis dengan Gemini
            </Txt>
            <Txt variant="small" color={theme.textMuted}>
              Kalau mati, Gemini hanya dipakai saat kamu menekan tombol di layar struk.
            </Txt>
          </View>
          <Switch
            value={settings.ai_auto === '1'}
            onValueChange={(next) => set('ai_auto', next ? '1' : '0')}
            trackColor={{ true: theme.primary, false: theme.cardAlt }}
            thumbColor="#FFFFFF"
          />
        </View>
        <Divider />
        <View style={{ gap: 2 }}>
          <Txt variant="small" color={theme.textMuted}>
            Pemakaian bulan ini
          </Txt>
          <Txt variant="section">
            {usage.calls} pembacaan{usage.failed > 0 ? ` · ${usage.failed} gagal` : ''}
          </Txt>
        </View>
        <Txt variant="small" color={theme.textMuted} style={{ fontSize: 11 }}>
          Foto dikirim langsung dari HP ke Google. Tidak ada server perantara. Kunci disimpan di
          penyimpanan aman perangkat, bukan di database.
        </Txt>
      </Card>

      <View
        style={{
          flexDirection: 'row',
          gap: space.sm,
          backgroundColor: theme.accentSoft,
          borderRadius: radii.lg,
          padding: space.md,
        }}>
        <Txt variant="small" color={theme.warning} style={{ flex: 1 }}>
          Kalau Gemini menolak kunci, periksa apakah Gemini API sudah aktif di project Google kamu.
        </Txt>
      </View>
    </Screen>
  );
}

