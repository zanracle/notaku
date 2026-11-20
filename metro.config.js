const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Mesin CI dan laptop kelas bawah mudah kehabisan RAM saat bundling release.
// Dua worker cukup; waktu bundling naik sedikit, memori turun banyak.
config.maxWorkers = 2;

module.exports = config;
