import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import type { Plugin } from 'esbuild';
import { packPluginFromManifest } from '@kintone/plugin-packer/from-manifest';
import prompts from 'prompts';

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
    fs.writeFileSync(privateKeyPath, privateKey.export({ type: 'pkcs1', format: 'pem' }).toString());
  }
  const privateKey = fs.readFileSync(privateKeyPath, 'utf-8');

  let baseUrl = '';
  let auth = '';

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
          try {
            if (!baseUrl) {
              ({ baseUrl, auth } = await getCredentials());
            }
            const plugin = await getPlugin(id);
            if (plugin) {
              // 更新アップロード
              const fileKey = await uploadFile(zipPath);
              await putPlugin(id, fileKey);
            } else {
              // 新規アップロード
              const fileKey = await uploadFile(zipPath);
              await postPlugin(fileKey);
            }
            console.log(`${pluginZipPath} をアップロードしました!`);
          } catch (err) {
            console.error(err);
          }
        }
      });
    },
  };

  async function getCredentials() {
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

    const auth = Buffer.from(`${username}:${password}`).toString('base64');

    return { baseUrl, auth };
  }

  async function uploadFile(zipPath: string) {
    const formData = new FormData();
    formData.append('file', new Blob([fs.readFileSync(zipPath)]));
    const resp = await fetch(new URL('/k/v1/file.json', baseUrl), {
      method: 'POST',
      headers: { 'X-Cybozu-Authorization': auth },
      body: formData,
    });
    const { fileKey } = await parseResp<{ fileKey: string }>(resp);
    return fileKey;
  }

  async function getPlugin(id: string) {
    const resp = await fetch(new URL(`/k/v1/plugins.json`, baseUrl) + `?ids=${id}`, {
      method: 'GET',
      headers: { 'X-Cybozu-Authorization': auth },
    });
    const { plugins } = await parseResp<RespGetPlugins>(resp);
    return plugins[0];
  }

  async function postPlugin(fileKey: string) {
    const resp = await fetch(new URL('/k/v1/plugin.json', baseUrl), {
      method: 'POST',
      headers: { 'X-Cybozu-Authorization': auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileKey }),
    });
    return await parseResp<RespPostPlugin>(resp);
  }

  async function putPlugin(id: string, fileKey: string) {
    const resp = await fetch(new URL('/k/v1/plugin.json', baseUrl), {
      method: 'PUT',
      headers: { 'X-Cybozu-Authorization': auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, fileKey }),
    });
    return await parseResp<RespPutPlugin>(resp);
  }

  async function parseResp<T = unknown>(resp: Response) {
    if (resp.ok) {
      return (await resp.json()) as T;
    }

    const text = await resp.text();
    try {
      const error = JSON.parse(text);
      throw new Error(error.message);
    } catch {
      throw new Error(`${resp.status} ${resp.statusText}`);
    }
  }
}

type RespGetPlugins = {
  plugins: Array<{ id: string; name: string; isMarketPlugin: boolean; version: string }>;
};

type RespPostPlugin = { id: string; version: string };

type RespPutPlugin = { id: string; version: string };
