import Constants from 'expo-constants';

/**
 * ML Kit adalah modul native. Di Expo Go modul ini tidak ada, jadi:
 * - jangan pernah import statis (bundle tetap jalan, tapi require saat runtime gagal)
 * - semua pemakaian dibungkus try/catch dan mengembalikan null
 * Setelah APK build terpasang, fungsi ini otomatis aktif tanpa perubahan kode.
 */
export const isExpoGo = Constants.executionEnvironment === 'storeClient';

type RecognizeFn = (uri: string) => Promise<{ text?: string }>;

let cached: RecognizeFn | null | undefined;

export function getOcrModule(): RecognizeFn | null {
  if (cached !== undefined) return cached;
  if (isExpoGo) {
    cached = null;
    return cached;
  }
  try {
    // Modul native harus di-require saat runtime, bukan import statis:
    // di Expo Go modulnya tidak ada dan import statis akan mematikan bundle.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const imported = require('@infinitered/react-native-mlkit-text-recognition');
    const candidate = imported?.recognizeText ?? imported?.default?.recognizeText;
    cached = typeof candidate === 'function' ? (candidate as RecognizeFn) : null;
  } catch {
    cached = null;
  }
  return cached;
}

export async function recognizeText(uri: string): Promise<string | null> {
  const recognize = getOcrModule();
  if (!recognize) return null;
  try {
    const result = await recognize(uri);
    const text = result?.text?.trim();
    return text && text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

export function ocrUnavailableMessage(): string {
  if (isExpoGo) {
    return 'Pembacaan struk otomatis butuh aplikasi versi build (bukan Expo Go). Semua fitur lain tetap jalan.';
  }
  return 'Modul pembaca struk tidak tersedia di perangkat ini. Isi nominal secara manual.';
}
