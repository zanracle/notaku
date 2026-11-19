import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Pressable, Switch, View } from 'react-native';

import { clearApiKey, getApiKey, saveApiKey, testGeminiKey } from '@/ai/gemini';
import { aiUsageThisMonth } from '@/db/queries';
import { deletePhotoFiles, saveLogoPhoto } from '@/storage/images';
import { useApp } from '@/state/app';
import { radii, space, useTheme } from '@/theme';
import {
  AppButton,
  Card,
  Chip,
  Divider,
  Field,
  Screen,
  ScreenHeader,
  SectionTitle,
  Txt,
} from '@/ui/components';
import { ocrUnavailableMessage, isExpoGo } from '@/ocr/recognize';

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { settings, set, categories, reload } = useApp();

  const [nama, setNama] = useState(settings.nama);
  const [nip, setNip] = useState(settings.nip);
  const [jabatan, setJabatan] = useState(settings.jabatan);
  const [departemen, setDepartemen] = useState(settings.departemen);
  const [perusahaan, setPerusahaan] = useState(settings.perusahaan);
  const [ttdPemohon, setTtdPemohon] = useState(settings.ttd_pemohon);
  const [ttdMengetahui, setTtdMengetahui] = useState(settings.ttd_mengetahui);

  const [keyState, setKeyState] = useState<'loading' | 'none' | 'saved'>('loading');
  const [keyInput, setKeyInput] = useState('');
  const [model, setModel] = useState(settings.ai_model);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [usage, setUsage] = useState({ calls: 0, failed: 0 });

  const [addCategory, setAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  const refreshKey = useCallback(async () => {
    const key = await getApiKey();
    setKeyState(key ? 'saved' : 'none');
    setUsage(await aiUsageThisMonth());
  }, []);

  useEffect(() => {
    refreshKey().catch(() => setKeyState('none'));
  }, [refreshKey]);

  const saveIdentity = async () => {
    await Promise.all([
      set('nama', nama.trim()),
      set('nip', nip.trim()),
      set('jabatan', jabatan.trim()),
      set('departemen', departemen.trim()),
      set('perusahaan', perusahaan.trim()),
      set('ttd_pemohon', ttdPemohon.trim() || 'Pemohon'),
      set('ttd_mengetahui', ttdMengetahui.trim() || 'Mengetahui'),
    ]);
    Alert.alert('Tersimpan', 'Identitas pelapor dan kop laporan sudah diperbarui.');
  };

  const pickLogo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Izin galeri ditolak', 'NotaKu butuh akses galeri untuk memilih logo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (result.canceled || !result.assets?.[0]) return;
    try {
      const saved = await saveLogoPhoto(result.assets[0].uri);
      await deletePhotoFiles([settings.logo_path]);
      await set('logo_path', saved);
    } catch (error) {
      Alert.alert('Gagal menyimpan logo', (error as Error).message);
    }
  };

  const removeLogo = async () => {
    await deletePhotoFiles([settings.logo_path]);
    await set('logo_path', '');
  };

  const saveKey = async () => {
    if (!keyInput.trim()) return;
    await saveApiKey(keyInput.trim());
    setKeyInput('');
    setKeyState('saved');
    setTestResult(null);
    await set('ai_model', model.trim() || 'gemini-3.5-flash-lite');
    Alert.alert('Kunci disimpan', 'Kunci hanya tersimpan di penyimpanan aman perangkat ini.');
  };

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    const key = (await getApiKey()) ?? keyInput.trim();
    const result = await testGeminiKey(key, model.trim() || 'gemini-3.5-flash-lite');
    setTesting(false);
    setTestResult(result.ok ? { ok: true, message: 'Kunci valid. AI siap dipakai.' } : { ok: false, message: result.message });
  };

  const removeKey = async () => {
    Alert.alert('Hapus kunci AI?', 'AI tidak bisa dipakai sampai kunci diisi lagi. Data tetap aman.', [
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

  const addCategoryItem = async () => {
    const value = newCategory.trim();
    if (!value) return;
    if (categories.some((item) => item.toLowerCase() === value.toLowerCase())) {
      Alert.alert('Kategori sudah ada', 'Gunakan nama lain.');
      return;
    }
    await set('categories', JSON.stringify([...categories, value]));
    setNewCategory('');
    setAddCategory(false);
  };

  const removeCategory = async (value: string) => {
    if (categories.length <= 1) {
      Alert.alert('Minimal satu kategori', 'Sisakan minimal satu kategori.');
      return;
    }
    await set('categories', JSON.stringify(categories.filter((item) => item !== value)));
  };

  return (
    <Screen edges={['top']}>
      <ScreenHeader title="Pengaturan" subtitle="Identitas, AI, dan data" />

      <SectionTitle>Identitas pelapor</SectionTitle>
      <Card style={{ gap: space.md }}>
        <Field label="Nama lengkap" value={nama} onChangeText={setNama} placeholder="Nama kamu" />
        <Field label="NIP / ID karyawan" value={nip} onChangeText={setNip} placeholder="Opsional" />
        <Field label="Jabatan" value={jabatan} onChangeText={setJabatan} placeholder="Opsional" />
        <Field label="Departemen" value={departemen} onChangeText={setDepartemen} placeholder="Opsional" />
        <Field label="Nama perusahaan" value={perusahaan} onChangeText={setPerusahaan} placeholder="Untuk kop laporan" />
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ flex: 1 }}>
            <Field label="Label tanda tangan 1" value={ttdPemohon} onChangeText={setTtdPemohon} placeholder="Pemohon" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Label tanda tangan 2" value={ttdMengetahui} onChangeText={setTtdMengetahui} placeholder="Mengetahui" />
          </View>
        </View>
        <AppButton title="Simpan identitas" onPress={saveIdentity} compact />
      </Card>

      <SectionTitle>Logo laporan</SectionTitle>
      <Card style={{ gap: space.md }}>
        <Txt variant="small" color={theme.textMuted}>
          Opsional. Muncul di kop PDF dan gambar laporan.
        </Txt>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <AppButton title={settings.logo_path ? 'Ganti logo' : 'Pilih logo'} variant="secondary" compact onPress={pickLogo} />
          {settings.logo_path ? <AppButton title="Hapus" variant="danger" compact onPress={removeLogo} /> : null}
        </View>
      </Card>

      <SectionTitle>Kategori</SectionTitle>
      <Card style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {categories.map((item) => (
            <Chip key={item} label={`${item} ✕`} onPress={() => removeCategory(item)} />
          ))}
        </View>
        <AppButton title="Tambah kategori" variant="secondary" compact onPress={() => setAddCategory(true)} />
      </Card>

      <SectionTitle>AI pembaca struk (opsional)</SectionTitle>
      <Card style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Ionicons
            name={keyState === 'saved' ? 'checkmark-circle' : 'ellipse-outline'}
            size={18}
            color={keyState === 'saved' ? theme.success : theme.textMuted}
          />
          <Txt variant="small" color={theme.textMuted} style={{ flex: 1 }}>
            {keyState === 'saved' ? 'Kunci Gemini tersimpan di perangkat' : 'Belum ada kunci'}
          </Txt>
        </View>

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
          {keyState === 'saved' ? (
            <AppButton title="Hapus kunci" compact variant="danger" onPress={removeKey} />
          ) : null}
        </View>

        {testResult ? (
          <Txt variant="small" color={testResult.ok ? theme.success : theme.danger}>
            {testResult.message}
          </Txt>
        ) : null}

        <Divider />
        <Txt variant="small" color={theme.textMuted}>
          {usage.calls > 0
            ? `Dipakai ${usage.calls} kali bulan ini${usage.failed > 0 ? `, ${usage.failed} gagal` : ''}.`
            : 'Belum dipakai bulan ini.'}
        </Txt>
        <Txt variant="small" color={theme.textMuted} style={{ fontSize: 11 }}>
          Foto struk hanya dikirim ke Google saat kamu menekan tombol AI. Tidak ada server perantara.
        </Txt>
      </Card>

      <SectionTitle>Laporan</SectionTitle>
      <Card style={{ gap: space.sm }}>
        <SwitchRow
          label="Wajibkan foto struk"
          hint="Kalau aktif, biaya tanpa foto ditandai sebagai tidak lengkap."
          value={settings.require_photo === '1'}
          onChange={(next) => set('require_photo', next ? '1' : '0')}
        />
        <Divider />
        <SwitchRow
          label="Kunci aplikasi"
          hint="Minta sidik jari atau PIN perangkat saat aplikasi dibuka."
          value={settings.app_lock === '1'}
          onChange={(next) => set('app_lock', next ? '1' : '0')}
        />
      </Card>

      <SectionTitle>Data</SectionTitle>
      <Card style={{ gap: space.sm }}>
        <Pressable
          onPress={() => router.push('/backup')}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.md,
            paddingVertical: space.sm,
            opacity: pressed ? 0.6 : 1,
          })}>
          <Ionicons name="cloud-download-outline" size={20} color={theme.primary} />
          <View style={{ flex: 1 }}>
            <Txt variant="body" style={{ fontWeight: '600' }}>
              Backup & restore
            </Txt>
            <Txt variant="small" color={theme.textMuted}>
              Simpan ZIP ke Drive, pulihkan di HP lain
            </Txt>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
        </Pressable>
        <Divider />
        <View style={{ gap: 4 }}>
          <Txt variant="small" color={theme.textMuted}>
            Backup terakhir
          </Txt>
          <Txt variant="body">
            {settings.last_backup_at
              ? new Date(settings.last_backup_at).toLocaleString('id-ID')
              : 'Belum pernah'}
          </Txt>
        </View>
      </Card>

      <SectionTitle>Tentang</SectionTitle>
      <Card style={{ gap: space.xs }}>
        <Txt variant="body">NotaKu 1.0.0</Txt>
        <Txt variant="small" color={theme.textMuted}>
          Pembaca struk otomatis: {isExpoGo ? 'butuh versi build' : ocrUnavailableMessage()}
        </Txt>
        <Txt variant="small" color={theme.textMuted}>
          Data tersimpan lokal di HP. Tidak ada akun dan tidak ada cloud.
        </Txt>
        <AppButton title="Muat ulang data" variant="ghost" compact onPress={() => reload()} />
      </Card>

      <Modal visible={addCategory} transparent animationType="slide" onRequestClose={() => setAddCategory(false)}>
        <Pressable style={{ flex: 1, backgroundColor: theme.overlay }} onPress={() => setAddCategory(false)} />
        <View
          style={{
            backgroundColor: theme.bg,
            borderTopLeftRadius: radii.xl,
            borderTopRightRadius: radii.xl,
            padding: space.xl,
            paddingBottom: space.xxl,
            gap: space.md,
          }}>
          <Txt variant="title">Kategori baru</Txt>
          <Field label="Nama kategori" value={newCategory} onChangeText={setNewCategory} autoFocus />
          <AppButton title="Tambah" onPress={addCategoryItem} disabled={!newCategory.trim()} />
        </View>
      </Modal>
    </Screen>
  );
}

function SwitchRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 4 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="body" style={{ fontWeight: '600' }}>
          {label}
        </Txt>
        <Txt variant="small" color={theme.textMuted}>
          {hint}
        </Txt>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: theme.primary, false: theme.cardAlt }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}
