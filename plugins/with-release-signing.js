const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * Menambahkan signing config "release" yang membaca keystore dari environment
 * variable saat build (GitHub Actions), tanpa menyimpan kunci di repo.
 * Tanpa env var, build tetap memakai debug keystore supaya tidak gagal.
 */
module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let contents = cfg.modResults.contents;
    if (contents.includes('NOTAKU_RELEASE_SIGNING')) {
      cfg.modResults.contents = contents;
      return cfg;
    }

    contents = contents.replace(
      'signingConfigs {',
      `signingConfigs { /* NOTAKU_RELEASE_SIGNING */
        release {
            storeFile file(System.getenv("NOTAKU_KEYSTORE_PATH") ?: "notaku.keystore")
            storePassword System.getenv("NOTAKU_STORE_PASSWORD") ?: ""
            keyAlias System.getenv("NOTAKU_KEY_ALIAS") ?: "notaku"
            keyPassword System.getenv("NOTAKU_KEY_PASSWORD") ?: ""
        }`,
    );

    // Hanya blok release yang diarahkan ke signing config baru.
    contents = contents.replace(
      /(\/\/ Caution! In production, you need to generate your own keystore file\.\r?\n\s*\/\/ see https:\/\/reactnative\.dev\/docs\/signed-apk-android\.\r?\n\s*)signingConfig signingConfigs\.debug/,
      '$1signingConfig signingConfigs.release',
    );

    cfg.modResults.contents = contents;
    return cfg;
  });
};
