
import { OrderData, PaymentInput, PaymentResult } from "../../../types/types";
import { logger } from "../../utils/logger";
import { GatewayConfigService } from "../gateway-config-service";
import { GatewayInterface } from "../payment-processor";
import { getGatewayUrl } from "../../utils/gateway-urls";

interface StripeConfig {
  secretKey: string;
}

export class StripeGateway implements GatewayInterface {
  constructor(private configService: GatewayConfigService) {}

  private baseUrl = getGatewayUrl("stripe");

  // =========================================
  // PAYMENT
  // =========================================
  async processPayment(payment: PaymentInput, order: OrderData): Promise<PaymentResult> {
    try {
      const config = await this.getConfig();

      if (!payment.paymentMethodId) {
        return {
          success: false,
          status: "error",
          gateway: "stripe",
          message: "Método de pagamento não informado",
        };
      }

      logger.info("[STRIPE] Creating PaymentIntent", {
        orderId: order.orderId,
        amount: payment.amount,
      });

      const payload = new URLSearchParams({
        amount: payment.amount.toString(),
        currency: "brl",
        payment_method: payment.paymentMethodId,
        confirm: "true",
        "metadata[order_id]": order.orderId,
        "metadata[device_id]": payment.deviceId || "",
        ...(payment.payer?.name ? { "metadata[payer_name]": payment.payer.name } : {}),
        ...(payment.remoteIp ? { "metadata[remote_ip]": payment.remoteIp } : {}),
        // Add fingerprints to metadata
        ...(payment.deviceFingerprints ? {
          "metadata[fingerprints]": JSON.stringify(payment.deviceFingerprints),
        } : {}),
      });

      const headers: Record<string, string> = {
        Authorization: `Bearer ${config.secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      };

      if (payment.idempotencyKey) {
        headers["Idempotency-Key"] = payment.idempotencyKey;
      }

      const res = await fetch(`${this.baseUrl}/payment_intents`, {
        method: "POST",
        headers,
        body: payload.toString(),
      });

      const data : any = await res.json();

      const transactionId = data?.id;
      const providerStatus = data?.status;

      // ===============================
      // ❌ ERRO HTTP (Stripe error object)
      // ===============================
      if (!res.ok) {
        logger.error("[STRIPE] Error", { data });

        return {
          success: false,
          status: "rejected",
          transactionId,
          gateway: "stripe",
          providerStatus: data?.error?.type || "error",
          message: data?.error?.message || "Pagamento não autorizado",
          raw: data,
        };
      }

      const status = this.normalizeStatus(providerStatus);

      // ===============================
      // ⚠️ REQUIRES ACTION (3DS)
      // ===============================
      if (status === "requires_action") {
        return {
          success: false,
          status: "requires_action",
          transactionId,
          gateway: "stripe",
          providerStatus,
          message: "Confirmação adicional necessária",
          raw: data,
        };
      }

      // ===============================
      // ❌ REJEITADO
      // ===============================
      if (status === "rejected" || status === "error") {
        return {
          success: false,
          status,
          transactionId,
          gateway: "stripe",
          providerStatus,
          message: "Pagamento recusado",
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
          gateway: "stripe",
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
        gateway: "stripe",
        providerStatus,
        message: "Pagamento aprovado",
        raw: data,
      };

    } catch (err: any) {
      logger.error("[STRIPE] Fatal error", {
        message: err.message,
        stack: err.stack,
      });

      return {
        success: false,
        status: "error",
        gateway: "stripe",
        message: "Erro ao processar pagamento",
      };
    }
  }

  // =========================================
  // HEALTH
  // =========================================
  async getHealthStatus(): Promise<{ status: string; latency: number }> {
    const start = Date.now();

    try {
      const config = await this.getConfig();

      const res = await fetch(`${this.baseUrl}/account`, {
        headers: {
          Authorization: `Bearer ${config.secretKey}`,
        },
      });

      return {
        status: res.ok ? "healthy" : "unhealthy",
        latency: Date.now() - start,
      };
    } catch {
      return {
        status: "unhealthy",
        latency: Date.now() - start,
      };
    }
  }

  // =========================================
  // CONFIG
  // =========================================
  private async getConfig(): Promise<StripeConfig> {
    const cfg = await this.configService.getActiveConfig("psp", "stripe");

    if (!cfg?.creds) {
      throw new Error("[STRIPE] Config não encontrada");
    }

    const creds = cfg.creds as Record<string, string>;

    const secretKey =
      creds.secretKey ||
      creds.secret_key ||
      creds.apiKey ||
      creds.api_key;

    if (!secretKey) {
      throw new Error("[STRIPE] secretKey não configurada");
    }

    return {
      secretKey,
    };
  }

  // =========================================
  // STATUS NORMALIZATION
  // =========================================
  private normalizeStatus(status: string): PaymentResult["status"] {
    const map: Record<string, PaymentResult["status"]> = {
      succeeded: "approved",
      processing: "pending",
      requires_action: "requires_action",
      requires_payment_method: "rejected",
      canceled: "rejected",
    };

    return map[status] || "error";
  }

  // =========================================
  // MESSAGE MAPPING
  // =========================================
  private getStatusMessage(status: string): string {
    const map: Record<string, string> = {
      succeeded: "Pagamento aprovado",
      processing: "Pagamento em processamento",
      requires_action: "Autenticação necessária (3DS)",
      requires_payment_method: "Pagamento recusado",
      canceled: "Pagamento cancelado",
    };

    return map[status] || "Erro no pagamento";
  }
}