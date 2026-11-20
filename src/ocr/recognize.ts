import Constants from 'expo-constants';

/**
 * OCR lokal (ML Kit) untuk pengguna tanpa kunci API.
 * Modul native tidak ada di Expo Go, jadi di-require saat runtime dan
 * semua kegagalan dikembalikan sebagai null (aplikasi tetap jalan).
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
  return 'Struk tidak terbaca otomatis. Isi item secara manual, atau aktifkan Gemini di Pengaturan.';
}
