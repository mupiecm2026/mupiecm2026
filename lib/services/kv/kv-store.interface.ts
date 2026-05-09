// lib\services\kv\kv-store.interface.ts
export interface KVStore {
  get(key: string): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number }
  ): Promise<void>;
  delete(key: string): Promise<void>;
  list(options: { prefix?: string; limit?: number }): Promise<{ keys: Array<{ name: string }> }>;
}