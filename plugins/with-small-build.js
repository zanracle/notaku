const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * expo-camera membawa barcode scanner (barhopper) yang tidak dipakai NotaKu.
 * Modul itu declares dependency sebagai compileOnly saat flag mati, tapi dalam
 * praktik AAR-nya masih ikut terpaket. Exclude hanya dari runtime classpath
 * supaya kompilasi expo-camera tetap jalan.
 */
module.exports = function withSmallBuild(config) {
  return withAppBuildGradle(config, (cfg) => {
    let contents = cfg.modResults.contents;
    if (!contents.includes('NOTAKU_SMALL_BUILD')) {
      contents += `

// NOTAKU_SMALL_BUILD: barcode scanner tidak dipakai, keluarkan dari APK.
configurations.configureEach {
    if (name.toLowerCase().contains("runtimeclasspath")) {
        exclude group: "com.google.mlkit", module: "barcode-scanning"
        exclude group: "com.google.android.gms", module: "play-services-code-scanner"
        exclude group: "androidx.camera", module: "camera-mlkit-vision"
    }
}
`;
    }
    cfg.modResults.contents = contents;
    return cfg;
  });
};
