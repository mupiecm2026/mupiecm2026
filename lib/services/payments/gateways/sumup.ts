import { OrderData, PaymentInput, PaymentResult } from "../../../../types/types";
import { detectCardBrand } from "../../../utils/card-brand-detector";
import { logger } from "../../../utils/logger";
import { GatewayInterface } from "./interface/payment-processor";
import { GatewayConfigService } from "./configurations/gateway-config-service";

interface SumupConfig {
  apiKey: string;
  merchantId: string;
  affiliateKey?: string;
}

export class SumupGateway implements GatewayInterface {
  private baseUrl = "https://api.sumup.com";
  constructor(private configService: GatewayConfigService) {}

  // =========================================
  // HEALTH CHECK
  // =========================================
  async getHealthStatus(): Promise<{ status: string; latency: number }> {
    const start = Date.now();
    try {
      const config = await this.getConfig();
      const res = await fetch(`${this.baseUrl}/v0.1/merchants/${config.merchantId}`, {
        headers: { Authorization: `Bearer ${config.apiKey}` },
      });
      return {
        status: res.ok ? "healthy" : "unhealthy",
        latency: Date.now() - start,
      };
    } catch {
      return { status: "unhealthy", latency: Date.now() - start };
    }
  }

  // =========================================
  // PAYMENT PROCESSING
  // =========================================
  async processPayment(
    payment: PaymentInput,
    order: OrderData
  ): Promise<PaymentResult> {
    try {
      const config = await this.getConfig();

      if (!payment.token && !payment.cardData) {
        return {
          success: false,
          status: "rejected",
          message: "Token ou dados do cartão não informados",
          errorCode: "PROCESSING_ERROR",
          gateway: "sumup",
        };
      }

      const payload = this.buildPayload(payment, order, config.merchantId);

      const headers: Record<string, string> = {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      };

      if (payment.idempotencyKey) {
        headers["X-Idempotency-Key"] = payment.idempotencyKey;
      }

      const res = await fetch(`${this.baseUrl}/v0.1/payments`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data: any = await res.json();

      // ❌ HTTP ERROR
      if (!res.ok) {
        logger.error("[Sumup] Payment error", {
          orderId: order.orderId,
          status: res.status,
          error: data,
        });

        const errorCode = this.mapErrorCode(data?.code || data?.error_code);
        return {
          success: false,
          status: "rejected",
          gateway: "sumup",
          errorCode,
          message: this.getUserMessage(errorCode, data?.message),
          raw: data,
        };
      }

      // ===============================
      // ✅ SUCCESS
      // ===============================
      const status = this.normalizeStatus(data?.status);
      const transactionId = data?.id || data?.payment_id;

      return {
        success: status === "approved",
        status,
        transactionId,
        gateway: "sumup",
        providerStatus: data?.status,
        message: this.getStatusMessage(status, data?.status),
        raw: data,
      };

    } catch (err: any) {
      logger.error("[Sumup] Fatal error", {
        message: err.message,
        orderId: order.orderId,
      });

      return {
        success: false,
        status: "error",
        gateway: "sumup",
        message: "Erro interno ao processar pagamento",
        errorCode: "PROCESSING_ERROR",
      };
    }
  }

  // =========================================
  // CREATE PAYMENT LINK (Pix/Boleto)
  // =========================================
  async createPaymentLink(
    payment: PaymentInput,
    order: OrderData
  ): Promise<{ checkoutUrl: string; paymentId: string }> {
    const config = await this.getConfig();

    const payload = {
      amount: payment.amount / 100, // Sumup expects decimal
      currency: "BRL",
      description: `Pedido ${order.orderId}`,
      reference: order.orderId,
      customer: {
        email: payment.payer?.email,
        name: payment.payer?.name || payment.cardholderName || "Cliente",
      },
    };

    const res = await fetch(`${this.baseUrl}/v0.1/checkout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data: any = await res.json();

    if (!res.ok || !data?.id) {
      throw new Error(data?.message || "Falha ao criar link de pagamento");
    }

    return {
      checkoutUrl: data?.url || `${this.baseUrl}/pay/${data.id}`,
      paymentId: data.id,
    };
  }

  // =========================================
  // REFUND
  // =========================================
  async refundPayment?(
    transactionId: string,
    amount?: number
  ): Promise<PaymentResult> {
    const config = await this.getConfig();

    const payload = amount
      ? { amount: amount / 100, currency: "BRL" }
      : {};

    const res = await fetch(
      `${this.baseUrl}/v0.1/payments/${transactionId}/refunds`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const data: any = await res.json();

    return {
      success: res.ok,
      status: res.ok ? "approved" : "rejected",
      transactionId,
      gateway: "sumup",
      message: data?.message || (res.ok ? "Estornado" : "Falha no estorno"),
      raw: data,
    };
  }

  // =========================================
  // PRIVATE HELPERS
  // =========================================
  private async getConfig(): Promise<SumupConfig> {
    const activeConfig = await this.configService.getActiveConfig(
      "gateway",
      "sumup"
    );
    if (!activeConfig?.creds) {
      throw new Error("[Sumup] Configuração não encontrada");
    }

    const creds = activeConfig.creds;
    return {
      apiKey: creds.apiKey || creds.api_key,
      merchantId: creds.merchantId || creds.merchant_id,
      affiliateKey: creds.affiliateKey || creds.affiliate_key,
    };
  }

  private buildPayload(payment: PaymentInput, order: OrderData, merchantId?: string) {
    const brand = payment.cardData
      ? detectCardBrand(payment.cardData.number.replace(/\s/g, ""))
      : "visa";

    const gatewayDeviceId =
      payment.deviceId ||
      payment.deviceFingerprints?.pagarme?.deviceId ||
      payment.deviceFingerprints?.mercadopago?.deviceId ||
      payment.deviceFingerprints?.cielo?.dfpSessionId ||
      payment.deviceFingerprints?.adiq?.fingerprintId ||
      payment.deviceFingerprints?.stripe?.fingerprintToken;

    return {
      amount: payment.amount / 100, // Sumup expects decimal (R$1.00 = 1.00)
      currency: "BRL",
      merchant_id: merchantId,
      order_id: order.orderId,
      payment_type: "card",
      card: payment.token
        ? { token: payment.token }
        : {
            number: payment.cardData?.number.replace(/\s/g, ""),
            exp_month: parseInt(payment.cardData?.expMonth || "0", 10),
            exp_year: this.formatYear(payment.cardData?.expYear || ""),
            cardholder_name: payment.cardData?.holder || payment.cardholderName,
            cvv: payment.cardData?.cvv,
            brand: this.mapBrand(brand),
          },
      customer: {
        email: payment.payer?.email,
        name: payment.payer?.name || "Cliente",
        tax_id: payment.payer?.cpf?.replace(/\D/g, ""),
      },
      installments: payment.installments || 1,
      metadata: {
        ...(gatewayDeviceId ? { device_id: gatewayDeviceId } : {}),
        ...(payment.remoteIp ? { remote_ip: payment.remoteIp } : {}),
      },
    };
  }

  private normalizeStatus(status?: string): PaymentResult["status"] {
    const map: Record<string, PaymentResult["status"]> = {
      SUCCESS: "approved",
      PENDING: "pending",
      DECLINED: "rejected",
      FAILED: "rejected",
      CANCELLED: "rejected",
    };
    return map[status || ""] || "error";
  }

  private mapErrorCode(errorCode?: string): PaymentResult["errorCode"] {
    const map: Record<string, PaymentResult["errorCode"]> = {
      INSUFFICIENT_FUNDS: "INSUFFICIENT_FUNDS",
      CARD_LIMIT_EXCEEDED: "CARD_DECLINED",
      CARD_BLOCKED: "CARD_DECLINED",
      INVALID_CARD: "INVALID_CARD",
      EXPIRED_CARD: "EXPIRED_CARD",
      CVV_NOT_MATCHED: "INVALID_CARD",
      FRAUD_SUSPECTED: "FRAUD_DETECTED",
      DUPLICATE_ORDER: "PROCESSING_ERROR",
      ACQUIRER_ERROR: "PROCESSING_ERROR",
    };
    return map[errorCode || ""] || "UNKNOWN";
  }

  private getUserMessage(
    code?: PaymentResult["errorCode"],
    rawMessage?: string
  ): string {
    const map: Record<string, string> = {
      INSUFFICIENT_FUNDS: "Saldo insuficiente.",
      CARD_DECLINED: "Cartão recusado.",
      INVALID_CARD: "Dados do cartão inválidos.",
      EXPIRED_CARD: "Cartão expirado.",
      FRAUD_DETECTED: "Transação recusada por segurança.",
      PROCESSING_ERROR: "Falha técnica. Tente novamente.",
      REQUIRES_AUTH: "Autorize a transação no seu banco.",
      UNKNOWN: rawMessage || "Pagamento não autorizado.",
    };
    return map[code || ""] || rawMessage || "Erro no processamento.";
  }

  private getStatusMessage(
    status: PaymentResult["status"],
    rawStatus?: string
  ): string {
    const map: Record<string, string> = {
      approved: "Pagamento aprovado",
      pending: "Pagamento autorizado. Aguardando confirmação.",
      rejected: "Pagamento recusado",
      error: "Erro no processamento",
    };
    return map[status] || rawStatus || "Status desconhecido";
  }

  private mapBrand(brand: string): string {
    const map: Record<string, string> = {
      visa: "visa",
      mastercard: "mastercard",
      amex: "amex",
      elo: "elo",
      hipercard: "hipercard",
      diners: "diners",
      discover: "discover",
      jcb: "jcb",
    };
    return map[brand] || "visa";
  }

  private formatYear(year: string): string {
    if (year.length === 2) {
      return `20${year}`;
    }
    return year;
  }
}