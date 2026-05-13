import { OrderData, PaymentInput, PaymentResult } from "../../../../types/types";
import { detectCardBrand } from "../../../utils/card-brand-detector";
import { getGatewayUrl } from "../../../utils/gateway-urls";
import { logger } from "../../../utils/logger";
import { GatewayInterface } from "./interface/payment-processor";
import { GatewayConfigService } from "./configurations/gateway-config-service";


interface AdyenConfig {
  apiKey: string;
  merchantAccount: string;
  environment: "test" | "live";
}

export class AdyenGateway implements GatewayInterface {
  private baseUrl = getGatewayUrl("adyen");
  constructor(private configService: GatewayConfigService) {}

  // =========================================
  // HEALTH CHECK
  // =========================================
  async getHealthStatus(): Promise<{ status: string; latency: number }> {
    const start = Date.now();
    try {
      const config = await this.getConfig();
      const res = await fetch(`${this.getBaseUrl(config.environment)}/health`, {
        method: "GET",
        headers: { "X-API-Key": config.apiKey },
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
          gateway: "adyen",
        };
      }

      const payload = this.buildPayload(payment, order, config.merchantAccount);

      const headers: Record<string, string> = {
        "X-API-Key": config.apiKey,
        "Content-Type": "application/json",
      };

      if (payment.idempotencyKey) {
        headers["Idempotency-Key"] = payment.idempotencyKey;
      }

      const res = await fetch(`${this.getBaseUrl(config.environment)}/payments`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data: any = await res.json();

      // ❌ HTTP ERROR
      if (!res.ok) {
        logger.error("[Adyen] Payment error", {
          orderId: order.orderId,
          status: res.status,
          error: data,
        });

        const errorCode = this.mapErrorCode(data?.errorCode, data?.refusalReason);
        return {
          success: false,
          status: "rejected",
          gateway: "adyen",
          errorCode,
          message: this.getUserMessage(errorCode, data?.refusalReason),
          raw: data,
        };
      }

      // ===============================
      // ✅ 3DS REQUIRED (requires_action)
      // ===============================
      if (data?.resultCode === "RedirectShopper" || data?.action) {
        return {
          success: false,
          status: "requires_action",
          transactionId: data?.pspReference || data?.merchantReference,
          gateway: "adyen",
          providerStatus: data?.resultCode,
          message: "Confirmação adicional necessária (3D Secure)",
          raw: data,
        };
      }

      // ===============================
      // ✅ SUCCESS
      // ===============================
      const status = this.normalizeStatus(data?.resultCode);
      const isApproved = status === "approved";

      return {
        success: isApproved,
        status,
        transactionId: data?.pspReference || data?.merchantReference,
        gateway: "adyen",
        providerStatus: data?.resultCode,
        message: this.getStatusMessage(status, data?.refusalReason),
        raw: data,
      };

    } catch (err: any) {
      logger.error("[Adyen] Fatal error", {
        message: err.message,
        orderId: order.orderId,
      });

      return {
        success: false,
        status: "error",
        gateway: "adyen",
        message: "Erro interno ao processar pagamento",
        errorCode: "PROCESSING_ERROR",
      };
    }
  }

  // =========================================
  // HANDLE 3DS RESULT
  // =========================================
  async handleRedirectResult(
    redirectResult: string,
    details: any
  ): Promise<PaymentResult> {
    try {
      const config = await this.getConfig();

      const res = await fetch(
        `${this.getBaseUrl(config.environment)}/payments/details`,
        {
          method: "POST",
          headers: {
            "X-API-Key": config.apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            details: details,
            paymentData: redirectResult,
          }),
        }
      );

      const data: any = await res.json();
      const status = this.normalizeStatus(data?.resultCode);

      return {
        success: status === "approved",
        status,
        transactionId: data?.pspReference,
        gateway: "adyen",
        providerStatus: data?.resultCode,
        message: this.getStatusMessage(status, data?.refusalReason),
        raw: data,
      };
    } catch (err: any) {
      logger.error("[Adyen] Redirect handling error", { message: err.message });
      return {
        success: false,
        status: "error",
        gateway: "adyen",
        message: "Erro ao processar confirmação",
        errorCode: "PROCESSING_ERROR",
      };
    }
  }

  // =========================================
  // CAPTURE
  // =========================================
  async capturePayment?(transactionId: string): Promise<PaymentResult> {
    const config = await this.getConfig();

    const res = await fetch(
      `${this.getBaseUrl(config.environment)}/payments/${transactionId}/captures`,
      {
        method: "POST",
        headers: {
          "X-API-Key": config.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      }
    );

    const data: any = await res.json();

    return {
      success: res.ok,
      status: res.ok ? "approved" : "rejected",
      transactionId,
      gateway: "adyen",
      message: data?.message || (res.ok ? "Capturado" : "Falha na captura"),
      raw: data,
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
      ? { modificationAmount: { value: amount, currency: "BRL" } }
      : {};

    const res = await fetch(
      `${this.getBaseUrl(config.environment)}/payments/${transactionId}/refunds`,
      {
        method: "POST",
        headers: {
          "X-API-Key": config.apiKey,
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
      gateway: "adyen",
      message: data?.message || (res.ok ? "Estornado" : "Falha no estorno"),
      raw: data,
    };
  }

  // =========================================
  // PRIVATE HELPERS
  // =========================================
  private async getConfig(): Promise<AdyenConfig> {
    const activeConfig = await this.configService.getActiveConfig(
      "gateway",
      "adyen"
    );
    if (!activeConfig?.creds) {
      throw new Error("[Adyen] Configuração não encontrada");
    }

    const creds = activeConfig.creds;
    return {
      apiKey: creds.apiKey || creds.api_key,
      merchantAccount: creds.merchantAccount || creds.merchant_account,
      environment: (creds.environment as "test" | "live") || "test",
    };
  }

  private getBaseUrl(environment: "test" | "live"): string {
    return environment === "test"
      ? "https://checkout-test.adyen.com/v71"
      : "https://checkout-live.adyen.com/v71";
  }

  private buildPayload(
    payment: PaymentInput,
    order: OrderData,
    merchantAccount: string
  ) {
    const brand = payment.cardData
      ? detectCardBrand(payment.cardData.number.replace(/\s/g, ""))
      : "visa";

    return {
      merchantAccount,
      reference: order.orderId,
      amount: {
        value: Math.round(payment.amount),
        currency: "BRL",
      },
      returnUrl: `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/checkout`,
      shopperInteraction: "Ecommerce",
      recurringProcessingModel: "CardOnFile",
      shopperEmail: payment.payer?.email,
      shopperReference: payment.payer?.cpf?.replace(/\D/g, ""),
      shopperIP: payment.remoteIp,
      additionalData: {
        deviceFingerprint: payment.deviceFingerprints?.adiq?.fingerprintId || payment.deviceId || undefined,
        remote_ip: payment.remoteIp,
      },
      paymentMethod: payment.token
        ? { type: "scheme", storedPaymentMethodId: payment.token }
        : {
            type: "scheme",
            number: payment.cardData?.number.replace(/\s/g, ""),
            expiryMonth: payment.cardData?.expMonth,
            expiryYear: this.formatYear(payment.cardData?.expYear || ""),
            holderName: payment.cardData?.holder || payment.cardholderName,
            cvc: payment.cardData?.cvv,
            brand: this.mapBrand(brand),
          },
    };
  }

  private normalizeStatus(resultCode?: string): PaymentResult["status"] {
    const map: Record<string, PaymentResult["status"]> = {
      Authorised: "approved",
      Received: "pending",
      Pending: "pending",
      Refused: "rejected",
      Cancelled: "rejected",
      Error: "error",
    };
    return map[resultCode || ""] || "error";
  }

  private mapErrorCode(
    errorCode?: string,
    refusalReason?: string
  ): PaymentResult["errorCode"] {
    // Adyen-specific error codes
    if (refusalReason?.toLowerCase().includes("insufficient")) {
      return "INSUFFICIENT_FUNDS";
    }
    if (refusalReason?.toLowerCase().includes("blocked")) {
      return "CARD_DECLINED";
    }
    if (refusalReason?.toLowerCase().includes("expired")) {
      return "EXPIRED_CARD";
    }
    if (refusalReason?.toLowerCase().includes("invalid")) {
      return "INVALID_CARD";
    }
    if (refusalReason?.toLowerCase().includes("fraud")) {
      return "FRAUD_DETECTED";
    }

    const map: Record<string, PaymentResult["errorCode"]> = {
      NotEnoughBalance: "INSUFFICIENT_FUNDS",
      CardBlocked: "CARD_DECLINED",
      ExpiredCard: "EXPIRED_CARD",
      InvalidCardNumber: "INVALID_CARD",
      InvalidSecurityCode: "INVALID_CARD",
      Fraud: "FRAUD_DETECTED",
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
      visa: "VISA",
      mastercard: "MC",
      amex: "AMEX",
      elo: "ELO",
      hipercard: "HIPER",
      diners: "DINERS",
      discover: "DISCOVER",
      jcb: "JCB",
    };
    return map[brand] || "VISA";
  }

  private formatYear(year: string): string {
    if (year.length === 2) {
      return `20${year}`;
    }
    return year;
  }
}