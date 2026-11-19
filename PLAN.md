# Rencana & Status â€” NotaKu

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
- [x] **M5a** build APK cloud berhasil (ML Kit ikut terkompilasi)
- [ ] **M5b** uji di HP + kirim satu dinas nyata

APK: https://expo.dev/artifacts/eas/qonYdfiNPGk1eftrN9judjZTFoSCi20opReWossxJP4.apk
Build: https://expo.dev/accounts/zanracle/projects/notaku/builds/dae2f822-3442-4d19-80ad-06a7f61b4bff
Dibuat: 2026-11-19 17:56 UTC, 167 MB (universal APK, semua ABI).

Definisi selesai M3 yang belum bisa saya buktikan tanpa HP: akurasi total pada 10 struk
fisik â‰¥ 7/10 tanpa koreksi. Fixture sintetis lulus 13/13.

## Verifikasi yang sudah dijalankan

- `tsc --noEmit` bersih
- `eslint .` bersih
- `vitest` 19 tes lulus (13 fixture struk + uang + tanggal)
- `expo export -p android` sukses (bundle 3.8 MB, semua modul resolve)
- `npx expo-doctor` 20/20 checks lulus
- commit awal git `ff1d45a`

Belum dijalankan (butuh perangkat/rekayasa): kamera, ML Kit, PDF nyata, share sheet,
print, biometrik, backup ke Drive, restore di HP lain.

## Saat kembali â€” checklist 15 menit

1. `cd notaku`
2. `npm run check`
3. `npm i -g eas-cli && eas login`
4. `eas build -p android --profile preview` (APK, Â±10 menit)
5. Pasang APK di HP
6. Pengaturan â†’ isi identitas, logo, kategori
7. Pengaturan â†’ AI â†’ tempel kunci Gemini â†’ Tes kunci
8. Foto 10 struk berturut-turut, koreksi bila perlu
9. Buka dinas â†’ Export PDF lengkap â†’ cek gambar struk
10. Kirim ke finance, lalu "Tandai terkirim"
11. Backup â†’ simpan ZIP ke Drive
12. Tutup aplikasi, buka lagi, pastikan data masih ada

## Kalau ada bug

- OCR kosong padahal build: cek `eas build` memakai profil `preview`, bukan Expo Go.
- AI 403: kunci salah atau Gemini API belum aktif di project Google.
- PDF tanpa gambar: cek `receipt_path` ada, lalu jalankan restore/backup untuk melihat file.
- Laporan JPG gagal: turunkan jumlah struk atau pakai PDF.

## Yang sengaja tidak dibuat

Cloud sync, login, portal approval, grafik, integrasi accounting, multi-currency,
split per item, i18n, auto-update APK, enkripsi database.


## Risiko build yang belum bisa dibuktikan

ML Kit dibangun sebagai Expo module (`@infinitered/react-native-mlkit-text-recognition`), jadi peluang build sukses tinggi, tapi belum pernah dikompilasi di perangkat nyata. Kalau EAS build gagal di bagian ini, aplikasi tetap berguna tanpa OCR: hapus dependensi ML Kit, dan semua alur manual + foto + laporan tetap jalan. Jangan hapus sebelum mencoba build sekali.


