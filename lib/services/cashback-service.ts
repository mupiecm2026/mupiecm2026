import { logger } from "../utils/logger";
import { createKVStore } from "./kv/kv-store.factory";
import { KVStore } from "./kv/kv-store.interface";

interface CashbackCode {
  code: string;
  transactionId: string;
  amount: number;
  gateway: string;
  createdAt: string;
  used: boolean;
  usedAt?: string;
  idempotencyKey?: string;
}

export class CashbackService {
  private kvInstance: KVStore | null = null;

  constructor(private env: any) {}

  private async getKV(): Promise<KVStore> {
    if (!this.kvInstance) {
      this.kvInstance = await createKVStore(this.env);
    }
    return this.kvInstance;
  }

  async generateCashbackCode(transactionId: string, amount: number, idempotencyKey?: string) {
    const kv = await this.getKV();

    const existingTransaction = transactionId ? await kv.get(`cashback:txn:${transactionId}`) : null;
    const existingIdempotency = idempotencyKey ? await kv.get(`cashback:idemp:${idempotencyKey}`) : null;
    if (existingTransaction || existingIdempotency) return null;

    const percentage = 5;
    const cashbackAmount = Math.floor((amount * percentage) / 100);

    if (cashbackAmount < 100) return null;

    const code = this.generateUniqueCode();

    const cashbackCode: CashbackCode = {
      code,
      transactionId,
      amount: cashbackAmount,
      gateway: "system",
      createdAt: new Date().toISOString(),
      used: false,
      idempotencyKey,
    };

    await kv.put(`cashback:${code}`, JSON.stringify(cashbackCode));
    if (transactionId) {
      await kv.put(`cashback:txn:${transactionId}`, code);
    }
    if (idempotencyKey) {
      await kv.put(`cashback:idemp:${idempotencyKey}`, code);
    }

    logger.info("Cashback generated", {
      transactionId,
      code,
      cashbackAmount,
    });

    return code;
  }

  async verifyCodes(codes: string[]) {
    const kv = await this.getKV();
    const results = [];

    for (const code of codes) {
      const data = await kv.get(`cashback:${code}`);

      if (!data) {
        results.push({ code, valid: false, error: "Code not found" });
        continue;
      }

      const cashbackCode: CashbackCode = JSON.parse(data);

      if (cashbackCode.used) {
        results.push({ code, valid: false, error: "Code already used" });
      } else {
        results.push({
          code,
          valid: true,
          amount: cashbackCode.amount,
        });
      }
    }

    return results;
  }

  async cashoutCode(code: string, pixKey: string) {
    const kv = await this.getKV();

    const data = await kv.get(`cashback:${code}`);
    if (!data) throw new Error("Cashback code not found");

    const cashbackCode: CashbackCode = JSON.parse(data);

    if (cashbackCode.used) {
      throw new Error("Cashback already used");
    }

    cashbackCode.used = true;
    cashbackCode.usedAt = new Date().toISOString();

    await kv.put(
      `cashback:${code}`,
      JSON.stringify(cashbackCode)
    );

    return {
      amount: cashbackCode.amount,
      transactionId: cashbackCode.transactionId,
    };
  }

  private generateUniqueCode() {
    return (
      "CB" +
      Date.now().toString(36).toUpperCase() +
      Math.random().toString(36).substring(2, 8).toUpperCase()
    );
  }
}