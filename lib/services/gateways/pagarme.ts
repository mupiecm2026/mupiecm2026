import { PaymentInput, OrderData, PaymentResult } from "../../../types/types";
import { logger } from "../../utils/logger";
import { GatewayConfigService } from "../gateway-config-service";
import { GatewayInterface } from "../payment-processor";
import { getGatewayUrl } from "../../utils/gateway-urls";

interface PagarmeConfig {
  apiKey: string;
}

export class PagarmeGateway implements GatewayInterface {
  constructor(private configService: GatewayConfigService) {}

  private baseUrl = getGatewayUrl("pagarme");

  // =========================================
  // PAYMENT
  // =========================================
  async processPayment(
    payment: PaymentInput,
    order: OrderData
  ): Promise<PaymentResult> {
    try {
      const config = await this.getConfig();

      if (!payment.cardData && !payment.token) {
        return {
          success: false,
          status: "error",
          gateway: "pagarme",
          message: "Dados de pagamento não informados",
        };
      }

      const payload = this.buildPayload(payment, order);

      const headers: Record<string, string> = {
        Authorization: `Basic ${Buffer.from(config.apiKey + ":").toString("base64")}`,
        "Content-Type": "application/json",
      };

      if (payment.idempotencyKey) {
        headers["X-Idempotency-Key"] = payment.idempotencyKey;
      }

      const res = await fetch(`${this.baseUrl}/orders`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data : any = await res.json();

      const charge = data?.charges?.[0];
      const transactionId = charge?.id || data?.id;

      const providerStatus = charge?.status || data?.status;
      const acquirerMessage = charge?.last_transaction?.acquirer_message;

      // ===============================
      // ❌ ERRO HTTP
      // ===============================
      if (!res.ok) {
        logger.error("[PAGARME] Error", { data });

        return {
          success: false,
          status: "rejected",
          transactionId,
          gateway: "pagarme",
          providerStatus,
          message: data?.message || "Pagamento não autorizado",
          raw: data,
        };
      }

      const status = this.normalizeStatus(providerStatus);

      // ===============================
      // ❌ REJEITADO (mesmo com 200)
      // ===============================
      if (status === "rejected" || status === "error") {
        return {
          success: false,
          status,
          transactionId,
          gateway: "pagarme",
          providerStatus,
          message: acquirerMessage || "Pagamento recusado",
          raw: data,
        };
      }

      // ===============================
      // ⏳ PENDENTE
      // ===============================
      if (status === "pending") {
        return {
          success: true,
          status: "pending",
          transactionId,
          gateway: "pagarme",
          providerStatus,
          message: "Pagamento em processamento",
          raw: data,
        };
      }

      // ===============================
      // ✅ APROVADO
      // ===============================
      return {
        success: true,
        status: "approved",
        transactionId,
        gateway: "pagarme",
        providerStatus,
        message: acquirerMessage || "Pagamento aprovado",
        raw: data,
      };

    } catch (err: any) {
      logger.error("[PAGARME] Fatal error", {
        message: err.message,
        stack: err.stack,
      });

      return {
        success: false,
        status: "error",
        gateway: "pagarme",
        message: "Erro ao processar pagamento",
      };
    }
  }

  // =========================================
  // PAYLOAD
  // =========================================
  private buildPayload(payment: PaymentInput, order: OrderData) {
    return {
      items: order.items.map((item) => ({
        amount: item.price,
        description: item.title,
        quantity: item.quantity,
      })),
      customer: {
        name: payment.payer.name || "Cliente",
        email: payment.payer.email,
        document: payment.payer.cpf,
        type: "individual",
      },
      payments: [
        {
          payment_method: "credit_card",
          credit_card: {
            installments: payment.installments || 1,
            statement_descriptor: "SUA LOJA",
            card: payment.token
              ? { token: payment.token }
              : {
                  number: payment.cardData?.number,
                  holder_name: payment.cardData?.holder,
                  exp_month: payment.cardData?.expMonth,
                  exp_year: payment.cardData?.expYear,
                  cvv: payment.cardData?.cvv,
                },
          },
        },
      ],
      metadata: {
        device_id: payment.deviceFingerprints?.pagarme?.deviceId || payment.deviceId || undefined,
        remote_ip: payment.remoteIp,
      },
    };
  }

  // =========================================
  // HEALTH
  // =========================================
  async getHealthStatus(): Promise<{ status: string; latency: number }> {
    const start = Date.now();

    try {
      const config = await this.getConfig();

      const res = await fetch(`${this.baseUrl}/orders?size=1`, {
        headers: {
          Authorization: `Basic ${Buffer.from(config.apiKey + ":").toString("base64")}`,
        },
      });

      return {
        status: res.ok ? "healthy" : "unhealthy",
        latency: Date.now() - start,
      };
    } catch (err) {
      return {
        status: "unhealthy",
        latency: Date.now() - start,
      };
    }
  }

  // =========================================
  // CONFIG
  // =========================================
  private async getConfig(): Promise<PagarmeConfig> {
    const cfg = await this.configService.getActiveConfig("gateway", "pagarme");

    if (!cfg?.creds) {
      throw new Error("[PAGARME] Config não encontrada");
    }

    const apiKey =
      cfg.creds.apiKey ||
      cfg.creds.api_key ||
      cfg.creds.secret_key;

    if (!apiKey) {
      throw new Error("[PAGARME] apiKey não configurada");
    }

    return { apiKey };
  }

  // =========================================
  // STATUS NORMALIZATION
  // =========================================
  private normalizeStatus(status: string): PaymentResult["status"] {
    const map: Record<string, PaymentResult["status"]> = {
      paid: "approved",
      authorized: "pending",
      pending: "pending",
      refused: "rejected",
      canceled: "rejected",
      failed: "error",
    };

    return map[status] || "error";
  }
}