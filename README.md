# NotaKu

Aplikasi pencatat pengeluaran dinas untuk reimburse. Foto struk, angkanya otomatis diisi
(atau diketik manual), lalu jadi laporan PDF/JPG siap dikirim ke tim finance.

Dibuat dengan Expo SDK 58 + React Native + TypeScript. Data tersimpan di HP (SQLite),
tanpa akun dan tanpa server. Satu-satunya koneksi keluar adalah Gemini, dan hanya kalau
kamu menekan tombol AI.

## Yang sudah jadi

| Fitur | Status |
| --- | --- |
| Dinas (trip) + total + anggaran | selesai |
| Catat biaya manual, kategori, catatan, metode bayar | selesai |
| Kamera + kompres foto + thumbnail | selesai |
| OCR lokal ML Kit + parser struk Indonesia | selesai (butuh build) |
| Review otomatis: merchant, tanggal, total, pajak, kategori | selesai (butuh build) |
| AI Gemini opsional (BYOK) + pemilihan saat nominal beda | selesai |
| Laporan PDF lengkap (kop, tanda tangan, lampiran struk) | selesai |
| Laporan PDF ringkas, JPG, CSV, print | selesai |
| Backup/restore ZIP + sampah (hapus lembut) | selesai |
| Deteksi duplikat, sapu file yatim, migrasi DB | selesai |
| Kunci aplikasi (biometrik/PIN) | selesai |
| Uji parser 13 fixture + uji uang/tanggal | lulus 19 tes |

## Menjalankan

```bash
npm install
npm start          # Expo Go: semua fitur kecuali OCR kamera
```

OCR kamera **tidak jalan di Expo Go** karena ML Kit adalah modul native. Aplikasi tetap
mendeteksi hal ini dan menampilkan pesan; input manual + foto + laporan tetap normal.

## Membuat APK (OCR aktif)

Sekali saja:

```bash
npm i -g eas-cli
eas login
eas build -p android --profile preview
```

EAS memberi link APK saat selesai. Pasang di HP, buka, lalu:

1. Pengaturan â†’ Identitas pelapor â†’ isi nama, NIP, perusahaan â†’ Simpan.
2. Pengaturan â†’ AI (opsional) â†’ tempel kunci Gemini dari https://aistudio.google.com/apikey â†’ Simpan kunci â†’ Tes kunci.
3. Beranda â†’ Foto Struk.

Kalau tidak punya kunci AI, semua fitur lain tetap jalan. OCR lokal tidak butuh kunci.

## Struktur

```
src/app/            layar (expo-router)
  (tabs)/           Beranda, Biaya, Pengaturan
  capture.tsx       kamera
  review.tsx        form + OCR + AI + simpan
  trip/[id].tsx     detail dinas + export
  backup.tsx        backup, restore, sampah
src/db/             skema, migrasi, query
src/ocr/            ML Kit (lazy) + parser + fixtures
src/ai/             Gemini: prompt, skema, error handling
src/report/         template HTML (PDF/print) + pratinjau native + export
src/storage/        foto, backup ZIP
src/ui/             komponen dasar
```

## Perintah

```bash
npm run check      # typecheck + lint + test
npm test           # hanya unit test parser/uang/tanggal
npm run typecheck
```

## Batasan yang diketahui

- Database **tidak terenkripsi**. Backup ZIP juga tanpa sandi. Simpan di Drive pribadi.
- Gambar JPG dibuat dari pratinjau 1:1 di dalam aplikasi; untuk lebih dari ~25 struk pakai PDF.
- Parser memakai heuristik. Struk pudar bisa salah; semua field bisa diedit dan foto tetap bukti.
- Satu struk = satu catatan (total saja), bukan per item.
- Belum ada cloud sync, approval finance, atau multi-currency.

## Privasi

Foto struk tidak pernah keluar dari HP kecuali kamu menekan "Baca ulang dengan AI".
Saat itu foto dikirim langsung dari HP ke Google Gemini memakai kunci API milikmu.
Kunci disimpan di Android Keystore / iOS Keychain lewat `expo-secure-store`, tidak pernah
ditulis ke database, log, atau laporan.
