# NotaKu

Pencatat pengeluaran dari foto struk. Gratis, tanpa akun, tanpa iklan.

**Unduh:** [Releases](https://github.com/zanracle/notaku/releases/latest) → `NotaKu-<versi>.apk`.
APK ditandatangani dan bisa di-install langsung di Android 64-bit.

Foto struk → OCR di HP membaca nama toko, tanggal, item satu per satu, dan total →
kamu koreksi seperlunya → tersimpan di dompet → cetak sebagai struk kasir atau ekspor CSV.

Data di HP (SQLite), tanpa akun, tanpa cloud. Pembacaan struk memakai OCR di perangkat
(gratis, offline). Gemini hanya dipakai kalau kamu memasukkan kunci API sendiri.

## Fitur

| Fitur | Status |
| --- | --- |
| Dompet (warna, saldo awal, total, progres) | selesai |
| Catat pengeluaran manual | selesai |
| Kamera, kompres foto, thumbnail | selesai |
| OCR di perangkat (gratis, tanpa kunci) | selesai |
| Gemini otomatis sebagai peningkatan (BYOK) | selesai |
| Item per produk: nama, qty, harga, tambah/hapus/edit | selesai |
| Total otomatis dari item + pajak, bisa ditimpa | selesai |
| Cetak struk gaya kasir (PDF / gambar / print) | selesai |
| CSV untuk Excel | selesai |
| Backup/restore ZIP, sampah, hapus lembut | selesai |
| Kategori custom, kunci aplikasi, mode gelap | selesai |
| Laporan: tren 6 bulan, donut kategori, heatmap kalender, top merchant, insight | selesai |
| Anggaran per kategori + progres | selesai |
| Template cepat, autocomplete merchant, ingat kategori | selesai |
| Galeri struk, foto beruntun, kartu ringkasan bagikan | selesai |
| PDF bulanan, filter lanjutan, sembunyikan nominal | selesai |
| Deteksi duplikat, sapu file yatim, migrasi DB | selesai |
| Tes: parser 13 fixture, uang, tanggal, migrasi SQL | 23 tes lulus |

## Menjalankan

```bash
npm install
npm start          # Expo Go: semua jalan kecuali OCR kamera & simpan gambar
```

## Rilis publik

Lihat [RELEASE.md](RELEASE.md). Ringkasnya: push tag `v*` → GitHub Actions membangun APK
bertanda tangan dan menaruhnya di Releases. Gratis untuk repo publik.

## Build APK

```bash
npm i -g eas-cli
eas login
eas build -p android --profile preview
```

Profil `preview` hanya membangun **arm64-v8a** (semua HP Android modern) dengan R8 dan
resource shrinking, supaya ukuran APK turun jauh dibanding build universal.

## Struktur

```
src/app/              layar (expo-router)
  (tabs)/             Beranda, Biaya, Pengaturan
  settings/           profil, AI, dompet, kategori
  review.tsx          editor struk + item + AI
  wallet/[id].tsx     detail dompet + ekspor
src/db/               skema, migrasi, query, tes migrasi
src/ocr/              parser teks struk + fixtures
src/ai/               Gemini: prompt, skema JSON, error
src/receipt/          HTML struk 80mm + PDF/JPG/print/CSV
src/storage/          foto + backup ZIP
src/ui/               komponen dasar
```

## Perintah

```bash
npm run check      # typecheck + lint + test
npm test
npm run typecheck
```

Kalau mengubah dependency, pakai `npx npm@10 install` supaya lockfile cocok dengan npm di
server EAS.

## Batasan

- Database dan backup ZIP tidak dienkripsi. Simpan backup di Drive pribadi.
- Satu struk = satu catatan; item di dalamnya boleh banyak.
- Item dibaca dari teks/gambar, bisa salah pada struk pudar. Semua bisa diedit.
- APK hanya arm64. Perangkat lama 32-bit tidak didukung.
- Belum ada cloud sync atau multi-user.

## Privasi

Foto struk tidak keluar dari HP kecuali fitur Gemini aktif dan kamu sudah menyetujui.
Saat itu foto dikirim langsung ke Google memakai kunci API milikmu. Kunci disimpan di
Android Keystore / iOS Keychain, tidak pernah ditulis ke database, log, atau ekspor.
