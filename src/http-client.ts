import fs from 'node:fs';
import url from 'node:url';

export default class HttpClient {
  private baseUrl: string;
  private auth: string;

  constructor(params: { baseUrl: string; username: string; password: string }) {
    this.baseUrl = params.baseUrl;
    this.auth = Buffer.from(`${params.username}:${params.password}`).toString('base64');
  }

  async uploadFile(zipPath: string) {
    const formData = new FormData();
    formData.append('file', new Blob([fs.readFileSync(zipPath)]));
    const resp = await fetch(url.resolve(this.baseUrl, '/k/v1/file.json'), {
      method: 'POST',
      headers: { 'X-Cybozu-Authorization': this.auth },
      body: formData,
    });
    const { fileKey } = await this.parseResp<{ fileKey: string }>(resp);
    return fileKey;
  }

  async getPlugins() {
    const result = [];
    for (let offset = 0; ; offset += 100) {
      const resp = await fetch(url.resolve(this.baseUrl, '/k/v1/plugins.json'), {
        method: 'GET',
        headers: { 'X-Cybozu-Authorization': this.auth },
      });
      const { plugins } = await this.parseResp<RespGetPlugins>(resp);
      result.push(...plugins);
      if (plugins.length < 100) {
        return result;
      }
    }
  }

  async postPlugin(fileKey: string) {
    const resp = await fetch(url.resolve(this.baseUrl, '/k/v1/plugin.json'), {
      method: 'POST',
      headers: { 'X-Cybozu-Authorization': this.auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileKey }),
    });
    return await this.parseResp<RespPostPlugin>(resp);
  }

  async putPlugin(id: string, fileKey: string) {
    const resp = await fetch(url.resolve(this.baseUrl, '/k/v1/plugin.json'), {
      method: 'PUT',
      headers: { 'X-Cybozu-Authorization': this.auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, fileKey }),
    });
    return await this.parseResp<RespPutPlugin>(resp);
  }

  private async parseResp<T = unknown>(resp: Response) {
    if (resp.ok) {
      return (await resp.json()) as T;
    }
    const error: any = await resp.json();
    throw new Error(error.message);
  }
}

type RespGetPlugins = {
  plugins: Array<{ id: string; name: string; isMarketPlugin: boolean; version: string }>;
};

type RespPostPlugin = { id: string; version: string };

type RespPutPlugin = { id: string; version: string };
