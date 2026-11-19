export const CATEGORY_HINT = 'Transport, Penginapan, Makan, Parkir, BBM, ATK, Lain-lain';

export const GEMINI_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    merchant: { type: 'string' },
    date: { type: 'string' },
    total: { type: 'number' },
    tax: { type: 'number' },
    category: { type: 'string' },
    confidence: { type: 'number' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          price: { type: 'number' },
        },
        required: ['name', 'price'],
      },
    },
  },
  required: ['merchant', 'date', 'total', 'category'],
};

export function buildReceiptPrompt(ocrText: string, categories: string[], today: string): string {
  const text = ocrText.slice(0, 3500);
  return `Kamu membaca foto struk belanja Indonesia untuk laporan reimburse kantor.

Tugas: keluarkan data dari gambar. Teks hasil OCR perangkat disertakan sebagai pembanding; percayai gambar bila berbeda.

Aturan wajib:
- total = jumlah akhir yang dibayar pembeli, BUKAN subtotal. Kalau ada tunai dan kembalian, total = tunai - kembali.
- Angka dalam integer rupiah tanpa titik, koma, atau simbol.
- date format YYYY-MM-DD. Hari ini ${today}. Kalau tanggal tidak ada di struk, pakai ${today}.
- category pilih tepat satu dari: ${categories.join(', ')}.
- tax hanya isi pajak (PPN/PB1/service) kalau tertulis. Kalau tidak ada, 0.
- merchant = nama toko/restoran, tanpa alamat.
- confidence 0-100, jujur: turunkan kalau gambar buram atau total tidak jelas.
- items hanya item yang benar-benar terbaca, maksimal 12 baris.
- Jangan mengarang. Kalau ragu, pakai nilai yang paling mungkin terlihat.

Teks OCR perangkat:
"""
${text || '(kosong)'}
"""`;
}
