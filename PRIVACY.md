# Kebijakan Privasi NotaKu

Terakhir diperbarui: 21 November 2026

NotaKu adalah aplikasi pencatat pengeluaran yang berjalan di perangkatmu.

## Data yang disimpan

- Catatan pengeluaran: nama toko, tanggal, item, nominal, kategori, catatan.
- Foto struk yang kamu ambil atau pilih.
- Pengaturan aplikasi: nama, email (opsional), kategori, dompet.

Semua data di atas disimpan **hanya di penyimpanan aplikasi di HP-mu**. Tidak ada akun,
tidak ada server NotaKu, tidak ada sinkronisasi cloud.

## Kamera dan galeri

Kamera dipakai untuk memotret struk. Galeri dipakai kalau kamu memilih foto struk.
Foto tidak dikirim ke mana pun kecuali kamu mengaktifkan fitur Gemini (lihat di bawah).

## Gemini (opsional)

Kalau kamu memasukkan kunci API Gemini milikmu dan memakai pembacaan struk dengan AI:

- Foto struk dan teks hasil OCR dikirim **langsung dari HP ke Google** (`generativelanguage.googleapis.com`).
- NotaKu tidak punya server perantara dan tidak menyimpan salinan foto.
- Pemrosesan di sisi Google tunduk pada ketentuan Google AI Studio / Gemini API.
- Kunci API disimpan di penyimpanan aman perangkat (Android Keystore), tidak pernah ditulis ke
  database, log, atau file ekspor.

Kalau fitur ini tidak dipakai, tidak ada data yang keluar dari perangkat.

## Backup

Kamu bisa membuat file ZIP berisi seluruh data dan foto. File itu kamu simpan sendiri
(misalnya ke Google Drive). NotaKu tidak mengunggahnya. File ZIP tidak diberi kata sandi,
jadi perlakukan sebagai dokumen sensitif.

## Analitik, iklan, pelacakan

Tidak ada. NotaKu tidak memuat SDK analitik, iklan, atau pelacakan.

## Izin yang diminta

- **Kamera**: memotret struk.
- **Biometrik/PIN perangkat** (opsional): membuka kunci aplikasi.

## Anak-anak

Aplikasi tidak ditujukan untuk anak di bawah 13 tahun dan tidak mengumpulkan data pribadi anak.

## Menghapus data

Hapus catatan di dalam aplikasi, atau hapus data aplikasi dari Pengaturan Android.
Menghapus aplikasi menghapus seluruh data, termasuk foto.

## Perubahan

Perubahan kebijakan akan dicantumkan di halaman ini dan di catatan rilis.

## Kontak

Ganti alamat ini dengan email kamu sebelum publikasi: `email@contoh.com`

---

# Privacy Policy (English summary)

NotaKu stores all data locally on your device. There is no account and no NotaKu server.
Photos leave the device only when you enable the optional Gemini feature with your own API key,
in which case the photo is sent directly from your phone to Google. No analytics, ads, or tracking.
Backups are ZIP files you create and store yourself. Contact: `email@contoh.com`
