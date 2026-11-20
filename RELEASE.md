# Rilis lewat GitHub (gratis)

Build APK berjalan di **GitHub Actions**. Untuk repo publik, menit build tidak dihitung.
APK muncul otomatis di halaman Releases setiap kali kamu push tag `v*`.

## Sekali saja

### 1. Buat repo

```powershell
cd "C:\Users\farre\OneDrive\Dokumen\Default Project\notaku"
winget install --id GitHub.cli -e
gh auth login
gh repo create notaku --public --source=. --push
```

Kalau tidak mau pakai `gh`: buat repo kosong di github.com, lalu

```powershell
git remote add origin https://github.com/USERNAME/notaku.git
git push -u origin master
```

### 2. Simpan keystore ke Secrets

Keystore ada di `credentials/notaku-release.keystore` (jangan pernah di-commit).
Isi password ada di `credentials/credentials.txt`. **Backup keduanya** — tanpa file ini
kamu tidak bisa merilis update yang bisa menimpa versi lama.

```powershell
$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes("credentials/notaku-release.keystore"))
gh secret set KEYSTORE_BASE64 --body $b64
gh secret set KEYSTORE_PASSWORD --body "PASSWORD_DARI_credentials.txt"
gh secret set KEY_ALIAS --body "notaku"
gh secret set KEY_PASSWORD --body "PASSWORD_DARI_credentials.txt"
```

Lewat web: Settings → Secrets and variables → Actions → New repository secret, isi empat nama di atas.

### 3. Aktifkan Actions

Tab **Actions** → izinkan workflow berjalan.

## Setiap rilis

1. Naikkan versi di `app.json` (`expo.version`, misal `1.1.1`) dan `package.json`.
2. Commit.
3. Push tag:

```powershell
git tag v1.1.1
git push origin master --tags
```

4. Tunggu ±10 menit. APK otomatis muncul di:
   `https://github.com/USERNAME/notaku/releases/latest`

Itu link yang kamu bagikan ke pengguna. Permanen dan gratis.

## Tanpa tag (tes build)

Actions → Android APK → Run workflow. APK tersimpan sebagai artifact (butuh login GitHub
untuk mengunduh). Untuk publik, selalu pakai tag.

## Kalau build gagal

- `npm ci` gagal → lockfile tidak cocok. Jalankan `npx npm@10 install` lalu commit lockfile.
- Gagal di `prebuild` → cek `app.json` valid: `npx expo config --type public`.
- Gagal signing → secret belum lengkap atau base64 terpotong.
- APK tidak bisa menimpa versi lama → keystore berbeda. Selalu pakai keystore yang sama.

## Ukuran

Build CI memakai `-PreactNativeArchitectures=arm64-v8a`, jadi APK hanya untuk HP 64-bit
(hampir semua HP Android sejak 2016). Kalau butuh 32-bit juga, hapus flag itu — ukuran naik
sekitar 30 MB.
