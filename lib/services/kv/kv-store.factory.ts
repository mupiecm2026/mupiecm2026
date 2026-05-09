import { KVStore } from "./kv-store.interface";
import { CloudflareKVStore } from "./kv-store.cf";
import { LocalKVStore } from "./kv-store.local";

export async function createKVStore(env: any): Promise<KVStore> {
  const hasKVBinding =
    env &&
    typeof env.PROD_KV_STORAGE !== "undefined" &&
    env.PROD_KV_STORAGE !== null;

  const appEnv = env?.APP_ENV;

  const isCloudflareRuntime =
    typeof (globalThis as any).__ENV__ !== "undefined";

  const isProduction =
    appEnv === "production" || isCloudflareRuntime;

  console.log("🔍 [KV INIT]", {
    hasEnv: !!env,
    hasKVBinding,
    appEnv,
    isCloudflareRuntime,
    isProduction,
  });

  /**
   * REGRA FINAL (determinística):
   *
   * 1. Se KV binding existe → usa KV (sempre)
   * 2. Se está em Cloudflare runtime → usa KV (mesmo sem binding explícito)
   * 3. Caso contrário → LocalKV
   */

  if (hasKVBinding) {
    console.log("✅ Using CloudflareKVStore (binding detected)");
    return new CloudflareKVStore(env.PROD_KV_STORAGE);
  }

  if (isCloudflareRuntime) {
    console.log("⚠️ Cloudflare runtime sem binding explícito → tentando KV");
    return new CloudflareKVStore(null);
  }

  console.log("⚠️ Using LocalKVStore (development fallback)");
  return new LocalKVStore();
}