# esbuild-plugin-kintone-plugin

Kintoneプラグインを生成するためのesbuildプラグインです。

## インストール

```
npm install -D esbuild-plugin-kintone-plugin
```

## 使い方

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
      autoUpload: false,
    }),
  ],
});
```

## オプション

オプションで、マニフェストファイル、秘密鍵、プラグインの出力先のパスを指定することができます。
それぞれの規定値は以下の通りです。

```
manifestJSONPath: './manifest.json',
privateKeyPath: './private.ppk',
pluginZipPath: './dist/plugin.zip',
```

## 自動アップロード

`autoUpload`オプションに`true`を設定すると、生成したプラグインを自動的にアップロードすることができます。
実行時に、以下のようなプロンプトが表示されるので、kintoneのベースURL、ログイン名、パスワードをそれぞれ入力してください。
なお、プラグインファイルをkintoneにアップロードするには、kintoneのシステム管理者の権限が必要です。

```
? kintoneのベースURLを入力してください (https://example.cybozu.com): ... https://example.cybozu.com
? ログイン名を入力してください: ... Administrator
? パスワードを入力してください: ... ********
```

上記プロンプトへの入力は、以下の環境変数をあらかじめ設定しておくことで省略することができます。

```
KINTONE_BASE_URL ... kintoneのベースURL
KINTONE_USERNAME ... ログイン名
KINTONE_PASSWORD ... パスワード
```
