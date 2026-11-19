// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'lint.json'],
    rules: {
      // Efek pemuatan data (SQLite) memang menulis state setelah await.
      // Aturan ini menandai pola tersebut sebagai render berantai.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]);
