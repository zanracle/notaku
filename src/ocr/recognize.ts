import Constants from 'expo-constants';

/**
 * Pembacaan struk memakai Gemini (BYOK). Tidak ada OCR lokal di perangkat,
 * supaya ukuran APK tetap kecil dan hasil baca konsisten.
 * Fungsi ini dipertahankan agar layar review tidak perlu tahu detailnya.
 */
export const isExpoGo = Constants.executionEnvironment === 'storeClient';

export async function recognizeText(_uri: string): Promise<string | null> {
  return null;
}

export function ocrUnavailableMessage(): string {
  return 'Pembacaan otomatis memakai Gemini. Isi kunci API di Pengaturan → Gemini, atau isi struk manual.';
}
