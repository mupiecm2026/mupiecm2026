import { KVNamespace } from "@cloudflare/workers-types";
import { KVStore } from "./kv-store.interface";

export class CloudflareKVStore implements KVStore {
  constructor(private kv: KVNamespace | null) {}

  async get(key: string): Promise<string | null> {
    console.log("🚀 ~ CloudflareKVStore ~ get ~ key:", key)
    if (!this.kv) {
      console.log("⚠️ ~ KV binding not available, returning null");
      return null;
    }
    return this.kv.get(key);
  }

  async put(
    key: string,
    value: string,
    options?: { expirationTtl?: number }
  ): Promise<void> {
    if (!this.kv) {
      console.log("⚠️ ~ KV binding not available, skipping put");
      return;
    }
    await this.kv.put(key, value, options);
  }

  async delete(key: string): Promise<void> {
    if (!this.kv) {
      console.log("⚠️ ~ KV binding not available, skipping delete");
      return;
    }
    await this.kv.delete(key);
  }

  async list(options: { prefix?: string; limit?: number } = { prefix: "", limit: 50 }): Promise<{ keys: Array<{ name: string }> }> {
    if (!this.kv) {
      console.log("⚠️ ~ KV binding not available, skipping list");
      return { keys: [] };
    }
    const result = await this.kv.list({ prefix: options.prefix, limit: options.limit });
    return {
      keys: (result.keys || []).map((item: any) => ({ name: item.name })),
    };
  }
}