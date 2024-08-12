const esbuild = require('esbuild');
const { kintonePlugin } = require('esbuild-plugin-kintone-plugin');

(async () => {
  const context = await esbuild.context({
    entryPoints: ['src/__tests__/js/desktop.ts'],
    minify: true,
    outdir: 'src/__tests__/dist',
    plugins: [
      kintonePlugin({
        manifestJSONPath: 'src/__tests__/manifest.json',
        privateKeyPath: 'src/__tests__/private.ppk',
        pluginZipPath: 'src/__tests__/dist/plugin.zip',
        autoUpload: true,
      }),
    ],
  });
  await context.watch();
})();
