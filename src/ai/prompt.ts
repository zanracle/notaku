export const GEMINI_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    merchant: { type: 'string' },
    date: { type: 'string' },
    subtotal: { type: 'number' },
    tax: { type: 'number' },
    total: { type: 'number' },
    category: { type: 'string' },
    confidence: { type: 'number' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          qty: { type: 'number' },
          price: { type: 'number' },
        },
        required: ['name', 'price'],
      },
    },
  },
  required: ['merchant', 'date', 'total', 'items'],
};

export function buildReceiptPrompt(ocrText: string, categories: string[], today: string): string {
  const text = ocrText.slice(0, 3500);
  return `Kamu membaca foto struk belanja Indonesia. Tugasmu menyalin isi struk, bukan menebak.

Yang wajib diambil:
1. merchant: nama toko/restoran saja, tanpa alamat dan tanpa nomor telepon.
2. date: tanggal yang TERTERA di struk, format YYYY-MM-DD. Hari ini ${today}. Kalau benar-benar tidak ada, pakai ${today}.
3. items: SETIAP baris barang yang dibeli. name = nama barang apa adanya, qty = jumlah (default 1), price = harga satuan dalam rupiah. Jangan menggabungkan baris, jangan mengarang barang.
4. subtotal: jumlah sebelum pajak/diskon kalau tertulis.
5. tax: PPN/PB1/service kalau tertulis, kalau tidak 0.
6. total: jumlah akhir yang dibayar. Kalau ada TUNAI dan KEMBALI, total = tunai - kembali.
7. category: pilih tepat satu dari ${categories.join(', ')}.
8. confidence: 0-100, turunkan kalau foto buram.

Aturan angka:
- Integer rupiah tanpa titik, koma, atau simbol. "25.000" menjadi 25000.
- Jangan memasukkan baris TOTAL, SUBTOTAL, TUNAI, KEMBALI, PPN, DISKON ke items.
- Jangan mengarang. Kalau ragu, pakai yang paling mungkin terlihat.

Teks OCR perangkat (pembanding, boleh berbeda dari gambar):
"""
${text || '(kosong)'}
"""`;
}
