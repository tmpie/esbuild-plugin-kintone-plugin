import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import type { Plugin } from 'esbuild';
import { packPluginFromManifest } from '@kintone/plugin-packer/dist/pack-plugin-from-manifest.js';

interface Option {
  manifestJSONPath: string;
  privateKeyPath: string;
  pluginZipPath: string | PluginZipPathFunction;
}

type PluginZipPathFunction = (id: string, manifest: { [key: string]: any }) => string;

export function kintonePlugin(opts?: Partial<Option>): Plugin {
  const manifestJSONPath = opts?.manifestJSONPath ?? './manifest.json';
  const privateKeyPath = opts?.privateKeyPath ?? './private.ppk';
  const pluginZipPath = opts?.pluginZipPath ?? './dist/plugin.zip';

  if (!fs.existsSync(manifestJSONPath)) {
    throw new Error(`manifestJSONPath cannot found: ${manifestJSONPath}`);
  }
  if (!fs.existsSync(privateKeyPath)) {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 1024 });
    fs.writeFileSync(privateKeyPath, privateKey.export({ type: 'pkcs1', format: 'pem' }));
  }
  const privateKey = fs.readFileSync(privateKeyPath, 'utf-8');

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
      });
    },
  };
}
