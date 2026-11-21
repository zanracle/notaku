# Rencana & Status — NotaKu

Dokumen kerja. README untuk cara pakai.

## Riwayat versi

### v1.0 (2026-11-19) — dasar
Expo SDK 58, SQLite lokal, OCR ML Kit, Gemini BYOK, laporan PDF formal, backup ZIP.
APK universal 167 MB.

### v1.1 (2026-11-20) — arah baru
User meminta: UI lebih hidup, Gemini otomatis, item per produk, cetak gaya struk,
dinas diganti dompet, ikon sendiri, dan APK di bawah 50 MB.

Yang berubah:

- **Dompet** menggantikan dinas. Migrasi v2: tabel `wallets`, `expenses.wallet_id`,
  pembangunan ulang tabel `expenses` agar `trip_id` hilang. Diuji dengan `node:sqlite`
  lewat `src/db/schema.test.mjs` (3 kasus, termasuk FK).
- **Item per produk** di tabel `expense_items` (nama, qty, harga, urutan). Parser lokal
  dan prompt Gemini sama-sama mengisi item. Editor bisa tambah/hapus/ubah; total otomatis.
- **Gemini otomatis** kalau kunci ada dan `ai_auto=1`. OCR lokal jalan lebih dulu sebagai
  jaring pengaman. Persetujuan sekali saat pertama memakai.
- **Cetak struk kasir**: HTML 80mm monospace, satu struk per halaman; pratinjau native
  1:1 untuk ekspor JPG. Laporan formal lama dihapus.
- **UI baru**: palet krem–hijau tua–amber, kartu radius 24, tab bar kustom, animasi tekan,
  haptik, grafik 7 hari, pengaturan dipecah jadi sub-halaman.
- **Ikon** dibuat di FigCraft dan diekspor 1024 px (bukan hasil model gambar yang gagal).
- **Ukuran**: buang 5 dependensi tak terpakai (`@expo/ui`, `expo-device`,
  `expo-glass-effect`, `expo-symbols`, `expo-web-browser`), R8 + resource shrinking,
  build arm64-only lewat `gradleCommand`.

## Verifikasi

- `tsc --noEmit`, `eslint`, `expo-doctor` (20/20) bersih
- `vitest`: 23 tes (13 fixture struk + item, uang, tanggal, 3 tes migrasi SQL)
- `expo export -p android` sukses

## Catatan desain

Empat layar dirancang di FigCraft lebih dulu (Beranda, Dompet, Periksa struk, Pengaturan),
lalu diimplementasikan. Palet dan radius mengikuti file desain itu.

## Saat kembali — uji cepat

1. Pasang APK baru.
2. Pengaturan → Gemini → tempel kunci → Tes kunci.
3. Foto satu struk berisi beberapa barang → cek item muncul satu per satu.
4. Hapus satu item → total ikut turun (kalau belum menyentuh kolom total).
5. Simpan → buka dompet → Ekspor → cetak struk → cek bentuknya seperti struk kasir.
6. Backup → simpan ZIP.

## Risiko

- R8 bisa memangkas kelas ML Kit. Kalau OCR mati setelah build baru, matikan
  `enableProguardInReleaseBuilds` lalu build ulang.
- Migrasi menghapus tabel `expenses` lama. Sudah diuji, tapi tetap: minta user membuat
  backup sebelum update kalau ada data penting.
- Build hanya arm64.

## Catatan v1.1 (ukuran)

- Target < 50 MB. APK arm64 + R8 + shrink resources.
- Ukuran turun dari 167 MB (universal, v1.0) -> 51,8 MB -> target ~41 MB setelah ML Kit lokal dilepas.
- Barcode scanner expo-camera dimatikan lewat arcodeScannerEnabled: false.
- OCR lokal dihapus; pembacaan struk memakai Gemini. Tanpa kunci, isi manual.

## v1.2 (2026-11-21)

- Tab Laporan: tren 6 bulan, donut kategori, heatmap kalender, top merchant, insight, proyeksi, drill-down ke daftar terfilter.
- Anggaran per kategori (tabel budgets) + progres di Beranda dan Laporan.
- Template cepat (tabel templates) muncul di Beranda, sekali tap tersimpan.
- Autocomplete merchant + ingat kategori dari riwayat.
- Filter lanjutan: rentang tanggal, nominal min/max, dompet, kategori.
- Sembunyikan nominal (masker UI; ekspor tetap angka asli).
- Mode foto beruntun dengan antrean, galeri struk, kartu ringkasan bagikan, PDF bulanan.
- Onboarding 3 layar + data contoh.
- 8 ilustrasi kategori doodle duotone; kategori custom bisa pilih ikon dan warna.
- Migrasi v3: budgets, templates. Tes migrasi ditambah.

Build v1.2.0 lewat GitHub Actions, arm64, R8, di bawah 50 MB.
