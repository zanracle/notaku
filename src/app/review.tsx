import Ionicons from '@expo/vector-icons/Ionicons';
import { File } from 'expo-file-system';
import { Image , Alert, Modal, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { askGemini, aiErrorMessage, getApiKey, type AiReceipt } from '@/ai/gemini';
import { ReceiptSheet } from '@/components/receipt-sheet';
import { WalletPicker } from '@/components/wallet-picker';
import {
  createExpense,
  ensureDefaultWallet,
  findDuplicate,
  getExpense,
  listItems,
  listWallets,
  logAiUsage,
  recentWalletId,
  softDeleteExpense,
  updateExpense,
  type DuplicateHit,
  type Expense,
  type ExpenseItem,
  type ItemInput,
  type Wallet,
} from '@/db/queries';
import { isValidISODate, todayISO } from '@/lib/dates';
import { newId } from '@/lib/id';
import { MAX_AMOUNT } from '@/lib/defaults';
import { formatRupiah, isReasonableAmount } from '@/lib/money';
import { ocrUnavailableMessage, recognizeText } from '@/ocr/recognize';
import { parseReceipt, type ParsedReceipt } from '@/ocr/parse';
import { saveReceiptPhoto } from '@/storage/images';
import type { ReceiptData } from '@/receipt/build';
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
  PressableScale,
  Screen,
  ScreenHeader,
  SectionTitle,
  Txt,
} from '@/ui/components';

type DraftItem = { key: string; name: string; qty: number; price: number };

function toDraft(items: { id: string; name: string; qty: number; price: number }[]): DraftItem[] {
  return items.map((item) => ({ key: item.id, name: item.name, qty: item.qty || 1, price: item.price }));
}

export default function ReviewScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ photoUri?: string; expenseId?: string; walletId?: string }>();
  const { settings, categories, set } = useApp();

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [walletId, setWalletId] = useState<string | null>(params.walletId ?? null);
  const [existing, setExisting] = useState<Expense | null>(null);

  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState<number | null>(null);
  const [tax, setTax] = useState<number | null>(null);
  const [category, setCategory] = useState(settings.default_category || 'Lain-lain');
  const [note, setNote] = useState('');
  const [items, setItems] = useState<DraftItem[]>([]);
  const [photoUri, setPhotoUri] = useState<string | null>(params.photoUri ?? null);

  const [confidence, setConfidence] = useState<number | null>(null);
  const [source, setSource] = useState<'manual' | 'ocr' | 'ai'>('manual');
  const [ocrText, setOcrText] = useState<string | null>(null);
  const [aiJson, setAiJson] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [dup, setDup] = useState<DuplicateHit | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{ id: string; walletId: string } | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptItems, setReceiptItems] = useState<ExpenseItem[]>([]);

  const booted = useRef(false);
  const dupAcknowledged = useRef(false);
  const amountTouched = useRef(false);

  const subtotal = items.reduce((sum, item) => sum + (item.price || 0) * (item.qty || 1), 0);
  const hasItems = items.filter((item) => item.name.trim() || item.price > 0).length > 0;

  const applyParsed = (parsed: ParsedReceipt, text: string) => {
    setOcrText(text);
    if (parsed.merchant) setMerchant((prev) => prev || parsed.merchant);
    if (parsed.date) setDate(parsed.date);
    if (parsed.amount) setAmount(parsed.amount);
    if (parsed.tax) setTax(parsed.tax);
    if (parsed.items.length > 0) {
      setItems(toDraft(parsed.items.map((item) => ({ ...item, id: newId('tmp') }))));
      amountTouched.current = false;
    }
    setCategory((prev) => (prev === 'Lain-lain' ? parsed.category : prev));
    setConfidence(parsed.confidence);
    setSource('ocr');
    setNotice(parsed.reasons.length > 0 ? parsed.reasons.join(' Ã‚Â· ') : null);
  };

  const applyAi = (ai: AiReceipt) => {
    if (ai.merchant) setMerchant(ai.merchant);
    setDate(ai.date);
    setAmount(ai.total);
    setTax(ai.tax || null);
    setCategory(ai.category);
    setConfidence(ai.confidence);
    setSource('ai');
    setAiJson(JSON.stringify(ai));
    amountTouched.current = false;
    if (ai.items.length > 0) {
      setItems(ai.items.map((item) => ({ key: newId('tmp'), name: item.name, qty: item.qty || 1, price: item.price })));
    }
    setNotice(`Dibaca Gemini Ã‚Â· keyakinan ${ai.confidence}%`);
  };

  const readWithAi = useCallback(
    async (uri: string, localText: string | null) => {
      setAiBusy(true);
      const model = settings.ai_model || 'gemini-3.5-flash-lite';
      try {
        const { receipt, usage } = await askGemini({ imageUri: uri, ocrText: localText, model, categories });
        await logAiUsage({ model, ok: true, tokensIn: usage.tokensIn, tokensOut: usage.tokensOut });
        applyAi(receipt);
      } catch (error) {
        await logAiUsage({ model, ok: false, error: error instanceof Error ? error.message : String(error) });
        setNotice(aiErrorMessage(error));
      } finally {
        setAiBusy(false);
      }
    },
    [settings.ai_model, categories],
  );

  const readPhoto = useCallback(    async (uri: string) => {
      setReading(true);
      const text = await recognizeText(uri);
      setReading(false);
      if (text) {
        const parsed = parseReceipt(text);
        applyParsed(parsed, text);
      } else {
        setNotice(ocrUnavailableMessage());
      }

      const key = await getApiKey();
      if (!key) return;
      if (settings.ai_auto !== '1') return;

      if (!settings.ai_consent_at) {
        Alert.alert(
          'Baca struk dengan Gemini?',
          'Foto struk dikirim langsung dari HP ke Google memakai kunci API milikmu. Lanjut?',
          [
            { text: 'Nanti', style: 'cancel' },
            {
              text: 'Boleh',
              onPress: async () => {
                await set('ai_consent_at', new Date().toISOString());
                await readWithAi(uri, text);
              },
            },
          ],
        );
        return;
      }
      await readWithAi(uri, text);
    },
    [readWithAi, settings.ai_auto, settings.ai_consent_at, set],
  );

  const retryAi = async () => {
    if (!photoUri) return;
    if (!settings.ai_consent_at) {
      const ok = await new Promise<boolean>((resolve) => {
        Alert.alert(
          'Baca struk dengan Gemini?',
          'Foto struk dikirim langsung dari HP ke Google memakai kunci API milikmu. Lanjut?',
          [
            { text: 'Batal', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Lanjut', onPress: () => resolve(true) },
          ],
          { cancelable: true, onDismiss: () => resolve(false) },
        );
      });
      if (!ok) return;
      await set('ai_consent_at', new Date().toISOString());
    }
    await readWithAi(photoUri, ocrText);
  };

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    (async () => {
      let list = await listWallets();
      if (list.length === 0) {
        const created = await ensureDefaultWallet();
        list = [created];
      }
      setWallets(list);

      if (params.expenseId) {
        const expense = await getExpense(params.expenseId);
        if (expense) {
          setExisting(expense);
          setWalletId(expense.walletId);
          setMerchant(expense.merchant);
          setDate(expense.date);
          setAmount(expense.amount);
          setTax(expense.tax || null);
          setCategory(expense.category);
          setNote(expense.note ?? '');
          setPhotoUri(expense.receiptPath);
          setOcrText(expense.ocrText);
          setAiJson(expense.aiJson);
          setSource(expense.source);
          setConfidence(expense.confidence);
          const savedItems = await listItems(expense.id);
          setItems(toDraft(savedItems));
          setReceiptItems(savedItems);
        }
        return;
      }

      if (!params.walletId) {
        const recent = await recentWalletId();
        setWalletId(recent ?? list[0]?.id ?? null);
      }
      if (params.photoUri) await readPhoto(params.photoUri);
    })().catch((error) => setNotice((error as Error).message));
  }, [params.expenseId, params.photoUri, params.walletId, readPhoto]);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (result.canceled || !result.assets?.[0]) return;
    setPhotoUri(result.assets[0].uri);
    await readPhoto(result.assets[0].uri);
  };

  const updateItem = (key: string, patch: Partial<DraftItem>) => {
    setItems((prev) => {
      const next = prev.map((item) => (item.key === key ? { ...item, ...patch } : item));
      if (!amountTouched.current) {
        const sum = next.reduce((total, item) => total + (item.price || 0) * (item.qty || 1), 0);
        setAmount(sum > 0 ? sum + (tax ?? 0) : null);
      }
      return next;
    });
  };

  const addItem = () => {
    setItems((prev) => [...prev, { key: newId('tmp'), name: '', qty: 1, price: 0 }]);
  };

  const removeItem = (key: string) => {
    setItems((prev) => {
      const next = prev.filter((item) => item.key !== key);
      if (!amountTouched.current) {
        const sum = next.reduce((total, item) => total + (item.price || 0) * (item.qty || 1), 0);
        setAmount(sum > 0 ? sum + (tax ?? 0) : null);
      }
      return next;
    });
  };

  const validate = (): string | null => {
    if (!merchant.trim()) return 'Nama toko wajib diisi.';
    if (!isReasonableAmount(amount)) return `Total harus antara Rp 1 dan ${formatRupiah(MAX_AMOUNT)}.`;
    if (!isValidISODate(date)) return 'Tanggal belum benar.';
    if (!walletId) return 'Pilih dompet dulu.';
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

      const payloadItems: ItemInput[] = items
        .filter((item) => item.name.trim() && item.price > 0)
        .map((item) => ({ name: item.name, qty: item.qty || 1, price: item.price }));

      const payload = {
        walletId: walletId as string,
        merchant: merchant.trim(),
        date,
        amount: amount as number,
        subtotal: hasItems ? subtotal : null,
        tax: tax ?? 0,
        category,
        note: note.trim() || null,
        receiptPath,
        thumbPath,
        receiptHash,
        ocrText,
        aiJson,
        source,
        confidence,
        items: payloadItems,
      };

      if (existing) await updateExpense(id, payload);
      else await createExpense(payload);

      setSaved({ id, walletId: walletId as string });
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
    if (!dupAcknowledged.current) {
      let hash: string | null = null;
      if (photoUri && photoUri !== existing?.receiptPath) {
        try {
          hash = await new File(photoUri).digest('SHA-256');
        } catch {
          hash = null;
        }
      }
      const found = await findDuplicate({ amount: amount as number, date, merchant, hash, excludeId: existing?.id });
      if (found) {
        setDup(found);
        return;
      }
    }
    await persist();
  };

  const remove = () => {
    if (!existing) return;
    Alert.alert('Hapus catatan?', 'Masih bisa dipulihkan dari Sampah.', [
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

  const wallet = wallets.find((item) => item.id === walletId) ?? wallets[0];
  const receiptData: ReceiptData[] | null =
    existing && wallet
      ? [{ wallet, expense: existing, items: receiptItems, settings }]
      : null;

  return (
    <Screen
      edges={['top']}
      footer={
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <AppButton
            title={existing ? 'Simpan perubahan' : 'Simpan struk'}
            icon="checkmark"
            loading={saving}
            onPress={save}
            style={{ flex: 1 }}
          />
          {existing ? (
            <AppButton title="Struk" icon="receipt-outline" variant="secondary" onPress={() => setReceiptOpen(true)} />
          ) : null}
        </View>
      }>
      <ScreenHeader
        title={existing ? 'Ubah struk' : 'Periksa struk'}
        subtitle={aiBusy ? 'Gemini membacaÃ¢â‚¬Â¦' : reading ? 'Membaca strukÃ¢â‚¬Â¦' : 'Semua kolom bisa diedit'}
        onBack={() => router.back()}
      />

      <Card style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
        <PressableScale onPress={pickPhoto} haptic="selection" accessibilityLabel="Ganti foto">
          {photoUri ? (
            <Image
              source={{ uri: photoUri }}
              style={{ width: 82, height: 108, borderRadius: radii.md, backgroundColor: theme.cardAlt }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                width: 82,
                height: 108,
                borderRadius: radii.md,
                backgroundColor: theme.cardAlt,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
              }}>
              <Ionicons name="camera-outline" size={22} color={theme.textMuted} />
              <Txt variant="small" color={theme.textMuted} style={{ fontSize: 10 }}>
                Foto
              </Txt>
            </View>
          )}
        </PressableScale>

        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            <Badge
              label={source === 'ai' ? 'Gemini' : source === 'ocr' ? 'OCR lokal' : 'Manual'}
              tone={source === 'ai' ? 'success' : 'neutral'}
            />
            {confidence != null ? (
              <Badge label={`${confidence}%`} tone={confidence < 60 ? 'warning' : 'success'} />
            ) : null}
          </View>
          <Txt variant="small" color={theme.textMuted} numberOfLines={2}>
            {notice ?? 'Foto struk tetap jadi bukti walau angkanya kamu koreksi.'}
          </Txt>
          {aiBusy ? (
            <Txt variant="small" color={theme.primary} style={{ fontWeight: '600' }}>
              Menyalin item satu per satuÃ¢â‚¬Â¦
            </Txt>
          ) : null}
        </View>
      </Card>

      {photoUri ? (
        <PressableScale
          onPress={retryAi}
          haptic="selection"
          disabled={aiBusy}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            alignSelf: 'flex-start',
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: radii.pill,
            backgroundColor: theme.mint,
          }}>
          <Ionicons name="sparkles" size={14} color={theme.primary} />
          <Txt variant="small" color={theme.primary} style={{ fontWeight: '700' }}>
            {aiBusy ? 'Gemini sedang membaca…' : 'Baca ulang dengan AI'}
          </Txt>
        </PressableScale>
      ) : null}

      <Card style={{ gap: space.lg }}>
        <Field
          label="Nama toko"
          value={merchant}
          onChangeText={setMerchant}
          placeholder="Warung Padang"
        />
        <DateField label="Tanggal" value={date} onChange={setDate} />
      </Card>

      <WalletPicker
        wallets={wallets}
        value={walletId}
        onChange={setWalletId}
        onCreated={(created) => {
          setWallets((prev) => [...prev, created]);
          setWalletId(created.id);
        }}
      />

      <View style={{ gap: space.sm }}>
        <SectionTitle
          right={
            <PressableScale onPress={addItem} haptic="selection">
              <Txt variant="small" color={theme.primary} style={{ fontWeight: '700' }}>
                + Tambah
              </Txt>
            </PressableScale>
          }>
          Item ({items.length})
        </SectionTitle>

        <Card padded={false} style={{ paddingHorizontal: space.md, paddingVertical: space.xs }}>
          {items.length === 0 ? (
            <View style={{ padding: space.lg, alignItems: 'center', gap: 4 }}>
              <Txt variant="small" color={theme.textMuted}>
                Belum ada item. Foto struk atau tambah manual.
              </Txt>
            </View>
          ) : (
            items.map((item, index) => (
              <View key={item.key}>
                {index > 0 ? <View style={{ height: 1, backgroundColor: theme.border }} /> : null}
                <View style={{ paddingVertical: 10, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                    <TextInput
                      value={item.name}
                      onChangeText={(text) => updateItem(item.key, { name: text })}
                      placeholder="Nama item"
                      placeholderTextColor={theme.textMuted}
                      style={{
                        flex: 1,
                        color: theme.text,
                        fontSize: 14,
                        fontWeight: '600',
                        paddingVertical: 4,
                      }}
                    />
                    <PressableScale onPress={() => removeItem(item.key)} accessibilityLabel="Hapus item" haptic="selection">
                      <Ionicons name="close" size={17} color={theme.danger} />
                    </PressableScale>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <PressableScale
                        onPress={() => updateItem(item.key, { qty: Math.max(1, (item.qty || 1) - 1) })}
                        haptic="selection"
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 8,
                          backgroundColor: theme.cardAlt,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                        <Ionicons name="remove" size={13} color={theme.textMuted} />
                      </PressableScale>
                      <Txt variant="small" style={{ minWidth: 18, textAlign: 'center' }}>
                        {item.qty || 1}
                      </Txt>
                      <PressableScale
                        onPress={() => updateItem(item.key, { qty: (item.qty || 1) + 1 })}
                        haptic="selection"
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 8,
                          backgroundColor: theme.cardAlt,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                        <Ionicons name="add" size={13} color={theme.textMuted} />
                      </PressableScale>
                    </View>
                    <View style={{ flex: 1 }} />
                    <View style={{ width: 120 }}>
                      <MoneyInput
                        compact
                        value={item.price || null}
                        onChange={(value) => updateItem(item.key, { price: value ?? 0 })}
                      />
                    </View>
                  </View>
                </View>
              </View>
            ))
          )}
        </Card>

        <PressableScale
          onPress={addItem}
          haptic="selection"
          style={{
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: theme.border,
            borderRadius: radii.lg,
            paddingVertical: space.md,
            alignItems: 'center',
          }}>
          <Txt variant="small" color={theme.primary} style={{ fontWeight: '700' }}>
            + Tambah item
          </Txt>
        </PressableScale>
      </View>

      <Card style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Txt variant="small" color={theme.textMuted}>
            Subtotal item
          </Txt>
          <Txt variant="section">{formatRupiah(subtotal)}</Txt>
        </View>
        <MoneyInput
          label="Pajak (opsional)"
          value={tax}
          onChange={(value) => {
            setTax(value);
            if (!amountTouched.current && subtotal > 0) setAmount(subtotal + (value ?? 0));
          }}
        />
        <MoneyInput
          label="Total dibayar"
          value={amount}
          onChange={(value) => {
            amountTouched.current = true;
            setAmount(value);
          }}
          hint="Otomatis dari item. Ubah kalau ada diskon atau pembulatan."
        />
      </Card>

      <View style={{ gap: space.sm }}>
        <SectionTitle>Kategori</SectionTitle>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {categories.map((item) => (
            <Chip key={item} label={item} selected={category === item} onPress={() => setCategory(item)} />
          ))}
        </View>
      </View>

      <Field label="Catatan (opsional)" value={note} onChangeText={setNote} placeholder="Jamuan klien" multiline />

      {existing ? <AppButton title="Hapus catatan" variant="ghost" icon="trash-outline" onPress={remove} /> : null}

      {receiptData ? (
        <ReceiptSheet
          visible={receiptOpen}
          receipts={receiptData}
          walletName={wallet?.name ?? 'Dompet'}
          onClose={() => setReceiptOpen(false)}
        />
      ) : null}

      <Modal visible={saved !== null} transparent animationType="fade" onRequestClose={() => setSaved(null)}>
        <View style={{ flex: 1, backgroundColor: theme.overlay, alignItems: 'center', justifyContent: 'center', padding: space.xl }}>
          <View style={{ backgroundColor: theme.card, borderRadius: radii.xxl, padding: space.xl, gap: space.md, width: '100%', maxWidth: 380 }}>
            <View style={{ alignItems: 'center', gap: space.sm }}>
              <Ionicons name="checkmark-circle" size={44} color={theme.primary} />
              <Txt variant="title">Tersimpan</Txt>
              <Txt variant="small" color={theme.textMuted} style={{ textAlign: 'center' }}>
                {merchant} Ã‚Â· {formatRupiah(amount ?? 0)}
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
              title="Buka dompet"
              variant="secondary"
              onPress={() => {
                const target = saved;
                setSaved(null);
                if (target) router.replace({ pathname: '/wallet/[id]', params: { id: target.walletId } });
              }}
            />
            <AppButton title="Selesai" variant="ghost" onPress={() => { setSaved(null); router.back(); }} />
          </View>
        </View>
      </Modal>

      <Modal visible={dup !== null} transparent animationType="fade" onRequestClose={() => setDup(null)}>
        <View style={{ flex: 1, backgroundColor: theme.overlay, alignItems: 'center', justifyContent: 'center', padding: space.xl }}>
          <View style={{ backgroundColor: theme.card, borderRadius: radii.xxl, padding: space.xl, gap: space.md, width: '100%', maxWidth: 380 }}>
            <Txt variant="title">Mungkin duplikat</Txt>
            <Txt variant="small" color={theme.textMuted}>
              {dup?.samePhoto ? 'Foto ini pernah dicatat.' : 'Ada catatan dengan nominal dan tanggal mirip.'}
            </Txt>
            {dup ? (
              <Card style={{ backgroundColor: theme.cardAlt, borderColor: theme.cardAlt }}>
                <Txt variant="body" style={{ fontWeight: '600' }}>
                  {dup.expense.merchant}
                </Txt>
                <Txt variant="small" color={theme.textMuted}>
                  {dup.expense.date} Ã‚Â· {formatRupiah(dup.expense.amount)}
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
            <AppButton title="Batal" variant="secondary" onPress={() => setDup(null)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}



