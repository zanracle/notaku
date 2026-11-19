import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';

import { createTrip, updateTrip, type Trip } from '@/db/queries';
import { addDays, isValidISODate, todayISO } from '@/lib/dates';
import { radii, space, useTheme } from '@/theme';
import {
  AppButton,
  Chip,
  DateField,
  Field,
  SectionTitle,
  Txt,
  uiStyles,
} from '@/ui/components';

export function TripFormSheet({
  visible,
  trip,
  onClose,
  onSaved,
}: {
  visible: boolean;
  trip?: Trip | null;
  onClose: () => void;
  onSaved: (trip: Trip) => void;
}) {
  const theme = useTheme();
  const editing = Boolean(trip);
  const [name, setName] = useState(trip?.name ?? '');
  const [city, setCity] = useState(trip?.city ?? '');
  const [refNo, setRefNo] = useState(trip?.refNo ?? '');
  const [start, setStart] = useState(trip?.startDate ?? todayISO());
  const [end, setEnd] = useState(trip?.endDate ?? addDays(todayISO(), 2));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName('');
    setCity('');
    setRefNo('');
    setStart(todayISO());
    setEnd(addDays(todayISO(), 2));
    setError(null);
  };

  const save = async () => {
    setError(null);
    if (!name.trim()) return setError('Nama dinas wajib diisi.');
    if (!isValidISODate(start)) return setError('Tanggal mulai tidak valid.');
    if (!isValidISODate(end)) return setError('Tanggal selesai tidak valid.');
    if (end < start) return setError('Tanggal selesai tidak boleh sebelum mulai.');
    setSaving(true);
    try {
      let saved: Trip | null = null;
      if (trip) {
        await updateTrip(trip.id, { name, city, refNo, startDate: start, endDate: end });
        saved = { ...trip, name: name.trim(), city: city || null, refNo: refNo || null, startDate: start, endDate: end };
      } else {
        saved = await createTrip({ name, city, refNo, startDate: start, endDate: end });
        reset();
      }
      onSaved(saved);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: theme.overlay }} onPress={onClose} />
      <View
        style={{
          backgroundColor: theme.bg,
          borderTopLeftRadius: radii.xl,
          borderTopRightRadius: radii.xl,
          padding: space.xl,
          paddingBottom: space.xxl,
          gap: space.md,
        }}>
        <View style={uiStyles.headerRow}>
          <Txt variant="title" style={{ flex: 1 }}>
            {editing ? 'Ubah dinas' : 'Dinas baru'}
          </Txt>
          <Pressable onPress={onClose} accessibilityLabel="Tutup" hitSlop={10}>
            <Ionicons name="close" size={22} color={theme.textMuted} />
          </Pressable>
        </View>

        <Field label="Nama dinas" value={name} onChangeText={setName} placeholder="Dinas Jakarta" autoFocus />
        <Field label="Kota (opsional)" value={city} onChangeText={setCity} placeholder="Jakarta" />
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ flex: 1 }}>
            <DateField label="Mulai" value={start} onChange={setStart} />
          </View>
          <View style={{ flex: 1 }}>
            <DateField label="Selesai" value={end} onChange={setEnd} />
          </View>
        </View>
        <Field
          label="No. referensi / SPPD (opsional)"
          value={refNo}
          onChangeText={setRefNo}
          placeholder="SPPD/2026/0142"
        />

        {error ? (
          <Txt variant="small" color={theme.danger}>
            {error}
          </Txt>
        ) : null}

        <AppButton title={editing ? 'Simpan perubahan' : 'Buat dinas'} onPress={save} loading={saving} />
      </View>
    </Modal>
  );
}

export function TripPicker({
  trips,
  value,
  onChange,
  onCreated,
}: {
  trips: Trip[];
  value: string | null;
  onChange: (id: string) => void;
  onCreated: (trip: Trip) => void;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View style={{ gap: space.sm }}>
      <SectionTitle>Dinas</SectionTitle>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        {trips.map((trip) => (
          <Chip
            key={trip.id}
            label={trip.name}
            selected={value === trip.id}
            onPress={() => onChange(trip.id)}
          />
        ))}
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 12,
            minHeight: 36,
            borderRadius: radii.pill,
            borderWidth: 1,
            borderColor: theme.border,
            borderStyle: 'dashed',
          }}>
          <Ionicons name="add" size={15} color={theme.textMuted} />
          <Txt variant="small" color={theme.textMuted} style={{ fontWeight: '600' }}>
            Dinas baru
          </Txt>
        </Pressable>
      </ScrollView>
      <TripFormSheet
        visible={open}
        onClose={() => setOpen(false)}
        onSaved={(trip) => {
          onCreated(trip);
          onChange(trip.id);
        }}
      />
    </View>
  );
}
