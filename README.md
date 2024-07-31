# esbuild-plugin-kintone-plugin

A esbuild plugin to create a plugin zip of Kintone.

## Install

```
npm install -D esbuild-plugin-kintone-plugin
```

## Usage

```js
const esbuild = require('esbuild');
const { kintonePlugin } = require('esbuild-plugin-kintone-plugin');

esbuild.build({
  ...
  plugins: [
    kintonePlugin({
      manifestJSONPath: './plugin/manifest.json',
      privateKeyPath: './private.ppk',
      pluginZipPath: './dist/plugin.zip',
    }),
  ],
});
```

## Options

You can customize the paths of manifest.json, privateKey and plugin zip. Those default values are like the following.

```
manifestJSONPath: './manifest.json',
privateKeyPath: './private.ppk',
pluginZipPath: './dist/plugin.zip'
```
