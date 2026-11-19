/**
 * Fixture teks OCR. Sengaja sintetis, meniru pola struk Indonesia:
 * label di baris sendiri, kolom harga, struk pudar, dan bahasa campur.
 */
export type Fixture = {
  name: string;
  text: string;
  expect: {
    amount?: number | null;
    date?: string | null;
    category?: string;
    minConfidence?: number;
    maxConfidence?: number;
  };
};

export const FIXTURES: Fixture[] = [
  {
    name: 'minimarket label total satu baris',
    text: `TOKO SUMBER REZEKI
JL MERDEKA NO 12
TELP 021-5551234
18/11/2026 19:42
AIR MINERAL 5.000
ROTI 12.500
SABUN 8.900
SUBTOTAL 26.400
PPN 2.640
TOTAL 29.040
TUNAI 50.000
KEMBALI 20.960`,
    expect: { amount: 29040, date: '2026-11-18', category: 'Lain-lain', minConfidence: 80 },
  },
  {
    name: 'total di baris berikutnya',
    text: `WARUNG PADANG SEDERHANA
18-11-26
NASI RENDANG 25.000
NASI AYAM 22.000
JUMLAH BAYAR
47.000
TERIMA KASIH`,
    expect: { amount: 47000, date: '2026-11-18', category: 'Makan', minConfidence: 70 },
  },
  {
    name: 'hanya tunai dan kembali',
    text: `KOPI SENJA
18 Nov 2026
LATTE 28.000
CROISSANT 17.000
TUNAI 50.000
KEMBALI 5.000`,
    expect: { amount: 45000, date: '2026-11-18', category: 'Makan' },
  },
  {
    name: 'tanpa label, ambil angka terbesar di ekor',
    text: `PARKIR CENTRAL
18/11/2026
MOBIL B 1234 XYZ
MASUK 10:15
KELUAR 12:40
BIAYA 5.000
TOTAL 5.000`,
    expect: { amount: 5000, date: '2026-11-18', category: 'Parkir' },
  },
  {
    name: 'struk pudar tanpa total terbaca',
    text: `... ... ...
18/11/2026
... 12.000
... ... ...`,
    expect: { amount: 12000, date: '2026-11-18', maxConfidence: 60 },
  },
  {
    name: 'hotel dengan PPN dan service',
    text: `HOTEL NUSANTARA
JL SUDIRMAN KAV 5
CHECK IN 17/11/2026
KAMAR DELUXE 1 MALAM 650.000
SUBTOTAL 650.000
SERVICE 65.000
PPN 78.650
GRAND TOTAL 793.650`,
    expect: { amount: 793650, date: '2026-11-17', category: 'Penginapan', minConfidence: 80 },
  },
  {
    name: 'SPBU pertalite',
    text: `PERTAMINA 34.567.89
JL RAYA BOGOR
18/11/2026 08:12
PERTALITE 8.50 L
HARGA/L 10.000
TOTAL 85.000
TUNAI 100.000
KEMBALI 15.000`,
    expect: { amount: 85000, date: '2026-11-18', category: 'BBM', minConfidence: 80 },
  },
  {
    name: 'tahun tidak boleh dibaca sebagai nominal',
    text: `APOTEK SEHAT
18/11/2026
PARACETAMOL 2026
TOTAL 15.000`,
    expect: { amount: 15000, date: '2026-11-18' },
  },
  {
    name: 'struk bahasa Inggris',
    text: `CITY TAXI
18/11/2026
FARE 120.000
SERVICE 12.000
TOTAL DUE 132.000
CASH 150.000
CHANGE 18.000`,
    expect: { amount: 132000, date: '2026-11-18', category: 'Transport' },
  },
  {
    name: 'tanggal bergaya 2026-11-18',
    text: `TOKO BUKU CERDAS
2026-11-18
BUKU TULIS 2 PCS 24.000
PULPEN 8.000
TOTAL 32.000`,
    expect: { amount: 32000, date: '2026-11-18', category: 'ATK' },
  },
  {
    name: 'nominal dengan titik ribuan dan ekor koma',
    text: `LAUNDRY KILAT
18/11/2026
CUCI 3 KG 1.350.000
SETRIKA 150.000
TOTAL 1.500.000`,
    expect: { amount: 1500000, date: '2026-11-18' },
  },
  {
    name: 'baris alamat di atas nama toko',
    text: `JL. GAJAH MADA NO 88
TELP 0812 3456 7890
BAKSO PAK KARNO
18/11/2026
BAKSO JUMBO 2 60.000
ES TEH 2 8.000
TOTAL 68.000`,
    expect: { amount: 68000, date: '2026-11-18', category: 'Makan' },
  },
  {
    name: 'total bayar plus tunai dan kembali tidak saling menimpa',
    text: `TOKO MAJU BERSAMA
18/11/2026
BELANJA 44.000
TOTAL BAYAR 47.000
TUNAI 50.000
KEMBALI 3.000`,
    expect: { amount: 47000, date: '2026-11-18', minConfidence: 70 },
  },
];
