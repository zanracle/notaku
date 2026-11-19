import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import {
  listExpenses,
  purgeExpense,
  restoreExpense,
  type Expense,
} from '@/db/queries';
import { formatDateID } from '@/lib/dates';
import { formatRupiah } from '@/lib/money';
import { shareFile } from '@/report/export';
import { createBackup, restoreBackup } from '@/storage/backup';
import { deletePhotoFiles } from '@/storage/images';
import { useApp } from '@/state/app';
import { radii, space, useTheme } from '@/theme';
import {
  AppButton,
  Card,
  EmptyState,
  Screen,
  ScreenHeader,
  SectionTitle,
  Txt,
} from '@/ui/components';

export default function BackupScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { settings, set, reload } = useApp();
  const [busy, setBusy] = useState<'backup' | 'restore' | null>(null);
  const [trash, setTrash] = useState<Expense[]>([]);

  const loadTrash = useCallback(async () => {
    setTrash(await listExpenses({ onlyDeleted: true }));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTrash().catch(() => undefined);
    }, [loadTrash]),
  );

  const runBackup = async () => {
    setBusy('backup');
    try {
      const result = await createBackup();
      await set('last_backup_at', new Date().toISOString());
      await shareFile(result.path, 'application/zip', 'Simpan backup ke Drive');
      Alert.alert(
        'Backup dibuat',
        `${result.fileName}\n${result.sizeKb} KB · ${result.photos} foto.\n\nSimpan ke Drive atau kirim ke diri sendiri supaya aman.`,
      );
    } catch (error) {
      Alert.alert('Backup gagal', (error as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const runRestore = async () => {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['application/zip', 'application/octet-stream', '*/*'],
      copyToCacheDirectory: true,
    });
    if (picked.canceled || !picked.assets?.[0]) return;

    Alert.alert(
      'Pulihkan data?',
      'Data dari backup akan ditambahkan. Data yang sudah ada di HP ini tidak ditimpa.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Pulihkan',
          onPress: async () => {
            setBusy('restore');
            try {
              const result = await restoreBackup(picked.assets![0].uri);
              await reload();
              await loadTrash();
              Alert.alert(
                'Restore selesai',
                `${result.tripsAdded} dinas, ${result.expensesAdded} biaya, ${result.photosRestored} foto ditambahkan.` +
                  (result.skipped > 0 ? `\n${result.skipped} baris dilewati karena tidak lengkap.` : ''),
              );
            } catch (error) {
              Alert.alert('Restore gagal', (error as Error).message);
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  };

  const restoreOne = async (expense: Expense) => {
    await restoreExpense(expense.id);
    await loadTrash();
  };

  const purgeOne = (expense: Expense) => {
    Alert.alert('Hapus permanen?', 'Foto dan catatan ini tidak bisa dikembalikan.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          const photo = await purgeExpense(expense.id);
          await deletePhotoFiles([photo, expense.thumbPath]);
          await loadTrash();
        },
      },
    ]);
  };

  return (
    <Screen edges={['top']}>
      <ScreenHeader
        title="Backup & data"
        subtitle="Simpan ke luar HP secara berkala"
        onBack={() => router.back()}
      />

      <Card style={{ gap: space.sm }}>
        <Txt variant="label" color={theme.textMuted}>
          Backup terakhir
        </Txt>
        <Txt variant="section">
          {settings.last_backup_at
            ? new Date(settings.last_backup_at).toLocaleString('id-ID')
            : 'Belum pernah'}
        </Txt>
        <Txt variant="small" color={theme.textMuted}>
          Backup berisi semua catatan, pengaturan, dan foto struk dalam satu file ZIP.
        </Txt>
        <AppButton
          title="Buat backup sekarang"
          icon="cloud-upload-outline"
          loading={busy === 'backup'}
          onPress={runBackup}
        />
      </Card>

      <Card style={{ gap: space.sm }}>
        <Txt variant="section">Pulihkan</Txt>
        <Txt variant="small" color={theme.textMuted}>
          Pilih file ZIP NotaKu dari Drive atau WhatsApp. Hanya data yang belum ada yang ditambahkan.
        </Txt>
        <AppButton
          title="Pilih file backup"
          icon="cloud-download-outline"
          variant="secondary"
          loading={busy === 'restore'}
          onPress={runRestore}
        />
      </Card>

      <Card style={{ gap: space.xs, backgroundColor: theme.warningSoft, borderColor: theme.warningSoft }}>
        <Txt variant="small" color={theme.warning} style={{ fontWeight: '600' }}>
          Backup tidak diberi kata sandi
        </Txt>
        <Txt variant="small" color={theme.warning}>
          Siapa pun yang punya file ZIP-nya bisa membuka foto struk. Simpan di Drive pribadi, jangan
          di grup umum.
        </Txt>
      </Card>

      <SectionTitle>Sampah</SectionTitle>
      <Txt variant="small" color={theme.textMuted}>
        Biaya yang dihapus masih bisa dipulihkan sampai kamu menghapusnya permanen.
      </Txt>

      {trash.length === 0 ? (
        <Card>
          <EmptyState icon="trash-outline" title="Sampah kosong" />
        </Card>
      ) : (
        <Card padded={false} style={{ paddingHorizontal: space.md }}>
          {trash.map((expense, index) => (
            <View key={expense.id}>
              {index > 0 ? <View style={{ height: 1, backgroundColor: theme.border }} /> : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt variant="body" style={{ fontWeight: '600' }} numberOfLines={1}>
                    {expense.merchant}
                  </Txt>
                  <Txt variant="small" color={theme.textMuted}>
                    {formatDateID(expense.date)} · {formatRupiah(expense.amount)}
                  </Txt>
                </View>
                <Pressable
                  onPress={() => restoreOne(expense)}
                  accessibilityLabel="Pulihkan"
                  hitSlop={8}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 7,
                    borderRadius: radii.pill,
                    backgroundColor: theme.successSoft,
                  }}>
                  <Txt variant="small" color={theme.success} style={{ fontWeight: '600' }}>
                    Pulihkan
                  </Txt>
                </Pressable>
                <Pressable
                  onPress={() => purgeOne(expense)}
                  accessibilityLabel="Hapus permanen"
                  hitSlop={8}>
                  <Ionicons name="trash-outline" size={18} color={theme.danger} />
                </Pressable>
              </View>
            </View>
          ))}
        </Card>
      )}

      <AppButton title="Kembali" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
