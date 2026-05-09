import { createKVStore } from "./kv/kv-store.factory";
import { KVStore } from "./kv/kv-store.interface";
import { logger } from "../utils/logger";

export type IdempotencyStatus = "processing" | "completed" | "failed";

export interface IdempotencyRecord {
  key: string;
  status: IdempotencyStatus;
  createdAt: string;
  updatedAt: string;
  requestId?: string;
  orderId?: string;
  gateway?: string;
  response?: any;
  error?: string;
}

export class IdempotencyService {
  private kv!: KVStore;

  constructor(private env: any) {}

  private getStorageKey(idempotencyKey: string) {
    return `idempotency:${idempotencyKey}`;
  }

  private getExpirationTtl(): number {
    const configured = Number(
      this.env?.IDEMPOTENCY_TTL_SECONDS || this.env?.IDEMPOTENCY_KEY_EXPIRATION_SECONDS
    );
    if (Number.isFinite(configured) && configured > 0) {
      return configured;
    }
    return 60 * 60 * 24; // 24 horas
  }

  async init() {
    if (this.kv) return;
    this.kv = await createKVStore(this.env);
  }

  async get(idempotencyKey: string): Promise<IdempotencyRecord | null> {
    await this.init();
    const raw = await this.kv.get(this.getStorageKey(idempotencyKey));
    if (!raw) return null;

    try {
      return JSON.parse(raw) as IdempotencyRecord;
    } catch (error) {
      logger.warn("[IdempotencyService] Failed to parse existing record", { idempotencyKey, raw });
      return null;
    }
  }

  async saveProcessing(
    idempotencyKey: string,
    metadata: { orderId?: string; requestId?: string; gateway?: string }
  ) {
    await this.init();
    const record: IdempotencyRecord = {
      key: idempotencyKey,
      status: "processing",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...metadata,
    };

    await this.kv.put(
      this.getStorageKey(idempotencyKey),
      JSON.stringify(record),
      { expirationTtl: this.getExpirationTtl() }
    );
    return record;
  }

  async saveResult(
    idempotencyKey: string,
    response: any,
    status: IdempotencyStatus,
    metadata: { orderId?: string; requestId?: string; gateway?: string } = {}
  ) {
    await this.init();
    const existing = (await this.get(idempotencyKey)) || {
      key: idempotencyKey,
      createdAt: new Date().toISOString(),
    };

    const record: IdempotencyRecord = {
      ...existing,
      ...metadata,
      key: idempotencyKey,
      status,
      response,
      updatedAt: new Date().toISOString(),
    };

    await this.kv.put(
      this.getStorageKey(idempotencyKey),
      JSON.stringify(record),
      { expirationTtl: this.getExpirationTtl() }
    );
    return record;
  }
}
