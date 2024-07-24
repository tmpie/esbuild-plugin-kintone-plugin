"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.kintonePlugin = kintonePlugin;
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_fs_1 = __importDefault(require("node:fs"));
const pack_plugin_from_manifest_js_1 = require("@kintone/plugin-packer/dist/pack-plugin-from-manifest.js");
function kintonePlugin(opts) {
    const manifestJSONPath = opts?.manifestJSONPath ?? './manifest.json';
    const privateKeyPath = opts?.privateKeyPath ?? './private.ppk';
    const pluginZipPath = opts?.pluginZipPath ?? './dist/plugin.zip';
    if (!node_fs_1.default.existsSync(manifestJSONPath)) {
        throw new Error(`manifestJSONPath cannot found: ${manifestJSONPath}`);
    }
    if (!node_fs_1.default.existsSync(privateKeyPath)) {
        const { privateKey, publicKey } = node_crypto_1.default.generateKeyPairSync('rsa', { modulusLength: 1024 });
        node_fs_1.default.writeFileSync(privateKeyPath, privateKey.export({ type: 'pkcs1', format: 'pem' }));
    }
    const privateKey = node_fs_1.default.readFileSync(privateKeyPath, 'utf-8');
    return {
        name: 'kintonePlugin',
        setup(build) {
            build.onEnd(async (result) => {
                const { id, plugin: buffer } = await (0, pack_plugin_from_manifest_js_1.packPluginFromManifest)(manifestJSONPath, privateKey);
                const zipPath = typeof pluginZipPath === 'function' ? pluginZipPath(id, JSON.parse(node_fs_1.default.readFileSync(manifestJSONPath, 'utf-8'))) : pluginZipPath;
                node_fs_1.default.writeFileSync(zipPath, buffer);
                console.log('----------------------');
                console.log('Success to create a plugin zip!');
                console.log(`Plugin ID: ${id}`);
                console.log(`Path: ${zipPath}`);
                console.log('----------------------');
            });
        },
    };
}
