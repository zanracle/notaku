# NotaKu

Pencatat pengeluaran dari foto struk. Untuk reimburse kantor maupun catatan pribadi.

Foto struk → Gemini membaca nama toko, tanggal, item satu per satu, dan total →
kamu koreksi seperlunya → tersimpan di dompet → cetak sebagai struk kasir atau ekspor CSV.

Data di HP (SQLite), tanpa akun, tanpa cloud. Koneksi keluar hanya ke Gemini saat kamu
memakai fitur AI, dan hanya setelah kamu menyetujui sekali.

## Fitur

| Fitur | Status |
| --- | --- |
| Dompet (warna, saldo awal, total, progres) | selesai |
| Catat pengeluaran manual | selesai |
| Kamera, kompres foto, thumbnail | selesai |
| Gemini otomatis saat kunci API terisi | selesai |
| Item per produk: nama, qty, harga, tambah/hapus/edit | selesai |
| Total otomatis dari item + pajak, bisa ditimpa | selesai |
| Cetak struk gaya kasir (PDF / gambar / print) | selesai |
| CSV untuk Excel | selesai |
| Backup/restore ZIP, sampah, hapus lembut | selesai |
| Kategori custom, kunci aplikasi, mode gelap | selesai |
| Deteksi duplikat, sapu file yatim, migrasi DB | selesai |
| Tes: parser 13 fixture, uang, tanggal, migrasi SQL | 23 tes lulus |

## Menjalankan

```bash
npm install
npm start          # Expo Go: semua jalan kecuali simpan gambar
```

Tanpa kunci Gemini, foto tetap tersimpan sebagai bukti tetapi item dan nominal diisi manual.

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
