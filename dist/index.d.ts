import type { Plugin } from 'esbuild';
interface Option {
    manifestJSONPath: string;
    privateKeyPath: string;
    pluginZipPath: string | PluginZipPathFunction;
}
type PluginZipPathFunction = (id: string, manifest: {
    [key: string]: any;
}) => string;
export declare function kintonePlugin(opts?: Partial<Option>): Plugin;
export {};
