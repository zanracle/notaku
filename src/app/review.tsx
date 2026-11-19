import { Ionicons } from '@expo/vector-icons';
import { File } from 'expo-file-system';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Modal, Pressable, View } from 'react-native';

import { askGemini, aiErrorMessage, type AiReceipt } from '@/ai/gemini';
import { TripPicker } from '@/components/trip-picker';
import {
  activeTrip,
  createExpense,
  ensureDefaultTrip,
  findDuplicate,
  getExpense,
  listTrips,
  logAiUsage,
  softDeleteExpense,
  updateExpense,
  type DuplicateHit,
  type Expense,
  type Trip,
} from '@/db/queries';
import { formatDateID, isValidISODate, todayISO } from '@/lib/dates';
import { newId } from '@/lib/id';
import { formatRupiah, isReasonableAmount } from '@/lib/money';
import { MAX_AMOUNT } from '@/lib/defaults';
import { ocrUnavailableMessage, recognizeText } from '@/ocr/recognize';
import { parseReceipt } from '@/ocr/parse';
import { saveReceiptPhoto } from '@/storage/images';
import { useApp } from '@/state/app';
import { radii, space, useTheme } from '@/theme';
import {
  AppButton,
  Badge,
  Card,
  Chip,
  DateField,
  Field,
  MoneyInput,
  Screen,
  ScreenHeader,
  SectionTitle,
  Txt,
} from '@/ui/components';

export default function ReviewScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ photoUri?: string; expenseId?: string; tripId?: string }>();
  const { settings, categories, set } = useApp();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripId, setTripId] = useState<string | null>(params.tripId ?? null);
  const [existing, setExisting] = useState<Expense | null>(null);

  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState<number | null>(null);
  const [tax, setTax] = useState<number | null>(null);
  const [category, setCategory] = useState(settings.default_category || 'Lain-lain');
  const [note, setNote] = useState('');
  const [payment, setPayment] = useState('Tunai');
  const [photoUri, setPhotoUri] = useState<string | null>(params.photoUri ?? null);

  const [confidence, setConfidence] = useState<number | null>(null);
  const [source, setSource] = useState<'manual' | 'ocr' | 'ai'>('manual');
  const [ocrText, setOcrText] = useState<string | null>(null);
  const [aiJson, setAiJson] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [diff, setDiff] = useState<{ ai: AiReceipt; local: number | null } | null>(null);
  const [dup, setDup] = useState<DuplicateHit | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{ id: string; tripId: string } | null>(null);

  const booted = useRef(false);
  const dupAcknowledged = useRef(false);

  const runLocalOcr = useCallback(
    async (uri: string) => {
      setReading(true);
      setAiMessage(null);
      const text = await recognizeText(uri);
      setReading(false);
      if (!text) {
        setNotice(ocrUnavailableMessage());
        return;
      }
      setOcrText(text);
      const parsed = parseReceipt(text);
      if (parsed.merchant) setMerchant((prev) => prev || parsed.merchant);
      if (parsed.date) setDate(parsed.date);
      if (parsed.amount) setAmount(parsed.amount);
      if (parsed.tax) setTax(parsed.tax);
      if (parsed.amount || parsed.merchant) {
        setCategory((prev) => (prev === 'Lain-lain' ? parsed.category : prev));
        setSource('ocr');
        setConfidence(parsed.confidence);
      }
      setNotice(parsed.reasons.length > 0 ? parsed.reasons.join(' · ') : null);
    },
    [],
  );

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    (async () => {
      let allTrips = await listTrips();
      if (allTrips.length === 0) {
        const created = await ensureDefaultTrip();
        allTrips = [created];
      }
      setTrips(allTrips);

      if (params.expenseId) {
        const expense = await getExpense(params.expenseId);
        if (expense) {
          setExisting(expense);
          setTripId(expense.tripId);
          setMerchant(expense.merchant);
          setDate(expense.date);
          setAmount(expense.amount);
          setTax(expense.tax || null);
          setCategory(expense.category);
          setNote(expense.note ?? '');
          setPayment(expense.paymentMethod ?? 'Tunai');
          setPhotoUri(expense.receiptPath);
          setOcrText(expense.ocrText);
          setAiJson(expense.aiJson);
          setSource(expense.source);
          setConfidence(expense.confidence);
        }
        return;
      }

      if (!params.tripId) {
        const current = await activeTrip();
        setTripId(current?.id ?? allTrips[0]?.id ?? null);
      }
      if (params.photoUri) await runLocalOcr(params.photoUri);
    })().catch((error) => {
      setNotice((error as Error).message);
    });
  }, [params.expenseId, params.photoUri, params.tripId, runLocalOcr]);

  const applyAi = (ai: AiReceipt, keepAmount?: boolean) => {
    if (ai.merchant) setMerchant(ai.merchant);
    setDate(ai.date);
    if (!keepAmount) setAmount(ai.total);
    setTax(ai.tax || null);
    setCategory(ai.category);
    setConfidence(ai.confidence);
    setSource('ai');
    setAiJson(JSON.stringify(ai));
    setAiMessage(`Dibaca AI dengan keyakinan ${ai.confidence}%. Periksa lagi nominalnya.`);
  };

  const confirmConsent = () =>
    new Promise<boolean>((resolve) => {
      Alert.alert(
        'Kirim foto ke Google?',
        'Foto struk ini akan dikirim langsung dari HP ke Gemini untuk dibaca. Tidak ada server perantara. Lanjut?',
        [
          { text: 'Batal', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Lanjut', onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      );
    });

  const askAi = async () => {
    if (!photoUri) return;
    setAiMessage(null);

    if (!settings.ai_consent_at) {
      const ok = await confirmConsent();
      if (!ok) return;
      await set('ai_consent_at', new Date().toISOString());
    }

    setAiBusy(true);
    const model = settings.ai_model || 'gemini-3.5-flash-lite';
    try {
      const { receipt, usage } = await askGemini({
        imageUri: photoUri,
        ocrText,
        model,
        categories,
      });
      await logAiUsage({
        model,
        ok: true,
        tokensIn: usage.tokensIn,
        tokensOut: usage.tokensOut,
      });
      if (amount != null && Math.abs(receipt.total - amount) / receipt.total > 0.05) {
        setDiff({ ai: receipt, local: amount });
      } else {
        applyAi(receipt);
      }
    } catch (error) {
      await logAiUsage({
        model,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
      setAiMessage(aiErrorMessage(error));
    } finally {
      setAiBusy(false);
    }
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (result.canceled || !result.assets?.[0]) return;
    setPhotoUri(result.assets[0].uri);
    await runLocalOcr(result.assets[0].uri);
  };

  const validate = (): string | null => {
    if (!merchant.trim()) return 'Nama toko atau keterangan wajib diisi.';
    if (!isReasonableAmount(amount)) return `Nominal harus antara Rp 1 dan ${formatRupiah(MAX_AMOUNT)}.`;
    if (!isValidISODate(date)) return 'Tanggal belum benar. Format YYYY-MM-DD.';
    if (!tripId) return 'Pilih dinas dulu.';
    if (tax != null && tax < 0) return 'Pajak tidak boleh negatif.';
    if (tax != null && amount != null && tax > amount * 0.15) return 'Pajak terlihat terlalu besar. Periksa lagi.';
    return null;
  };

  const persist = async () => {
    setSaving(true);
    try {
      const id = existing?.id ?? newId('exp');
      let receiptPath = existing?.receiptPath ?? null;
      let thumbPath = existing?.thumbPath ?? null;
      let receiptHash = existing?.receiptHash ?? null;

      if (photoUri && photoUri !== existing?.receiptPath) {
        const photo = await saveReceiptPhoto(photoUri, id);
        receiptPath = photo.receiptPath;
        thumbPath = photo.thumbPath;
        receiptHash = photo.hash;
      }

      const payload = {
        tripId: tripId as string,
        merchant: merchant.trim(),
        date,
        amount: amount as number,
        tax: tax ?? 0,
        category,
        note: note.trim() || null,
        paymentMethod: payment.trim() || null,
        receiptPath,
        thumbPath,
        receiptHash,
        ocrText,
        aiJson: aiJson ?? existing?.aiJson ?? null,
        source,
        confidence,
      };

      if (existing) await updateExpense(id, payload);
      else await createExpense(payload);

      setSaved({ id, tripId: tripId as string });
    } catch (error) {
      Alert.alert('Gagal menyimpan', (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    const error = validate();
    if (error) {
      Alert.alert('Belum bisa disimpan', error);
      return;
    }
    if (settings.require_photo === '1' && !photoUri) {
      Alert.alert('Foto struk wajib', 'Pengaturan kamu mewajibkan foto. Lampirkan dulu, atau ubah di Pengaturan.');
      return;
    }

    if (!dupAcknowledged.current) {
      let hash: string | null = null;
      if (photoUri && photoUri !== existing?.receiptPath) {
        try {
          hash = await new File(photoUri).digest('SHA-256');
        } catch {
          hash = null;
        }
      }
      const found = await findDuplicate({
        amount: amount as number,
        date,
        merchant,
        hash,
        excludeId: existing?.id,
      });
      if (found) {
        setDup(found);
        return;
      }
    }
    await persist();
  };

  const remove = () => {
    if (!existing) return;
    Alert.alert('Hapus biaya ini?', 'Masih bisa dipulihkan dari Sampah selama 30 hari.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          await softDeleteExpense(existing.id);
          router.back();
        },
      },
    ]);
  };

  const photo = photoUri;
  const lowConfidence = confidence != null && confidence < 60;

  return (
    <Screen edges={['top']} footer={<AppButton title={existing ? 'Simpan perubahan' : 'Simpan biaya'} icon="checkmark" loading={saving} onPress={save} />}>
      <ScreenHeader
        title={existing ? 'Ubah biaya' : 'Catat biaya'}
        subtitle={reading ? 'Membaca struk…' : existing ? 'Perubahan tersimpan lokal' : 'Periksa sebelum simpan'}
        onBack={() => router.back()}
      />

      {photo ? (
        <View style={{ borderRadius: radii.lg, overflow: 'hidden', backgroundColor: theme.cardAlt }}>
          <Image source={{ uri: photo }} style={{ width: '100%', height: 190 }} contentFit="cover" />
          <View style={{ position: 'absolute', bottom: space.sm, right: space.sm, flexDirection: 'row', gap: space.sm }}>
            <Pressable
              onPress={pickPhoto}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: 'rgba(17,24,39,0.72)',
                paddingHorizontal: 10,
                paddingVertical: 7,
                borderRadius: radii.pill,
              }}>
              <Ionicons name="swap-horizontal" size={14} color="#FFFFFF" />
              <Txt variant="small" color="#FFFFFF">
                Ganti
              </Txt>
            </Pressable>
          </View>
        </View>
      ) : (
        <AppButton title="Lampirkan foto struk" icon="images-outline" variant="secondary" onPress={pickPhoto} />
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.sm }}>
        {source === 'ocr' ? <Badge label="OCR lokal" tone="neutral" /> : null}
        {source === 'ai' ? <Badge label="Dibaca AI" tone="success" /> : null}
        {source === 'manual' ? <Badge label="Manual" tone="neutral" /> : null}
        {confidence != null ? (
          <Badge label={`Keyakinan ${confidence}%`} tone={lowConfidence ? 'warning' : 'success'} />
        ) : null}
        {existing?.status === 'terkirim' ? <Badge label="Sudah terkirim" tone="success" /> : null}
      </View>

      {notice ? (
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Ionicons name="information-circle-outline" size={15} color={theme.warning} style={{ marginTop: 1 }} />
          <Txt variant="small" color={theme.warning} style={{ flex: 1 }}>
            {notice}
          </Txt>
        </View>
      ) : null}

      <TripPicker
        trips={trips}
        value={tripId}
        onChange={setTripId}
        onCreated={(trip) => {
          setTrips((prev) => [trip, ...prev]);
          setTripId(trip.id);
        }}
      />

      <Field
        label="Toko / keterangan"
        value={merchant}
        onChangeText={setMerchant}
        placeholder="Nama restoran, toko, atau keterangan biaya"
      />

      <MoneyInput label="Nominal" value={amount} onChange={setAmount} />

      <DateField label="Tanggal struk" value={date} onChange={setDate} />

      <View style={{ gap: space.sm }}>
        <SectionTitle>Kategori</SectionTitle>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {categories.map((item) => (
            <Chip key={item} label={item} selected={category === item} onPress={() => setCategory(item)} />
          ))}
        </View>
      </View>

      <View style={{ gap: space.sm }}>
        <SectionTitle>Pembayaran</SectionTitle>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {['Tunai', 'Transfer', 'Kartu'].map((item) => (
            <Chip key={item} label={item} selected={payment === item} onPress={() => setPayment(item)} />
          ))}
        </View>
      </View>

      <MoneyInput
        label="Pajak (opsional)"
        value={tax}
        onChange={setTax}
        hint="Isi hanya kalau tertulis di struk. Tidak ditambahkan ke total."
      />

      <Field
        label="Catatan (opsional)"
        value={note}
        onChangeText={setNote}
        placeholder="Misal: jamuan klien PT ABC"
        multiline
      />

      {photo ? (
        <Card style={{ gap: space.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Ionicons name="sparkles-outline" size={18} color={theme.primary} />
            <Txt variant="section" style={{ flex: 1 }}>
              Baca ulang dengan AI
            </Txt>
          </View>
          <Txt variant="small" color={theme.textMuted}>
            Kirim foto ke Gemini kalau hasil baca lokal kurang yakin. Pakai kunci API milikmu sendiri.
          </Txt>
          <AppButton
            title={lowConfidence ? 'Coba baca dengan AI' : 'Baca ulang dengan AI'}
            icon="sparkles"
            variant={lowConfidence ? 'primary' : 'secondary'}
            compact
            loading={aiBusy}
            onPress={askAi}
          />
          {aiMessage ? (
            <Txt variant="small" color={theme.textMuted}>
              {aiMessage}
            </Txt>
          ) : null}
        </Card>
      ) : null}

      {existing ? (
        <AppButton title="Hapus biaya" variant="ghost" icon="trash-outline" onPress={remove} />
      ) : null}

      <Modal visible={saved !== null} transparent animationType="fade" onRequestClose={() => setSaved(null)}>
        <View style={{ flex: 1, backgroundColor: theme.overlay, alignItems: 'center', justifyContent: 'center', padding: space.xl }}>
          <View style={{ backgroundColor: theme.card, borderRadius: radii.xl, padding: space.xl, gap: space.md, width: '100%', maxWidth: 380 }}>
            <View style={{ alignItems: 'center', gap: space.sm }}>
              <Ionicons name="checkmark-circle" size={44} color={theme.success} />
              <Txt variant="title">Tersimpan</Txt>
              <Txt variant="small" color={theme.textMuted} style={{ textAlign: 'center' }}>
                {merchant} · {formatRupiah(amount ?? 0)} · {formatDateID(date)}
              </Txt>
            </View>
            <AppButton
              title="Foto struk berikutnya"
              icon="camera"
              onPress={() => {
                setSaved(null);
                router.replace('/capture');
              }}
            />
            <AppButton
              title="Buka dinas"
              variant="secondary"
              onPress={() => {
                const target = saved;
                setSaved(null);
                if (target) router.replace({ pathname: '/trip/[id]', params: { id: target.tripId } });
              }}
            />
            <AppButton
              title="Selesai"
              variant="ghost"
              onPress={() => {
                setSaved(null);
                router.back();
              }}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={dup !== null} transparent animationType="fade" onRequestClose={() => setDup(null)}>
        <View style={{ flex: 1, backgroundColor: theme.overlay, alignItems: 'center', justifyContent: 'center', padding: space.xl }}>
          <View style={{ backgroundColor: theme.card, borderRadius: radii.xl, padding: space.xl, gap: space.md, width: '100%', maxWidth: 380 }}>
            <Txt variant="title">Mungkin duplikat</Txt>
            <Txt variant="small" color={theme.textMuted}>
              {dup?.samePhoto
                ? 'Foto ini pernah dicatat sebelumnya.'
                : 'Ada biaya dengan nominal dan tanggal yang mirip.'}
            </Txt>
            {dup ? (
              <Card style={{ backgroundColor: theme.cardAlt }}>
                <Txt variant="body" style={{ fontWeight: '600' }}>
                  {dup.expense.merchant}
                </Txt>
                <Txt variant="small" color={theme.textMuted}>
                  {formatDateID(dup.expense.date)} · {formatRupiah(dup.expense.amount)}
                </Txt>
              </Card>
            ) : null}
            <AppButton
              title="Tetap simpan"
              onPress={async () => {
                dupAcknowledged.current = true;
                setDup(null);
                await persist();
              }}
            />
            <AppButton
              title="Batal"
              variant="secondary"
              onPress={() => setDup(null)}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={diff !== null} transparent animationType="fade" onRequestClose={() => setDiff(null)}>
        <View style={{ flex: 1, backgroundColor: theme.overlay, alignItems: 'center', justifyContent: 'center', padding: space.xl }}>
          <View style={{ backgroundColor: theme.card, borderRadius: radii.xl, padding: space.xl, gap: space.md, width: '100%', maxWidth: 380 }}>
            <Txt variant="title">Nominal berbeda</Txt>
            <Txt variant="small" color={theme.textMuted}>
              Hasil AI dan hasil baca lokal tidak sama. Pilih yang menurutmu benar.
            </Txt>
            {diff ? (
              <>
                <Card style={{ backgroundColor: theme.primarySoft }} onPress={() => { applyAi(diff.ai); setDiff(null); }}>
                  <Txt variant="small" color={theme.textMuted}>
                    Hasil AI
                  </Txt>
                  <Txt variant="title">{formatRupiah(diff.ai.total)}</Txt>
                </Card>
                <Card
                  onPress={() => {
                    applyAi(diff.ai, true);
                    setDiff(null);
                  }}>
                  <Txt variant="small" color={theme.textMuted}>
                    Hasil lokal / isianmu
                  </Txt>
                  <Txt variant="title">{formatRupiah(diff.local ?? 0)}</Txt>
                </Card>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
