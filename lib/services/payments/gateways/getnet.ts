import { OrderData, PaymentInput, PaymentResult } from "../../../../types/types";
import { detectCardBrand } from "../../../utils/card-brand-detector";
import { getGatewayUrl } from "../../../utils/gateway-urls";
import { logger } from "../../../utils/logger";
import { GatewayInterface } from "./interface/payment-processor";
import { GatewayConfigService } from "./configurations/gateway-config-service";


interface GetnetConfig {
  seller_id: string;
  client_id: string;
  client_secret?: string;
  access_token?: string;
}

export class GetnetGateway implements GatewayInterface {
  private baseUrl = getGatewayUrl("getnet");
  constructor(private configService: GatewayConfigService) {}

  // =========================================
  // HEALTH CHECK
  // =========================================
  async getHealthStatus(): Promise<{ status: string; latency: number }> {
    const start = Date.now();
    try {
      const config = await this.getConfig();
      const response = await fetch(`${this.baseUrl}/v1/auth/oauth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: config.client_id,
          client_secret: config.client_secret,
          scope: "payment",
          grant_type: "client_credentials",
        }),
      });
      return {
        status: response.ok ? "healthy" : "unhealthy",
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
      const accessToken = await this.getAccessToken(config);

      if (!payment.token && !payment.cardData) {
        return {
          success: false,
          status: "rejected",
          message: "Token ou dados do cartão não informados",
          errorCode: "PROCESSING_ERROR",
          gateway: "getnet",
        };
      }

      const payload = this.buildPayload(payment, order, payment.token, config.seller_id);

      const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      };

      if (payment.idempotencyKey) {
        headers["X-Idempotency-Key"] = payment.idempotencyKey;
      }

      const res = await fetch(`${this.baseUrl}/v1/payments/credit`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data: any = await res.json();

      // ❌ HTTP ERROR
      if (!res.ok) {
        logger.error("[Getnet] Payment error", {
          orderId: order.orderId,
          status: res.status,
          error: data,
        });

        const errorCode = this.mapErrorCode(data?.error_code || data?.code);
        return {
          success: false,
          status: "rejected",
          gateway: "getnet",
          errorCode,
          message: this.getUserMessage(errorCode, data?.message),
          raw: data,
        };
      }

      // ✅ SUCCESS
      const status = this.normalizeStatus(data?.status);
      const transactionId = data?.payment_id || data?.id;

      return {
        success: status === "approved",
        status,
        transactionId,
        gateway: "getnet",
        providerStatus: data?.status,
        message: this.getStatusMessage(status, data?.status),
        raw: data,
      };

    } catch (err: any) {
      logger.error("[Getnet] Fatal error", {
        message: err.message,
        orderId: order.orderId,
      });

      return {
        success: false,
        status: "error",
        gateway: "getnet",
        message: "Erro interno ao processar pagamento",
        errorCode: "PROCESSING_ERROR",
      };
    }
  }

  // =========================================
  // CARD TOKENIZATION
  // =========================================
  async tokenizeCard(cardData: {
    number: string;
    holder: string;
    expMonth: string;
    expYear: string;
    cvv: string;
  }): Promise<{ token: string; brand: string }> {
    const config = await this.getConfig();
    const accessToken = await this.getAccessToken(config);

    const payload = {
      card_number: cardData.number.replace(/\s/g, ""),
      customer_id: "cardholder",
      cardholder_name: cardData.holder,
      expiration_month: parseInt(cardData.expMonth, 10),
      expiration_year: this.formatYear(cardData.expYear),
    };

    const res = await fetch(`${this.baseUrl}/v1/cards/token`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data: any = await res.json();

    if (!res.ok || !data?.card_id) {
      logger.error("[Getnet] Tokenization error", { error: data });
      throw new Error(data?.message || "Falha ao tokenizar cartão");
    }

    const brand = detectCardBrand(cardData.number.replace(/\s/g, ""));

    return {
      token: data.card_id,
      brand,
    };
  }

  // =========================================
  // CAPTURE
  // =========================================
  async capturePayment?(transactionId: string): Promise<PaymentResult> {
    const config = await this.getConfig();
    const accessToken = await this.getAccessToken(config);

    const res = await fetch(
      `${this.baseUrl}/v1/payments/credit/${transactionId}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data: any = await res.json();

    return {
      success: res.ok,
      status: res.ok ? "approved" : "rejected",
      transactionId,
      gateway: "getnet",
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
    const accessToken = await this.getAccessToken(config);

    const payload = amount
      ? { amount: amount, currency: "BRL" }
      : {};

    const res = await fetch(
      `${this.baseUrl}/v1/payments/credit/${transactionId}/refund`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
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
      gateway: "getnet",
      message: data?.message || (res.ok ? "Estornado" : "Falha no estorno"),
      raw: data,
    };
  }

  // =========================================
  // PRIVATE HELPERS
  // =========================================
  private async getConfig(): Promise<GetnetConfig> {
    const activeConfig = await this.configService.getActiveConfig(
      "gateway",
      "getnet"
    );
    if (!activeConfig?.creds) {
      throw new Error("[Getnet] Configuração não encontrada");
    }

    const creds = activeConfig.creds;
    return {
      seller_id: creds.seller_id || creds.sellerId,
      client_id: creds.client_id || creds.clientId,
      client_secret: creds.client_secret || creds.clientSecret,
      access_token: creds.access_token || creds.accessToken,
    };
  }

  private async getAccessToken(config: GetnetConfig): Promise<string> {
    if (config.access_token) {
      return config.access_token;
    }

    const res = await fetch(`${this.baseUrl}/v1/auth/oauth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: config.client_id,
        client_secret: config.client_secret,
        scope: "payment",
        grant_type: "client_credentials",
      }),
    });

    const data: any = await res.json();

    if (!res.ok || !data?.access_token) {
      throw new Error("[Getnet] Falha ao obter access_token");
    }

    return data.access_token;
  }

  private buildPayload(payment: PaymentInput, order: OrderData, token?: string, sellerId?: string) {
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

    const payerName = payment.payer?.name;
    const nameParts = this.splitUserName(payerName);

    return {
      seller_id: sellerId,
      order_id: order.orderId,
      amount: Math.round(payment.amount),
      currency: "BRL",
      transaction_type: "FULL",
      installments: payment.installments || 1,
      device_id: gatewayDeviceId,
      card: token
        ? { card_id: token }
        : {
            number: payment.cardData?.number.replace(/\s/g, ""),
            brand: this.mapBrand(brand),
            expiration_month: parseInt(payment.cardData?.expMonth || "0", 10),
            expiration_year: this.formatYear(payment.cardData?.expYear || ""),
            cardholder_name: payment.cardData?.holder || payment.cardholderName,
          },
      customer: {
        customer_id: payment.payer?.cpf?.replace(/\D/g, "") || "default",
        first_name: nameParts.first_name,
        last_name: nameParts.last_name,
        document_type: "CPF",
        document_number: payment.payer?.cpf?.replace(/\D/g, ""),
        email: payment.payer?.email,
        ip_address: payment.remoteIp,
      },
    };
  }

  private splitUserName(fullName?: string) {
    const name = fullName?.trim();
    if (!name) {
      return { first_name: "Cliente", last_name: undefined };
    }

    const parts = name.split(/\s+/);
    return {
      first_name: parts[0] || "Cliente",
      last_name: parts.slice(1).join(" ") || undefined,
    };
  }

  private normalizeStatus(status?: string): PaymentResult["status"] {
    const map: Record<string, PaymentResult["status"]> = {
      APPROVED: "approved",
      AUTHORIZED: "pending",
      DECLINED: "rejected",
      CANCELLED: "rejected",
      ERROR: "error",
    };
    return map[status || ""] || "error";
  }

  private mapErrorCode(errorCode?: string): PaymentResult["errorCode"] {
    const map: Record<string, PaymentResult["errorCode"]> = {
      INSUFFICIENT_FUNDS: "INSUFFICIENT_FUNDS",
      CARD_BLOCKED: "CARD_DECLINED",
      INVALID_CARD: "INVALID_CARD",
      EXPIRED_CARD: "EXPIRED_CARD",
      CARD_NOT_SUPPORTED: "INVALID_CARD",
      SECURITY_CODE_FAILED: "INVALID_CARD",
      SECURITY_CODE_NOT_MATCHED: "INVALID_CARD",
      TRANSACTION_NOT_PERMITTED: "FRAUD_DETECTED",
      DUPLICATE_TRANSACTION: "PROCESSING_ERROR",
      ACQUIRER_ERROR: "PROCESSING_ERROR",
      TIMEOUT: "PROCESSING_ERROR",
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
      mastercard: "MASTERCARD",
      amex: "AMEX",
      elo: "ELO",
      hipercard: "HIPERCARD",
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