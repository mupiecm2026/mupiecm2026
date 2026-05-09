import { createKVStore } from "./kv/kv-store.factory";
import { KVStore } from "./kv/kv-store.interface";
import { logger } from "../utils/logger";


export class GatewayConfigService {
  private kv!: KVStore;

  constructor(private env: any) {
    logger.debug("[GatewayConfigService] Initialized", { env: Object.keys(env) });
  }

  async init() {
    // if (!this.kv) {
      this.kv = await createKVStore(this.env);
    // }
  }

  async getStore() {
    await this.init();

    const raw = await this.kv.get("store");
    if (!raw) return { gateways: {}, psps: {} };

    try {
      const parsed = JSON.parse(raw);
      const store = parsed?.store ?? parsed;

      return {
        gateways: store?.gateways ?? {},
        psps: store?.psps ?? {},
      };
    } catch {
      return { gateways: {}, psps: {} };
    }
  }

  async saveConfig(
    scope: "gateway" | "psp",
    key: string,
    creds: any,
    mode: string,
    active: boolean
  ) {
    await this.init();

    const store = await this.getStore();
    const root = scope === "gateway" ? "gateways" : "psps";

    if (!store[root]) store[root] = {};
    if (!store[root][key]) store[root][key] = { configs: [] };

    const configs = store[root][key].configs;

    const now = new Date().toISOString();

    const newConfig = {
      id: `${key}-${Date.now()}`,
      status: active ? "ativo" : "inativo",
      mode,
      creds,
      createdAt: now,
      updatedAt: now,
    };

    const idx = configs.findIndex((c: any) => c.mode === mode);

    if (idx >= 0) {
      configs[idx] = {
        ...configs[idx],
        ...newConfig,
        id: configs[idx].id,
        createdAt: configs[idx].createdAt,
      };
    } else {
      configs.push(newConfig);
    }

    await this.kv.put("store", JSON.stringify(store));

    return { success: true, store };
  }

  async updateConfigStatus(
    scope: "gateway" | "psp",
    key: string,
    id: string,
    status: string
  ) {
    await this.init();

    const store = await this.getStore();
    const root = scope === "gateway" ? "gateways" : "psps";

    const configs = store?.[root]?.[key]?.configs;
    if (!Array.isArray(configs)) return { success: true, store };

    configs.forEach((c: any) => {
      if (status === "ativo") {
        c.status = c.id === id ? "ativo" : "inativo";
      } else if (c.id === id) {
        c.status = status;
      }

      c.updatedAt = new Date().toISOString();
    });

    await this.kv.put("store", JSON.stringify(store));

    return { success: true, store };
  }

  async deleteConfig(
    scope: "gateway" | "psp",
    key: string,
    id?: string
  ) {
    await this.init();

    const store = await this.getStore();
    const root = scope === "gateway" ? "gateways" : "psps";

    if (!store?.[root]?.[key]) return { success: true, store };

    if (!id) {
      delete store[root][key];
    } else {
      const configs = store[root][key].configs;

      if (Array.isArray(configs)) {
        store[root][key].configs = configs.filter(
          (c: any) => c.id !== id
        );
      }
    }

    await this.kv.put("store", JSON.stringify(store));

    return { success: true, store };
  }

  async getActiveConfig(scope: "gateway" | "psp", key: string) {
    await this.init();

    const store = await this.getStore();
    const root = scope === "gateway" ? "gateways" : "psps";

    const configs = store?.[root]?.[key]?.configs;

    if (!Array.isArray(configs)) return null;

    return configs.find((c: any) => c.status === "ativo") ?? null;
  }
}