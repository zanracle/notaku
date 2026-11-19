# Rencana & Status — NotaKu

Dokumen kerja. Diperbarui saat implementasi. README untuk cara pakai.

## Keputusan terkunci

| Item | Nilai |
| --- | --- |
| Stack | Expo SDK 58, React Native, TypeScript, expo-router |
| Nama / paket | NotaKu / `com.notaku.app` |
| Penyimpanan | SQLite lokal + file di `documentDirectory` |
| Uang | integer rupiah, maksimal Rp 50.000.000 per catatan |
| OCR | `@infinitered/react-native-mlkit-text-recognition`, lazy require, guard Expo Go |
| AI | Gemini, BYOK, model `gemini-3.5-flash-lite` (bisa diganti) |
| Ambang AI | confidence < 60, atau selisih total > 5% |
| Backup | ZIP tanpa sandi, pengingat 7 hari |
| Laporan | PDF lengkap, PDF ringkas, JPG, CSV, print |

## Milestone

- [x] **M0** scaffold, tema, navigasi, SQLite + migrasi v1
- [x] **M1** dinas, biaya manual, total, cari/filter, hapus lembut
- [x] **M2** kamera, kompres, thumbnail, lampiran galeri
- [x] **M2b** backup/restore ZIP, deteksi duplikat, sapu file yatim
- [x] **M3** ML Kit + parser + confidence + review (kode)
- [x] **M3b** Gemini BYOK, tes kunci, pemilihan angka, `ai_usage`
- [x] **M4** PDF/JPG/CSV/print, status terkirim
- [ ] **M5** build APK + uji di HP + kirim satu dinas nyata

Definisi selesai M3 yang belum bisa saya buktikan tanpa HP: akurasi total pada 10 struk
fisik ≥ 7/10 tanpa koreksi. Fixture sintetis lulus 13/13.

## Verifikasi yang sudah dijalankan

- `tsc --noEmit` bersih
- `eslint .` bersih
- `vitest` 19 tes lulus (13 fixture struk + uang + tanggal)
- `expo export -p android` sukses (bundle 3.8 MB, semua modul resolve)

Belum dijalankan (butuh perangkat/rekayasa): kamera, ML Kit, PDF nyata, share sheet,
print, biometrik, backup ke Drive, restore di HP lain.

## Saat kembali — checklist 15 menit

1. `cd notaku`
2. `npm run check`
3. `npm i -g eas-cli && eas login`
4. `eas build -p android --profile preview` (APK, ±10 menit)
5. Pasang APK di HP
6. Pengaturan → isi identitas, logo, kategori
7. Pengaturan → AI → tempel kunci Gemini → Tes kunci
8. Foto 10 struk berturut-turut, koreksi bila perlu
9. Buka dinas → Export PDF lengkap → cek gambar struk
10. Kirim ke finance, lalu "Tandai terkirim"
11. Backup → simpan ZIP ke Drive
12. Tutup aplikasi, buka lagi, pastikan data masih ada

## Kalau ada bug

- OCR kosong padahal build: cek `eas build` memakai profil `preview`, bukan Expo Go.
- AI 403: kunci salah atau Gemini API belum aktif di project Google.
- PDF tanpa gambar: cek `receipt_path` ada, lalu jalankan restore/backup untuk melihat file.
- Laporan JPG gagal: turunkan jumlah struk atau pakai PDF.

## Yang sengaja tidak dibuat

Cloud sync, login, portal approval, grafik, integrasi accounting, multi-currency,
split per item, i18n, auto-update APK, enkripsi database.
