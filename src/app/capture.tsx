import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, View } from 'react-native';

import { clearCaptureQueue, enqueueCapture, shiftCapture } from '@/lib/capture-queue';
import { radii, space, useTheme } from '@/theme';
import { AppButton, Screen, ScreenHeader, Txt } from '@/ui/components';

export default function CaptureScreen() {
  const theme = useTheme();
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    clearCaptureQueue();
  }, []);

  const addPhoto = (uri: string) => {
    enqueueCapture(uri);
    setPhotos((prev) => [...prev, uri]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };

  const takePicture = async () => {
    if (!cameraRef.current || busy) return;
    setBusy(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (!photo?.uri) throw new Error('Foto kosong');
      addPhoto(photo.uri);
    } catch {
      Alert.alert('Gagal memotret', 'Coba lagi, atau pilih foto dari galeri.');
    } finally {
      setBusy(false);
    }
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (result.canceled || !result.assets?.[0]) return;
    addPhoto(result.assets[0].uri);
  };

  const finish = () => {
    if (photos.length === 0) {
      router.back();
      return;
    }
    const first = shiftCapture() ?? photos[0];
    router.replace({ pathname: '/review', params: { photoUri: first, bulk: '1' } });
  };

  const close = () => {
    if (photos.length === 0) {
      router.back();
      return;
    }
    Alert.alert('Buang foto?', `${photos.length} foto belum diproses.`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Buang', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  if (!permission) {
    return (
      <Screen edges={['top', 'bottom']}>
        <ScreenHeader title="Kamera" onBack={() => router.back()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen edges={['top', 'bottom']}>
        <ScreenHeader title="Kamera" onBack={() => router.back()} />
        <View style={{ flex: 1, justifyContent: 'center', gap: space.md }}>
          <Ionicons name="camera-outline" size={44} color={theme.textMuted} style={{ alignSelf: 'center' }} />
          <Txt variant="title" style={{ textAlign: 'center' }}>
            Butuh izin kamera
          </Txt>
          <Txt variant="small" color={theme.textMuted} style={{ textAlign: 'center' }}>
            NotaKu memakai kamera hanya untuk memotret struk. Foto tidak dikirim ke mana pun
            kecuali kamu memakai fitur Gemini.
          </Txt>
          <AppButton title="Izinkan kamera" onPress={() => requestPermission()} />
          <AppButton title="Pilih dari galeri" variant="secondary" onPress={pickFromGallery} />
        </View>
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" enableTorch={torch} />

      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: space.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Pressable
            onPress={close}
            accessibilityLabel="Tutup kamera"
            hitSlop={12}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(0,0,0,0.45)',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </Pressable>
          <View style={{ flex: 1 }} />
          {photos.length > 0 ? (
            <Pressable
              onPress={finish}
              accessibilityLabel="Selesai memotret"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: theme.accent,
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: 999,
              }}>
              <Txt variant="small" color={theme.primaryDeep} style={{ fontWeight: '700' }}>
                Selesai ({photos.length})
              </Txt>
              <Ionicons name="arrow-forward" size={15} color={theme.primaryDeep} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => setTorch((value) => !value)}
            accessibilityLabel={torch ? 'Matikan lampu' : 'Nyalakan lampu'}
            hitSlop={12}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: torch ? '#FFFFFF' : 'rgba(0,0,0,0.45)',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Ionicons name={torch ? 'flash' : 'flash-off'} size={20} color={torch ? '#111827' : '#FFFFFF'} />
          </Pressable>
        </View>
      </View>

      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            width: '84%',
            aspectRatio: 0.72,
            borderWidth: 2,
            borderColor: 'rgba(255,255,255,0.75)',
            borderRadius: radii.lg,
          }}
        />
        <Txt variant="small" color="#FFFFFF" style={{ marginTop: 14, opacity: 0.9 }}>
          {photos.length > 0
            ? `${photos.length} struk siap. Lanjut foto berikutnya atau tekan Selesai.`
            : 'Posisikan seluruh struk di dalam bingkai'}
        </Txt>
      </View>

      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingBottom: 34,
          paddingTop: space.lg,
          gap: space.md,
          backgroundColor: 'rgba(0,0,0,0.35)',
        }}>
        {photos.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingHorizontal: space.lg }}>
            {photos.map((uri, index) => (
              <View key={`${uri}-${index}`} style={{ width: 46, height: 60, borderRadius: 8, overflow: 'hidden' }}>
                <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              </View>
            ))}
          </ScrollView>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '70%' }}>
          <Pressable
            onPress={pickFromGallery}
            accessibilityLabel="Pilih dari galeri"
            hitSlop={10}
            style={{
              width: 46,
              height: 46,
              borderRadius: 12,
              backgroundColor: 'rgba(255,255,255,0.18)',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Ionicons name="images-outline" size={22} color="#FFFFFF" />
          </Pressable>

          <Pressable
            onPress={takePicture}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Ambil foto struk"
            style={{
              width: 74,
              height: 74,
              borderRadius: 37,
              borderWidth: 5,
              borderColor: 'rgba(255,255,255,0.7)',
              backgroundColor: busy ? 'rgba(255,255,255,0.4)' : '#FFFFFF',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            {busy ? <ActivityIndicator color="#111827" /> : <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFFFFF' }} />}
          </Pressable>

          <View style={{ width: 46 }} />
        </View>
      </View>
    </View>
  );
}
