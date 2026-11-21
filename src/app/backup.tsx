import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, View } from 'react-native';

import { listExpenses, purgeExpense, restoreExpense, type Expense } from '@/db/queries';
import { formatDateID } from '@/lib/dates';
import { formatRupiah } from '@/lib/money';
import { shareFile } from '@/receipt/export';
import { createBackup, restoreBackup } from '@/storage/backup';
import { deletePhotoFiles } from '@/storage/images';
import { useApp } from '@/state/app';
import { radii, space, useTheme } from '@/theme';
import {
  AppButton,
  Card,
  EmptyState,
  PressableScale,
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
        `${result.fileName}\n${result.sizeKb} KB · ${result.photos} foto.\n\nSimpan ke Drive atau kirim ke diri sendiri.`,
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

    Alert.alert('Pulihkan data?', 'Data dari backup ditambahkan. Data yang sudah ada tidak ditimpa.', [
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
              `${result.walletsAdded} dompet, ${result.expensesAdded} catatan, ${result.photosRestored} foto ditambahkan.` +
                (result.skipped > 0 ? `\n${result.skipped} baris dilewati.` : ''),
            );
          } catch (error) {
            Alert.alert('Restore gagal', (error as Error).message);
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  };

  const purgeOne = (expense: Expense) => {
    Alert.alert('Hapus permanen?', 'Foto dan catatan ini tidak bisa dikembalikan.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          const paths = await purgeExpense(expense.id);
          await deletePhotoFiles(paths);
          await loadTrash();
        },
      },
    ]);
  };

  return (
    <Screen edges={['top']}>
      <ScreenHeader title="Backup & data" subtitle="Simpan ke luar HP" onBack={() => router.back()} />

      <Card style={{ gap: space.sm }}>
        <Txt variant="label" color={theme.textMuted}>
          Backup terakhir
        </Txt>
        <Txt variant="title" style={{ fontSize: 19 }}>
          {settings.last_backup_at ? new Date(settings.last_backup_at).toLocaleString('id-ID') : 'Belum pernah'}
        </Txt>
        <Txt variant="small" color={theme.textMuted}>
          Satu file ZIP berisi semua catatan, item, pengaturan, dan foto struk.
        </Txt>
        <AppButton
          title="Buat backup"
          icon="cloud-upload-outline"
          loading={busy === 'backup'}
          onPress={runBackup}
          style={{ marginTop: space.sm }}
        />
      </Card>

      <Card style={{ gap: space.sm }}>
        <Txt variant="section">Pulihkan</Txt>
        <Txt variant="small" color={theme.textMuted}>
          Pilih file ZIP NotaKu. Hanya data yang belum ada yang ditambahkan.
        </Txt>
        <AppButton
          title="Pilih file backup"
          icon="cloud-download-outline"
          variant="secondary"
          loading={busy === 'restore'}
          onPress={runRestore}
        />
      </Card>

      <View
        style={{
          flexDirection: 'row',
          gap: space.sm,
          backgroundColor: theme.accentSoft,
          borderRadius: radii.lg,
          padding: space.md,
        }}>
        <Ionicons name="warning-outline" size={18} color={theme.warning} style={{ marginTop: 1 }} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="small" color={theme.warning} style={{ fontWeight: '700' }}>
            Backup tanpa kata sandi
          </Txt>
          <Txt variant="small" color={theme.warning}>
            Siapa pun yang punya file ZIP bisa membuka foto struk. Simpan di Drive pribadi.
          </Txt>
        </View>
      </View>

      <SectionTitle>Sampah</SectionTitle>
      {trash.length === 0 ? (
        <Card>
          <EmptyState icon="trash-outline" title="Sampah kosong" body="Catatan yang dihapus muncul di sini." />
        </Card>
      ) : (
        <Card padded={false} style={{ paddingHorizontal: space.lg }}>
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
                <PressableScale
                  onPress={async () => {
                    await restoreExpense(expense.id);
                    await loadTrash();
                  }}
                  haptic="selection"
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 7,
                    borderRadius: radii.pill,
                    backgroundColor: theme.mint,
                  }}>
                  <Txt variant="small" color={theme.primary} style={{ fontWeight: '700' }}>
                    Pulihkan
                  </Txt>
                </PressableScale>
                <PressableScale onPress={() => purgeOne(expense)} accessibilityLabel="Hapus permanen" haptic="selection">
                  <Ionicons name="trash-outline" size={18} color={theme.danger} />
                </PressableScale>
              </View>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}

