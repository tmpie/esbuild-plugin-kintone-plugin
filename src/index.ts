import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import type { Plugin } from 'esbuild';
import { packPluginFromManifest } from '@kintone/plugin-packer/dist/pack-plugin-from-manifest.js';
import prompts from 'prompts';

import HttpClient from './http-client';

interface Option {
  manifestJSONPath: string;
  privateKeyPath: string;
  pluginZipPath: string | PluginZipPathFunction;
  autoUpload: boolean;
}

type PluginZipPathFunction = (id: string, manifest: { [key: string]: any }) => string;

export function kintonePlugin(opts?: Partial<Option>): Plugin {
  const manifestJSONPath = opts?.manifestJSONPath ?? './manifest.json';
  const privateKeyPath = opts?.privateKeyPath ?? './private.ppk';
  const pluginZipPath = opts?.pluginZipPath ?? './dist/plugin.zip';
  const autoUpload = opts?.autoUpload ?? false;

  if (!fs.existsSync(manifestJSONPath)) {
    throw new Error(`manifestJSONPath cannot found: ${manifestJSONPath}`);
  }
  if (!fs.existsSync(privateKeyPath)) {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 1024 });
    fs.writeFileSync(privateKeyPath, privateKey.export({ type: 'pkcs1', format: 'pem' }));
  }
  const privateKey = fs.readFileSync(privateKeyPath, 'utf-8');

  let client: HttpClient | null = null;

  return {
    name: 'kintone-plugin',
    setup(build) {
      build.onEnd(async (result) => {
        const { id, plugin: buffer } = await packPluginFromManifest(manifestJSONPath, privateKey);
        const zipPath = typeof pluginZipPath === 'function' ? pluginZipPath(id, JSON.parse(fs.readFileSync(manifestJSONPath, 'utf-8'))) : pluginZipPath;
        const zipDir = path.dirname(zipPath);
        if (!fs.existsSync(zipDir)) {
          fs.mkdirSync(zipDir, { recursive: true });
        }
        fs.writeFileSync(zipPath, buffer);
        console.log('----------------------');
        console.log('Success to create a plugin zip!');
        console.log(`Plugin ID: ${id}`);
        console.log(`Path: ${zipPath}`);
        console.log('----------------------');

        if (autoUpload) {
          if (!client) {
            client = await httpClient();
          }
          const plugins = await client.getPlugins();
          if (plugins.some((plugin) => plugin.id === id)) {
            // 更新アップロード
            const fileKey = await client.uploadFile(zipPath);
            await client.putPlugin(id, fileKey);
          } else {
            // 新規アップロード
            const fileKey = await client.uploadFile(zipPath);
            await client.postPlugin(fileKey);
          }
          console.log(`${pluginZipPath} をアップロードしました!`);
        }
      });
    },
  };
}

async function httpClient() {
  const baseUrl = await prompts({
    type: process.env.KINTONE_BASE_URL ? null : 'text',
    name: 'baseUrl',
    message: 'kintoneのベースURLを入力してください (https://example.cybozu.com):',
    validate: (baseUrl: string) => (baseUrl.match('^https://.+[.]cybozu[.]com/?$') ? true : 'URLの形式が不正です'),
  }).then(({ baseUrl }) => process.env.KINTONE_BASE_URL || baseUrl);

  const username = await prompts({
    type: process.env.KINTONE_USERNAME ? null : 'text',
    name: 'username',
    message: 'ログイン名を入力してください:',
  }).then(({ username }) => process.env.KINTONE_USERNAME || username);

  const password = await prompts({
    type: process.env.KINTONE_PASSWORD ? null : 'password',
    name: 'password',
    message: 'パスワードを入力してください:',
  }).then(({ password }) => process.env.KINTONE_PASSWORD || password);

  return new HttpClient({ baseUrl, username, password });
}
